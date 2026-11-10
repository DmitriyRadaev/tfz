import {
    consumeRefreshToken,
    destroySession,
    refreshSession,
    RefreshError,
} from "@/server/auth/session";
import { ApiError } from "@/server/http/api-error";
import { json, withApi } from "@/server/http/handler";
import { findAccountById } from "@/server/services/accounts";
import { toAccountDto } from "@/server/services/presenters";

/**
 * POST /api/auth/refresh — перенос `CookieTokenRefreshView`.
 *
 * Refresh-токен одноразовый: при обновлении старый `jti` удаляется и выдаётся
 * новый (rotation). Любая неудача завершается снятием кук, чтобы клиент не
 * застрял в цикле «обновить → снова 401».
 */
export const POST = withApi(async () => {
    try {
        const { userId } = await consumeRefreshToken();

        const account = await findAccountById(userId);
        if (!account || !account.isActive) {
            throw new RefreshError("Учётная запись недоступна");
        }

        await refreshSession({
            id: account.id,
            email: account.email,
            role: account.role,
            sessionVersion: account.sessionVersion,
        });

        return json({ user: toAccountDto(account) });
    } catch (error) {
        if (error instanceof RefreshError) {
            await destroySession();
            throw ApiError.unauthorized(error.message);
        }
        throw error;
    }
});
