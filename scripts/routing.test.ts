import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import middleware, { config } from "../src/middleware";
import { APP_BASE_PATH } from "../src/shared/lib/app-path";
import { postLoginPath } from "../src/features/auth/model/post-login-path";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from "../src/server/auth/cookies";
import { signAccessToken, signRefreshToken } from "../src/server/auth/jwt";
import { assertSameOrigin } from "../src/server/http/origin";
import { buildOpenApiDocument } from "../src/server/openapi/document";

process.env.JWT_SECRET = "routing-test-secret-not-for-production-12345";

function request(path: string, cookie?: string) {
    return new NextRequest(`http://tfz_app:3005${APP_BASE_PATH}${path}`, {
        nextConfig: { basePath: APP_BASE_PATH },
        headers: {
            host: "172.26.4.9:8084",
            "x-forwarded-host": "172.26.4.9:8084",
            "x-forwarded-proto": "http",
            ...(cookie ? { cookie } : {}),
        },
    });
}

test("anonymous redirect preserves basePath, public port, query and scoped cookie removal", async () => {
    assert.equal(new URL((await middleware(request("/"))).headers.get("location")!).pathname, `${APP_BASE_PATH}/sign-in`);
    const response = await middleware(request("/admin-home?tab=users"));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location")!);
    assert.equal(location.origin, "http://172.26.4.9:8084");
    assert.equal(location.pathname, `${APP_BASE_PATH}/sign-in`);
    assert.equal(location.searchParams.get("redirect"), "/admin-home?tab=users");
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
        assert.equal(response.cookies.get(name)?.path, APP_BASE_PATH);
        assert.equal(response.cookies.get(name)?.maxAge, 0);
    }
    assert.equal(response.headers.get("x-frame-options"), "DENY");
});

test("login and registration stay public; APIs/assets bypass page authentication", async () => {
    for (const path of ["/sign-in", "/sign-up"]) {
        assert.equal((await middleware(request(path))).headers.get("x-middleware-next"), "1");
    }
    for (const path of ["/api", "/api/profile", "/api/auth/refresh", "/_next/static/a.js", "/_next/image", "/manifest.webmanifest", "/apple-icon.png"]) {
        assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath: APP_BASE_PATH }, url: `${APP_BASE_PATH}${path}` }), false, path);
    }
    for (const path of ["", "/", "/admin-home", "/api-docs"]) {
        assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath: APP_BASE_PATH }, url: `${APP_BASE_PATH}${path}` }), true, path);
    }
});

test("role checks and redirects remain inside TFZ", async () => {
    for (const role of ["WORKER", "ADMIN", "SUPERADMIN"] as const) {
        const token = await signAccessToken({ userId: 1, email: "test@example.com", role, sessionVersion: 0 });
        const cookie = `${ACCESS_COOKIE}=${token}`;
        const login = await middleware(request("/sign-in", cookie));
        const isAdmin = role !== "WORKER";
        assert.equal(new URL(login.headers.get("location")!).pathname, `${APP_BASE_PATH}${isAdmin ? "/admin-home" : "/"}`);
        const admin = await middleware(request("/admin-home", cookie));
        if (isAdmin) assert.equal(admin.headers.get("x-middleware-next"), "1");
        else assert.equal(new URL(admin.headers.get("location")!).pathname, `${APP_BASE_PATH}/`);
    }
    const refresh = await signRefreshToken({ userId: 1, jti: "routing-test" });
    assert.equal((await middleware(request("/", `${REFRESH_COOKIE}=${refresh}`))).headers.get("x-middleware-next"), "1");
});

test("post-login redirects reject external, ambiguous and forbidden targets", () => {
    for (const path of [null, "https://example.com", "//example.com", "/\\example.com", "/%5cexample.com", "/%2fexample.com", `${APP_BASE_PATH}/%2fexample.com`, "/%0a/example.com", "/%252fexample.com", "/../admin-home", `${APP_BASE_PATH}/../admin-home`, "/sign-in", "/admin-home", "/admin-home/users", "/%ZZ", "/\n/example.com"]) {
        assert.equal(postLoginPath(path, false), "/", String(path));
    }
    assert.equal(postLoginPath(`${APP_BASE_PATH}/scale?mode=1#rules`, false), "/scale?mode=1#rules");
    assert.equal(postLoginPath("/scale", false), "/scale");
    assert.equal(postLoginPath(`${APP_BASE_PATH}/admin-home`, true), "/admin-home");
    assert.equal(postLoginPath(null, true), "/admin-home");
});

test("HTTP cookie settings and same-origin checks preserve public :8084", () => {
    assert.equal(buildOpenApiDocument().servers[0].url, `${APP_BASE_PATH}/api`);
    const previous = process.env.COOKIE_SECURE;
    try {
        process.env.COOKIE_SECURE = "false";
        assert.equal(cookieOptions().secure, false);
        assert.equal(cookieOptions().path, APP_BASE_PATH);
        process.env.COOKIE_SECURE = "true";
        assert.equal(cookieOptions().secure, true);
    } finally {
        if (previous === undefined) delete process.env.COOKIE_SECURE;
        else process.env.COOKIE_SECURE = previous;
    }
    const headers = { origin: "http://172.26.4.9:8084", "x-forwarded-host": "172.26.4.9:8084" };
    assert.doesNotThrow(() => assertSameOrigin(new Request("http://tfz_app:3005", { method: "POST", headers })));
    assert.throws(() => assertSameOrigin(new Request("http://tfz_app:3005", { method: "POST", headers: { ...headers, origin: "http://other.example" } })));
});
