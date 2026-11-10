import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    patientApi,
    type CalculationMode,
    type CreatePatient,
    type UpdatePatient,
} from "@/shared/api/patientApi";
import { extractErrorMessage } from "@/shared/api/api-instance";
import { queryKeys } from "@/shared/api/query-keys";
import { queue } from "@/shared/ui/Toast";

/** Действие, выполняемое после успешной мутации (например, закрытие модалки). */
type OnSuccessAction = () => void;

/* ---------------------------- Запросы ---------------------------- */

export function usePatientListQuery() {
    return useQuery({
        queryKey: queryKeys.patients.list(),
        queryFn: () => patientApi.getPatientList(),
    });
}

export function usePatientCasesListQuery(
    idPatient: number | undefined,
    mode?: CalculationMode,
) {
    return useQuery({
        queryKey: queryKeys.calculations.byPatient(idPatient ?? 0, mode),
        queryFn: () => patientApi.getPatientCasesList(idPatient!, { mode }),
        // Без выбранного пациента запрос не имеет смысла.
        enabled: idPatient !== undefined,
    });
}

/* ---------------------------- Мутации ---------------------------- */

export function useCreatePatientMutation({
    onSuccessActions,
}: {
    onSuccessActions?: OnSuccessAction[];
} = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePatient) => patientApi.createPatient(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: "Пациент добавлен",
                    description: "Пациент успешно добавлен в систему",
                    type: "success",
                },
                { timeout: 3000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Пациент не добавлен",
                    description: extractErrorMessage(
                        error,
                        "Не удалось добавить пациента",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}

export function useUpdatePatientMutation({
    onSuccessActions,
}: {
    onSuccessActions?: OnSuccessAction[];
} = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            idPatient,
            data,
        }: {
            idPatient: number;
            data: UpdatePatient;
        }) => patientApi.updatePatient(idPatient, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: "Пациент обновлён",
                    description: "Данные пациента успешно обновлены",
                    type: "success",
                },
                { timeout: 3000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Пациент не обновлён",
                    description: extractErrorMessage(
                        error,
                        "Не удалось обновить данные пациента",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}

export function useDeletePatientMutation({
    onSuccessActions,
}: {
    onSuccessActions?: OnSuccessAction[];
} = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (idPatient: number) => patientApi.deletePatient(idPatient),
        onSuccess: () => {
            // Удаление пациента уносит и его расчёты — сбрасываем оба поддерева.
            queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
            queryClient.invalidateQueries({
                queryKey: queryKeys.calculations.all,
            });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: "Пациент удалён",
                    description: "Пациент и его история расчётов удалены",
                    type: "success",
                },
                { timeout: 3000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Пациент не удалён",
                    description: extractErrorMessage(
                        error,
                        "Не удалось удалить пациента",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}
