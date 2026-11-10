import { useDeleteCaseMutation } from "@/entities/case";
import { useGetPatientCasesList } from "@/features/patient/model/useGetPatientCasesList";
import { PatientCaseCardSkeleton } from "@/shared/ui/Skeleton";
import { Button } from "@/shared/ui/Button";
import type { PatientCase, Severity } from "@/shared/api/patientApi";
import { UiModal } from "@/shared/ui/UiModal";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { CreateCaseForm } from "@/features/case/ui/createCaseForm";
import { PatientCasesChart } from "@/features/patient/ui/PatientCasesChart";
import { formatDateTime } from "@/shared/lib/format";

type PatientCasesListProps = {
    selectedCase: PatientCase | null;
    idPatient: number;
    onOpenCase: (patientCase: PatientCase) => void;
    /** Вызывается, когда удалён приём, открытый в блоке результатов. */
    onCaseDeleted: (deletedId: number) => void;
};

/** Цвета степеней тяжести заданы токенами — те же значения в блоке результатов. */
const SEVERITY_STYLES: Record<Severity, string> = {
    "лёгкая": "bg-severity-light-bg text-severity-light",
    "средняя": "bg-severity-medium-bg text-severity-medium",
    "тяжёлая": "bg-severity-heavy-bg text-severity-heavy",
};

export function PatientCasesList({
    selectedCase,
    idPatient,
    onOpenCase,
    onCaseDeleted,
}: PatientCasesListProps) {
    const { patientCasesList, isError, isLoading } =
        useGetPatientCasesList(idPatient);

    const deleteCaseMutation = useDeleteCaseMutation();

    const handleDelete = (patientCase: PatientCase) => {
        deleteCaseMutation.mutate(patientCase.id, {
            onSuccess: () => onCaseDeleted(patientCase.id),
        });
    };

    const addCaseButton = (
        <UiModal
            button={
                <Button
                    variant="secondary"
                    className="h-full min-h-[92px] w-full border-brand-200 bg-brand-50 text-3xl font-medium text-brand-700 hover:bg-brand-100"
                    aria-label="Добавить приём"
                >
                    +
                </Button>
            }
        >
            {({ close }) => (
                <CreateCaseForm closeModal={close} idPatient={idPatient} />
            )}
        </UiModal>
    );

    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-ink">Список приёмов</h2>

            {isLoading && (
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <PatientCaseCardSkeleton key={index} />
                    ))}
                </div>
            )}

            {isError && !isLoading && (
                <div className="p-6 text-center sm:p-8">
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
                        Не удалось загрузить список приёмов
                    </p>
                    <Button variant="secondary" onPress={() => window.location.reload()}>
                        Попробовать снова
                    </Button>
                </div>
            )}

            {!isLoading && !isError && patientCasesList.length === 0 && (
                <div className="p-6 text-center sm:p-8">
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-1 text-base font-medium text-ink">
                        Приёмы не найдены
                    </h3>
                    <p className="mb-6 text-sm text-neutral-500">
                        Добавьте первый приём, нажав кнопку ниже
                    </p>
                    <div className="mx-auto w-full sm:w-1/2">{addCaseButton}</div>
                </div>
            )}

            {!isLoading && !isError && patientCasesList.length >= 2 && (
                <PatientCasesChart cases={patientCasesList} />
            )}

            {!isLoading && !isError && patientCasesList.length > 0 && (
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                    {patientCasesList.map((item) => {
                        const isSelected = selectedCase?.id === item.id;

                        return (
                            /*
                             * Кнопка удаления — сосед основной кнопки, а не её
                             * потомок: вложенная кнопка невалидна в HTML и
                             * ломает навигацию с клавиатуры.
                             */
                            <div key={item.id} className="group relative">
                                <button
                                    type="button"
                                    onClick={() => onOpenCase(item)}
                                    aria-pressed={isSelected}
                                    className={`h-full w-full cursor-pointer rounded-lg border p-3 pr-10 text-left transition-colors duration-150 sm:p-4 sm:pr-10 ${
                                        isSelected
                                            ? "border-brand-500 bg-brand-50"
                                            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                                    }`}
                                >
                                    <h3 className="mb-2 text-sm font-medium text-ink sm:text-base">
                                        Приём от {formatDateTime(item.created_at)}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand-700">
                                            {item.mode === "dtz" ? "ДТЗ" : "МТЗ"}
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                                                SEVERITY_STYLES[item.severity] ??
                                                "bg-neutral-100 text-neutral-700"
                                            }`}
                                        >
                                            {item.score} б. — {item.severity}
                                        </span>
                                    </div>
                                </button>

                                <ConfirmDialog
                                    title="Удалить приём?"
                                    description={
                                        <>
                                            Приём от{" "}
                                            <strong>
                                                {formatDateTime(item.created_at)}
                                            </strong>{" "}
                                            ({item.score} б. — {item.severity}) будет
                                            удалён из истории пациента. Отменить это
                                            действие нельзя.
                                        </>
                                    }
                                    isPending={deleteCaseMutation.isPending}
                                    onConfirm={() => handleDelete(item)}
                                    trigger={
                                        <Button
                                            variant="quiet"
                                            aria-label={`Удалить приём от ${formatDateTime(item.created_at)}`}
                                            className="absolute top-2 right-2 h-8 w-8 p-0 text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
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
                                        </Button>
                                    }
                                />
                            </div>
                        );
                    })}

                    {addCaseButton}
                </div>
            )}
        </section>
    );
}
