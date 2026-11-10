import { createInstance, RequestOptions } from "./api-instance";

/* ------------------------------- DTO ------------------------------- */

export type AccountRole = "SUPERADMIN" | "ADMIN" | "WORKER";

export interface Account {
    id: number;
    email: string;
    name: string;
    surname: string;
    patronymic: string;
    role: AccountRole;
    role_display: string;
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkerProfile {
    id: number;
    user: Account;
    work: string;
    position: string;
}

/** Исторический псевдоним: раньше профиль был отдельным урезанным типом. */
export type GetProfileInfoDto = Account;

/* ------------------------------- API ------------------------------- */

export const getProfileInfo = (options?: RequestOptions) =>
    createInstance<Account>({ url: "/profile", method: "GET" }, options);

export interface UpdateProfileBody {
    name?: string;
    surname?: string;
    patronymic?: string;
    email?: string;
    /** Обязателен при смене email или пароля. */
    current_password?: string;
    new_password?: string;
    new_password2?: string;
}

export const updateProfile = (
    data: UpdateProfileBody,
    options?: RequestOptions,
) =>
    createInstance<Account>({ url: "/profile", method: "PATCH", data }, options);

export const getWorkerProfiles = (options?: RequestOptions) =>
    createInstance<WorkerProfile[]>(
        { url: "/worker-profiles", method: "GET" },
        options,
    );

export const updateWorkerProfile = (
    id: number,
    data: { work?: string; position?: string },
    options?: RequestOptions,
) =>
    createInstance<WorkerProfile>(
        { url: `/worker-profiles/${id}`, method: "PATCH", data },
        options,
    );

/** Подтверждение или блокировка учётной записи (только для администраторов). */
export const setAccountActive = (
    id: number,
    isActive: boolean,
    options?: RequestOptions,
) =>
    createInstance<Account>(
        { url: `/accounts/${id}`, method: "PATCH", data: { is_active: isActive } },
        options,
    );

export const deleteWorkerProfile = (id: number, options?: RequestOptions) =>
    createInstance<void>(
        { url: `/worker-profiles/${id}`, method: "DELETE" },
        options,
    );

export interface RegisterPrivilegedBody {
    email: string;
    name: string;
    surname: string;
    patronymic?: string;
    password: string;
    password2: string;
}

export const registerAdmin = (
    data: RegisterPrivilegedBody,
    options?: RequestOptions,
) =>
    createInstance<Account>(
        { url: "/auth/register/admin", method: "POST", data },
        options,
    );

export const registerSuperAdmin = (
    data: RegisterPrivilegedBody,
    options?: RequestOptions,
) =>
    createInstance<Account>(
        { url: "/auth/register/superadmin", method: "POST", data },
        options,
    );

export const accountApi = {
    getProfileInfo,
    updateProfile,
    getWorkerProfiles,
    setAccountActive,
    updateWorkerProfile,
    deleteWorkerProfile,
    registerAdmin,
    registerSuperAdmin,
};
