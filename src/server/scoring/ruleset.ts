import type { CalculationMode } from "@/server/db/schema";

/**
 * Декларативное описание шкалы расчёта.
 *
 * Раньше пороги и веса жили в цепочках `if/else` внутри калькулятора. Из-за
 * этого их нельзя было ни показать врачу, ни изменить, ни разложить готовый
 * балл на слагаемые. Теперь шкала — это данные: один и тот же объект
 * используется и для расчёта, и для страницы со шкалой, и для разбивки
 * «откуда взялись 27 баллов». Разойтись они не могут по построению.
 *
 * Набор критериев фиксирован: на них опирается логика рекомендаций, которая
 * обращается к ним по имени. Редактированию подлежат пороги и веса, а не
 * состав критериев.
 */

/* ------------------------------------------------------------------ *
 * Полосы значений
 * ------------------------------------------------------------------ */

/**
 * Полосы проверяются по порядку, срабатывает первая подошедшая, —
 * как в исходной цепочке `if / else if`. Поэтому порядок значим, и
 * немонотонные шкалы (например, длительность терапии) выражаются
 * без дополнительных конструкций.
 */
export type ScoreBand =
    /** значение < value */
    | { kind: "below"; value: number; points: number }
    /** значение ≤ value */
    | { kind: "upTo"; value: number; points: number }
    /** значение ≥ value */
    | { kind: "atLeast"; value: number; points: number }
    /** значение > value */
    | { kind: "above"; value: number; points: number }
    /** всё остальное */
    | { kind: "else"; points: number };

export type NumericCriterion = {
    type: "bands";
    label: string;
    unit?: string;
    bands: ScoreBand[];
};

/** Балл равен самому значению — так устроена стадия ЭОП. */
export type IdentityCriterion = {
    type: "identity";
    label: string;
    unit?: string;
};

export type BooleanCriterion = {
    type: "boolean";
    label: string;
    whenTrue: number;
    whenFalse: number;
};

export type EnumCriterion = {
    type: "enum";
    label: string;
    options: Array<{ value: string; label: string; points: number }>;
};

export type Criterion =
    | NumericCriterion
    | IdentityCriterion
    | BooleanCriterion
    | EnumCriterion;

/** Имена критериев фиксированы — на них ссылается логика рекомендаций. */
export const CRITERION_KEYS = [
    "age",
    "gender",
    "st4",
    "ttg",
    "atrttg",
    "thyroid_volume",
    "eop_stage",
    "thyrostatic_daily_dose_mg",
    "thyrostatic_therapy_duration_months",
    "ccc_complications",
    "compression_syndrome",
    "slco1b1_polymorphism",
    "multiple_thyroid_nodules",
] as const;

export type CriterionKey = (typeof CRITERION_KEYS)[number];

export interface SeverityBand {
    /** Верхняя граница включительно; `null` — всё, что выше. */
    upTo: number | null;
    label: string;
}

export interface Ruleset {
    criteria: Record<CriterionKey, Criterion>;
    severity: SeverityBand[];
    recommendation: {
        /** С какого балла степень считается средней/тяжёлой. */
        severeScore: number;
        /** Порог титра а/т к рТТГ, МЕ/л. */
        antibodyThreshold: number;
    };
}

/* ------------------------------------------------------------------ *
 * Действующая шкала (версия 1)
 * ------------------------------------------------------------------ */

/**
 * Перенос прежних значений один в один. Эквивалентность проверена
 * сравнением с исходной реализацией на случайных наборах данных.
 */
