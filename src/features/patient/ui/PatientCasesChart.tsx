import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { useState, useMemo } from "react";
import type { PatientCase } from "@/shared/api/patientApi";
import { formatShortDate } from "@/shared/lib/format";

type Metric = {
    key: keyof PatientCase;
    label: string;
    unit: string;
    refMin?: number;
    refMax?: number;
    color: string;
};

const METRICS: Metric[] = [
    { key: "ttg",    label: "ТТГ",          unit: "мМЕ/л",    refMin: 0.4,  refMax: 4.0,   color: "#185FA5" },
    { key: "st4",    label: "св.Т4",        unit: "пмоль/л",  refMin: 11.5, refMax: 22.7,  color: "#1D9E75" },
    { key: "atrttg", label: "АТ-рТТГ",     unit: "МЕ/л",      refMin: 1,    refMax: 1.75,  color: "#D85A30" },
    { key: "thyroid_volume",               label: "Объём ЩЖ", unit: "мл",                  color: "#534AB7" },
    { key: "thyrostatic_daily_dose_mg",    label: "Доза",      unit: "мг/сут",              color: "#BA7517" },
];

type Props = { cases: PatientCase[] };

export function PatientCasesChart({ cases }: Props) {
    const [activeKey, setActiveKey] = useState<keyof PatientCase>("ttg");

    const sorted = useMemo(
        () => [...cases].sort((a, b) => a.created_at.localeCompare(b.created_at)),
        [cases]
    );

    const chartData = useMemo(
        () => sorted
            .filter(c => c[activeKey] !== "" && c[activeKey] !== null)
            .map(c => ({
                date: formatShortDate(c.created_at),
                value: Number(c[activeKey]),
            })),
        [sorted, activeKey]
    );

    const activeMetric = METRICS.find(m => m.key === activeKey)!;

    // Карточки — последнее значение + тренд
    const summaryCards = METRICS.slice(0, 4).map(m => {
        const vals = sorted
            .map(c => c[m.key])
            .filter(v => v !== "" && v !== null)
            .map(Number);
        const last = vals.at(-1);
        const prev = vals.at(-2);
        const delta = last !== undefined && prev !== undefined ? last - prev : null;
        return { ...m, last, delta };
    });

    if (cases.length < 2) return null; // не показываем при одном приёме

    return (
        <div className="bg-white rounded-xl border border-gray-200/50 shadow-lg p-4 sm:p-6 mb-4">
            {/* Сводные карточки */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {summaryCards.map(m => (
                    <div key={String(m.key)} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{m.label} ({m.unit})</p>
                        <p className="text-xl font-medium text-gray-800">
                            {m.last?.toFixed(2) ?? "—"}
                        </p>
                        {m.delta !== null && (
                            m.delta === 0
                                ? <p className="text-xs mt-0.5 text-gray-400">→ Не изменилось</p>
                                : <p className={`text-xs mt-0.5 ${m.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                    {m.delta > 0 ? "▲" : "▼"} {Math.abs(m.delta).toFixed(2)} к пред.
                                </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Табы */}
            <div className="flex flex-wrap gap-2 mb-4">
                {METRICS.map(m => (
                    <button
                        key={String(m.key)}
                        onClick={() => setActiveKey(m.key)}
                        className={`px-3 py-1 rounded-full text-xs border transition-all ${
                            activeKey === m.key
                                ? "bg-blue-50 text-blue-800 border-blue-300 font-medium"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* График */}
            <p className="text-xs text-gray-400 mb-2">{activeMetric.label} ({activeMetric.unit})</p>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={45} />
                    <Tooltip formatter={(v) => [Number(v).toFixed(2), activeMetric.label]} />
                    {activeMetric.refMax && (
                        <ReferenceLine y={activeMetric.refMax} stroke="rgba(200,0,0,0.3)"
                                       strokeDasharray="5 3" label={{ value: "норма max", fontSize: 10 }} />
                    )}
                    {activeMetric.refMin && (
                        <ReferenceLine y={activeMetric.refMin} stroke="rgba(0,160,0,0.3)"
                                       strokeDasharray="5 3" label={{ value: "норма min", fontSize: 10 }} />
                    )}
                    <Line
                        type="monotone" dataKey="value"
                        stroke={activeMetric.color} strokeWidth={2}
                        dot={{ r: 4, fill: activeMetric.color }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}