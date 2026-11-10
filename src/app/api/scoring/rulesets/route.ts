import { requireSuperAdmin, requireUser } from "@/server/auth/guards";
import { json, parseBody, withApi } from "@/server/http/handler";
import { listRulesets, publishRuleset } from "@/server/services/scoring";
import { publishRulesetSchema } from "@/server/validation/ruleset-schema";
import type { Ruleset } from "@/server/scoring/ruleset";

/** GET /api/scoring/rulesets — история версий шкалы. */
export const GET = withApi(async () => {
    await requireUser();

    const rulesets = await listRulesets();
    return json(
        rulesets.map((item) => ({
            version: item.version,
            comment: item.comment,
            is_active: item.isActive,
            created_at: item.createdAt.toISOString(),
        })),
    );
});

/**
 * POST /api/scoring/rulesets — публикация новой версии шкалы.
 *
 * Изменение порогов влияет на все последующие клинические решения, поэтому
 * право оставлено только главному администратору. Прежние версии остаются
 * в базе: к ним привязаны уже выполненные расчёты.
 */
export const POST = withApi(async (request) => {
    const actor = await requireSuperAdmin();

    const input = await parseBody(request, publishRulesetSchema);

    const created = await publishRuleset({
        config: input.config as Ruleset,
        comment: input.comment,
        authorId: actor.id,
    });

    return json(
        {
            version: created.version,
            comment: created.comment,
            created_at: created.createdAt.toISOString(),
            config: created.config,
        },
        201,
    );
});
