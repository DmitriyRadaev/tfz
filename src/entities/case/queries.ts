import { useMutation, useQueryClient } from "@tanstack/react-query";

import { caseApi, type CalculateData } from "@/shared/api/caseApi";
import { patientApi } from "@/shared/api/patientApi";
import { extractErrorMessage } from "@/shared/api/api-instance";
import { queryKeys } from "@/shared/api/query-keys";
import { queue } from "@/shared/ui/Toast";

type OnSuccessAction = () => void;

/** Добавление нового приёма (расчёта) для пациента. */
export function useCreateCaseMutation({
    idPatient,
    onSuccessActions,
}: {
    idPatient: number;
    onSuccessActions?: OnSuccessAction[];
}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CalculateData) => caseApi.createCase(idPatient, data),
        onSuccess: () => {
            // Инвалидируем все варианты фильтра по режиму для этого пациента.
            queryClient.invalidateQueries({
                queryKey: queryKeys.calculations.all,
            });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: "Приём добавлен",
                    description: "Расчёт выполнен и сохранён в истории",
                    type: "success",
                },
                { timeout: 3000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Приём не добавлен",
                    description: extractErrorMessage(
                        error,
                        "Не удалось выполнить расчёт",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}

/** Удаление приёма из истории. */
export function useDeleteCaseMutation({
    onSuccessActions,
}: {
    onSuccessActions?: OnSuccessAction[];
} = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (idCase: number) => patientApi.deleteCase(idCase),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.calculations.all,
            });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: "Приём удалён",
                    description: "Расчёт убран из истории пациента",
                    type: "success",
                },
                { timeout: 3000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Приём не удалён",
                    description: extractErrorMessage(
                        error,
                        "Не удалось удалить приём",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}
