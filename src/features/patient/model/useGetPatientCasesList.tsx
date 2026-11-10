import { usePatientCasesListQuery } from "@/entities/patient";
import type { CalculationMode } from "@/shared/api/patientApi";

/** История приёмов (расчётов) выбранного пациента. */
export function useGetPatientCasesList(
    idPatient: number | undefined,
    mode?: CalculationMode,
) {
    const patientCasesListQuery = usePatientCasesListQuery(idPatient, mode);

    return {
        patientCasesList: patientCasesListQuery.data ?? [],
        isLoading: patientCasesListQuery.isPending,
        isError: patientCasesListQuery.isError,
    };
}
