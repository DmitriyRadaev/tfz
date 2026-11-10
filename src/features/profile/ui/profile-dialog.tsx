"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Heading } from "react-aria-components";

import { useProfileQuery, useUpdateProfileMutation } from "@/entities/profile";
import type { UpdateProfileBody } from "@/shared/api/accountApi";
import { Button } from "@/shared/ui/Button";
import { UiTextField } from "@/shared/ui/ui-text-field";

type FormValues = {
    surname: string;
    name: string;
    patronymic: string;
    email: string;
    current_password: string;
    new_password: string;
    new_password2: string;
};

/**
 * Редактирование собственного профиля.
 *
 * Смена пароля спрятана за переключателем: в обычном сценарии врач правит
 * только ФИО, и три лишних поля на экране мешали бы.
 *
 * Email и пароль требуют подтверждения текущим паролем — это проверяет
 * сервер, а форма показывает поле заранее, чтобы запрос не уходил заведомо
 * неполным.
 */
export function ProfileDialog({ close }: { close: () => void }) {
    const { data: profile } = useProfileQuery();
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isDirty },
    } = useForm<FormValues>({
        defaultValues: {
            surname: profile?.surname ?? "",
            name: profile?.name ?? "",
            patronymic: profile?.patronymic ?? "",
            email: profile?.email ?? "",
            current_password: "",
            new_password: "",
            new_password2: "",
        },
    });

    const mutation = useUpdateProfileMutation({ onSuccessActions: [close] });

    const newPassword = watch("new_password");
    const emailChanged = profile ? watch("email").trim().toLowerCase() !== profile.email : false;
    const needsCurrentPassword = isChangingPassword || emailChanged;

    const onSubmit = (values: FormValues) => {
        const payload: UpdateProfileBody = {
            surname: values.surname,
            name: values.name,
            patronymic: values.patronymic,
        };

        if (emailChanged) payload.email = values.email;
        if (isChangingPassword) {
            payload.new_password = values.new_password;
            payload.new_password2 = values.new_password2;
        }
        if (needsCurrentPassword) {
            payload.current_password = values.current_password;
        }

        mutation.mutate(payload);
    };

    return (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
                <Heading slot="title" className="text-xl font-bold text-ink">
                    Профиль
                </Heading>
                {profile && (
                    <p className="mt-1 text-sm text-neutral-500">
                        {profile.role_display}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            <UiTextField
                label="Отчество"
                placeholder="Иванович"
                error={errors.patronymic?.message}
                inputProps={{ ...register("patronymic") }}
            />

            <UiTextField
                label="Email"
                placeholder="doctor@example.com"
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
                    autoComplete: "email",
                }}
            />

            {/* Смена пароля */}
            <div className="rounded-lg border border-neutral-200 p-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                    <input
                        type="checkbox"
                        className="accent-brand-500"
                        checked={isChangingPassword}
                        onChange={(event) =>
                            setIsChangingPassword(event.target.checked)
                        }
                    />
                    Сменить пароль
                </label>

                {isChangingPassword && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <UiTextField
                            label="Новый пароль"
                            placeholder="Минимум 6 символов"
                            error={errors.new_password?.message}
                            inputProps={{
                                ...register("new_password", {
                                    required: isChangingPassword
                                        ? "Введите новый пароль"
                                        : false,
                                    minLength: {
                                        value: 6,
                                        message: "Минимум 6 символов",
                                    },
                                }),
                                type: "password",
                                autoComplete: "new-password",
                            }}
                        />
                        <UiTextField
                            label="Повторите новый пароль"
                            placeholder="Повторите пароль"
                            error={errors.new_password2?.message}
                            inputProps={{
                                ...register("new_password2", {
                                    required: isChangingPassword
                                        ? "Подтвердите пароль"
                                        : false,
                                    validate: (value) =>
                                        !isChangingPassword ||
                                        value === newPassword ||
                                        "Пароли не совпадают",
                                }),
                                type: "password",
                                autoComplete: "new-password",
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Подтверждение личности */}
            {needsCurrentPassword && (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
                    <UiTextField
                        label="Текущий пароль"
                        placeholder="Введите текущий пароль"
                        error={errors.current_password?.message}
                        inputProps={{
                            ...register("current_password", {
                                required: needsCurrentPassword
                                    ? "Введите текущий пароль"
                                    : false,
                            }),
                            type: "password",
                            autoComplete: "current-password",
                        }}
                    />
                    <p className="mt-2 text-xs leading-relaxed text-brand-800">
                        {isChangingPassword
                            ? "Смена пароля завершит сессии на других устройствах."
                            : "Смена email подтверждается текущим паролем и завершит сессии на других устройствах."}
                    </p>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button
                    variant="secondary"
                    onPress={close}
                    isDisabled={mutation.isPending}
                >
                    Отмена
                </Button>
                <Button
                    type="submit"
                    isPending={mutation.isPending}
                    isDisabled={mutation.isPending || (!isDirty && !isChangingPassword)}
                >
                    Сохранить
                </Button>
            </div>
        </form>
    );
}
