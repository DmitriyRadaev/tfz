import { z } from "zod";

/**
 * Чтение и валидация серверного окружения.
 *
 * Схемы разделены на две: `authEnv()` нужен только для подписи JWT, `env()` —
 * для всего остального (БД, Redis, лимиты). Разделение не косметическое:
 * `authEnv()` вызывается из middleware, которое работает в Edge Runtime и не
 * должно падать из-за отсутствия, например, DATABASE_URL.
 *
 * Модуль намеренно не помечен `server-only` — этот маркер не поддерживается в
 * Edge Runtime. От попадания в клиентский бандл защищают модули уровнем выше:
 * `db`, `auth/session`, `auth/guards`, `auth/password`, `services/*`.
 *
 * Поддерживаются и «родные» имена переменных Upstash/Neon, и те, которые
 * проставляют интеграции Vercel Marketplace (префиксы `KV_`, `POSTGRES_`).
 */

/* ------------------------------------------------------------------ *
 * Окружение аутентификации (доступно и в Edge Runtime)
 * ------------------------------------------------------------------ */

const authEnvSchema = z.object({
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET должен быть не короче 32 символов"),
    ACCESS_TOKEN_TTL: z.string().default("15m"),
    REFRESH_TOKEN_TTL: z.string().default("7d"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

/* ------------------------------------------------------------------ *
 * Полное окружение (Node runtime)
 * ------------------------------------------------------------------ */

const envSchema = authEnvSchema.extend({
    DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL обязателен (строка подключения к Postgres / Neon)"),

    REDIS_URL: z.url().optional(),
    REDIS_TOKEN: z.string().min(1).optional(),

    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
    LOGIN_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;

/* ------------------------------------------------------------------ *
 * Разбор
 * ------------------------------------------------------------------ */

function describeIssues(error: z.ZodError): string {
    return error.issues
        .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n");
}

/**
 * `process.env` читается по явным именам, а не перебором: в Edge Runtime и при
 * статической замене переменных Next.js объект не поддерживает перечисление.
 */
const rawAuth = () => ({
    JWT_SECRET: process.env.JWT_SECRET,
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL,
});

const rawFull = () => ({
    ...rawAuth(),
    DATABASE_URL: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
    REDIS_URL: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    REDIS_TOKEN:
        process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
    LOGIN_RATE_LIMIT: process.env.LOGIN_RATE_LIMIT,
    LOGIN_RATE_WINDOW_SECONDS: process.env.LOGIN_RATE_WINDOW_SECONDS,
});

let cachedAuthEnv: AuthEnv | undefined;
let cachedEnv: Env | undefined;

/** Минимальный набор для подписи и проверки токенов. */
export function authEnv(): AuthEnv {
    if (cachedAuthEnv) return cachedAuthEnv;

    const parsed = authEnvSchema.safeParse(rawAuth());
    if (!parsed.success) {
        throw new Error(
            `Некорректное окружение аутентификации:\n${describeIssues(parsed.error)}`,
        );
    }

    return (cachedAuthEnv = parsed.data);
}

/** Полное окружение. Читается лениво — `next build` не требует наличия БД. */
export function env(): Env {
    if (cachedEnv) return cachedEnv;

    const parsed = envSchema.safeParse(rawFull());
    if (!parsed.success) {
        throw new Error(`Некорректное окружение:\n${describeIssues(parsed.error)}`);
    }

    return (cachedEnv = parsed.data);
}

export const isProduction = () => process.env.NODE_ENV === "production";
