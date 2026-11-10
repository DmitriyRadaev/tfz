import { requireUser } from "@/server/auth/guards";
import {
    json,
    noContent,
    parseBody,
    parseId,
    withApi,
    type RouteContext,
} from "@/server/http/handler";
import {
    deletePatient,
    getPatientOrFail,
    updatePatient,
} from "@/server/services/patients";
import { toPatientDto } from "@/server/services/presenters";
import { updatePatientSchema } from "@/server/validation/schemas";

type Context = RouteContext<{ id: string }>;

/** GET /api/patients/{id} — перенос `PatientDetailView.get`. */
export const GET = withApi<{ id: string }>(async (_request, context: Context) => {
    await requireUser();

    const id = parseId((await context.params).id, "Идентификатор пациента");
    const patient = await getPatientOrFail(id);

    return json(toPatientDto(patient));
});

/** PATCH /api/patients/{id} — перенос `PatientDetailView.patch`. */
export const PATCH = withApi<{ id: string }>(async (request, context: Context) => {
    await requireUser();

    const id = parseId((await context.params).id, "Идентификатор пациента");
    const input = await parseBody(request, updatePatientSchema);
    const patient = await updatePatient(id, input);

    return json(toPatientDto(patient));
});

/**
 * DELETE /api/patients/{id} — перенос `PatientDetailView.delete`.
 *
 * Права оставлены как в исходном проекте: удалять может любой аутентифицированный
 * пользователь. Учтите, что удаление каскадом уносит всю историю расчётов
 * пациента — если это нежелательно, замените `requireUser` на `requireAdmin`.
 */
export const DELETE = withApi<{ id: string }>(
    async (_request, context: Context) => {
        await requireUser();

        const id = parseId((await context.params).id, "Идентификатор пациента");
        await deletePatient(id);

        return noContent();
    },
);
