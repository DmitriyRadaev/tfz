import { requireAdmin } from "@/server/auth/guards";
import { revokeUserSessions } from "@/server/auth/session";
import { ApiError } from "@/server/http/api-error";
import {
    json,
    parseBody,
    parseId,
    withApi,
    type RouteContext,
} from "@/server/http/handler";
import { findAccountById, setAccountActive } from "@/server/services/accounts";
import { toAccountDto } from "@/server/services/presenters";
import { accountActivationSchema } from "@/server/validation/schemas";

type Context = RouteContext<{ id: string }>;

/**
 * PATCH /api/accounts/{id} — включение и отключение учётной записи.
 *
 * Нужен для модерации самостоятельных регистраций: врач заводит себя сам,
 * но до подтверждения администратором его аккаунт неактивен и данных
 * пациентов не видит.
 */
export const PATCH = withApi<{ id: string }>(async (request, context: Context) => {
    const actor = await requireAdmin();

    const id = parseId((await context.params).id, "Идентификатор пользователя");
    const { is_active: isActive } = await parseBody(
        request,
        accountActivationSchema,
    );

    const target = await findAccountById(id);
    if (!target) {
        throw ApiError.notFound("Пользователь не найден");
    }

    // Отключить себя — верный способ потерять доступ к админке, если
    // других администраторов нет.
    if (target.id === actor.id) {
        throw ApiError.badRequest(
            "Нельзя изменить статус собственной учётной записи",
        );
    }

    // Администратор распоряжается только рядовыми сотрудниками: иначе он мог бы
    // отключить главного администратора и остаться единственным владельцем системы.
    if (actor.role !== "SUPERADMIN" && target.role !== "WORKER") {
        throw ApiError.forbidden(
            "Изменять статус администраторов может только главный администратор",
        );
    }

    const updated = await setAccountActive(id, isActive);

    // При отключении гасим активные сессии — иначе выданный токен продолжал бы
    // работать до истечения срока, и блокировка не сработала бы сразу.
    if (!isActive) {
        await revokeUserSessions(id);
    }

    return json(toAccountDto(updated));
});
