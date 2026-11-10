import {
    CRITERION_KEYS,
    type Criterion,
    type CriterionKey,
    type Ruleset,
    type ScoreBand,
} from "./ruleset";

/**
 * Вычисление балла по шкале.
 *
 * Возвращает не только сумму, но и вклад каждого критерия: ровно те данные,
 * которые нужны, чтобы показать врачу, из чего сложился результат. Расчёт и
 * разбивка берутся из одного прохода — показанные слагаемые не могут не
 * совпасть с итогом.
 */

export interface ScoringInput {
    age: number;
    gender: string;
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
    multiple_thyroid_nodules: boolean;
}

export interface BreakdownRow {
    key: CriterionKey;
    label: string;
    unit?: string;
    /** Значение показателя у пациента, уже в виде строки для показа. */
    value: string;
    /** Какое правило сработало — «≤ 2,78», «Мужской», «есть». */
    matched: string;
    points: number;
}

export interface ScoringResult {
    total: number;
    breakdown: BreakdownRow[];
}

/* ------------------------------------------------------------------ *
 * Полосы
 * ------------------------------------------------------------------ */

function bandMatches(band: ScoreBand, value: number): boolean {
    switch (band.kind) {
        case "below":
            return value < band.value;
        case "upTo":
            return value <= band.value;
        case "atLeast":
            return value >= band.value;
        case "above":
            return value > band.value;
        case "else":
            return true;
    }
}

/** Человекочитаемое описание полосы — используется и в разбивке, и на странице шкалы. */
export function describeBand(band: ScoreBand): string {
    const format = (value: number) => String(value).replace(".", ",");
    switch (band.kind) {
        case "below":
            return `< ${format(band.value)}`;
        case "upTo":
            return `≤ ${format(band.value)}`;
        case "atLeast":
            return `≥ ${format(band.value)}`;
        case "above":
            return `> ${format(band.value)}`;
        case "else":
            return "в остальных случаях";
    }
}

/* ------------------------------------------------------------------ *
 * Вклад одного критерия
 * ------------------------------------------------------------------ */

const formatNumber = (value: number) => String(value).replace(".", ",");

function evaluateCriterion(
    key: CriterionKey,
    criterion: Criterion,
    input: ScoringInput,
): BreakdownRow {
    const raw = (input as unknown as Record<string, unknown>)[key];

    switch (criterion.type) {
        case "bands": {
            const value = Number(raw);
            const band =
                criterion.bands.find((candidate) => bandMatches(candidate, value)) ??
                // Шкала без замыкающей полосы «else» — ошибка конфигурации,
                // но ронять расчёт из-за неё нельзя: считаем вклад нулевым
                // и показываем это явно.
                ({ kind: "else", points: 0 } as ScoreBand);

            return {
                key,
                label: criterion.label,
                unit: criterion.unit,
                value: formatNumber(value),
                matched: describeBand(band),
                points: band.points,
            };
        }

        case "identity": {
            const value = Number(raw);
            return {
                key,
                label: criterion.label,
                unit: criterion.unit,
                value: formatNumber(value),
                matched: "балл равен значению",
                points: value,
            };
        }

        case "boolean": {
            const value = Boolean(raw);
            return {
                key,
                label: criterion.label,
                value: value ? "есть" : "нет",
                matched: value ? "есть" : "нет",
                points: value ? criterion.whenTrue : criterion.whenFalse,
            };
        }

        case "enum": {
            const value = String(raw);
            const option = criterion.options.find(
                (candidate) => candidate.value === value,
            );
            return {
                key,
                label: criterion.label,
                value: option?.label ?? value,
                matched: option?.label ?? value,
                points: option?.points ?? 0,
            };
        }
    }
}

/* ------------------------------------------------------------------ *
 * Публичный расчёт
 * ------------------------------------------------------------------ */

export function evaluateScore(
    ruleset: Ruleset,
    input: ScoringInput,
): ScoringResult {
    const breakdown = CRITERION_KEYS.map((key) =>
        evaluateCriterion(key, ruleset.criteria[key], input),
    );

    return {
        total: breakdown.reduce((sum, row) => sum + row.points, 0),
        breakdown,
    };
}

/** Степень тяжести по шкале. */
export function resolveSeverity(ruleset: Ruleset, score: number): string {
    for (const band of ruleset.severity) {
        if (band.upTo === null || score <= band.upTo) return band.label;
    }
    // Последняя полоса всегда должна быть открытой сверху; если это не так,
    // возвращаем её метку, а не пустую строку.
    return ruleset.severity.at(-1)?.label ?? "не определена";
}
