import { createInstance, RequestOptions } from "./api-instance";
import type { Account } from "./accountApi";

/* ------------------------------- DTO ------------------------------- */

export interface SignInBodyDto {
    email: string;
    password: string;
}

export interface SignUpBodyDto {
    name: string;
    surname: string;
    patronymic: string;
    work: string;
    position: string;
    email: string;
    password: string;
    password2: string;
}

/**
 * Токены в теле ответа не приходят: они живут только в httpOnly-куках,
 * недоступных для JavaScript. Сервер возвращает профиль вошедшего пользователя.
 */
export interface SignInResponseDto {
    user: Account;
}

/* ------------------------------- API ------------------------------- */

const signIn = (body: SignInBodyDto, options?: RequestOptions) =>
    createInstance<SignInResponseDto>(
        { url: "/auth/login", method: "POST", data: body },
        options,
    );

const signUp = (body: SignUpBodyDto, options?: RequestOptions) =>
    createInstance<Account>(
        { url: "/auth/register/worker", method: "POST", data: body },
        options,
    );

const signOut = (options?: RequestOptions) =>
    createInstance<{ detail: string }>(
        { url: "/auth/logout", method: "POST" },
        options,
    );

const refresh = (options?: RequestOptions) =>
    createInstance<SignInResponseDto>(
        { url: "/auth/refresh", method: "POST" },
        options,
    );

export const authApi = {
    signIn,
    signUp,
    signOut,
    refresh,
};
