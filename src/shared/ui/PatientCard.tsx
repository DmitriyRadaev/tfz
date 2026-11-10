import type { Patient } from "@/shared/api/patientApi";
import { formatAge, formatDate } from "@/shared/lib/format";

type PatientCardProps = {
    patient: Patient;
    actions?: React.ReactNode;
};

type FieldProps = {
    label: string;
    children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
    return (
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-4">
            <dt className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
                {label}
            </dt>
            <dd className="text-base font-semibold break-words text-ink sm:text-lg">
                {children}
            </dd>
        </div>
    );
}

export function PatientCard({ patient, actions }: PatientCardProps) {
    const age = formatAge(patient.birth_date);

    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">Карточка пациента</h2>
                {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                <Field label="ФИО">{patient.full_name}</Field>
                <Field label="Дата рождения">
                    {formatDate(patient.birth_date)}
                    {age && (
                        <span className="font-normal text-neutral-500"> ({age})</span>
                    )}
                </Field>
                <Field label="Пол">{patient.gender_display}</Field>
            </dl>
        </section>
    );
}
