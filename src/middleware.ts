import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/auth/cookies";
import { verifyAccessToken, verifyRefreshToken } from "@/server/auth/jwt";
import { ROUTES } from "@/shared/constants/routes";

/**
 * Проверка доступа к страницам на границе приложения.
 */

const AUTH_ROUTES = [ROUTES.SIGN_IN, ROUTES.SIGN_UP];
const ADMIN_ROUTES = [ROUTES.ADMIN_HOME];

const SECURITY_HEADERS: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-DNS-Prefetch-Control": "off",
    // Приложение не использует эти API — отключаем их явно.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

type Session = { role: string } | null;

async function readSession(request: NextRequest): Promise<Session> {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

    if (accessToken) {
        const claims = await verifyAccessToken(accessToken);
        if (claims) return { role: claims.role };
    }

    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken && (await verifyRefreshToken(refreshToken))) {
        return { role: "UNKNOWN" };
    }

    return null;
}

function withSecurityHeaders(response: NextResponse): NextResponse {
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(header, value);
    }
    return response;
}

function clearSessionCookies(response: NextResponse): NextResponse {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

    const session = await readSession(request);

   // --- Неаутентифицированный посетитель ---
    if (!session) {
        if (isAuthRoute) {
            return withSecurityHeaders(NextResponse.next());
        }

        // Явно добавляем префикс /calculate-tfz к странице входа
        const signInUrl = new URL(`/calculate-tfz${ROUTES.SIGN_IN}`, request.url);
        signInUrl.searchParams.set("redirect", pathname);

        return withSecurityHeaders(
            clearSessionCookies(NextResponse.redirect(signInUrl)),
        );
    }

    // --- Аутентифицированный пользователь ---

    if (isAuthRoute) {
        const rawTarget =
            session.role === "ADMIN" || session.role === "SUPERADMIN"
                ? ROUTES.ADMIN_HOME
                : ROUTES.HOME;

        const target = `/calculate-tfz${rawTarget}` as string;
        return withSecurityHeaders(
            NextResponse.redirect(new URL(target, request.url)),
        );
    }

    if (isAdminRoute && session.role !== "ADMIN" && session.role !== "SUPERADMIN") {
        const homeTarget = `/calculate-tfz${ROUTES.HOME}` as string;
        return withSecurityHeaders(
            NextResponse.redirect(new URL(homeTarget, request.url)),
        );
    }

    // Админский раздел — только для ADMIN и SUPERADMIN.
    if (isAdminRoute && session.role !== "ADMIN" && session.role !== "SUPERADMIN") {
        return withSecurityHeaders(
            NextResponse.redirect(new URL(ROUTES.HOME, request.url)),
        );
    }

    return withSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        /*
         * Пропускаем мимо middleware:
         *  - /api/*  — доступ там проверяют сами route handlers.
         *  - _next/* — статика и чанки Next.js;
         *  - файлы с расширениями (картинки, манифесты и т. п.).
         */
        "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|txt|xml|webmanifest|well-known)).*)",
    ],
};