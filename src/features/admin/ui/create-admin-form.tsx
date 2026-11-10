"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import {
    accountApi,
    type RegisterPrivilegedBody,
} from "@/shared/api/accountApi";
import { extractErrorMessage } from "@/shared/api/api-instance";
import { Button } from "@/shared/ui/Button";
import { queue } from "@/shared/ui/Toast";
import { UiTextField } from "@/shared/ui/ui-text-field";

type FormValues = RegisterPrivilegedBody & { role: "ADMIN" | "SUPERADMIN" };

/**
 * Создание администратора — заменяет `createsuperuser` и форму добавления
 * пользователя в Django-админке. Доступно только роли SUPERADMIN (проверка
 * выполняется на сервере).
 */
export function CreateAdminForm() {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            email: "",
            name: "",
            surname: "",
            patronymic: "",
            password: "",
            password2: "",
            role: "ADMIN",
        },
    });

    const password = watch("password");

    const mutation = useMutation({
        mutationFn: ({ role, ...body }: FormValues) =>
            role === "SUPERADMIN"
                ? accountApi.registerSuperAdmin(body)
                : accountApi.registerAdmin(body),
        onSuccess: (account) => {
            reset();
            queue.add(
                {
                    title: "Администратор создан",
                    description: `${account.email} — ${account.role_display}`,
                    type: "success",
                },
                { timeout: 4000 },
            );
        },
        onError: (error) => {
            queue.add(
                {
                    title: "Не удалось создать администратора",
                    description: extractErrorMessage(
                        error,
                        "Проверьте введённые данные",
                    ),
                    type: "error",
                },
                { timeout: 6000 },
            );
        },
    });

    return (
        <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UiTextField
                    label="Фамилия"
                    placeholder="Иванов"
                    error={errors.surname?.message}
                    inputProps={{
                        ...register("surname", { required: "Укажите фамилию" }),
                        autoComplete: "family-name",
                    }}
                />
                <UiTextField
                    label="Имя"
                    placeholder="Иван"
                    error={errors.name?.message}
                    inputProps={{
                        ...register("name", { required: "Укажите имя" }),
                        autoComplete: "given-name",
                    }}
                />
                <UiTextField
                    label="Отчество"
                    placeholder="Иванович"
                    error={errors.patronymic?.message}
                    inputProps={{ ...register("patronymic") }}
                />
                <UiTextField
                    label="Email"
                    placeholder="admin@example.com"
                    error={errors.email?.message}
                    inputProps={{
                        ...register("email", {
                            required: "Укажите email",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                                message: "Неверный формат email",
                            },
                        }),
                        type: "email",
                        autoComplete: "off",
                    }}
                />
                <UiTextField
                    label="Пароль"
                    placeholder="Минимум 6 символов"
                    error={errors.password?.message}
                    inputProps={{
                        ...register("password", {
                            required: "Укажите пароль",
                            minLength: { value: 6, message: "Минимум 6 символов" },
                        }),
                        type: "password",
                        autoComplete: "new-password",
                    }}
                />
                <UiTextField
                    label="Повторите пароль"
                    placeholder="Повторите пароль"
                    error={errors.password2?.message}
                    inputProps={{
                        ...register("password2", {
                            required: "Подтвердите пароль",
                            validate: (value) =>
                                value === password || "Пароли не совпадают",
                        }),
                        type: "password",
                        autoComplete: "new-password",
                    }}
                />
            </div>

            <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700">
                    Роль
                </legend>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="radio"
                            value="ADMIN"
                            {...register("role")}
                            className="accent-[#006CB4]"
                        />
                        Администратор
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="radio"
                            value="SUPERADMIN"
                            {...register("role")}
                            className="accent-[#006CB4]"
                        />
                        Главный администратор
                    </label>
                </div>
            </fieldset>

            <Button
                type="submit"
                isPending={mutation.isPending}
                isDisabled={mutation.isPending}
            >
                Создать администратора
            </Button>
        </form>
    );
}
