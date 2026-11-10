import { requireUser } from "@/server/auth/guards";
import { json, withApi } from "@/server/http/handler";
import { getActiveRuleset } from "@/server/services/scoring";

/**
 * GET /api/scoring — действующая шкала расчёта.
 *
 * Доступна любому аутентифицированному пользователю: врач должен видеть, по
 * каким правилам считается показатель, которым он пользуется.
 */
export const GET = withApi(async () => {
    await requireUser();

    const active = await getActiveRuleset();
    return json({
        version: active.version,
        comment: active.comment,
        created_at: active.createdAt.toISOString(),
        config: active.config,
    });
});
