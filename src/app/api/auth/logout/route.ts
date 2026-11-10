import { destroySession } from "@/server/auth/session";
import { json, withApi } from "@/server/http/handler";

/**
 * POST /api/auth/logout — перенос `logoutView`.
 *
 * Операция идемпотентна и не требует валидного access-токена: истёкшая сессия
 * всё равно должна дать пользователю возможность «выйти» и снять куки.
 */
export const POST = withApi(async () => {
    await destroySession();
    return json({ detail: "Вы вышли из системы" });
});
