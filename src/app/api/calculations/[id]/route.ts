import { requireUser } from "@/server/auth/guards";
import {
    json,
    noContent,
    parseId,
    withApi,
    type RouteContext,
} from "@/server/http/handler";
import {
    buildBreakdown,
    deleteCalculation,
    getCalculationOrFail,
} from "@/server/services/calculations";
import { toCalculationDto } from "@/server/services/presenters";

type Context = RouteContext<{ id: string }>;

/** GET /api/calculations/{id} — перенос `CalculationDetailView` (retrieve). */
export const GET = withApi<{ id: string }>(async (_request, context: Context) => {
    await requireUser();

    const id = parseId((await context.params).id, "Идентификатор расчёта");
    const { record, patient, doctor } = await getCalculationOrFail(id);

    return json(
        toCalculationDto(record, patient, doctor, await buildBreakdown(record)),
    );
});

/** DELETE /api/calculations/{id} — перенос `CalculationDetailView` (destroy). */
export const DELETE = withApi<{ id: string }>(
    async (_request, context: Context) => {
        await requireUser();

        const id = parseId((await context.params).id, "Идентификатор расчёта");
        await deleteCalculation(id);

        return noContent();
    },
);
