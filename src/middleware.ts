
import { NextResponse, type NextRequest } from "next/server";

import {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    expiredCookieOptions,
} from "@/server/auth/cookies";

import {
    verifyAccessToken,
    verifyRefreshToken,
} from "@/server/auth/jwt";

import { ROUTES } from "@/shared/constants/routes";

const AUTH_ROUTES = [ROUTES.SIGN_IN, ROUTES.SIGN_UP];
const ADMIN_ROUTES = [ROUTES.ADMIN_HOME];

const SECURITY_HEADERS: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-DNS-Prefetch-Control": "off",
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
    response.cookies.set(ACCESS_COOKIE, "", expiredCookieOptions());
    response.cookies.set(REFRESH_COOKIE, "", expiredCookieOptions());
    return response;
}

function isRoute(pathname: string, routes: readonly string[]): boolean {
    return routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

function redirectUrl(path: string, request: NextRequest) {
    // clone сохраняет basePath Next.js, в отличие от new URL('/...', request.url).
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const target = new URL(url.toString());
    // NextURL наследует завершающий слеш исходного запроса. Фиксируем целевой путь.
    target.pathname = `${url.basePath}${path}`;
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto");
    if (host) target.host = host;
    if (protocol === "http" || protocol === "https") target.protocol = `${protocol}:`;
    return target;
}

export default async function middleware(request: NextRequest) {
    // nextUrl.pathname уже не содержит basePath.
    const pathname = request.nextUrl.pathname;

    const isAuthRoute = isRoute(pathname, AUTH_ROUTES);
    const isAdminRoute = isRoute(pathname, ADMIN_ROUTES);

    const session = await readSession(request);

    // Неавторизованный пользователь.
    if (!session) {
        if (isAuthRoute) {
            return withSecurityHeaders(NextResponse.next());
        }

        const signInUrl = redirectUrl(ROUTES.SIGN_IN, request);

        // Передаём внутренний путь без внешнего префикса.
        signInUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);

        return withSecurityHeaders(
            clearSessionCookies(NextResponse.redirect(signInUrl)),
        );
    }

    // Авторизованный пользователь на странице входа или регистрации.
    if (isAuthRoute) {
        const target =
            session.role === "ADMIN" || session.role === "SUPERADMIN"
                ? ROUTES.ADMIN_HOME
                : ROUTES.HOME;

        return withSecurityHeaders(
            NextResponse.redirect(redirectUrl(target, request)),
        );
    }

    // Доступ к административному разделу.
    if (
        isAdminRoute &&
        session.role !== "ADMIN" &&
        session.role !== "SUPERADMIN"
    ) {
        return withSecurityHeaders(
            NextResponse.redirect(redirectUrl(ROUTES.HOME, request)),
        );
    }

    return withSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        // Next сопоставляет корень basePath отдельно, в том числе без '/'.
        "/",
        "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|txt|xml|webmanifest)$).*)",
    ],
};
