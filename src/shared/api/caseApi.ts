import { createInstance, RequestOptions } from "./api-instance";
import type { CalculationMode, PatientCase } from "./patientApi";

/* ------------------------------- DTO ------------------------------- */

/**
 * Данные формы расчёта.
 *
 * Числовые поля допускают `""`, потому что пустое поле ввода — это пустая
 * строка; сервер отличает её от нуля и возвращает ошибку «поле обязательно».
 *
 * `multiple_thyroid_nodules` в запрос не входит: наличие множественных узлов
 * однозначно определяется режимом (`mtz`), и дублирующее поле могло бы
 * противоречить режиму. Форма по-прежнему показывает его как переключатель и
 * выводит из него `mode`.
 */
export type CalculateData = {
    mode: CalculationMode | "";
    st4: number | "";
    ttg: number | "";
    atrttg: number | "";
    thyroid_volume: number | "";
    eop_stage: number | "";
    thyrostatic_daily_dose_mg: number | "";
    thyrostatic_therapy_duration_months: number | "";
    ccc_complications: boolean;
    compression_syndrome: boolean;
    slco1b1_polymorphism: boolean;
    multiple_thyroid_nodules: boolean;
    /**
     * Локализация узлов: `true` — обе доли, `false` — одна,
     * `null` — ещё не выбрано. Спрашивается только при МТЗ и напрямую
     * влияет на предлагаемый объём операции.
     */
    nodules_bilateral: boolean | null;
};

/** Полный расчёт, сохранённый в истории. */
export type CalculationResult = PatientCase;

/* ------------------------------- API ------------------------------- */

export const createCase = (
    idPatient: number,
    data: CalculateData,
    options?: RequestOptions,
) => {
    // Поле формы в API не отправляется — режим уже несёт эту информацию.
    const payload: Omit<CalculateData, "multiple_thyroid_nodules"> = {
        mode: data.mode,
        // Для ДТЗ признак не имеет смысла — сервер всё равно запишет null.
        nodules_bilateral: data.mode === "mtz" ? data.nodules_bilateral : null,
        st4: data.st4,
        ttg: data.ttg,
        atrttg: data.atrttg,
        thyroid_volume: data.thyroid_volume,
        eop_stage: data.eop_stage,
        thyrostatic_daily_dose_mg: data.thyrostatic_daily_dose_mg,
        thyrostatic_therapy_duration_months:
            data.thyrostatic_therapy_duration_months,
        ccc_complications: data.ccc_complications,
        compression_syndrome: data.compression_syndrome,
        slco1b1_polymorphism: data.slco1b1_polymorphism,
    };

    return createInstance<CalculationResult>(
        { url: `/patients/${idPatient}/calculate`, method: "POST", data: payload },
        options,
    );
};

export const caseApi = {
    createCase,
};
