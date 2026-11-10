import { Redis } from "@upstash/redis";

import { env } from "@/server/env";

/**
 * Минимальный контракт, который нужен приложению от Redis.
 *
 * Абстракция позволяет поднять проект локально без Upstash: если переменные
 * окружения не заданы, подставляется in-memory реализация. В продакшене
 * отсутствие Redis — ошибка конфигурации, и `redis()` сразу её выбрасывает.
 */
export interface RedisLike {
    get(key: string): Promise<string | null>;
    set(
        key: string,
        value: string,
        options?: { ex?: number },
    ): Promise<unknown>;
    del(...keys: string[]): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<unknown>;
    ttl(key: string): Promise<number>;
    sadd(key: string, ...members: string[]): Promise<number>;
    srem(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
}

/* ------------------------------------------------------------------ *
 * In-memory заглушка для локальной разработки
 * ------------------------------------------------------------------ */

type MemoryEntry = { value: string | Set<string>; expiresAt: number | null };

class MemoryRedis implements RedisLike {
    private store = new Map<string, MemoryEntry>();

    private read(key: string): MemoryEntry | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry;
    }

    private set_(key: string, value: string | Set<string>, ttlSeconds?: number) {
        this.store.set(key, {
            value,
            expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
        });
    }

    async get(key: string) {
        const entry = this.read(key);
        return typeof entry?.value === "string" ? entry.value : null;
    }

    async set(key: string, value: string, options?: { ex?: number }) {
        this.set_(key, value, options?.ex);
        return "OK";
    }

    async del(...keys: string[]) {
        let removed = 0;
        for (const key of keys) {
            if (this.store.delete(key)) removed += 1;
        }
        return removed;
    }

    async incr(key: string) {
        const entry = this.read(key);
        const next = Number(entry?.value ?? 0) + 1;
        this.store.set(key, {
            value: String(next),
            expiresAt: entry?.expiresAt ?? null,
        });
        return next;
    }

    async expire(key: string, seconds: number) {
        const entry = this.read(key);
        if (!entry) return 0;
        entry.expiresAt = Date.now() + seconds * 1000;
        return 1;
    }

    async ttl(key: string) {
        const entry = this.read(key);
        if (!entry) return -2;
        if (entry.expiresAt === null) return -1;
        return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
    }

    async sadd(key: string, ...members: string[]) {
        const entry = this.read(key);
        const set = entry?.value instanceof Set ? entry.value : new Set<string>();
        const before = set.size;
        members.forEach((member) => set.add(member));
        this.set_(key, set);
        if (entry?.expiresAt) {
            this.store.get(key)!.expiresAt = entry.expiresAt;
        }
        return set.size - before;
    }

    async srem(key: string, ...members: string[]) {
        const entry = this.read(key);
        if (!(entry?.value instanceof Set)) return 0;
        let removed = 0;
        members.forEach((member) => {
            if (entry.value instanceof Set && entry.value.delete(member)) removed += 1;
        });
        return removed;
    }

    async smembers(key: string) {
        const entry = this.read(key);
        return entry?.value instanceof Set ? [...entry.value] : [];
    }
}

/* ------------------------------------------------------------------ *
 * Публичный доступ
 * ------------------------------------------------------------------ */

const globalForRedis = globalThis as unknown as {
    __tfzRedis?: RedisLike;
    __tfzRedisWarned?: boolean;
};

export function isRedisConfigured(): boolean {
    const { REDIS_URL, REDIS_TOKEN } = env();
    return Boolean(REDIS_URL && REDIS_TOKEN);
}

export function redis(): RedisLike {
    if (globalForRedis.__tfzRedis) return globalForRedis.__tfzRedis;

    const { REDIS_URL, REDIS_TOKEN } = env();

    // Единая точка контроля: в продакшене in-memory заглушка недопустима —
    // сессии и счётчики попыток «разъехались» бы между инстансами функций.
    if (process.env.NODE_ENV === "production" && !(REDIS_URL && REDIS_TOKEN)) {
        throw new Error(
            "В продакшене обязательны UPSTASH_REDIS_REST_URL и " +
                "UPSTASH_REDIS_REST_TOKEN (или KV_REST_API_URL / KV_REST_API_TOKEN)",
        );
    }

    if (REDIS_URL && REDIS_TOKEN) {
        // `automaticDeserialization: false` — храним только строки, чтобы
        // поведение совпадало с in-memory реализацией.
        const client = new Redis({
            url: REDIS_URL,
            token: REDIS_TOKEN,
            automaticDeserialization: false,
        });
        globalForRedis.__tfzRedis = client as unknown as RedisLike;
    } else {
        if (!globalForRedis.__tfzRedisWarned) {
            globalForRedis.__tfzRedisWarned = true;
            console.warn(
                "[redis] UPSTASH_REDIS_REST_URL/TOKEN не заданы — используется in-memory " +
                    "хранилище. Оно не переживает перезапуск и не разделяется между " +
                    "инстансами, поэтому годится только для локальной разработки.",
            );
        }
        globalForRedis.__tfzRedis = new MemoryRedis();
    }

    return globalForRedis.__tfzRedis;
}

