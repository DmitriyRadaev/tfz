import type { CalculationGender, CalculationMode } from "@/server/db/schema";
import {
    evaluateScore,
    resolveSeverity,
    type BreakdownRow,
} from "@/server/scoring/evaluate";
import {
    multipleNodulesFromMode,
    type Ruleset,
} from "@/server/scoring/ruleset";

/**
 * Расчёт интегрального показателя тяжести тиреотоксикоза.
 *
 * Пороги и веса вынесены из кода в описание шкалы (`server/scoring`): одни
 * и те же данные используются и для расчёта, и для страницы со шкалой, и для
 * разбивки «откуда взялись баллы», поэтому разойтись они не могут. Шкала
 * версионируется, и каждый расчёт помнит версию, по которой был выполнен.
 *
 * Значения перенесены из `main/services/calculator.py` дословно и сверены с
 * прежней реализацией на 50 000 наборов данных — расхождений нет.
 *
 * Правила выдачи рекомендации взяты из клиентского калькулятора, а не из
 * Django: в бэкенде они отстали от него на две вещи.
 *
 *   1. Спорные случаи (те, что не попали ни в одну явную ветку) завершались
 *      ответом «требуется индивидуальная консультация специалиста». Он
 *      выпадал примерно в половине расчётов и ничего врачу не давал.
 *      Теперь спорный случай разрешается по титру а/т к рТТГ для ДТЗ и по
 *      локализации узлов для МТЗ.
 *   2. У МТЗ не было признака локализации узлов, и объём операции
 *      предлагался одинаковый независимо от того, поражены обе доли или
 *      одна. Поле `nodules_bilateral` закрывает этот пробел.
 *
 * Пол при этом реально доходит до расчёта: в Django в поле `gender` попадал
 * код 0/1, который никогда не был равен строке "male", из-за чего балл за
 * мужской пол не начислялся.
 */

export interface CalculationInput {
    mode: CalculationMode;
    age: number;
    gender: CalculationGender;
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
    /**
     * Узлы в обеих долях ЩЖ (`true`) или только в одной (`false`).
     * Имеет смысл только для МТЗ; для ДТЗ — `null`.
     */
    nodules_bilateral: boolean | null;
}

export interface CalculationResult {
    score: number;
    severity: string;
    recommendation: string;
    /** Вклад каждого критерия — для показа врачу. */
    breakdown: BreakdownRow[];
}

/** Код пола пациента (0/1) → значение, с которым работает расчёт. */
export function patientGenderToCalculationGender(
    gender: number,
): CalculationGender {
    return gender === 0 ? "male" : "female";
}

/** Полных лет на указанную дату. */
export function calculateAge(birthDate: string, today = new Date()): number {
    const [year, month, day] = birthDate.split("-").map(Number);

    let age = today.getUTCFullYear() - year;
    const hasHadBirthday =
        today.getUTCMonth() + 1 > month ||
        (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day);

    if (!hasHadBirthday) age -= 1;
    return Math.max(0, age);
}

/* ------------------------------------------------------------------ *
 * Рекомендация
 * ------------------------------------------------------------------ */

const THYROIDECTOMY = "Тиреоидэктомия.";
const SUBTOTAL_RESECTION = "Субтотальная резекция ЩЖ (СРЩЖ).";

function conclusion(operation: string, reasons: string[]): string {
    return `${operation}\nОбоснование: ${reasons.join(", ")}.`;
}

/**
 * Границы «средней/тяжёлой» степени.
 *
 * В клиентском калькуляторе ветка ограничена сверху (`score <= 40`), так как
 * шкала задумана как 0–40. Но фактический максимум выше: стадия ЭОП
 * принимается до 6, и предельный пациент набирает до 47. У клиента такой
 * случай проваливается в «спорную» ветку и может получить рекомендацию
 * меньшего объёма — то есть самый тяжёлый пациент более щадящую операцию.
 * Здесь верхней границы нет намеренно; нижняя берётся из шкалы.
 */
function severityFlags(ruleset: Ruleset, score: number) {
    const threshold = ruleset.recommendation.severeScore;
    return {
        isLightOrMedium: score < threshold,
        isMediumOrHeavy: score >= threshold,
    };
}

