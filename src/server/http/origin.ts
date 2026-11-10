import { ApiError } from "./api-error";

/**
 * Защита от CSRF через сверку источника запроса.
 *
 * В Django за это отвечала пара «csrftoken в куке + заголовок X-CSRFToken».
 * Здесь API живёт на том же origin, что и фронтенд, поэтому надёжнее и проще
 * другой подход (его же использует Next.js для Server Actions):
 *
 *   1. куки помечены `SameSite=Lax` — браузер не приложит их к межсайтовому POST;
 *   2. для любого небезопасного метода сверяется заголовок `Origin` с хостом,
 *      на который пришёл запрос.
 *
 * Заголовок `Origin` браузер проставляет сам и подделать его из JS нельзя, так
 * что отдельный токен не нужен.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requestHost(request: Request): string | null {
    // За прокси Vercel реальный хост приходит в x-forwarded-host.
    return (
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        null
    );
}

export function assertSameOrigin(request: Request): void {
    if (SAFE_METHODS.has(request.method)) return;

    const origin = request.headers.get("origin");
    const host = requestHost(request);

    if (!host) {
        throw ApiError.forbidden("Не удалось определить хост запроса");
    }

    // Запросы не из браузера (curl, серверные интеграции) Origin не присылают.
    // Их пропускаем: CSRF — атака на браузерную сессию, а в отсутствие Origin
    // браузер куки и не отправит.
    if (!origin) return;

    let originHost: string;
    try {
        originHost = new URL(origin).host;
    } catch {
        throw ApiError.forbidden("Некорректный заголовок Origin");
    }

    if (originHost !== host) {
        throw ApiError.forbidden(
            "Запрос отклонён: источник не совпадает с адресом приложения",
        );
    }
}
