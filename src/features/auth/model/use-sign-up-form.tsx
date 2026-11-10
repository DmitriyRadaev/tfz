"use client";

import { authApi, SignUpBodyDto } from "@/shared/api/authApi";
import { extractErrorMessage } from "@/shared/api/api-instance";
import { ROUTES } from "@/shared/constants/routes";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {useForm, useWatch} from "react-hook-form";

// Ключ для localStorage
const SIGNUP_STORAGE_KEY = "signup_form_data";
const SIGNUP_STAGE_KEY = "signup_current_stage";

// Тип данных формы
type SignUpFormData = {
  name: string;
  surname: string;
  patronymic: string;
  work: string;
  position: string;
  email: string;
  password: string;
  password2: string;
};

/**
 * Хук для формы регистрации
 *
 * Этапы:
 * 1. Личные данные (ФИО)
 * 2. Профессиональные данные (работа, должность)
 * 3. Данные для входа (email, пароль)
 *
 * Особенности:
 * - Валидация совпадения паролей
 * - Сохранение прогресса в localStorage
 * - Автоматическая загрузка сохраненных данных
 */
export function useSignUpForm() {
  // ========== Навигация ==========
  const router = useRouter();

  // ========== Состояние шагов формы ==========
  // Инициализация с восстановлением из localStorage
  const [currentStageIndex, setCurrentStageIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIGNUP_STAGE_KEY);
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  // ========== Управление формой ==========
  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, errors },
    setValue,
  } = useForm<SignUpFormData>({
    mode: "onChange", // Валидация при каждом изменении поля
    defaultValues: {
      name: "",
      surname: "",
      patronymic: "",
      work: "",
      position: "",
      email: "",
      password: "",
      password2: "",
    },
  });

  const formData = useWatch({
    control,
  });

  // Следим за значением password для валидации совпадения
  const password = useWatch({
    control,
    name: "password",
  });

  // ========== Восстановление данных из localStorage ==========
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem(SIGNUP_STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData) as Partial<SignUpFormData>;
          // Восстанавливаем все поля кроме паролей (из соображений безопасности)
          Object.entries(parsed).forEach(([key, value]) => {
            if (key !== "password" && key !== "password2" && value) {
              setValue(key as keyof SignUpFormData, value);
            }
          });
        } catch (error) {
          console.error("Ошибка восстановления данных формы:", error);
        }
      }
    }
  }, [setValue]);

  // ========== Сохранение прогресса в localStorage ==========
  useEffect(() => {
    if (!formData) return;

    const { ...dataToSave } = formData;


    localStorage.setItem(
        SIGNUP_STORAGE_KEY,
        JSON.stringify(dataToSave)
    );
  }, [formData]);

  // ========== Сохранение текущего этапа ==========
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SIGNUP_STAGE_KEY, currentStageIndex.toString());
    }
  }, [currentStageIndex]);

  // ========== Переключение между этапами формы ==========
  /**
   * Переключение между этапами формы
   * @param index - номер этапа (1, 2 или 3)
   */
  const handleStageChange = (index: number) => {
    setCurrentStageIndex(index);
  };

  // ========== Мутация регистрации ==========
  const signUpMutation = useMutation({
    mutationFn: (data: SignUpBodyDto) => authApi.signUp(data),
    onSuccess: () => {
      // Очищаем сохраненные данные после успешной регистрации
      if (typeof window !== "undefined") {
        localStorage.removeItem(SIGNUP_STORAGE_KEY);
        localStorage.removeItem(SIGNUP_STAGE_KEY);
      }
      // Перенаправляем на страницу входа
      // Пометка нужна, чтобы на странице входа объяснить, почему
      // войти прямо сейчас не получится.
      router.replace(`${ROUTES.SIGN_IN}?pending=1`);
    },
  });

  // ========== Обработка отправки формы ==========
  const onSubmit = (data: SignUpFormData) => {
    signUpMutation.mutate(data as SignUpBodyDto);
  };

  // ========== Обработка ошибок ==========
  // Сообщение берём из ответа API: там, например, «email уже зарегистрирован»,
  // что гораздо полезнее общего «проверьте данные».
  const errorMessage = signUpMutation.error
      ? extractErrorMessage(signUpMutation.error, "Проверьте введённые данные")
      : undefined;

  // ========== Возвращаемые значения ==========
  return {
    // Регистрация полей с валидацией
    register: (field: keyof SignUpFormData) => {
      // Специальная валидация для password2
      if (field === "password2") {
        return register(field, {
          required: "Подтвердите пароль",
          validate: (value) =>
              value === password || "Пароли не совпадают",
        });
      }
      // Валидация для пароля
      if (field === "password") {
        return register(field, {
          required: "Введите пароль",
          minLength: {
            value: 6,
            message: "Минимум 6 символов",
          },
        });
      }
      // Валидация для email
      if (field === "email") {
        return register(field, {
          required: "Введите email",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: "Неверный формат email",
          },
        });
      }
      // Остальные поля - обязательные
      return register(field, { required: true });
    },
    errorMessage,                           // Сообщение об ошибке с сервера
    errors,                                 // Ошибки валидации полей
    handleSubmit: handleSubmit(onSubmit),   // Обработчик отправки формы
    isPending: signUpMutation.isPending,    // Индикатор загрузки
    currentStageIndex,                      // Текущий этап (1-3)
    handleStageChange,                      // Переключение этапов
    isAllFieldsFilled: isValid,             // Все поля заполнены корректно
  };
}