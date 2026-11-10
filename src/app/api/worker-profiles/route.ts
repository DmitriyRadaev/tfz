import { requireAdmin } from "@/server/auth/guards";
import { json, withApi } from "@/server/http/handler";
import { listWorkerProfiles } from "@/server/services/accounts";
import { toWorkerProfileDto } from "@/server/services/presenters";

/**
 * GET /api/worker-profiles — перенос `WorkerProfileViewSet.list`.
 *
 * Как и в Django, доступ только для ADMIN/SUPERADMIN. Создание профиля
 * отдельным запросом не предусмотрено: он появляется вместе с аккаунтом
 * сотрудника при регистрации.
 */
export const GET = withApi(async () => {
    await requireAdmin();

    const rows = await listWorkerProfiles();
    return json(
        rows.map(({ profile, account }) => toWorkerProfileDto(profile, account)),
    );
});
