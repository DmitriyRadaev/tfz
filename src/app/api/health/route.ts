import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { isRedisConfigured, redis } from "@/server/redis";
import { json } from "@/server/http/handler";

/**
 * GET /api/health — проверка связности с внешними сервисами.
 *
 * Полезно сразу после деплоя: показывает, доехали ли переменные окружения и
 * отвечают ли Postgres с Redis, не требуя логина.
 */
export async function GET() {
    const checks: Record<string, "ok" | "error" | "not-configured"> = {
        database: "error",
        redis: "error",
    };

    try {
        await db.execute(sql`select 1`);
        checks.database = "ok";
    } catch (error) {
        console.error("[health] Postgres недоступен:", error);
    }

    if (!isRedisConfigured()) {
        checks.redis = "not-configured";
    } else {
        try {
            await redis().set("health:ping", "1", { ex: 30 });
            checks.redis = "ok";
        } catch (error) {
            console.error("[health] Redis недоступен:", error);
        }
    }

    const healthy = Object.values(checks).every((value) => value !== "error");
    return json({ status: healthy ? "ok" : "degraded", checks }, healthy ? 200 : 503);
}
