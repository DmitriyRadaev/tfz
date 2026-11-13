/** Next Link/router добавляют basePath сами; обычные URL требуют appPath(). */
export const APP_BASE_PATH = "/calculate-tfz";

export function appPath(path: string): string {
    return `${APP_BASE_PATH}${path}`;
}
