"use client";

import Link from "next/link";

import type { PatientCase, Severity } from "@/shared/api/patientApi";
import { ROUTES } from "@/shared/constants/routes";
import { formatYears } from "@/shared/lib/format";

/** Те же токены, что и на карточках приёмов — результат должен читаться одинаково. */
const SEVERITY_STYLES: Record<Severity, string> = {
    "лёгкая": "bg-severity-light-bg text-severity-light",
    "средняя": "bg-severity-medium-bg text-severity-medium",
    "тяжёлая": "bg-severity-heavy-bg text-severity-heavy",
};

function yesNo(value: boolean) {
    return value ? "Есть" : "Нет";
}

type CaseResultProps = {
    patientCase: PatientCase;
};

/**
 * Результаты расчёта: исходные параметры и рекомендация.
 *
 * Балл и степень тяжести вынесены в отдельный блок наверху — это главный вывод
 * системы, и раньше он терялся в общем списке параметров.
 */
export function CaseResult({ patientCase }: CaseResultProps) {
    const parameters: Array<{ label: string; value: string | number }> = [
        { label: "Возраст на момент приёма", value: formatYears(patientCase.age) },
        { label: "Объём щитовидной железы, мл", value: patientCase.thyroid_volume },
        { label: "сТ4, нг/дл", value: patientCase.st4 },
        { label: "ТТГ, мкМЕ/мл", value: patientCase.ttg },
        { label: "АтрТТГ, МЕ/л", value: patientCase.atrttg },
        { label: "Эндокринная офтальмопатия, стадия", value: patientCase.eop_stage },
        {
            label: "Суточная доза тиреостатиков, мг/сут",
            value: patientCase.thyrostatic_daily_dose_mg,
        },
        {
            label: "Длительность терапии, мес.",
            value: patientCase.thyrostatic_therapy_duration_months,
        },
        {
            label: "Осложнения со стороны ССС",
            value: yesNo(patientCase.ccc_complications),
        },
        {
            label: "Компрессионный синдром",
            value: yesNo(patientCase.compression_syndrome),
        },
        {
            label: "Полиморфизм гена SLCO1B1",
            value: yesNo(patientCase.slco1b1_polymorphism),
        },
        {
            label: "Множественные узлы в ЩЖ",
            value: yesNo(patientCase.mode === "mtz"),
        },
    ];

    // Локализация имеет смысл только при МТЗ — у ДТЗ строку не показываем.
    if (patientCase.mode === "mtz") {
        parameters.push({
            label: "Локализация узлов",
            value:
                patientCase.nodules_bilateral === null
                    ? "не указана"
                    : patientCase.nodules_bilateral
                      ? "обе доли"
                      : "одна доля",
        });
    }

    const breakdown = patientCase.breakdown;

    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">Результаты расчёта</h2>
                <Link
                    href={ROUTES.SCALE}
                    className="text-sm text-brand-600 hover:underline"
                >
                    Шкала, версия №{patientCase.ruleset_version} →
                </Link>
            </div>

            {/* Главный вывод */}
            <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-brand-100 bg-brand-50 p-4">
                <div>
                    <p className="text-xs font-medium tracking-wide text-brand-700 uppercase">
                        Интегральный показатель
                    </p>
                    <p className="text-3xl font-bold text-brand-600 tabular-nums">
                        {patientCase.score}
                        <span className="ml-1 text-base font-medium">
                            {patientCase.score % 10 === 1 && patientCase.score % 100 !== 11
                                ? "балл"
                                : "баллов"}
                        </span>
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium tracking-wide text-brand-700 uppercase">
                        Степень тяжести
                    </p>
                    <span
                        className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                            SEVERITY_STYLES[patientCase.severity] ??
                            "bg-neutral-100 text-neutral-700"
                        }`}
                    >
                        {patientCase.severity}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
                {/* Разбивка по баллам */}
                <div>
                    <h3 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                        Из чего сложился балл
                    </h3>

                    {breakdown && !breakdown.exact && (
                        <p className="mb-3 rounded-lg border border-severity-medium-bg bg-severity-medium-bg p-3 text-xs leading-relaxed text-severity-medium">
                            Версия шкалы №{patientCase.ruleset_version}, по которой
                            выполнялся расчёт, не найдена. Разбивка посчитана по
                            действующей шкале и может отличаться от исходной.
                        </p>
                    )}

                    {breakdown && !breakdown.consistent && (
                        <p className="mb-3 rounded-lg border border-severity-heavy-bg bg-severity-heavy-bg p-3 text-xs leading-relaxed text-severity-heavy">
                            Сумма слагаемых не сходится с сохранённым баллом
                            ({patientCase.score}). Доверять следует сохранённому
                            значению — именно на его основании выдана рекомендация.
                        </p>
                    )}

                    {breakdown ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left text-xs tracking-wide text-neutral-500 uppercase">
                                    <th scope="col" className="pb-2 font-medium">
                                        Критерий
                                    </th>
                                    <th scope="col" className="pb-2 font-medium">
                                        Значение
                                    </th>
                                    <th scope="col" className="pb-2 text-right font-medium">
                                        Балл
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {breakdown.rows.map((row) => (
                                    <tr key={row.key}>
                                        <td className="py-2 pr-3 text-neutral-600">
                                            {row.label}
                                            {row.unit && (
                                                <span className="text-neutral-400">
                                                    , {row.unit}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span className="font-medium text-ink tabular-nums">
                                                {row.value}
                                            </span>
                                            {/* У булевых критериев и
                                                 перечислений условие дословно
                                                 повторяет значение — второй
                                                 строкой его не показываем. */}
                                            {row.matched !== row.value && (
                                                <span className="block text-xs text-neutral-400">
                                                    {row.matched}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`py-2 text-right font-semibold tabular-nums ${
                                                row.points > 0
                                                    ? "text-ink"
                                                    : "text-neutral-300"
                                            }`}
                                        >
                                            {row.points}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-neutral-300">
                                    <td
                                        colSpan={2}
                                        className="pt-2 font-semibold text-ink"
                                    >
                                        Итого
                                    </td>
                                    <td className="pt-2 text-right text-base font-bold text-brand-600 tabular-nums">
                                        {breakdown.rows.reduce(
                                            (sum, row) => sum + row.points,
                                            0,
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <dl className="divide-y divide-neutral-100">
                            {parameters.map((parameter) => (
                                <div
                                    key={parameter.label}
                                    className="flex items-baseline justify-between gap-4 py-2.5"
                                >
                                    <dt className="text-sm text-neutral-600">
                                        {parameter.label}
                                    </dt>
                                    <dd className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                                        {parameter.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>

                {/* Рекомендация */}
                <div>
                    <h3 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                        Рекомендация
                    </h3>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-[15px] leading-relaxed whitespace-pre-line text-neutral-800">
                        {patientCase.recommendation}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                        Расчёт носит справочный характер и не заменяет решение
                        лечащего врача.
                    </p>
                </div>
            </div>
        </section>
    );
}
