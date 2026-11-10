import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * Подключение к Postgres.
 *
 * Драйвер выбирается по строке подключения:
 *
 *  • Neon (`*.neon.tech`) — HTTP-драйвер. В serverless-среде Vercel каждый вызов
 *    функции живёт отдельно, и обычный TCP-пул быстро упирается в лимит
 *    коннектов Postgres. HTTP-драйвер соединений не держит вовсе: один запрос —
 *    один stateless вызов. Плата — отсутствие интерактивных транзакций
 *    (`db.transaction(cb)`); для набора запросов в один раундтрип есть
 *    `db.batch([...])`.
 *
 *  • Любой другой хост — обычный пул `pg`. Нужен для локальной разработки на
 *    собственном Postgres (например, из docker-compose) и для self-hosted
 *    развёртывания.
 *
 * Переменная `DB_DRIVER` (`neon` | `pg`) позволяет выбрать драйвер вручную.
 */

export type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

function usesNeonDriver(connectionString: string): boolean {
    const forced = process.env.DB_DRIVER?.toLowerCase();
    if (forced === "neon") return true;
    if (forced === "pg") return false;

    try {
        const { hostname } = new URL(connectionString);
        return hostname.endsWith(".neon.tech") || hostname.endsWith(".neon.build");
    } catch {
        return false;
    }
}

function createDb(): Database {
    const connectionString = env().DATABASE_URL;

    if (usesNeonDriver(connectionString)) {
        return drizzleNeon(neon(connectionString), {
            schema,
            casing: "snake_case",
        });
    }

    const pool = new Pool({
        connectionString,
        // Пул держим маленьким: в serverless каждый инстанс функции открывает
        // собственный, и большой размер быстро исчерпал бы max_connections.
        max: 5,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
    });

    // Структурно оба варианта предоставляют один и тот же query builder;
    // расходится только свойство `$client`, которое приложение не использует.
    return drizzleNodePg(pool, {
        schema,
        casing: "snake_case",
    }) as unknown as Database;
}

const globalForDb = globalThis as unknown as { __tfzDb?: Database };

function getDb(): Database {
    if (!globalForDb.__tfzDb) {
        globalForDb.__tfzDb = createDb();
    }
    return globalForDb.__tfzDb;
}

/**
 * Прокси нужен, чтобы соединение (и чтение env) создавались при первом
 * обращении, а не при импорте модуля: иначе `next build` падал бы на машинах
 * без DATABASE_URL.
 */
export const db = new Proxy({} as Database, {
    get(_target, property) {
        const instance = getDb();
        const value = Reflect.get(instance, property) as unknown;
        return typeof value === "function" ? value.bind(instance) : value;
    },
    has(_target, property) {
        return Reflect.has(getDb(), property);
    },
});

export { schema };
