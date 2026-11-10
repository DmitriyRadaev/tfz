import type { BreakdownRow } from "@/server/scoring/evaluate";
import type {
    Account,
    CalculationGender,
    CalculationMode,
    CalculationRecord,
    Patient,
    WorkerProfile,
} from "@/server/db/schema";

/**
 * Преобразование записей БД в DTO API.
 *
 * Слой заменяет сериализаторы DRF и решает две задачи: не пускать наружу лишние
 * поля (прежде всего `password_hash`) и задать стабильный контракт для клиента.
 *
 * Отличие от Django: даты отдаются в ISO 8601, а не в «ДД.ММ.ГГГГ». Так их можно
 * корректно сортировать и сравнивать, а форматирование под локаль — забота
 * интерфейса (см. `shared/lib/format.ts`).
 */

/* ------------------------------------------------------------------ *
 * Человекочитаемые подписи (аналог get_*_display в Django)
 * ------------------------------------------------------------------ */

export const PATIENT_GENDER_LABELS: Record<number, string> = {
    0: "Мужской",
    1: "Женский",
};

export const CALCULATION_GENDER_LABELS: Record<CalculationGender, string> = {
    male: "Мужской",
    female: "Женский",
};

export const CALCULATION_MODE_LABELS: Record<CalculationMode, string> = {
    dtz: "ДТЗ (Диффузный токсический зоб)",
    mtz: "МТЗ (Многоузловой токсический зоб)",
};

export const ACCOUNT_ROLE_LABELS = {
    SUPERADMIN: "Главный администратор",
    ADMIN: "Администратор",
    WORKER: "Работник",
} as const;

/* ------------------------------------------------------------------ *
 * DTO
 * ------------------------------------------------------------------ */

export interface AccountDto {
    id: number;
    email: string;
    name: string;
    surname: string;
    patronymic: string;
    role: Account["role"];
    role_display: string;
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
}

export interface PatientDto {
    id: number;
    name: string;
    surname: string;
    patronymic: string;
    birth_date: string;
    gender: number;
    gender_display: string;
    full_name: string;
    created_at: string;
}

export interface WorkerProfileDto {
    id: number;
    user: AccountDto;
    work: string;
    position: string;
}

export interface CalculationDto {
    id: number;
    patient: PatientDto | null;
    doctor: AccountDto | null;
    mode: CalculationMode;
    mode_display: string;
    age: number;
    gender: CalculationGender;
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
    severity: string;
    recommendation: string;
    created_at: string;
    /** Версия шкалы, по которой выполнен расчёт. */
    ruleset_version: number;
    /** Вклад каждого критерия. Присутствует, если разбивка запрошена. */
    breakdown?: {
        rows: BreakdownRow[];
        exact: boolean;
        consistent: boolean;
    };
}

/* ------------------------------------------------------------------ *
 * Функции преобразования
 * ------------------------------------------------------------------ */

export function fullName(person: {
    surname: string;
    name: string;
    patronymic: string;
}): string {
    return [person.surname, person.name, person.patronymic]
        .filter(Boolean)
        .join(" ")
        .trim();
}

export function toAccountDto(account: Account): AccountDto {
    return {
        id: account.id,
        email: account.email,
        name: account.name,
        surname: account.surname,
        patronymic: account.patronymic,
        role: account.role,
        role_display: ACCOUNT_ROLE_LABELS[account.role],
        is_active: account.isActive,
        is_staff: account.isStaff,
        is_superuser: account.isSuperuser,
        created_at: account.createdAt.toISOString(),
        updated_at: account.updatedAt.toISOString(),
    };
}

export function toPatientDto(patient: Patient): PatientDto {
    return {
        id: patient.id,
        name: patient.name,
        surname: patient.surname,
        patronymic: patient.patronymic,
        birth_date: patient.birthDate,
        gender: patient.gender,
        gender_display: PATIENT_GENDER_LABELS[patient.gender] ?? "—",
        full_name: fullName(patient),
        created_at: patient.createdAt.toISOString(),
    };
}

export function toWorkerProfileDto(
    profile: WorkerProfile,
    account: Account,
): WorkerProfileDto {
    return {
        id: profile.id,
        user: toAccountDto(account),
        work: profile.work,
        position: profile.position,
    };
}

export function toCalculationDto(
    record: CalculationRecord,
    patient: Patient | null,
    doctor: Account | null,
    breakdown?: CalculationDto["breakdown"],
): CalculationDto {
    return {
        id: record.id,
        patient: patient ? toPatientDto(patient) : null,
        doctor: doctor ? toAccountDto(doctor) : null,
        mode: record.mode,
        mode_display: CALCULATION_MODE_LABELS[record.mode],
        age: record.age,
        gender: record.gender,
        gender_display: CALCULATION_GENDER_LABELS[record.gender],
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
        nodules_bilateral: record.nodulesBilateral,
        score: record.score,
        severity: record.severity,
        recommendation: record.recommendation,
        created_at: record.createdAt.toISOString(),
        ruleset_version: record.rulesetVersion,
        ...(breakdown ? { breakdown } : {}),
    };
}
