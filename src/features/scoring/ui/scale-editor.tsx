"use client";

import { useMemo, useState } from "react";

import { usePublishRulesetMutation } from "@/entities/scoring";
import type {
    Criterion,
    Ruleset,
    ScoreBand,
} from "@/shared/api/scoringApi";
import { Button } from "@/shared/ui/Button";
import { UiTextField } from "@/shared/ui/ui-text-field";

/** Человекочитаемое условие полосы — те же формулировки, что в разбивке. */
function describeBand(band: ScoreBand): string {
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

/** Глубокая копия — редактируем черновик, не трогая загруженную шкалу. */
const clone = (ruleset: Ruleset): Ruleset =>
    JSON.parse(JSON.stringify(ruleset)) as Ruleset;

type NumberCellProps = {
    value: number;
    onChange: (value: number) => void;
    editable: boolean;
    suffix?: string;
    step?: string;
    ariaLabel: string;
};

function NumberCell({
    value,
    onChange,
    editable,
    suffix,
    step = "any",
    ariaLabel,
}: NumberCellProps) {
    if (!editable) {
        return (
            <span className="tabular-nums">
                {String(value).replace(".", ",")}
                {suffix ? ` ${suffix}` : ""}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1">
            <input
                type="number"
                step={step}
                value={value}
                aria-label={ariaLabel}
                // Колесо мыши над сфокусированным полем меняет значение —
                // при прокрутке длинной таблицы это молча исказило бы шкалу.
                onWheel={(event) => event.currentTarget.blur()}
                onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isNaN(next)) onChange(next);
                }}
                className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm tabular-nums focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            {suffix && <span className="text-xs text-neutral-500">{suffix}</span>}
        </span>
    );
}

/* ------------------------------------------------------------------ *
 * Один критерий
 * ------------------------------------------------------------------ */

