import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountApi, type UpdateProfileBody } from "@/shared/api/accountApi";
import { extractErrorMessage } from "@/shared/api/api-instance";
import { queryKeys } from "@/shared/api/query-keys";
import { queue } from "@/shared/ui/Toast";

/** Профиль текущего пользователя. */
export function useProfileQuery() {
    return useQuery({
        queryKey: queryKeys.profile,
        queryFn: () => accountApi.getProfileInfo(),
        // Профиль меняется редко — держим свежим час, чтобы не дёргать API.
        staleTime: 60 * 60 * 1000,
    });
}

/** Профили сотрудников — доступно только администраторам. */
export function useWorkerProfilesQuery({ enabled = true } = {}) {
    return useQuery({
        queryKey: queryKeys.workerProfiles.list(),
        queryFn: () => accountApi.getWorkerProfiles(),
        enabled,
    });
}

/** Редактирование собственного профиля. */
export function useUpdateProfileMutation({
    onSuccessActions,
}: {
    onSuccessActions?: Array<() => void>;
} = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateProfileBody) => accountApi.updateProfile(data),
        onSuccess: (account) => {
            // Профиль кэшируется на час — подменяем значение сразу, чтобы
            // шапка обновилась без лишнего запроса.
            queryClient.setQueryData(queryKeys.profile, account);
            queryClient.invalidateQueries({
                queryKey: queryKeys.workerProfiles.all,
            });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: "Профиль обновлён",
                    description: "Изменения сохранены",
                    type: "success",
                },
                { timeout: 3000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Профиль не обновлён",
                    description: extractErrorMessage(
                        error,
                        "Не удалось сохранить изменения",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}

/** Подтверждение заявки на регистрацию или блокировка сотрудника. */
export function useSetAccountActiveMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
            accountApi.setAccountActive(id, isActive),
        onSuccess: (account) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.workerProfiles.all,
            });

            queue.add(
                {
                    title: account.is_active
                        ? "Доступ открыт"
                        : "Доступ закрыт",
                    description: account.is_active
                        ? `${account.email} теперь может входить в систему`
                        : `${account.email} больше не имеет доступа`,
                    type: "success",
                },
                { timeout: 4000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Статус не изменён",
                    description: extractErrorMessage(
                        error,
                        "Не удалось изменить статус учётной записи",
                    ),
                    type: "error",
                },
                { timeout: 5000 },
            );
        },
    });
}
