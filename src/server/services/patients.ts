import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { patients, type Patient } from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import type {
    CreatePatientInput,
    UpdatePatientInput,
} from "@/server/validation/schemas";

/** CRUD по пациентам — перенос `PatientListCreateView` и `PatientDetailView`. */

export async function listPatients(): Promise<Patient[]> {
    return db.select().from(patients).orderBy(desc(patients.createdAt));
}

export async function findPatientById(id: number): Promise<Patient | undefined> {
    const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id))
        .limit(1);
    return patient;
}

/** Как `get_object_or_404`: либо пациент, либо корректный 404. */
export async function getPatientOrFail(id: number): Promise<Patient> {
    const patient = await findPatientById(id);
    if (!patient) {
        throw ApiError.notFound("Пациент не найден.");
    }
    return patient;
}

export async function createPatient(
    input: CreatePatientInput,
): Promise<Patient> {
    const [patient] = await db
        .insert(patients)
        .values({
            name: input.name,
            surname: input.surname,
            patronymic: input.patronymic,
            birthDate: input.birth_date,
            gender: input.gender,
        })
        .returning();

    return patient;
}

export async function updatePatient(
    id: number,
    input: UpdatePatientInput,
): Promise<Patient> {
    // В объект обновления попадают только переданные поля — это PATCH,
    // а не полная замена записи.
    const values: Partial<typeof patients.$inferInsert> = {};
    if (input.name !== undefined) values.name = input.name;
    if (input.surname !== undefined) values.surname = input.surname;
    if (input.patronymic !== undefined) values.patronymic = input.patronymic;
    if (input.birth_date !== undefined) values.birthDate = input.birth_date;
    if (input.gender !== undefined) values.gender = input.gender;

    const [patient] = await db
        .update(patients)
        .set(values)
        .where(eq(patients.id, id))
        .returning();

    if (!patient) {
        throw ApiError.notFound("Пациент не найден.");
    }
    return patient;
}

export async function deletePatient(id: number): Promise<void> {
    const [deleted] = await db
        .delete(patients)
        .where(eq(patients.id, id))
        .returning({ id: patients.id });

    if (!deleted) {
        throw ApiError.notFound("Пациент не найден.");
    }
}
