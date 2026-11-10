"use client";

import { useRulesetVersionsQuery } from "@/entities/scoring";
import { formatDateTime } from "@/shared/lib/format";
import { Skeleton } from "@/shared/ui/Skeleton";

/** История версий шкалы: когда и зачем её меняли. */
export function RulesetHistory() {
    const { data, isPending, isError } = useRulesetVersionsQuery();

    if (isPending) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-red-600">
                Не удалось загрузить историю версий
            </p>
        );
    }

    return (
        <ol className="space-y-2">
            {data.map((item) => (
                <li
                    key={item.version}
                    className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border p-3 text-sm ${
                        item.is_active
                            ? "border-brand-200 bg-brand-50"
                            : "border-neutral-200 bg-white"
                    }`}
                >
                    <span className="font-semibold text-ink">№{item.version}</span>
                    {item.is_active && (
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                            действует
                        </span>
                    )}
                    <span className="text-neutral-600">{item.comment}</span>
                    <span className="ml-auto text-xs whitespace-nowrap text-neutral-400">
                        {formatDateTime(item.created_at)}
                    </span>
                </li>
            ))}
        </ol>
    );
}
