import { z } from "zod";

import { CRITERION_KEYS } from "@/server/scoring/ruleset";

/**
 * Проверка присланной шкалы.
 *
 * Шкала приходит снаружи и попадает прямо в клинический расчёт, поэтому
 * проверяется строго: состав критериев фиксирован (на них по именам
 * опирается логика рекомендаций), типы менять нельзя, а полосы значений
 * обязаны замыкаться веткой «в остальных случаях» — иначе нашлось бы
 * значение, которое не попадает никуда.
 */

const points = z
    .number()
    .int("Балл — целое число")
    .min(-100, "Слишком маленький балл")
    .max(100, "Слишком большой балл");

const threshold = z
    .number()
    .finite("Порог должен быть числом")
    .min(-1_000_000)
    .max(1_000_000);

const bandSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("below"), value: threshold, points }),
    z.object({ kind: z.literal("upTo"), value: threshold, points }),
    z.object({ kind: z.literal("atLeast"), value: threshold, points }),
    z.object({ kind: z.literal("above"), value: threshold, points }),
    z.object({ kind: z.literal("else"), points }),
]);

const label = z.string().trim().min(1, "Укажите название").max(120);
const unit = z.string().trim().max(40).optional();

const bandsCriterion = z.object({
    type: z.literal("bands"),
    label,
    unit,
    bands: z
        .array(bandSchema)
        .min(1, "Нужна хотя бы одна полоса")
        .max(20, "Слишком много полос")
        .refine((bands) => bands.at(-1)?.kind === "else", {
            message:
                "Последняя полоса должна быть «в остальных случаях» — иначе " +
                "часть значений останется без балла",
        })
        .refine(
            (bands) => bands.filter((band) => band.kind === "else").length === 1,
            { message: "Полоса «в остальных случаях» должна быть ровно одна" },
        ),
});

const identityCriterion = z.object({
    type: z.literal("identity"),
    label,
    unit,
});

const booleanCriterion = z.object({
    type: z.literal("boolean"),
    label,
    whenTrue: points,
    whenFalse: points,
});

const enumCriterion = z.object({
    type: z.literal("enum"),
    label,
    options: z
        .array(
            z.object({
                value: z.string().min(1).max(40),
                label,
                points,
            }),
        )
        .min(1, "Нужен хотя бы один вариант")
        .max(10),
});

const criterionSchema = z.discriminatedUnion("type", [
    bandsCriterion,
    identityCriterion,
    booleanCriterion,
    enumCriterion,
]);

/** Состав критериев фиксирован: ни добавить, ни убрать. */
const criteriaSchema = z.object(
    Object.fromEntries(
        CRITERION_KEYS.map((key) => [key, criterionSchema]),
    ) as Record<(typeof CRITERION_KEYS)[number], typeof criterionSchema>,
);

const severitySchema = z
    .array(
        z.object({
            upTo: z.union([threshold, z.null()]),
            label: z.string().trim().min(1).max(60),
        }),
    )
    .min(1, "Нужна хотя бы одна степень тяжести")
    .max(10)
    .refine((bands) => bands.at(-1)?.upTo === null, {
        message:
            "У последней степени тяжести не должно быть верхней границы — " +
            "иначе высокие баллы останутся без степени",
    })
    .refine(
        (bands) =>
            bands
                .slice(0, -1)
                .every((band, index, all) =>
                    index === 0
                        ? true
                        : (all[index - 1].upTo ?? 0) < (band.upTo ?? 0),
                ),
        { message: "Границы степеней тяжести должны возрастать" },
    );

export const rulesetConfigSchema = z.object({
    criteria: criteriaSchema,
    severity: severitySchema,
    recommendation: z.object({
        severeScore: z
            .number()
            .int("Порог — целое число баллов")
            .min(0)
            .max(1000),
        antibodyThreshold: z.number().finite().min(0).max(10000),
    }),
});

export const publishRulesetSchema = z.object({
    config: rulesetConfigSchema,
    comment: z
        .string()
        .trim()
        .min(1, "Опишите, что и зачем изменено")
        .max(500, "Не более 500 символов"),
});

export type PublishRulesetInput = z.infer<typeof publishRulesetSchema>;
