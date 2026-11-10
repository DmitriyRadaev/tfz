"use client";

import Link from "next/link";

import { useProfileQuery } from "@/entities/profile";
import { SignOutButton } from "@/features/auth";
import { CreateAdminForm, WorkerProfilesTable } from "@/features/admin";
import { ProfileButton } from "@/features/profile";
import { ROUTES } from "@/shared/constants/routes";

/**
 * Административный раздел.
 *
 * Заменяет те сценарии Django-админки, которые у приложения действительно есть
 * в API: просмотр сотрудников и создание администраторов. Остальное
 * администрирование (правка пациентов и расчётов) делается из основного
 * интерфейса врача — там же, где эти данные и создаются.
 */
export default function AdminHomePage() {
    const { data: profile } = useProfileQuery();
    const isSuperAdmin = profile?.role === "SUPERADMIN";

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold text-black truncate">
                                Администрирование
                            </h1>
                            <p className="text-[#006CB4] text-xs sm:text-sm">
                                {profile
                                    ? `${profile.surname} ${profile.name} — ${profile.role_display}`
                                    : "Загрузка профиля…"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <Link
                                href={ROUTES.SCALE}
                                className="text-sm text-brand-600 hover:underline"
                            >
                                Шкала расчёта
                            </Link>
                            <Link
                                href={ROUTES.HOME}
                                className="text-sm text-brand-600 hover:underline"
                            >
                                К рабочему месту
                            </Link>
                            <ProfileButton />
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                <section className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Сотрудники
                    </h2>
                    <WorkerProfilesTable />
                </section>

                <section className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">
                        Новый администратор
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Создавать администраторов может только главный администратор.
                    </p>

                    {isSuperAdmin ? (
                        <CreateAdminForm />
                    ) : (
                        <p className="text-sm text-gray-500">
                            У вашей роли нет прав на создание администраторов.
                        </p>
                    )}
                </section>

                <section className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">
                        Документация API
                    </h2>
                    <p className="text-sm text-gray-500 mb-3">
                        Актуальная схема всех эндпоинтов приложения.
                    </p>
                    <Link
                        href={ROUTES.API_DOCS}
                        className="text-sm text-[#006CB4] hover:underline"
                    >
                        Открыть /api-docs →
                    </Link>
                </section>
            </main>
        </div>
    );
}
