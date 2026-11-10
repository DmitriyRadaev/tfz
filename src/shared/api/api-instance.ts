import axios, { AxiosError, AxiosRequestConfig } from "axios";

import { getQueryClient } from "@/shared/api/query-client";

/**
 * Единый HTTP-клиент приложения.
 *
 * После объединения фронтенда и бэкенда в одно приложение API живёт на том же
 * origin, поэтому:
 *  - базовый адрес — относительный `/api`, никаких CORS и NEXT_PUBLIC_*;
 *  - CSRF-токен не нужен: куки помечены SameSite=Lax, а сервер дополнительно
 *    сверяет заголовок Origin (см. `server/http/origin.ts`).
 */

/** Эндпоинты, для которых обновление токена не имеет смысла. */
const AUTH_ENDPOINTS = [
    "/auth/login",
    "/auth/logout",
    "/auth/refresh",
    "/auth/register",
];

export const apiInstance = axios.create({
    baseURL: "/api",
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
});

const isAuthEndpoint = (url: string) =>
    AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

/**
 * Одновременные 401 не должны порождать несколько запросов на обновление:
 * иначе первый же ротирует refresh-токен, а остальные получат «токен уже
 * использован» — и сервер отзовёт все сессии пользователя как при краже.
 */
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
    refreshPromise ??= apiInstance
        .post("/auth/refresh")
        .then(() => undefined)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

type RetriableConfig = AxiosRequestConfig & { _isRetry?: boolean };

apiInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableConfig | undefined;
        const status = error.response?.status;

        if (
            status === 401 &&
            originalRequest &&
            !originalRequest._isRetry &&
            !isAuthEndpoint(originalRequest.url ?? "")
        ) {
            originalRequest._isRetry = true;
            try {
                await refreshSession();
                return apiInstance(originalRequest);
            } catch {
                return handleAuthFailure();
            }
        }

        if (
            status === 401 &&
            originalRequest?._isRetry &&
            !isAuthEndpoint(originalRequest.url ?? "")
        ) {
            return handleAuthFailure();
        }

        return Promise.reject(error);
    },
);

async function handleAuthFailure(): Promise<never> {
    getQueryClient().clear();

    try {
        // Снимаем куки на сервере, чтобы middleware сразу увидел отсутствие сессии.
        await apiInstance.post("/auth/logout");
    } catch (logoutError) {
        console.error("Не удалось корректно завершить сессию:", logoutError);
    }

    if (typeof window !== "undefined") {
        window.location.replace("/sign-in");
    }

    throw new Error("AUTH_EXPIRED");
}

export const createInstance = <T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig,
): Promise<T> =>
    apiInstance({ ...config, ...options }).then((response) => response.data);

export type RequestOptions = Parameters<typeof createInstance>[1];
export type BodyType<Data> = Data;
export type ErrorType<Error> = AxiosError<Error>;

/** Форма ошибки, которую отдаёт API. */
export interface ApiErrorBody {
    detail: string;
    errors?: Record<string, string[]>;
}

/** Достаёт человекочитаемое сообщение из ошибки axios. */
export function extractErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
        const body = error.response?.data;
        const fieldError = body?.errors
            ? Object.values(body.errors).flat()[0]
            : undefined;
        return fieldError ?? body?.detail ?? fallback;
    }
    return fallback;
}
