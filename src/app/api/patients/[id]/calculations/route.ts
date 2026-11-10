import { requireUser } from "@/server/auth/guards";
import {
    json,
    parseId,
    parseQuery,
    withApi,
    type RouteContext,
} from "@/server/http/handler";
import {
    buildBreakdown,
    listPatientCalculations,
} from "@/server/services/calculations";
import { getPatientOrFail } from "@/server/services/patients";
import { toCalculationDto } from "@/server/services/presenters";
import { calculationListQuerySchema } from "@/server/validation/schemas";

type Context = RouteContext<{ id: string }>;

/**
 * GET /api/patients/{id}/calculations — перенос `PatientCalculationHistoryView`.
 * Поддерживает фильтр `?mode=dtz|mtz`.
 */
export const GET = withApi<{ id: string }>(async (request, context: Context) => {
    await requireUser();

    const patientId = parseId((await context.params).id, "Идентификатор пациента");
    // Проверяем существование пациента, чтобы на неизвестный id отдать 404,
    // а не пустой список.
    await getPatientOrFail(patientId);

    const { mode } = parseQuery(request, calculationListQuerySchema);
    const rows = await listPatientCalculations(patientId, mode);

    // Разбивка считается для всех записей сразу: чтение шкалы мемоизировано
    // в пределах запроса, поэтому версий читается столько, сколько их реально
    // встречается, а не по одной на строку.
    const dtos = await Promise.all(
        rows.map(async ({ record, patient, doctor }) =>
            toCalculationDto(
                record,
                patient,
                doctor,
                await buildBreakdown(record),
            ),
        ),
    );

    return json(dtos);
});
