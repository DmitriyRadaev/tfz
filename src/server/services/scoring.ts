import "server-only";

import { cache } from "react";
import { desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { scoringRulesets, type ScoringRuleset } from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import {
    DEFAULT_RULESET,
    DEFAULT_RULESET_VERSION,
    type Ruleset,
} from "@/server/scoring/ruleset";

/**
 * Хранение версий шкалы расчёта.
 *
 * Версии неизменяемы: правка создаёт новую запись, старые остаются навсегда,
 * потому что к ним привязаны выполненные расчёты. Активная версия ровно одна —
 * это гарантирует частичный уникальный индекс в схеме.
 */

export interface RulesetRecord {
    version: number;
    config: Ruleset;
    comment: string;
    isActive: boolean;
    createdAt: Date;
    createdBy: number | null;
}

function toRecord(row: ScoringRuleset): RulesetRecord {
    return {
        version: row.version,
        config: row.config as Ruleset,
        comment: row.comment,
        isActive: row.isActive,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
    };
}

/* ------------------------------------------------------------------ *
 * Чтение
 * ------------------------------------------------------------------ */

/**
 * Активная шкала. При первом обращении к пустой таблице создаёт версию 1 из
 * значений по умолчанию — чтобы развёртывание не требовало отдельного шага
 * инициализации.
 */
export const getActiveRuleset = cache(async (): Promise<RulesetRecord> => {
    const [active] = await db
        .select()
        .from(scoringRulesets)
        .where(eq(scoringRulesets.isActive, true))
        .limit(1);

    if (active) return toRecord(active);

    // Гонка двух одновременных первых запросов упрётся в уникальный индекс;
    // в этом случае просто перечитываем то, что успел записать сосед.
    try {
        const [created] = await db
            .insert(scoringRulesets)
            .values({
                version: DEFAULT_RULESET_VERSION,
                config: DEFAULT_RULESET,
                comment: "Исходная шкала",
                isActive: true,
            })
            .returning();
        return toRecord(created);
    } catch {
        const [existing] = await db
            .select()
            .from(scoringRulesets)
            .where(eq(scoringRulesets.isActive, true))
            .limit(1);

        if (!existing) {
            throw new Error("Не удалось инициализировать шкалу расчёта");
        }
        return toRecord(existing);
    }
});

export const getRulesetByVersion = cache(async (
    version: number,
): Promise<RulesetRecord | undefined> => {
    const [row] = await db
        .select()
        .from(scoringRulesets)
        .where(eq(scoringRulesets.version, version))
        .limit(1);

    return row ? toRecord(row) : undefined;
});

/**
 * Шкала для разбора уже выполненного расчёта.
 *
 * Если версия почему-то отсутствует (база переносилась частично), берём
 * активную: лучше показать разбивку с оговоркой, чем не показать ничего.
 */
export async function getRulesetForCalculation(
    version: number,
): Promise<{ ruleset: Ruleset; exact: boolean }> {
    const stored = await getRulesetByVersion(version);
    if (stored) return { ruleset: stored.config, exact: true };

    const active = await getActiveRuleset();
    return { ruleset: active.config, exact: false };
}

export async function listRulesets(): Promise<RulesetRecord[]> {
    const rows = await db
        .select()
        .from(scoringRulesets)
        .orderBy(desc(scoringRulesets.version));

    return rows.map(toRecord);
}

/* ------------------------------------------------------------------ *
 * Публикация новой версии
 * ------------------------------------------------------------------ */

/**
 * Каноническая сериализация: ключи объектов упорядочены.
 *
 * Postgres возвращает jsonb с собственным порядком ключей, не совпадающим с
 * порядком в присланном объекте. Обычный `JSON.stringify` счёл бы такие
 * объекты разными, и проверка «шкала не изменилась» никогда бы не срабатывала.
 */
function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(",")}]`;
    }
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, item]) => item !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}

export async function publishRuleset(params: {
    config: Ruleset;
    comment: string;
    authorId: number;
}): Promise<RulesetRecord> {
    const current = await getActiveRuleset();

    if (canonicalJson(current.config) === canonicalJson(params.config)) {
        throw ApiError.badRequest(
            "Шкала не изменилась — новая версия не создана",
        );
    }

    const nextVersion = current.version + 1;

    // HTTP-драйвер Neon не поддерживает интерактивные транзакции, поэтому
    // снимаем флаг до вставки: короткий момент без активной версии безопаснее,
    // чем две активные одновременно (их не допустит уникальный индекс).
    await db
        .update(scoringRulesets)
        .set({ isActive: false })
        .where(eq(scoringRulesets.isActive, true));

    const [created] = await db
        .insert(scoringRulesets)
        .values({
            version: nextVersion,
            config: params.config,
            comment: params.comment,
            isActive: true,
            createdBy: params.authorId,
        })
        .returning();

    return toRecord(created);
}
