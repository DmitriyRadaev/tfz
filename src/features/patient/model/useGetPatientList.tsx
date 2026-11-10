import { useMemo } from "react";

import { usePatientListQuery } from "@/entities/patient";

/**
 * Список пациентов с поиском.
 *
 * Фильтрация делается на клиенте: список пациентов одной клиники невелик,
 * а запрос к API на каждое нажатие клавиши того не стоит.
 *
 * Выбранного пациента хук не хранит — это состояние страницы: от него
 * зависят и карточка, и история приёмов, поэтому владеть им должен тот,
 * кто рисует всё вместе.
 */
export function useGetPatientList(searchTerm = "") {
    const patientListQuery = usePatientListQuery();
    const data = patientListQuery.data;

    const filteredPatientList = useMemo(() => {
        const patients = data ?? [];
        const query = searchTerm.trim().toLowerCase();
        if (!query) return patients;

        return patients.filter((patient) =>
            [patient.full_name, patient.birth_date, patient.gender_display]
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [data, searchTerm]);

    return {
        patientList: filteredPatientList,
        totalCount: data?.length ?? 0,
        isLoading: patientListQuery.isPending,
        isError: patientListQuery.isError,
    };
}
