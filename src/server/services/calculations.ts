import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
    accounts,
    calculationHistory,
    patients,
    type Account,
    type CalculationMode,
    type CalculationRecord,
    type Patient,
} from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import type { CalculateRequestInput } from "@/server/validation/schemas";
import {
    calculateAge,
    patientGenderToCalculationGender,
    runCalculation,
    type CalculationInput,
} from "./calculator";
import { getActiveRuleset, getRulesetForCalculation } from "./scoring";
import { evaluateScore, type BreakdownRow } from "@/server/scoring/evaluate";
import { multipleNodulesFromMode } from "@/server/scoring/ruleset";

/**
 * История расчётов — перенос `calculate_view`,
 * `PatientCalculationHistoryView` и `CalculationDetailView`.
 */

export interface CalculationWithRelations {
    record: CalculationRecord;
    patient: Patient | null;
    doctor: Account | null;
}

/* ------------------------------------------------------------------ *
 * Создание расчёта
 * ------------------------------------------------------------------ */

export async function createCalculation(params: {
    patient: Patient;
    doctorId: number;
    input: CalculateRequestInput;
}): Promise<CalculationWithRelations> {
    const { patient, doctorId, input } = params;

    // Возраст и пол берутся из карточки пациента, а не из запроса: клиент не
    // должен иметь возможность подменить параметры, влияющие на балл.
    const calculationInput: CalculationInput = {
        ...input,
        age: calculateAge(patient.birthDate),
        gender: patientGenderToCalculationGender(patient.gender),
    };

    // Расчёт всегда идёт по действующей шкале, а её версия сохраняется
    // вместе с результатом — чтобы потом разложить балл теми же правилами.
    const activeRuleset = await getActiveRuleset();
    const result = runCalculation(calculationInput, activeRuleset.config);

    const [record] = await db
        .insert(calculationHistory)
        .values({
            doctorId,
            patientId: patient.id,
            mode: calculationInput.mode,
            age: calculationInput.age,
            gender: calculationInput.gender,
            st4: calculationInput.st4,
            ttg: calculationInput.ttg,
            atrttg: calculationInput.atrttg,
            thyroidVolume: calculationInput.thyroid_volume,
            eopStage: calculationInput.eop_stage,
            thyrostaticDailyDoseMg: calculationInput.thyrostatic_daily_dose_mg,
            thyrostaticTherapyDurationMonths:
                calculationInput.thyrostatic_therapy_duration_months,
            cccComplications: calculationInput.ccc_complications,
            compressionSyndrome: calculationInput.compression_syndrome,
            slco1b1Polymorphism: calculationInput.slco1b1_polymorphism,
            nodulesBilateral: calculationInput.nodules_bilateral,
            rulesetVersion: activeRuleset.version,
            score: result.score,
            severity: result.severity,
            recommendation: result.recommendation,
        })
        .returning();

    return { record, patient, doctor: null };
}

/* ------------------------------------------------------------------ *
 * Чтение
 * ------------------------------------------------------------------ */

export async function listPatientCalculations(
    patientId: number,
    mode?: CalculationMode,
): Promise<CalculationWithRelations[]> {
    const filter = mode
        ? and(
              eq(calculationHistory.patientId, patientId),
              eq(calculationHistory.mode, mode),
          )
        : eq(calculationHistory.patientId, patientId);

    const rows = await db
        .select({
            record: calculationHistory,
            patient: patients,
            doctor: accounts,
        })
        .from(calculationHistory)
        // Пациент есть всегда (FK NOT NULL), врач может быть удалён — отсюда left join.
        .innerJoin(patients, eq(calculationHistory.patientId, patients.id))
        .leftJoin(accounts, eq(calculationHistory.doctorId, accounts.id))
        .where(filter)
        .orderBy(desc(calculationHistory.createdAt));

    return rows;
}

export async function findCalculationById(
    id: number,
): Promise<CalculationWithRelations | undefined> {
    const [row] = await db
        .select({
            record: calculationHistory,
            patient: patients,
            doctor: accounts,
        })
        .from(calculationHistory)
        .innerJoin(patients, eq(calculationHistory.patientId, patients.id))
        .leftJoin(accounts, eq(calculationHistory.doctorId, accounts.id))
        .where(eq(calculationHistory.id, id))
        .limit(1);

    return row;
}

export async function getCalculationOrFail(
    id: number,
): Promise<CalculationWithRelations> {
    const row = await findCalculationById(id);
    if (!row) {
        throw ApiError.notFound("Расчёт не найден.");
    }
    return row;
}

export async function deleteCalculation(id: number): Promise<void> {
    const [deleted] = await db
        .delete(calculationHistory)
        .where(eq(calculationHistory.id, id))
        .returning({ id: calculationHistory.id });

    if (!deleted) {
        throw ApiError.notFound("Расчёт не найден.");
    }
}

/* ------------------------------------------------------------------ *
 * Разбивка балла
 * ------------------------------------------------------------------ */

export interface CalculationBreakdown {
    rows: BreakdownRow[];
    /** Версия шкалы, по которой выполнялся расчёт. */
    rulesetVersion: number;
    /** Найдена ли именно та версия; иначе разбивка посчитана по действующей. */
    exact: boolean;
    /**
     * Сходится ли сумма слагаемых с сохранённым баллом. Расхождение означает,
     * что запись и шкала разъехались, — врачу об этом нужно сказать, а не
     * показывать слагаемые, которые не дают итог.
     */
    consistent: boolean;
}

/** Раскладывает сохранённый расчёт на вклады критериев. */
export async function buildBreakdown(
    record: CalculationRecord,
): Promise<CalculationBreakdown> {
    const { ruleset, exact } = await getRulesetForCalculation(
        record.rulesetVersion,
    );

    const { total, breakdown } = evaluateScore(ruleset, {
        age: record.age,
        gender: record.gender,
        st4: record.st4,
        ttg: record.ttg,
        atrttg: record.atrttg,
        thyroid_volume: record.thyroidVolume,
        eop_stage: record.eopStage,
        thyrostatic_daily_dose_mg: record.thyrostaticDailyDoseMg,
        thyrostatic_therapy_duration_months:
            record.thyrostaticTherapyDurationMonths,
        ccc_complications: record.cccComplications,
        compression_syndrome: record.compressionSyndrome,
        slco1b1_polymorphism: record.slco1b1Polymorphism,
        multiple_thyroid_nodules: multipleNodulesFromMode(record.mode),
    });

    return {
        rows: breakdown,
        rulesetVersion: record.rulesetVersion,
        exact,
        consistent: total === record.score,
    };
}
