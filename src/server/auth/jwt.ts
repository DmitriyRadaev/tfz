// Импорт по подпутям, а не из корня пакета: корневой индекс тянет за собой
// шифрование JWE с CompressionStream, который Next.js помечает как
// неподдерживаемый в Edge Runtime. Приложению нужны только подпись и проверка.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { JWTPayload } from "jose";

import { authEnv } from "@/server/env";
import type { AccountRole } from "@/server/db/schema";

/**
 * Подпись и проверка JWT.
 *
 * Модуль намеренно не использует `node:crypto`: jose работает поверх WebCrypto,
 * поэтому те же функции доступны в Edge Runtime, где выполняется middleware.
 */

const ISSUER = "tfz";
const ACCESS_AUDIENCE = "tfz:access";
const REFRESH_AUDIENCE = "tfz:refresh";
const ALGORITHM = "HS256";

export interface AccessTokenClaims extends JWTPayload {
    sub: string;
    email: string;
    role: AccountRole;
    /** Поколение сессий — сверяется с аккаунтом, см. `auth/guards.ts`. */
    sv: number;
}

export interface RefreshTokenClaims extends JWTPayload {
    sub: string;
    jti: string;
}

function secretKey(): Uint8Array {
    return new TextEncoder().encode(authEnv().JWT_SECRET);
}

/** Переводит запись вида `15m` / `7d` / `3600` в секунды. */
export function parseDuration(input: string): number {
    const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(input.trim());
    if (!match) {
        throw new Error(
            `Некорректная длительность: "${input}". Ожидается, например, 15m, 2h, 7d.`,
        );
    }

    const amount = Number(match[1]);
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[
        (match[2] ?? "s").toLowerCase() as "s" | "m" | "h" | "d"
    ];

    return amount * multiplier;
}

export const accessTokenTtlSeconds = () =>
    parseDuration(authEnv().ACCESS_TOKEN_TTL);
export const refreshTokenTtlSeconds = () =>
    parseDuration(authEnv().REFRESH_TOKEN_TTL);

/* ------------------------------------------------------------------ *
 * Access-токен
 * ------------------------------------------------------------------ */

export async function signAccessToken(payload: {
    userId: number;
    email: string;
    role: AccountRole;
    sessionVersion: number;
}): Promise<string> {
    return new SignJWT({
        email: payload.email,
        role: payload.role,
        sv: payload.sessionVersion,
    })
        .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
        .setSubject(String(payload.userId))
        .setIssuer(ISSUER)
        .setAudience(ACCESS_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${accessTokenTtlSeconds()}s`)
        .sign(secretKey());
}

/** Возвращает `null` вместо исключения: невалидный токен — ожидаемый сценарий. */
export async function verifyAccessToken(
    token: string,
): Promise<AccessTokenClaims | null> {
    try {
        const { payload } = await jwtVerify<AccessTokenClaims>(token, secretKey(), {
            issuer: ISSUER,
            audience: ACCESS_AUDIENCE,
            algorithms: [ALGORITHM],
        });

        if (
            !payload.sub ||
            !payload.email ||
            !payload.role ||
            typeof payload.sv !== "number"
        ) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ *
 * Refresh-токен
 * ------------------------------------------------------------------ */

export async function signRefreshToken(payload: {
    userId: number;
    jti: string;
}): Promise<string> {
    return new SignJWT({})
        .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
        .setSubject(String(payload.userId))
        .setJti(payload.jti)
        .setIssuer(ISSUER)
        .setAudience(REFRESH_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${refreshTokenTtlSeconds()}s`)
        .sign(secretKey());
}

export async function verifyRefreshToken(
    token: string,
): Promise<RefreshTokenClaims | null> {
    try {
        const { payload } = await jwtVerify<RefreshTokenClaims>(token, secretKey(), {
            issuer: ISSUER,
            audience: REFRESH_AUDIENCE,
            algorithms: [ALGORITHM],
        });

        if (!payload.sub || !payload.jti) return null;
        return payload;
    } catch {
        return null;
    }
}
