"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useDeletePatientMutation } from "@/entities/patient";
import { useProfileQuery } from "@/entities/profile";
import { SignOutButton } from "@/features/auth";
import { CaseResult } from "@/features/case/ui/caseResult";
import { PatientCasesList, PatientList } from "@/features/patient";
import { ProfileButton } from "@/features/profile";
import type { Patient, PatientCase } from "@/shared/api/patientApi";
import { ROUTES } from "@/shared/constants/routes";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PatientCard } from "@/shared/ui/PatientCard";

export default function WorkstationPage() {
    const { data: profile } = useProfileQuery();

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedCase, setSelectedCase] = useState<PatientCase | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const deletePatientMutation = useDeletePatientMutation({
        // Удалённый пациент не должен остаться открытым в правой колонке.
        onSuccessActions: [
            () => {
                setSelectedPatient(null);
                setSelectedCase(null);
            },
        ],
    });

    const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPERADMIN";

    return (
        <div className="min-h-screen bg-[#f6f8fa]">
            {/* Шапка */}
            <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="rounded-md p-2 hover:bg-neutral-100 lg:hidden"
                        aria-label="Открыть список пациентов"
                        aria-expanded={isMobileSidebarOpen}
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>

                    <Image
                        src="/samgmu-logo.jpg"
                        alt="Самарский государственный медицинский университет"
                        width={180}
                        height={79}
                        priority
                        className="hidden h-12 w-auto object-contain sm:block lg:h-14"
                    />

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-bold text-ink sm:text-base lg:text-lg">
                            АРМ врача — Калькулятор ТФЗ
                        </h1>
                        <p className="hidden text-xs text-brand-600 sm:block">
                            Расчёт интегрального показателя токсических форм зоба
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <Link
                            href={ROUTES.SCALE}
                            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 sm:inline-block"
                        >
                            Шкала
                        </Link>

                        {isAdmin && (
                            <Link
                                href={ROUTES.ADMIN_HOME}
                                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 sm:inline-block"
                            >
                                Администрирование
                            </Link>
                        )}

                        <ProfileButton />

                        <SignOutButton />
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row sm:gap-6">
                    {/* Затемнение под выезжающей панелью на мобильных */}
                    {isMobileSidebarOpen && (
                        <div
                            className="fixed inset-0 z-15 bg-black/50 lg:hidden"
                            onClick={() => setIsMobileSidebarOpen(false)}
                            aria-hidden
                        />
                    )}

                    {/* Левая колонка — список пациентов */}
                    <aside
                        className={`fixed inset-y-0 left-0 z-15 w-80 max-h-screen overflow-y-auto border-r border-neutral-200 bg-white p-4 pt-20 transition-transform duration-200 ease-in-out sm:w-96 lg:relative lg:max-h-none lg:w-1/4 lg:rounded-xl lg:border lg:pt-4 lg:shadow-sm ${
                            isMobileSidebarOpen
                                ? "translate-x-0"
                                : "-translate-x-full lg:translate-x-0"
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="absolute top-4 right-4 rounded-md p-2 hover:bg-neutral-100 lg:hidden"
                            aria-label="Закрыть список пациентов"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                        <h2 className="mb-3 pr-10 text-base font-semibold text-ink lg:pr-0">
                            Список пациентов
                        </h2>

                        <div className="relative mb-4">
                            <svg
                                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <input
                                type="search"
                                placeholder="Поиск по ФИО, дате рождения, полу"
                                aria-label="Поиск пациентов"
                                className="w-full rounded-lg border border-neutral-300 py-2 pr-3 pl-9 text-sm text-ink transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>

                        <PatientList
                            searchTerm={searchTerm}
                            selectedPatientId={selectedPatient?.id ?? null}
                            onOpenPatient={(patient) => {
                                setSelectedPatient(patient);
                                setSelectedCase(null);
                                setIsMobileSidebarOpen(false);
                            }}
                        />
                    </aside>

                    {/* Правая колонка */}
                    <main className="flex-1 space-y-4 sm:space-y-6 lg:w-3/4">
                        {selectedPatient && (
                            <>
                                <PatientCard
                                    patient={selectedPatient}
                                    actions={
                                        <ConfirmDialog
                                            title="Удалить пациента?"
                                            description={
                                                <>
                                                    Пациент{" "}
                                                    <strong>
                                                        {selectedPatient.full_name}
                                                    </strong>{" "}
                                                    будет удалён вместе со{" "}
                                                    <strong>
                                                        всей историей расчётов
                                                    </strong>
                                                    . Восстановить данные будет
                                                    невозможно.
                                                </>
                                            }
                                            confirmLabel="Удалить пациента"
                                            isPending={deletePatientMutation.isPending}
                                            onConfirm={() =>
                                                deletePatientMutation.mutate(
                                                    selectedPatient.id,
                                                )
                                            }
                                            trigger={
                                                <Button
                                                    variant="quiet"
                                                    className="gap-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <svg
                                                        className="h-4 w-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                    Удалить
                                                </Button>
                                            }
                                        />
                                    }
                                />

                                <PatientCasesList
                                    selectedCase={selectedCase}
                                    idPatient={selectedPatient.id}
                                    onOpenCase={setSelectedCase}
                                    onCaseDeleted={(deletedId) => {
                                        // Блок результатов закрываем, только если
                                        // удалён именно открытый приём.
                                        if (selectedCase?.id === deletedId) {
                                            setSelectedCase(null);
                                        }
                                    }}
                                />
                            </>
                        )}

                        {selectedCase && <CaseResult patientCase={selectedCase} />}

                        {/* Пустой экран */}
                        {!selectedPatient && (
                            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-10">
                                <div className="mx-auto max-w-md">
                                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 sm:h-20 sm:w-20">
                                        <svg
                                            className="h-8 w-8 text-brand-500 sm:h-10 sm:w-10"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                            />
                                        </svg>
                                    </div>
                                    <h2 className="mb-2 text-xl font-bold text-ink sm:text-2xl">
                                        Расчёт интегрального показателя
                                        токсических форм зоба
                                    </h2>
                                    <p className="mb-6 text-sm leading-relaxed text-neutral-600 sm:text-base">
                                        Выберите пациента из списка слева, чтобы
                                        открыть карточку и историю приёмов.
                                    </p>
                                    <Button
                                        onPress={() => setIsMobileSidebarOpen(true)}
                                        className="lg:hidden"
                                    >
                                        Открыть список пациентов
                                    </Button>
                                    <p className="hidden items-center justify-center gap-1 text-sm font-medium text-brand-600 lg:inline-flex">
                                        Выберите пациента
                                        <svg
                                            className="h-5 w-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
