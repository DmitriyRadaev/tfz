import { redis } from "./index";

export interface RateLimitResult {
    /** Разрешён ли текущий запрос. */
    success: boolean;
    /** Сколько запросов осталось в текущем окне. */
    remaining: number;
    /** Через сколько секунд окно сбросится. */
    retryAfter: number;
}

/**
 * Ограничение частоты по алгоритму фиксированного окна.
 *
 * Повторяет поведение исходного Django-вида: счётчик в кэше с TTL. Fixed window
 * допускает всплеск на стыке окон (до 2×limit), но для защиты формы входа этого
 * достаточно, а стоит он один INCR вместо скрипта на сортированных множествах —
 * что важно на бесплатном тарифе Upstash с лимитом на число команд.
 */
export async function fixedWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
): Promise<RateLimitResult> {
    const client = redis();
    const namespacedKey = `ratelimit:${key}`;

    try {
        const hits = await client.incr(namespacedKey);

        // TTL ставим только на первом попадании, иначе окно будет продлеваться
        // каждым запросом и превратится в вечную блокировку.
        if (hits === 1) {
            await client.expire(namespacedKey, windowSeconds);
        }

        if (hits > limit) {
            const ttl = await client.ttl(namespacedKey);
            return {
                success: false,
                remaining: 0,
                retryAfter: ttl > 0 ? ttl : windowSeconds,
            };
        }

        return { success: true, remaining: limit - hits, retryAfter: 0 };
    } catch (error) {
        // Недоступность Redis не должна ронять вход в систему: логируем и
        // пропускаем запрос (fail-open). Для rate-limit это осознанный выбор —
        // отказ в обслуживании всем пользователям хуже, чем временно снятый лимит.
        console.error("[rate-limit] Redis недоступен, лимит не применён:", error);
        return { success: true, remaining: limit, retryAfter: 0 };
    }
}

/** Сброс счётчика — вызывается после успешного входа. */
export async function resetRateLimit(key: string): Promise<void> {
    try {
        await redis().del(`ratelimit:${key}`);
    } catch (error) {
        console.error("[rate-limit] не удалось сбросить счётчик:", error);
    }
}
