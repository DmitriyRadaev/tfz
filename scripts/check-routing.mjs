import assert from "node:assert/strict";

// Проверяет готовую сборку локально, через :8084 или через основной Nginx.
// Не создаёт аккаунты и не изменяет данные в БД.
const origin = process.env.TFZ_ORIGIN || "http://localhost:3005";
const prefix = "/calculate-tfz";
const request = (path, options) => fetch(`${origin}${prefix}${path}`, { redirect: "manual", ...options });

for (const path of ["/", "/admin-home?tab=users"]) {
    const response = await request(path);
    assert.equal(response.status, 307, path);
    const location = new URL(response.headers.get("location"), origin);
    assert.equal(location.origin, new URL(origin).origin, path);
    assert.equal(location.pathname, `${prefix}/sign-in`);
    assert.equal(location.searchParams.get("redirect"), path);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    console.log("OK protected", path, "->", location.pathname);
}

const withoutSlash = await fetch(`${origin}${prefix}`, { redirect: "manual" });
assert.ok([307, 308].includes(withoutSlash.status));
const nextLocation = new URL(withoutSlash.headers.get("location"), origin);
assert.equal(nextLocation.origin, new URL(origin).origin);
assert.ok([`${prefix}/`, `${prefix}/sign-in`].includes(nextLocation.pathname));

const assets = new Set();
for (const path of ["/sign-in", "/sign-up"]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    for (const match of (response.headers.get("link") || "").matchAll(/<([^>]+)>/g)) {
        if (match[1].startsWith(`${prefix}/_next/`)) assets.add(match[1]);
    }
    const html = await response.text();
    for (const match of html.matchAll(/(?:src|href)="(\/[^"<>]+)"/g)) {
        const url = match[1].replaceAll("&amp;", "&");
        assert.ok(url.startsWith(`${prefix}/`), `Unprefixed HTML URL: ${url}`);
        if (/\/_next\/|\.(?:png|jpg|ico|webmanifest)(?:\?|$)/.test(url)) assets.add(url);
    }
    assert.ok(html.includes(`${prefix}/manifest.webmanifest`));
    console.log("OK page", path);
}
assert.ok([...assets].some((path) => path.includes(".css")), "No CSS found");
assert.ok([...assets].some((path) => path.includes(".js")), "No JS found");
for (const path of assets) {
    const response = await fetch(new URL(path, origin), { redirect: "manual" });
    assert.equal(response.status, 200, path);
    if (response.headers.get("content-type")?.includes("text/css")) {
        const css = await response.text();
        for (const match of css.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) {
            if (match[1].startsWith("data:")) continue;
            const asset = new URL(match[1], new URL(path, origin));
            assert.equal(asset.origin, new URL(origin).origin);
            assert.ok(asset.pathname.startsWith(`${prefix}/`), asset.href);
            assets.add(`${asset.pathname}${asset.search}`);
        }
    } else {
        await response.arrayBuffer();
    }
}
assert.ok([...assets].some((path) => path.includes(".woff")), "No font found in CSS or preload links");
console.log(`OK ${assets.size} concrete HTML assets (CSS/JS/fonts/images/manifest)`);

const manifestResponse = await request("/manifest.webmanifest");
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.start_url, `${prefix}/`);
assert.equal(manifest.scope, `${prefix}/`);
for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith(`${prefix}/`));
    const response = await fetch(new URL(icon.src, origin), { redirect: "manual" });
    assert.equal(response.status, 200, icon.src);
    assert.ok(response.headers.get("content-type")?.startsWith(icon.type), icon.src);
}
console.log("OK manifest and all icons");

const schemaResponse = await request("/api/openapi");
assert.equal(schemaResponse.status, 401);
assert.equal((await request("/api/profile")).status, 401);

for (const [path, expected] of [["/api/auth/logout", 200], ["/api/auth/refresh", 401]]) {
    const response = await request(path, { method: "POST", headers: { Origin: origin } });
    assert.equal(response.status, expected, path);
    const cookies = response.headers.getSetCookie();
    for (const name of ["tfz_access", "tfz_refresh"]) {
        assert.ok(cookies.some((value) => value.startsWith(`${name}=`) && value.includes(`Path=${prefix}`) && value.includes("Max-Age=0")), `${path}: ${name}`);
    }
}
assert.equal((await request("/api/auth/logout", { method: "POST", headers: { Origin: "http://other.invalid" } })).status, 403);
console.log("OK TFZ API, logout, missing refresh token, cookie scope and Origin protection");
console.log(`Routing checks passed: ${origin}${prefix}/`);
