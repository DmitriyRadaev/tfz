import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { extractErrorMessage } from "@/shared/api/api-instance";
import { queryKeys } from "@/shared/api/query-keys";
import { scoringApi, type Ruleset } from "@/shared/api/scoringApi";
import { queue } from "@/shared/ui/Toast";

/** Действующая шкала расчёта. */
export function useActiveRulesetQuery() {
    return useQuery({
        queryKey: queryKeys.scoring.active(),
        queryFn: () => scoringApi.getActiveRuleset(),
        // Шкала меняется крайне редко — держим свежей полчаса.
        staleTime: 30 * 60 * 1000,
    });
}

/** История версий шкалы. */
export function useRulesetVersionsQuery() {
    return useQuery({
        queryKey: queryKeys.scoring.versions(),
        queryFn: () => scoringApi.getRulesets(),
    });
}

/** Публикация новой версии шкалы (только главный администратор). */
export function usePublishRulesetMutation({
    onSuccessActions,
}: {
    onSuccessActions?: Array<() => void>;
} = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { config: Ruleset; comment: string }) =>
            scoringApi.publishRuleset(data),
        onSuccess: (ruleset) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.scoring.all });
            // Разбивка уже выполненных расчётов считается по их версии и не
            // меняется, но новые расчёты пойдут по новой шкале — сбрасываем,
            // чтобы интерфейс не показывал устаревшую версию.
            queryClient.invalidateQueries({
                queryKey: queryKeys.calculations.all,
            });
            onSuccessActions?.forEach((action) => action());

            queue.add(
                {
                    title: `Опубликована версия ${ruleset.version}`,
                    description:
                        "Новые расчёты пойдут по ней. Выполненные ранее " +
                        "сохранят свою версию.",
                    type: "success",
                },
                { timeout: 5000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Шкала не сохранена",
                    description: extractErrorMessage(
                        error,
                        "Не удалось опубликовать новую версию",
                    ),
                    type: "error",
                },
                { timeout: 6000 },
            );
        },
    });
}
