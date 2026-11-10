import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import type { Account, AccountRole } from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import { findAccountById } from "@/server/services/accounts";
import { ACCESS_COOKIE } from "./cookies";
import { verifyAccessToken } from "./jwt";

/**
 * Проверка прав доступа — замена `CustomAuthentication` и классов из
 * `permissions.py`.
 *
 * Подпись токена проверяется без обращения к БД, но сам аккаунт всё равно
 * подгружается: роль могли понизить, а пользователя — деактивировать уже после
 * выдачи токена. `cache()` из React гарантирует, что в рамках одного запроса
 * обращение к БД произойдёт один раз, сколько бы guard'ов ни вызвали.
 */

export const getCurrentUser = cache(async (): Promise<Account | null> => {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (!token) return null;

    const claims = await verifyAccessToken(token);
    if (!claims) return null;

    const userId = Number(claims.sub);
    if (!Number.isInteger(userId)) return null;

    const account = await findAccountById(userId);
    if (!account || !account.isActive) return null;

    // Токен прошлого поколения недействителен: сессии были принудительно
    // отозваны (например, при обнаружении повторного использования
    // refresh-токена).
    if (claims.sv !== account.sessionVersion) return null;

    return account;
});

/** Аналог `permissions.IsAuthenticated`. */
export async function requireUser(): Promise<Account> {
    const user = await getCurrentUser();
    if (!user) {
        throw ApiError.unauthorized("Учётные данные не предоставлены.");
    }
    return user;
}

/** Аналог `IsAdminOrSuperAdmin` / `IsSuperAdmin` — в зависимости от аргументов. */
export async function requireRole(
    ...allowedRoles: AccountRole[]
): Promise<Account> {
    const user = await requireUser();
    if (!allowedRoles.includes(user.role)) {
        throw ApiError.forbidden(
            "У вас недостаточно прав для выполнения этого действия.",
        );
    }
    return user;
}

export const requireSuperAdmin = () => requireRole("SUPERADMIN");
export const requireAdmin = () => requireRole("ADMIN", "SUPERADMIN");
