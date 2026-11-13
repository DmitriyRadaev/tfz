import { ROUTES } from "@/shared/constants/routes";
import { APP_BASE_PATH } from "@/shared/lib/app-path";

/** Возвращает внутренний URL для Next router, включая старые ссылки с префиксом. */
export function postLoginPath(requested: string | null, isAdmin: boolean): string {
    const fallback = isAdmin ? ROUTES.ADMIN_HOME : ROUTES.HOME;
    if (!requested?.startsWith("/") || requested.startsWith("//") ||
        /[\\\u0000-\u0020\u007f]/.test(requested)) return fallback;

    try {
        const pathname = requested.split(/[?#]/, 1)[0];
        const decoded = decodeURIComponent(pathname);
        // Не допускаем неоднозначные пути, которые браузер/прокси нормализует иначе.
        if (/[\\%\u0000-\u0020\u007f]/.test(decoded) || /%(?:2f|5c)/i.test(pathname) || decoded.startsWith("//") ||
            decoded.split("/").some((part) => part === "." || part === "..")) return fallback;

        const url = new URL(requested, "https://tfz.invalid");
        if (url.origin !== "https://tfz.invalid") return fallback;
        let path = url.pathname;
        if (path === APP_BASE_PATH) path = "/";
        else if (path.startsWith(`${APP_BASE_PATH}/`)) path = path.slice(APP_BASE_PATH.length);
        if (path.startsWith("//") || path.startsWith(`${APP_BASE_PATH}/`)) return fallback;
        if (path === ROUTES.SIGN_IN || path === ROUTES.SIGN_UP ||
            path.startsWith(`${ROUTES.SIGN_IN}/`) || path.startsWith(`${ROUTES.SIGN_UP}/`)) return fallback;
        if (!isAdmin && (path === ROUTES.ADMIN_HOME || path.startsWith(`${ROUTES.ADMIN_HOME}/`))) return fallback;
        return `${path}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}
