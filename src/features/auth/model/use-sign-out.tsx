"use client";

import { useResetSession } from "@/entities/session";
import { authApi } from "@/shared/api/authApi";
import { ROUTES } from "@/shared/constants/routes";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

/**
 * Хук для выхода из системы
 *
 * Выполняет:
 * - Запрос на сервер для завершения сессии
 * - Очистку локального состояния сессии
 * - Редирект на страницу входа
 */
export function useSignOut() {
  // ========== Зависимости ==========
  const resetSession = useResetSession(); // Хук для сброса локальной сессии
  const router = useRouter();

  // ========== Мутация выхода ==========
  const signOutMutation = useMutation({
    mutationFn: () => authApi.signOut(),
    // Кэш очищается в любом случае: если сервер ответил ошибкой, локально
    // пользователь всё равно должен выйти.
    onSettled() {
      resetSession();
      router.replace(ROUTES.SIGN_IN);
    },
  });

  // ========== Возвращаемые значения ==========
  return {
    signOut: signOutMutation.mutate, // Функция для вызова выхода
  };
}