import { requireUser } from "@/server/auth/guards";
import {
    json,
    parseBody,
    parseId,
    withApi,
    type RouteContext,
} from "@/server/http/handler";
import {
    buildBreakdown,
    createCalculation,
} from "@/server/services/calculations";
import { getPatientOrFail } from "@/server/services/patients";
import { toCalculationDto } from "@/server/services/presenters";
import { calculateRequestSchema } from "@/server/validation/schemas";

type Context = RouteContext<{ id: string }>;

/**
 * POST /api/patients/{id}/calculate — перенос `calculate_view`.
 *
 * Возраст и пол берутся из карточки пациента, результат сохраняется в историю,
 * текущий пользователь записывается врачом. В ответ уходит полный DTO расчёта
 * (в Django возвращался урезанный объект без части полей).
 */
export const POST = withApi<{ id: string }>(async (request, context: Context) => {
    const user = await requireUser();

    const patientId = parseId((await context.params).id, "Идентификатор пациента");
    const patient = await getPatientOrFail(patientId);

    const input = await parseBody(request, calculateRequestSchema);

    const { record } = await createCalculation({
        patient,
        doctorId: user.id,
        input,
    });

    return json(
        toCalculationDto(record, patient, user, await buildBreakdown(record)),
        201,
    );
});
