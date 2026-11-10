import { createInstance, RequestOptions } from "./api-instance";

/* ------------------------------- DTO ------------------------------- */

export type ScoreBand =
    | { kind: "below"; value: number; points: number }
    | { kind: "upTo"; value: number; points: number }
    | { kind: "atLeast"; value: number; points: number }
    | { kind: "above"; value: number; points: number }
    | { kind: "else"; points: number };

export type Criterion =
    | { type: "bands"; label: string; unit?: string; bands: ScoreBand[] }
    | { type: "identity"; label: string; unit?: string }
    | { type: "boolean"; label: string; whenTrue: number; whenFalse: number }
    | {
          type: "enum";
          label: string;
          options: Array<{ value: string; label: string; points: number }>;
      };

export interface SeverityBand {
    /** `null` — верхней границы нет. */
    upTo: number | null;
    label: string;
}

export interface Ruleset {
    criteria: Record<string, Criterion>;
    severity: SeverityBand[];
    recommendation: {
        severeScore: number;
        antibodyThreshold: number;
    };
}

export interface ActiveRuleset {
    version: number;
    comment: string;
    created_at: string;
    config: Ruleset;
}

export interface RulesetSummary {
    version: number;
    comment: string;
    is_active: boolean;
    created_at: string;
}

/** Вклад одного критерия в итоговый балл. */
export interface BreakdownRow {
    key: string;
    label: string;
    unit?: string;
    value: string;
    matched: string;
    points: number;
}

/* ------------------------------- API ------------------------------- */

export const getActiveRuleset = (options?: RequestOptions) =>
    createInstance<ActiveRuleset>({ url: "/scoring", method: "GET" }, options);

export const getRulesets = (options?: RequestOptions) =>
    createInstance<RulesetSummary[]>(
        { url: "/scoring/rulesets", method: "GET" },
        options,
    );

export const publishRuleset = (
    data: { config: Ruleset; comment: string },
    options?: RequestOptions,
) =>
    createInstance<ActiveRuleset>(
        { url: "/scoring/rulesets", method: "POST", data },
        options,
    );

export const scoringApi = {
    getActiveRuleset,
    getRulesets,
    publishRuleset,
};
