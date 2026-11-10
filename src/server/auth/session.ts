import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { accounts, type AccountRole } from "@/server/db/schema";
import { redis } from "@/server/redis";
import {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    cookieOptions,
    expiredCookieOptions,
} from "./cookies";
import {
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "./jwt";

/**
 * Управление сессией: короткоживущий access-токен + refresh-токен с ротацией.
 *
 * Refresh-токены хранятся в Redis по принципу allow-list: валиден только тот
 * `jti`, который лежит в хранилище. Это даёт мгновенный отзыв (logout реально
 * убивает сессию, а не ждёт истечения токена) — ровно то, что в Django делало
 * приложение `token_blacklist`, только без обращения к БД на каждый запрос.
 *
 * При каждом обновлении выдаётся новый `jti`, а старый удаляется. Если приходит
 * refresh-токен с корректной подписью, но отсутствующим `jti`, значит токен
 * используется повторно — скорее всего он был украден. В этом случае гасятся
 * все сессии пользователя (см. `detectReuse`).
 */

const refreshKey = (jti: string) => `refresh:${jti}`;
const userSessionsKey = (userId: number) => `sessions:${userId}`;

export interface SessionUser {
    id: number;
    email: string;
    role: AccountRole;
    sessionVersion: number;
}

export interface IssuedTokens {
    accessToken: string;
    refreshToken: string;
}

/* ------------------------------------------------------------------ *
 * Выдача
 * ------------------------------------------------------------------ */

async function issueTokens(user: SessionUser): Promise<IssuedTokens> {
    const jti = randomUUID();
    const ttl = refreshTokenTtlSeconds();

    const [accessToken, refreshToken] = await Promise.all([
        signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            sessionVersion: user.sessionVersion,
        }),
        signRefreshToken({ userId: user.id, jti }),
    ]);

    const client = redis();
    await client.set(refreshKey(jti), String(user.id), { ex: ttl });
    await client.sadd(userSessionsKey(user.id), jti);
    // TTL на множестве — страховка от бесконечного роста ключа, если
    // пользователь перестал заходить и его `jti` истекли сами.
    await client.expire(userSessionsKey(user.id), ttl);

    return { accessToken, refreshToken };
}

async function writeCookies(tokens: IssuedTokens): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(
        ACCESS_COOKIE,
        tokens.accessToken,
        cookieOptions(accessTokenTtlSeconds()),
    );
    cookieStore.set(
        REFRESH_COOKIE,
        tokens.refreshToken,
        cookieOptions(refreshTokenTtlSeconds()),
    );
}

/** Создаёт новую сессию и проставляет куки. Используется при входе. */
export async function createSession(user: SessionUser): Promise<IssuedTokens> {
    const tokens = await issueTokens(user);
    await writeCookies(tokens);
    return tokens;
}

/* ------------------------------------------------------------------ *
 * Ротация
 * ------------------------------------------------------------------ */

export class RefreshError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RefreshError";
    }
}

/** Повторное использование `jti` — признак компрометации: гасим все сессии. */
async function revokeAllSessions(userId: number): Promise<void> {
    const client = redis();
    const jtis = await client.smembers(userSessionsKey(userId));
    if (jtis.length > 0) {
        await client.del(...jtis.map(refreshKey));
    }
    await client.del(userSessionsKey(userId));

    // Смена поколения обесценивает и уже выданные access-токены: иначе
    // похищенный токен продолжал бы работать до истечения своего срока,
    // несмотря на отзыв сессий.
    await db
        .update(accounts)
        .set({
            sessionVersion: sql`${accounts.sessionVersion} + 1`,
            updatedAt: new Date(),
        })
        .where(eq(accounts.id, userId));
}

/**
 * Проверяет refresh-куку, аннулирует её и выдаёт новую пару токенов.
 * Возвращает пользователя из токена — вызывающая сторона обязана сверить его
 * с БД (аккаунт мог быть деактивирован) перед выдачей новой сессии.
 */
export async function consumeRefreshToken(): Promise<{ userId: number }> {
    const cookieStore = await cookies();
    const token = cookieStore.get(REFRESH_COOKIE)?.value;

    if (!token) {
        throw new RefreshError("Refresh-токен отсутствует");
    }

    const claims = await verifyRefreshToken(token);
    if (!claims) {
        throw new RefreshError("Refresh-токен недействителен или истёк");
    }

    const userId = Number(claims.sub);
    if (!Number.isInteger(userId)) {
        throw new RefreshError("Некорректный идентификатор в токене");
    }

    const client = redis();
    const stored = await client.get(refreshKey(claims.jti));

    if (stored === null) {
        await revokeAllSessions(userId);
        throw new RefreshError(
            "Refresh-токен уже был использован — все сессии отозваны",
        );
    }

    // Старый jti убираем до выдачи нового: токен одноразовый.
    await client.del(refreshKey(claims.jti));
    await client.srem(userSessionsKey(userId), claims.jti);

    return { userId };
}

/** Завершает ротацию: выдаёт новую пару и перезаписывает куки. */
export async function refreshSession(user: SessionUser): Promise<IssuedTokens> {
    return createSession(user);
}

/* ------------------------------------------------------------------ *
 * Завершение
 * ------------------------------------------------------------------ */

/** Снимает куки и удаляет refresh-токен из Redis. Идемпотентна. */
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get(REFRESH_COOKIE)?.value;

    if (token) {
        const claims = await verifyRefreshToken(token);
        if (claims) {
            const client = redis();
            await client.del(refreshKey(claims.jti));
            const userId = Number(claims.sub);
            if (Number.isInteger(userId)) {
                await client.srem(userSessionsKey(userId), claims.jti);
            }
        }
    }

    cookieStore.set(ACCESS_COOKIE, "", expiredCookieOptions());
    cookieStore.set(REFRESH_COOKIE, "", expiredCookieOptions());
}

/** Отзыв всех сессий пользователя — например, после смены роли или блокировки. */
export async function revokeUserSessions(userId: number): Promise<void> {
    await revokeAllSessions(userId);
}
