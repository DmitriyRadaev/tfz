
import { NextResponse, type NextRequest } from "next/server";

import {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
} from "@/server/auth/cookies";

import {
    verifyAccessToken,
    verifyRefreshToken,
} from "@/server/auth/jwt";

import { ROUTES } from "@/shared/constants/routes";

const PREFIX = "/calculate-tfz";

const AUTH_ROUTES = [
    ROUTES.SIGN_IN,
    ROUTES.SIGN_UP,
];

const ADMIN_ROUTES = [
    ROUTES.ADMIN_HOME,
];

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

        if (claims) {
            return { role: claims.role };
        }
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

function isRoute(pathname: string, routes: readonly string[]): boolean {
    return routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

function externalUrl(path: string, request: NextRequest): URL {
    return new URL(`${PREFIX}${path}`, request.url);
}

export default async function middleware(request: NextRequest) {
    // Nginx removes /calculate-tfz before forwarding the request.
    // Therefore Next.js sees ordinary paths: /, /sign-in, /admin-home.
    const { pathname } = request.nextUrl;

    const isAuthRoute = isRoute(pathname, AUTH_ROUTES);
    const isAdminRoute = isRoute(pathname, ADMIN_ROUTES);

    const session = await readSession(request);

    // Unauthenticated visitor
    if (!session) {
        if (isAuthRoute) {
            return withSecurityHeaders(NextResponse.next());
        }

        const signInUrl = externalUrl(ROUTES.SIGN_IN, request);

        const redirectPath =
            pathname === "/"
                ? `${PREFIX}/`
                : `${PREFIX}${pathname}`;

        signInUrl.searchParams.set("redirect", redirectPath);

        return withSecurityHeaders(
            clearSessionCookies(NextResponse.redirect(signInUrl)),
        );
    }

    // Authenticated user visiting sign-in or sign-up
    if (isAuthRoute) {
        const target =
            session.role === "ADMIN" || session.role === "SUPERADMIN"
                ? ROUTES.ADMIN_HOME
                : ROUTES.HOME;

        return withSecurityHeaders(
            NextResponse.redirect(externalUrl(target, request)),
        );
    }

    // Only ADMIN and SUPERADMIN can access admin pages
    if (
        isAdminRoute &&
        session.role !== "ADMIN" &&
        session.role !== "SUPERADMIN"
    ) {
        return withSecurityHeaders(
            NextResponse.redirect(externalUrl(ROUTES.HOME, request)),
        );
    }

    return withSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|txt|xml|webmanifest|well-known)).*)",
    ],
};
