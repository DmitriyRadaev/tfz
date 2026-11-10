import { requireAdmin } from "@/server/auth/guards";
import { ApiError } from "@/server/http/api-error";
import {
    json,
    noContent,
    parseBody,
    parseId,
    withApi,
    type RouteContext,
} from "@/server/http/handler";
import {
    deleteWorkerProfile,
    findWorkerProfileById,
    updateWorkerProfile,
} from "@/server/services/accounts";
import { toWorkerProfileDto } from "@/server/services/presenters";
import { workerProfileUpdateSchema } from "@/server/validation/schemas";

type Context = RouteContext<{ id: string }>;

/** GET /api/worker-profiles/{id} — перенос `WorkerProfileViewSet.retrieve`. */
export const GET = withApi<{ id: string }>(async (_request, context: Context) => {
    await requireAdmin();

    const id = parseId((await context.params).id, "Идентификатор профиля");
    const row = await findWorkerProfileById(id);
    if (!row) {
        throw ApiError.notFound("Профиль сотрудника не найден");
    }

    return json(toWorkerProfileDto(row.profile, row.account));
});

/** PATCH /api/worker-profiles/{id} — перенос `WorkerProfileViewSet.partial_update`. */
export const PATCH = withApi<{ id: string }>(async (request, context: Context) => {
    await requireAdmin();

    const id = parseId((await context.params).id, "Идентификатор профиля");
    const input = await parseBody(request, workerProfileUpdateSchema);
    const { profile, account } = await updateWorkerProfile(id, input);

    return json(toWorkerProfileDto(profile, account));
});

/** DELETE /api/worker-profiles/{id} — перенос `WorkerProfileViewSet.destroy`. */
export const DELETE = withApi<{ id: string }>(
    async (_request, context: Context) => {
        await requireAdmin();

        const id = parseId((await context.params).id, "Идентификатор профиля");
        await deleteWorkerProfile(id);

        return noContent();
    },
);
