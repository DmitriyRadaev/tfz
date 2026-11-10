import { UiModal } from "@/shared/ui/UiModal";
import { Button } from "@/shared/ui/Button";
import { useGetPatientList } from "@/features/patient/model/useGetPatientList";
import type { Patient } from "@/shared/api/patientApi";
import { PatientCardSkeleton } from "@/shared/ui/Skeleton";
import { CreatePatientForm } from "@/features/patient";
import { formatAge, formatDate } from "@/shared/lib/format";

type PatientListProps = {
    onOpenPatient: (patient: Patient) => void;
    /** Строка поиска: фильтрация идёт по ФИО, дате рождения и полу. */
    searchTerm?: string;
    /** Пациент, выбранный на уровне страницы. */
    selectedPatientId?: number | null;
};

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="p-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <svg
                    className="h-6 w-6 text-brand-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>
            </div>
            <h3 className="mb-1 text-base font-medium text-ink">{title}</h3>
            <p className="text-sm text-neutral-500">{description}</p>
        </div>
    );
}

export function PatientList({
    onOpenPatient,
    searchTerm = "",
    selectedPatientId = null,
}: PatientListProps) {
    const { patientList, totalCount, isLoading, isError } =
        useGetPatientList(searchTerm);

    const isFiltered = searchTerm.trim().length > 0;

    return (
        <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto">
            {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                    <PatientCardSkeleton key={index} />
                ))}

            {isError && !isLoading && (
                <div className="p-6 text-center">
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                        <svg
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-1 text-base font-medium text-ink">
                        Ошибка загрузки
                    </h3>
                    <p className="mb-4 text-sm text-neutral-500">
                        Не удалось загрузить список пациентов
                    </p>
                    <Button variant="secondary" onPress={() => window.location.reload()}>
                        Попробовать снова
                    </Button>
                </div>
            )}

            {!isLoading && !isError && patientList.length === 0 && (
                <EmptyState
                    title={isFiltered ? "Ничего не найдено" : "Пациенты не найдены"}
                    description={
                        isFiltered
                            ? `Среди ${totalCount} пациентов нет совпадений с «${searchTerm}»`
                            : "Добавьте первого пациента, нажав кнопку ниже"
                    }
                />
            )}

            {!isLoading &&
                !isError &&
                patientList.map((patient) => {
                    const age = formatAge(patient.birth_date);
                    const isSelected = selectedPatientId === patient.id;

                    return (
                        <button
                            key={patient.id}
                            type="button"
                            onClick={() => onOpenPatient(patient)}
                            aria-pressed={isSelected}
                            className={`block w-full cursor-pointer rounded-lg border p-3 text-left transition-colors duration-150 ${
                                isSelected
                                    ? "border-brand-500 bg-brand-50"
                                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                            }`}
                        >
                            <h3 className="mb-2 font-medium text-ink">
                                {patient.full_name}
                            </h3>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-neutral-600">
                                    {formatDate(patient.birth_date)}
                                    {age && ` · ${age}`}
                                </p>
                                <span className="inline-flex shrink-0 items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand-700">
                                    {patient.gender_display}
                                </span>
                            </div>
                        </button>
                    );
                })}

            {!isLoading && !isError && (
                <UiModal
                    button={
                        <Button
                            variant="secondary"
                            className="mt-4 min-h-18 w-full border-brand-200 bg-brand-50 text-4xl font-medium text-brand-700 hover:bg-brand-100"
                            aria-label="Добавить пациента"
                        >
                            +
                        </Button>
                    }
                >
                    {({ close }) => <CreatePatientForm closeModal={close} />}
                </UiModal>
            )}
        </div>
    );
}