function CriterionCard({
    criterion,
    editable,
    onChange,
}: {
    criterion: Criterion;
    editable: boolean;
    onChange: (next: Criterion) => void;
}) {
    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-ink">
                {criterion.label}
                {"unit" in criterion && criterion.unit && (
                    <span className="ml-1 font-normal text-neutral-500">
                        , {criterion.unit}
                    </span>
                )}
            </h3>

            {criterion.type === "identity" && (
                <p className="text-sm text-neutral-600">
                    Балл равен значению показателя.
                </p>
            )}

            {criterion.type === "boolean" && (
                <dl className="space-y-2 text-sm">
                    {(
                        [
                            ["есть", "whenTrue"],
                            ["нет", "whenFalse"],
                        ] as const
                    ).map(([label, field]) => (
                        <div key={field} className="flex items-center justify-between gap-4">
                            <dt className="text-neutral-600">{label}</dt>
                            <dd>
                                <NumberCell
                                    value={criterion[field]}
                                    editable={editable}
                                    step="1"
                                    suffix="б."
                                    ariaLabel={`${criterion.label}: ${label}, баллов`}
                                    onChange={(points) =>
                                        onChange({ ...criterion, [field]: points })
                                    }
                                />
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {criterion.type === "enum" && (
                <dl className="space-y-2 text-sm">
                    {criterion.options.map((option, index) => (
                        <div
                            key={option.value}
                            className="flex items-center justify-between gap-4"
                        >
                            <dt className="text-neutral-600">{option.label}</dt>
                            <dd>
                                <NumberCell
                                    value={option.points}
                                    editable={editable}
                                    step="1"
                                    suffix="б."
                                    ariaLabel={`${criterion.label}: ${option.label}, баллов`}
                                    onChange={(points) => {
                                        const options = [...criterion.options];
                                        options[index] = { ...option, points };
                                        onChange({ ...criterion, options });
                                    }}
                                />
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {criterion.type === "bands" && (
                <dl className="space-y-2 text-sm">
                    {criterion.bands.map((band, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-4"
                        >
                            <dt className="flex items-center gap-1 text-neutral-600">
                                {band.kind === "else" ? (
                                    "в остальных случаях"
                                ) : editable ? (
                                    <>
                                        <span>
                                            {
                                                {
                                                    below: "<",
                                                    upTo: "≤",
                                                    atLeast: "≥",
                                                    above: ">",
                                                }[band.kind]
                                            }
                                        </span>
                                        <NumberCell
                                            value={band.value}
                                            editable
                                            ariaLabel={`${criterion.label}: порог полосы ${index + 1}`}
                                            onChange={(value) => {
                                                const bands = [...criterion.bands];
                                                bands[index] = { ...band, value };
                                                onChange({ ...criterion, bands });
                                            }}
                                        />
                                    </>
                                ) : (
                                    describeBand(band)
                                )}
                            </dt>
                            <dd>
                                <NumberCell
                                    value={band.points}
                                    editable={editable}
                                    step="1"
                                    suffix="б."
                                    ariaLabel={`${criterion.label}: баллов за полосу ${index + 1}`}
                                    onChange={(points) => {
                                        const bands = [...criterion.bands];
                                        bands[index] = { ...band, points };
                                        onChange({ ...criterion, bands });
                                    }}
                                />
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Шкала целиком
 * ------------------------------------------------------------------ */

export function ScaleEditor({
    ruleset,
    version,
    canEdit,
}: {
    ruleset: Ruleset;
    version: number;
    canEdit: boolean;
}) {
    const [draft, setDraft] = useState<Ruleset>(() => clone(ruleset));
    const [isEditing, setIsEditing] = useState(false);
    const [comment, setComment] = useState("");

    const mutation = usePublishRulesetMutation({
        onSuccessActions: [
            () => {
                setIsEditing(false);
                setComment("");
            },
        ],
    });

    const isChanged = useMemo(
        () => JSON.stringify(draft) !== JSON.stringify(ruleset),
        [draft, ruleset],
    );

    const maxScore = useMemo(() => {
        // Теоретический максимум: берём наибольший вклад каждого критерия.
        return Object.values(draft.criteria).reduce((sum, criterion) => {
            switch (criterion.type) {
                case "bands":
                    return sum + Math.max(...criterion.bands.map((b) => b.points));
                case "boolean":
                    return sum + Math.max(criterion.whenTrue, criterion.whenFalse);
                case "enum":
                    return sum + Math.max(...criterion.options.map((o) => o.points));
                case "identity":
                    // У стадии ЭОП верхняя граница задана валидацией формы.
                    return sum + 6;
            }
        }, 0);
    }, [draft]);

    const cancel = () => {
        setDraft(clone(ruleset));
        setIsEditing(false);
        setComment("");
    };

    const updateCriterion = (key: string, next: Criterion) =>
        setDraft((current) => ({
            ...current,
            criteria: { ...current.criteria, [key]: next },
        }));

    return (
        <div className="space-y-6">
            {/* Шапка */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-neutral-600">
                    Действующая версия шкалы:{" "}
                    <strong className="text-ink">№{version}</strong>. Максимально
                    возможный балл — <strong className="text-ink">{maxScore}</strong>.
                </p>

                {canEdit && !isEditing && (
                    <Button variant="secondary" onPress={() => setIsEditing(true)}>
                        Изменить шкалу
                    </Button>
                )}
            </div>

            {isEditing && (
                <div className="rounded-lg border border-severity-medium-bg bg-severity-medium-bg p-4 text-sm text-severity-medium">
                    Изменения вступят в силу для <strong>новых</strong> расчётов.
                    Ранее выполненные сохранят свою версию шкалы, и их разбивка по
                    баллам не изменится.
                </div>
            )}

            {/* Критерии */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(draft.criteria).map(([key, criterion]) => (
                    <CriterionCard
                        key={key}
                        criterion={criterion}
                        editable={isEditing}
                        onChange={(next) => updateCriterion(key, next)}
                    />
                ))}
            </div>

            {/* Степени тяжести */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h3 className="mb-3 font-semibold text-ink">Степени тяжести</h3>
                <dl className="space-y-2 text-sm">
                    {draft.severity.map((band, index) => (
                        <div
                            key={band.label}
                            className="flex items-center justify-between gap-4"
                        >
                            <dt className="text-neutral-600">{band.label}</dt>
                            <dd>
                                {band.upTo === null ? (
                                    <span className="text-neutral-500">
                                        всё, что выше
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1">
                                        <span>до</span>
                                        <NumberCell
                                            value={band.upTo}
                                            editable={isEditing}
                                            step="1"
                                            suffix="б. включительно"
                                            ariaLabel={`Верхняя граница степени «${band.label}»`}
                                            onChange={(upTo) =>
                                                setDraft((current) => {
                                                    const severity = [
                                                        ...current.severity,
                                                    ];
                                                    severity[index] = {
                                                        ...band,
                                                        upTo,
                                                    };
                                                    return { ...current, severity };
                                                })
                                            }
                                        />
                                    </span>
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Пороги рекомендаций */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h3 className="mb-1 font-semibold text-ink">Пороги рекомендаций</h3>
                <p className="mb-3 text-sm text-neutral-500">
                    На эти два значения опирается выбор между тиреоидэктомией и
                    субтотальной резекцией.
                </p>
                <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                        <dt className="text-neutral-600">
                            С какого балла степень считается средней/тяжёлой
                        </dt>
                        <dd>
                            <NumberCell
                                value={draft.recommendation.severeScore}
                                editable={isEditing}
                                step="1"
                                suffix="б."
                                ariaLabel="Порог средней/тяжёлой степени"
                                onChange={(severeScore) =>
                                    setDraft((current) => ({
                                        ...current,
                                        recommendation: {
                                            ...current.recommendation,
                                            severeScore,
                                        },
                                    }))
                                }
                            />
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <dt className="text-neutral-600">
                            Порог титра а/т к рТТГ
                        </dt>
                        <dd>
                            <NumberCell
                                value={draft.recommendation.antibodyThreshold}
                                editable={isEditing}
                                suffix="МЕ/л"
                                ariaLabel="Порог титра антител"
                                onChange={(antibodyThreshold) =>
                                    setDraft((current) => ({
                                        ...current,
                                        recommendation: {
                                            ...current.recommendation,
                                            antibodyThreshold,
                                        },
                                    }))
                                }
                            />
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Публикация */}
            {isEditing && (
                <div className="sticky bottom-0 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg">
                    <UiTextField
                        label="Что и зачем изменено"
                        placeholder="Например: порог титра а/т приведён к обновлённым клиническим рекомендациям"
                        inputProps={{
                            value: comment,
                            onChange: (event) => setComment(event.target.value),
                        }}
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                        {!isChanged && (
                            <span className="mr-auto text-sm text-neutral-500">
                                Изменений пока нет
                            </span>
                        )}
                        <Button
                            variant="secondary"
                            onPress={cancel}
                            isDisabled={mutation.isPending}
                        >
                            Отмена
                        </Button>
                        <Button
                            isPending={mutation.isPending}
                            isDisabled={
                                mutation.isPending ||
                                !isChanged ||
                                comment.trim().length === 0
                            }
                            onPress={() =>
                                mutation.mutate({ config: draft, comment: comment.trim() })
                            }
                        >
                            Опубликовать версию {version + 1}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
