/**
 * Создание первого главного администратора.
 *
 * Заменяет `manage.py createsuperuser`. Запуск: `npm run db:seed`.
 * Скрипт идемпотентен — повторный вызов для существующего email ничего не меняет.
 */
import { createAccount, findAccountByEmail } from "@/server/services/accounts";

async function main() {
    const email = process.env.SEED_SUPERADMIN_EMAIL;
    const password = process.env.SEED_SUPERADMIN_PASSWORD;
    const name = process.env.SEED_SUPERADMIN_NAME ?? "Администратор";
    const surname = process.env.SEED_SUPERADMIN_SURNAME ?? "Системы";

    if (!email || !password) {
        console.error(
            "Задайте SEED_SUPERADMIN_EMAIL и SEED_SUPERADMIN_PASSWORD " +
                "(например, в .env.local) и повторите запуск.",
        );
        process.exit(1);
    }

    if (password.length < 6) {
        console.error("Пароль должен содержать не менее 6 символов.");
        process.exit(1);
    }

    const existing = await findAccountByEmail(email);
    if (existing) {
        console.log(
            `Аккаунт ${existing.email} уже существует (роль: ${existing.role}). ` +
                "Ничего не изменено.",
        );
        return;
    }

    const account = await createAccount({
        email,
        name,
        surname,
        password,
        role: "SUPERADMIN",
    });

    console.log(
        `Создан главный администратор: ${account.email} (id=${account.id}).`,
    );
}

main().catch((error) => {
    console.error("Не удалось выполнить seed:", error);
    process.exit(1);
});
