/**
 * Имена и параметры аутентификационных кук.
 *
 * Файл сознательно не зависит ни от `node:*`, ни от окружения, чтобы его можно
 * было импортировать и из middleware (Edge Runtime), и из route handlers.
 */

export const ACCESS_COOKIE = "access";
export const REFRESH_COOKIE = "refresh";

export interface CookieOptions {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge?: number;
}

/**
 * `httpOnly` — токен недоступен из JS, поэтому XSS не уводит сессию.
 * `sameSite: "lax"` — браузер не отправит куку в межсайтовом POST-запросе; вместе
 * с проверкой заголовка Origin на мутациях это заменяет CSRF-токен Django.
 */
export function cookieOptions(maxAgeSeconds?: number): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds } : {}),
    };
}

/** Параметры для удаления куки: тот же path/sameSite плюс нулевой срок жизни. */
export function expiredCookieOptions(): CookieOptions {
    return cookieOptions(0);
}
