
/** Внутренние маршруты для Next Link/router, которые сами добавляют basePath. */
export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/sign-in",
    SIGN_UP: "/sign-up",
    ADMIN_HOME: "/admin-home",
    SCALE: "/scale",
    API_DOCS: "/api-docs",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
