import { requireUser } from "@/server/auth/guards";
import { json, parseBody, withApi } from "@/server/http/handler";
import { createPatient, listPatients } from "@/server/services/patients";
import { toPatientDto } from "@/server/services/presenters";
import { createPatientSchema } from "@/server/validation/schemas";

/** GET /api/patients — перенос `PatientListCreateView.get`. */
export const GET = withApi(async () => {
    await requireUser();

    const patients = await listPatients();
    return json(patients.map(toPatientDto));
});

/** POST /api/patients — перенос `PatientListCreateView.post`. */
export const POST = withApi(async (request) => {
    await requireUser();

    const input = await parseBody(request, createPatientSchema);
    const patient = await createPatient(input);

    return json(toPatientDto(patient), 201);
});
