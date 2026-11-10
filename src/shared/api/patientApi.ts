import { createInstance, RequestOptions } from "./api-instance";
import type { Account } from "./accountApi";
import type { BreakdownRow } from "./scoringApi";

/* ------------------------------- DTO ------------------------------- */

/** 0 — мужской, 1 — женский. */
export type PatientGender = 0 | 1;

export type Patient = {
    id: number;
    name: string;
    surname: string;
    patronymic: string;
    /** ISO-дата (ГГГГ-ММ-ДД). */
    birth_date: string;
    gender: PatientGender;
    gender_display: string;
    full_name: string;
    /** ISO 8601. */
    created_at: string;
    /** Версия шкалы, по которой выполнен расчёт. */
    ruleset_version: number;
    /** Разбивка балла по критериям. */
    breakdown?: {
        rows: BreakdownRow[];
        /** Найдена ли именно та версия шкалы, по которой считали. */
        exact: boolean;
        /** Сходится ли сумма слагаемых с сохранённым баллом. */
        consistent: boolean;
    };
};

export type CalculationMode = "dtz" | "mtz";
export type Severity = "лёгкая" | "средняя" | "тяжёлая";

/**
 * Запись истории расчётов — то, что отдаёт `/patients/{id}/calculations`.
 * Имена полей совпадают с API, чтобы не плодить слой переименований.
 */
export type PatientCase = {
    id: number;
    patient: Patient | null;
    doctor: Account | null;
    mode: CalculationMode;
    mode_display: string;
    age: number;
    gender: "male" | "female";
    gender_display: string;
    st4: number;
    ttg: number;
    atrttg: number;
    thyroid_volume: number;
    eop_stage: number;
    thyrostatic_daily_dose_mg: number;
    thyrostatic_therapy_duration_months: number;
    ccc_complications: boolean;
    compression_syndrome: boolean;
    slco1b1_polymorphism: boolean;
    /** Только для МТЗ: узлы в обеих долях (true) или в одной (false). */
    nodules_bilateral: boolean | null;
    score: number;
    severity: Severity;
    recommendation: string;
    /** ISO 8601. */
    created_at: string;
    /** Версия шкалы, по которой выполнен расчёт. */
    ruleset_version: number;
    /** Разбивка балла по критериям. */
    breakdown?: {
        rows: BreakdownRow[];
        /** Найдена ли именно та версия шкалы, по которой считали. */
        exact: boolean;
        /** Сходится ли сумма слагаемых с сохранённым баллом. */
        consistent: boolean;
    };
};

export type CreatePatient = {
    name: string;
    surname: string;
    patronymic: string;
    birth_date: string;
    gender: PatientGender;
};

export type UpdatePatient = Partial<CreatePatient>;

/* ------------------------------- API ------------------------------- */

export const getPatientList = (options?: RequestOptions) =>
    createInstance<Patient[]>({ url: "/patients", method: "GET" }, options);

export const getPatient = (idPatient: number, options?: RequestOptions) =>
    createInstance<Patient>(
        { url: `/patients/${idPatient}`, method: "GET" },
        options,
    );

export const getPatientCasesList = (
    idPatient: number,
    params?: { mode?: CalculationMode },
    options?: RequestOptions,
) =>
    createInstance<PatientCase[]>(
        { url: `/patients/${idPatient}/calculations`, method: "GET", params },
        options,
    );

export const getPatientCase = (idCase: number, options?: RequestOptions) =>
    createInstance<PatientCase>(
        { url: `/calculations/${idCase}`, method: "GET" },
        options,
    );

export const createPatient = (data: CreatePatient, options?: RequestOptions) =>
    createInstance<Patient>(
        { url: "/patients", method: "POST", data },
        options,
    );

export const updatePatient = (
    idPatient: number,
    data: UpdatePatient,
    options?: RequestOptions,
) =>
    createInstance<Patient>(
        { url: `/patients/${idPatient}`, method: "PATCH", data },
        options,
    );

export const deletePatient = (idPatient: number, options?: RequestOptions) =>
    createInstance<void>(
        { url: `/patients/${idPatient}`, method: "DELETE" },
        options,
    );

export const deleteCase = (idCase: number, options?: RequestOptions) =>
    createInstance<void>(
        { url: `/calculations/${idCase}`, method: "DELETE" },
        options,
    );

export const patientApi = {
    getPatientList,
    getPatient,
    getPatientCasesList,
    getPatientCase,
    createPatient,
    updatePatient,
    deletePatient,
    deleteCase,
};
