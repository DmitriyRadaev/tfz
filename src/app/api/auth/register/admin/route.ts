import { requireSuperAdmin } from "@/server/auth/guards";
import { json, parseBody, withApi } from "@/server/http/handler";
import { createAccount } from "@/server/services/accounts";
import { toAccountDto } from "@/server/services/presenters";
import { privilegedRegistrationSchema } from "@/server/validation/schemas";

/**
 * POST /api/auth/register/admin — перенос `AdminRegisterView`.
 * Создавать администраторов может только главный администратор.
 */
export const POST = withApi(async (request) => {
    await requireSuperAdmin();

    const input = await parseBody(request, privilegedRegistrationSchema);

    const account = await createAccount({
        email: input.email,
        name: input.name,
        surname: input.surname,
        patronymic: input.patronymic,
        password: input.password,
        role: "ADMIN",
    });

    return json(toAccountDto(account), 201);
});
