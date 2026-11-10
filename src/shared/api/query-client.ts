import { QueryClient } from "@tanstack/react-query";

/**
 * Создание QueryClient.
 *
 * В браузере клиент один на всё приложение, на сервере — новый на каждый рендер.
 * Это принципиально: общий серверный инстанс делил бы кэш между запросами разных
 * пользователей, то есть данные одного врача могли бы попасть другому.
 */
export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Данные считаются свежими минуту: убирает повторные запросы
                // при переключении пациентов туда-обратно.
                staleTime: 60 * 1000,
                gcTime: 5 * 60 * 1000,
                refetchOnWindowFocus: false,
                // Повторять запрос при 401/403/404 бессмысленно — обновлением
                // токена занимается интерцептор axios.
                retry: (failureCount, error) => {
                    const status = (
                        error as { response?: { status?: number } } | undefined
                    )?.response?.status;
                    if (status && status >= 400 && status < 500) return false;
                    return failureCount < 2;
                },
            },
            mutations: {
                retry: 0,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
    if (typeof window === "undefined") {
        return makeQueryClient();
    }
    return (browserQueryClient ??= makeQueryClient());
}
