import { useQueryClient } from "@tanstack/react-query";

/**
 * Полная очистка клиентского кэша.
 *
 * Вызывается при выходе: иначе данные предыдущего пользователя остались бы
 * в памяти и показались следующему, кто войдёт в этой же вкладке.
 */
export function useResetSession() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.clear();
    };
}
