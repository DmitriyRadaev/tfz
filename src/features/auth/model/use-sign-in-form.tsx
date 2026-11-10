"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { authApi, type SignInBodyDto } from "@/shared/api/authApi";
import { extractErrorMessage } from "@/shared/api/api-instance";
import { ROUTES } from "@/shared/constants/routes";

/**
 * Форма авторизации.
 *
 * Обрабатывает отправку данных, сообщения об ошибках и переход после входа.
 * Токены приходят в httpOnly-куках, поэтому ничего сохранять на клиенте не нужно.
 */
export function useSignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { register, handleSubmit } = useForm<SignInBodyDto>({
        defaultValues: { email: "", password: "" },
    });

    const signInMutation = useMutation({
        mutationFn: (data: SignInBodyDto) => authApi.signIn(data),
        onSuccess: ({ user }) => {
            const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

            // Возвращаем пользователя туда, откуда его увёл middleware.
            // Принимаем только относительные пути: внешний адрес в параметре
            // превратил бы страницу входа в инструмент для открытого редиректа.
            const requested = searchParams.get("redirect");
            const fallback = isAdmin ? ROUTES.ADMIN_HOME : ROUTES.HOME;

            const target =
                requested &&
                requested.startsWith("/") &&
                !requested.startsWith("//")
                    ? requested
                    : fallback;

            // `replace`, чтобы кнопка «назад» не возвращала на форму входа.
            router.replace(target);
            // Сервер выставил куки — обновляем серверные компоненты и middleware.
            router.refresh();
        },
    });

    const errorMessage = signInMutation.error
        ? extractErrorMessage(signInMutation.error, "Неверный email или пароль")
        : undefined;

    return {
        register,
        errorMessage,
        /** Пользователь только что зарегистрировался и ждёт подтверждения. */
        isAwaitingApproval: searchParams.get("pending") === "1",
        handleSubmit: handleSubmit((data) => signInMutation.mutate(data)),
        isPending: signInMutation.isPending,
    };
}
