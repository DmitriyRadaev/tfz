"use client";

import Link from "next/link";

import { useProfileQuery } from "@/entities/profile";
import { useActiveRulesetQuery } from "@/entities/scoring";
import { SignOutButton } from "@/features/auth";
import { ProfileButton } from "@/features/profile";
import { RulesetHistory, ScaleEditor } from "@/features/scoring";
import { ROUTES } from "@/shared/constants/routes";
import { Skeleton } from "@/shared/ui/Skeleton";

/**
 * Шкала расчёта.
 *
 * Врачу страница объясняет, из чего складывается интегральный показатель;
 * главному администратору позволяет изменить пороги и веса. Правка создаёт
 * новую версию — выполненные расчёты остаются привязанными к своей.
 */
export default function ScalePage() {
    const { data: profile } = useProfileQuery();
    const { data, isPending, isError } = useActiveRulesetQuery();

    const canEdit = profile?.role === "SUPERADMIN";

    return (
        <div className="min-h-screen bg-[#f6f8fa]">
            <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-bold text-ink sm:text-xl">
                            Шкала расчёта
                        </h1>
                        <p className="text-xs text-brand-600 sm:text-sm">
                            Критерии, пороги и веса интегрального показателя
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <Link
                            href={ROUTES.HOME}
                            className="hidden text-sm text-brand-600 hover:underline sm:inline"
                        >
                            К рабочему месту
                        </Link>
                        <ProfileButton />
                        <SignOutButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 className="mb-1 text-lg font-semibold text-ink">
                        Как считается показатель
                    </h2>
                    <p className="mb-5 text-sm leading-relaxed text-neutral-600">
                        Баллы по каждому критерию складываются в интегральный
                        показатель, он определяет степень тяжести, а она вместе с
                        отдельными факторами — рекомендуемый объём операции.
                        {canEdit
                            ? " Менять шкалу может только главный администратор."
                            : " Изменить шкалу может главный администратор."}
                    </p>

                    {isPending && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-40 w-full rounded-lg" />
                            ))}
                        </div>
                    )}

                    {isError && (
                        <p className="text-sm text-red-600">
                            Не удалось загрузить шкалу расчёта
                        </p>
                    )}

                    {data && (
                        <ScaleEditor
                            ruleset={data.config}
                            version={data.version}
                            canEdit={canEdit}
                        />
                    )}
                </section>

                <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 className="mb-1 text-lg font-semibold text-ink">
                        История версий
                    </h2>
                    <p className="mb-4 text-sm text-neutral-500">
                        Старые версии не удаляются: к ним привязаны выполненные
                        расчёты.
                    </p>
                    <RulesetHistory />
                </section>
            </main>
        </div>
    );
}