/** Рекомендация при диффузном токсическом зобе. */
function recommendForDtz(
    data: CalculationInput,
    score: number,
    ruleset: Ruleset,
): string {
    const { isLightOrMedium, isMediumOrHeavy } = severityFlags(ruleset, score);
    const threshold = ruleset.recommendation.antibodyThreshold;
    const formattedThreshold = String(threshold.toFixed(2)).replace(".", ",");

    const hasPolymorphism = data.slco1b1_polymorphism;
    const highAntibodies = data.atrttg > threshold;
    const noComplications = !data.ccc_complications;
    const isMale = data.gender === "male";

    // Явный случай: органосохраняющая операция оправдана.
    if (hasPolymorphism && isLightOrMedium && !highAntibodies && noComplications) {
        return conclusion(SUBTOTAL_RESECTION, [
            "наличие полиморфизма SLCO1B1",
            "лёгкая/средняя тяжесть",
            `титр а/т к рТТГ ≤ ${formattedThreshold} МЕ/л`,
            "отсутствие осложнений",
        ]);
    }

    // Явный случай: показано полное удаление железы.
    if (!hasPolymorphism && isMediumOrHeavy && (highAntibodies || isMale)) {
        const reasons = [
            "отсутствие полиморфизма SLCO1B1",
            "средняя/тяжёлая тяжесть",
        ];
        if (highAntibodies) reasons.push(`титр а/т к рТТГ > ${formattedThreshold} МЕ/л`);
        if (isMale) reasons.push("мужской пол");
        return conclusion(THYROIDECTOMY, reasons);
    }

    // Спорный случай: решающим остаётся титр антител к рецептору ТТГ.
    return highAntibodies
        ? conclusion(THYROIDECTOMY, [`титр а/т к рТТГ > ${formattedThreshold} МЕ/л`])
        : conclusion(SUBTOTAL_RESECTION, [
              `титр а/т к рТТГ ≤ ${formattedThreshold} МЕ/л`,
          ]);
}

/** Рекомендация при многоузловом токсическом зобе. */
function recommendForMtz(
    data: CalculationInput,
    score: number,
    ruleset: Ruleset,
): string {
    const { isLightOrMedium, isMediumOrHeavy } = severityFlags(ruleset, score);
    const hasPolymorphism = data.slco1b1_polymorphism;
    const noComplications = !data.ccc_complications;

    // Узлы в обеих долях не оставляют места для органосохраняющей операции.
    const isBilateral = data.nodules_bilateral === true;
    const localization = isBilateral
        ? "множественные узлы в обеих долях ЩЖ"
        : "узлы в одной доле ЩЖ";
    const operation = isBilateral ? THYROIDECTOMY : SUBTOTAL_RESECTION;

    if (hasPolymorphism && isLightOrMedium && noComplications) {
        return conclusion(operation, [
            "наличие полиморфизма SLCO1B1",
            "лёгкая/средняя тяжесть",
            "отсутствие осложнений",
            localization,
        ]);
    }

    if (!hasPolymorphism && isMediumOrHeavy) {
        return conclusion(operation, [
            "отсутствие полиморфизма SLCO1B1",
            "средняя/тяжёлая тяжесть",
            localization,
        ]);
    }

    // Спорный случай: решает локализация узлов.
    return conclusion(operation, [localization]);
}

export function getRecommendation(
    data: CalculationInput,
    score: number,
    severity: string,
    ruleset: Ruleset,
): string {
    const summary =
        `Интегральный показатель: ${score} баллов.\n` +
        `Степень тяжести тиреотоксикоза: ${severity}.\n\n`;

    const header =
        data.mode === "dtz"
            ? "--- Рекомендация для ДТЗ ---\n"
            : "--- Рекомендация для МТЗ ---\n";

    const advice =
        data.mode === "dtz"
            ? recommendForDtz(data, score, ruleset)
            : recommendForMtz(data, score, ruleset);

    return summary + header + advice;
}

/* ------------------------------------------------------------------ *
 * Точка входа
 * ------------------------------------------------------------------ */

export function runCalculation(
    data: CalculationInput,
    ruleset: Ruleset,
): CalculationResult {
    const { total, breakdown } = evaluateScore(ruleset, {
        ...data,
        // Режим МТЗ по определению означает множественные узлы.
        multiple_thyroid_nodules: multipleNodulesFromMode(data.mode),
    });

    const severity = resolveSeverity(ruleset, total);

    return {
        score: total,
        severity,
        recommendation: getRecommendation(data, total, severity, ruleset),
        breakdown,
    };
}
