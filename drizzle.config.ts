import { defineConfig } from "drizzle-kit";

/**
 * Конфигурация drizzle-kit (генерация и применение миграций).
 *
 * Команды: `npm run db:generate` → `npm run db:migrate`.
 *
 * Next.js подхватывает `.env.local` сам, а drizzle-kit — нет, поэтому файлы
 * окружения загружаются здесь вручную, в том же порядке приоритета:
 * значения из `.env.local` перекрывают `.env`.
 */
for (const file of [".env", ".env.local"]) {
    try {
        process.loadEnvFile(file);
    } catch {
        // Файла нет — это нормально: на CI и в Vercel переменные приходят извне.
    }
}

const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

export default defineConfig({
    schema: "./src/server/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    casing: "snake_case",
    dbCredentials: { url: connectionString },
    strict: true,
    verbose: true,
});