export const DEFAULT_RULESET: Ruleset = {
    criteria: {
        age: {
            type: "bands",
            label: "Возраст",
            unit: "лет",
            bands: [
                { kind: "upTo", value: 30, points: 3 },
                { kind: "upTo", value: 39, points: 2 },
                { kind: "upTo", value: 49, points: 1 },
                { kind: "else", points: 0 },
            ],
        },
        gender: {
            type: "enum",
            label: "Пол",
            options: [
                { value: "male", label: "Мужской", points: 1 },
                { value: "female", label: "Женский", points: 0 },
            ],
        },
        st4: {
            type: "bands",
            label: "сТ4",
            unit: "нг/дл",
            bands: [
                { kind: "upTo", value: 1.78, points: 0 },
                { kind: "upTo", value: 2.78, points: 1 },
                { kind: "upTo", value: 3.78, points: 2 },
                { kind: "upTo", value: 4.78, points: 3 },
                { kind: "else", points: 4 },
            ],
        },
        ttg: {
            type: "bands",
            label: "ТТГ",
            unit: "мкМЕ/мл",
            bands: [
                { kind: "above", value: 2.5, points: 0 },
                { kind: "atLeast", value: 0.1, points: 1 },
                { kind: "else", points: 4 },
            ],
        },
        atrttg: {
            type: "bands",
            label: "АтрТТГ",
            unit: "МЕ/л",
            bands: [
                { kind: "upTo", value: 1.0, points: 0 },
                { kind: "upTo", value: 3.0, points: 1 },
                { kind: "upTo", value: 5.0, points: 2 },
                { kind: "upTo", value: 10.0, points: 3 },
                { kind: "else", points: 4 },
            ],
        },
        thyroid_volume: {
            type: "bands",
            label: "Объём щитовидной железы",
            unit: "мл",
            bands: [
                { kind: "below", value: 25, points: 0 },
                { kind: "upTo", value: 40, points: 1 },
                { kind: "upTo", value: 60, points: 2 },
                { kind: "upTo", value: 80, points: 3 },
                { kind: "else", points: 4 },
            ],
        },
        eop_stage: {
            type: "identity",
            label: "Эндокринная офтальмопатия",
            unit: "стадия",
        },
        thyrostatic_daily_dose_mg: {
            type: "bands",
            label: "Суточная доза тиреостатиков",
            unit: "мг/сут",
            bands: [
                { kind: "upTo", value: 4.9, points: 0 },
                { kind: "upTo", value: 10, points: 1 },
                { kind: "upTo", value: 15, points: 2 },
                { kind: "upTo", value: 20, points: 3 },
                { kind: "else", points: 4 },
            ],
        },
        thyrostatic_therapy_duration_months: {
            type: "bands",
            label: "Длительность тиреостатической терапии",
            unit: "мес.",
            // Шкала немонотонная: и очень короткая, и очень длительная терапия
            // одинаково утяжеляют прогноз.
            bands: [
                { kind: "upTo", value: 12, points: 4 },
                { kind: "above", value: 48, points: 4 },
                { kind: "upTo", value: 24, points: 1 },
                { kind: "upTo", value: 36, points: 2 },
                { kind: "else", points: 3 },
            ],
        },
        ccc_complications: {
            type: "boolean",
            label: "Осложнения со стороны ССС",
            whenTrue: 4,
            whenFalse: 0,
        },
        compression_syndrome: {
            type: "boolean",
            label: "Компрессионный синдром",
            whenTrue: 4,
            whenFalse: 0,
        },
        slco1b1_polymorphism: {
            type: "boolean",
            label: "Полиморфизм гена SLCO1B1",
            // Полиморфизм — защитный фактор: баллы начисляются за его ОТСУТСТВИЕ.
            whenTrue: 0,
            whenFalse: 4,
        },
        multiple_thyroid_nodules: {
            type: "boolean",
            label: "Множественные узлы в ЩЖ",
            whenTrue: 4,
            whenFalse: 0,
        },
    },
    severity: [
        { upTo: 13, label: "лёгкая" },
        { upTo: 26, label: "средняя" },
        { upTo: null, label: "тяжёлая" },
    ],
    recommendation: {
        severeScore: 18,
        antibodyThreshold: 3.9,
    },
};

/** Версия шкалы, которая создаётся при первом запуске. */
export const DEFAULT_RULESET_VERSION = 1;

/** Значение критерия «множественные узлы» выводится из режима расчёта. */
export const multipleNodulesFromMode = (mode: CalculationMode) => mode === "mtz";
