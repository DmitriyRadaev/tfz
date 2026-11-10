/**
 * Единый тип ошибки API.
 *
 * Формат ответа повторяет DRF (`{ "detail": "..." }`, плюс необязательное
 * `errors` с ошибками по полям), чтобы существующий клиентский код и привычные
 * сообщения не пришлось переписывать.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly errors?: Record<string, string[]>;
    readonly headers?: Record<string, string>;

    constructor(
        status: number,
        detail: string,
        options?: {
            errors?: Record<string, string[]>;
            headers?: Record<string, string>;
        },
    ) {
        super(detail);
        this.name = "ApiError";
        this.status = status;
        this.errors = options?.errors;
        this.headers = options?.headers;
    }

    static badRequest(detail = "Некорректный запрос", errors?: Record<string, string[]>) {
        return new ApiError(400, detail, { errors });
    }

    static unauthorized(detail = "Требуется аутентификация") {
        return new ApiError(401, detail);
    }

    static forbidden(detail = "Недостаточно прав") {
        return new ApiError(403, detail);
    }

    static notFound(detail = "Объект не найден") {
        return new ApiError(404, detail);
    }

    static conflict(detail = "Конфликт данных") {
        return new ApiError(409, detail);
    }

    static tooManyRequests(detail: string, retryAfterSeconds: number) {
        return new ApiError(429, detail, {
            headers: { "Retry-After": String(retryAfterSeconds) },
        });
    }
}
