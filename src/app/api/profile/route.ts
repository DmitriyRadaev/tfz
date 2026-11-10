import { requireUser } from "@/server/auth/guards";
import { verifyPassword } from "@/server/auth/password";
import { createSession, revokeUserSessions } from "@/server/auth/session";
import { ApiError } from "@/server/http/api-error";
import { json, parseBody, withApi } from "@/server/http/handler";
import {
    findAccountByEmail,
    findAccountById,
    normalizeEmail,
    updateAccountProfile,
} from "@/server/services/accounts";
import { toAccountDto } from "@/server/services/presenters";
import { updateProfileSchema } from "@/server/validation/schemas";

/** GET /api/profile — перенос `current_user_view`. */
export const GET = withApi(async () => {
    const user = await requireUser();
    return json(toAccountDto(user));
});

/**
 * PATCH /api/profile — редактирование собственных данных.
 *
 * ФИО меняется свободно, а email и пароль — только с подтверждением текущим
 * паролем. После смены любого из них все прочие сессии гасятся: если учётную
 * запись увели, смена пароля должна выбрасывать злоумышленника немедленно.
 * Текущему устройству тут же выдаётся новая пара токенов, чтобы пользователя
 * не выкинуло из системы за его же действие.
 */
export const PATCH = withApi(async (request) => {
    const user = await requireUser();
    const input = await parseBody(request, updateProfileSchema);

    const wantsEmailChange =
        input.email !== undefined && normalizeEmail(input.email) !== user.email;
    const wantsPasswordChange = input.new_password !== undefined;

    if (wantsEmailChange || wantsPasswordChange) {
        const matches = await verifyPassword(
            input.current_password ?? "",
            user.passwordHash,
        );
        if (!matches) {
            throw ApiError.badRequest("Текущий пароль указан неверно", {
                current_password: ["Текущий пароль указан неверно"],
            });
        }
    }

    if (wantsEmailChange) {
        const occupied = await findAccountByEmail(input.email!);
        if (occupied && occupied.id !== user.id) {
            throw ApiError.conflict("Этот email уже занят другим пользователем");
        }
    }

    await updateAccountProfile(user.id, {
        name: input.name,
        surname: input.surname,
        patronymic: input.patronymic,
        email: wantsEmailChange ? input.email : undefined,
        password: wantsPasswordChange ? input.new_password : undefined,
    });

    if (wantsEmailChange || wantsPasswordChange) {
        await revokeUserSessions(user.id);

        // Поколение сессий изменилось — перечитываем аккаунт, иначе новый
        // токен был бы выписан на устаревшую версию и сразу отклонён.
        const refreshed = await findAccountById(user.id);
        if (!refreshed) {
            throw ApiError.notFound("Пользователь не найден");
        }

        await createSession({
            id: refreshed.id,
            email: refreshed.email,
            role: refreshed.role,
            sessionVersion: refreshed.sessionVersion,
        });

        return json(toAccountDto(refreshed));
    }

    // `getCurrentUser` закэширован на время запроса, поэтому читаем напрямую.
    const updated = await findAccountById(user.id);
    if (!updated) {
        throw ApiError.notFound("Пользователь не найден");
    }

    return json(toAccountDto(updated));
});
