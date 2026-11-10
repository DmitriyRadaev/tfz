import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import {
    accounts,
    workerProfiles,
    type Account,
    type AccountRole,
    type WorkerProfile,
} from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import { hashPassword } from "@/server/auth/password";

/**
 * Работа с аккаунтами — перенос `AccountManager` и регистрационных
 * сериализаторов Django.
 */

/** Postgres-код нарушения уникального ограничения. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === UNIQUE_VIOLATION
    );
}

/**
 * Флаги доступа выводятся из роли, а не задаются вручную.
 * В Django это делал переопределённый `Account.save()`.
 */
export function deriveAccessFlags(role: AccountRole): {
    isStaff: boolean;
    isSuperuser: boolean;
} {
    return {
        isStaff: role === "ADMIN" || role === "SUPERADMIN",
        isSuperuser: role === "SUPERADMIN",
    };
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/* ------------------------------------------------------------------ *
 * Чтение
 * ------------------------------------------------------------------ */

export async function findAccountByEmail(
    email: string,
): Promise<Account | undefined> {
    const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.email, normalizeEmail(email)))
        .limit(1);
    return account;
}

export async function findAccountById(id: number): Promise<Account | undefined> {
    const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, id))
        .limit(1);
    return account;
}

export async function listWorkerProfiles(): Promise<
    Array<{ profile: WorkerProfile; account: Account }>
> {
    const rows = await db
        .select({ profile: workerProfiles, account: accounts })
        .from(workerProfiles)
        .innerJoin(accounts, eq(workerProfiles.userId, accounts.id))
        .orderBy(accounts.surname, accounts.name);

    return rows;
}

export async function findWorkerProfileById(
    id: number,
): Promise<{ profile: WorkerProfile; account: Account } | undefined> {
    const [row] = await db
        .select({ profile: workerProfiles, account: accounts })
        .from(workerProfiles)
        .innerJoin(accounts, eq(workerProfiles.userId, accounts.id))
        .where(eq(workerProfiles.id, id))
        .limit(1);
    return row;
}

/* ------------------------------------------------------------------ *
 * Создание
 * ------------------------------------------------------------------ */

export interface CreateAccountParams {
    email: string;
    name: string;
    surname: string;
    patronymic?: string;
    password: string;
    role: AccountRole;
    /**
     * Активен ли аккаунт сразу. Самостоятельная регистрация создаёт
     * неактивную запись — до подтверждения администратором такой
     * пользователь не видит картотеку пациентов.
     */
    isActive?: boolean;
    /** Профиль сотрудника создаётся только для роли WORKER. */
    workerProfile?: { work: string; position: string };
}

export async function createAccount(
    params: CreateAccountParams,
): Promise<Account> {
    const email = normalizeEmail(params.email);

    // Явная проверка нужна, чтобы отдать понятное сообщение вместо 500;
    // от гонки защищает уникальный индекс, его ошибку перехватываем ниже.
    const existing = await findAccountByEmail(email);
    if (existing) {
        throw ApiError.conflict("Пользователь с таким email уже зарегистрирован");
    }

    const passwordHash = await hashPassword(params.password);
    const flags = deriveAccessFlags(params.role);

    let account: Account;
    try {
        const [created] = await db
            .insert(accounts)
            .values({
                email,
                passwordHash,
                name: params.name,
                surname: params.surname,
                patronymic: params.patronymic ?? "",
                role: params.role,
                isActive: params.isActive ?? true,
                isStaff: flags.isStaff,
                isSuperuser: flags.isSuperuser,
            })
            .returning();
        account = created;
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw ApiError.conflict(
                "Пользователь с таким email уже зарегистрирован",
            );
        }
        throw error;
    }

    if (params.workerProfile) {
        await db.insert(workerProfiles).values({
            userId: account.id,
            work: params.workerProfile.work,
            position: params.workerProfile.position,
        });
    }

    return account;
}

/* ------------------------------------------------------------------ *
 * Изменение
 * ------------------------------------------------------------------ */

export async function updateWorkerProfile(
    id: number,
    values: { work?: string; position?: string },
): Promise<{ profile: WorkerProfile; account: Account }> {
    const existing = await findWorkerProfileById(id);
    if (!existing) {
        throw ApiError.notFound("Профиль сотрудника не найден");
    }

    const [profile] = await db
        .update(workerProfiles)
        .set(values)
        .where(eq(workerProfiles.id, id))
        .returning();

    return { profile, account: existing.account };
}

/** Обновление собственных данных пользователя. */
export async function updateAccountProfile(
    id: number,
    values: {
        name?: string;
        surname?: string;
        patronymic?: string;
        email?: string;
        password?: string;
    },
): Promise<Account> {
    const patch: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };

    if (values.name !== undefined) patch.name = values.name;
    if (values.surname !== undefined) patch.surname = values.surname;
    if (values.patronymic !== undefined) patch.patronymic = values.patronymic;
    if (values.email !== undefined) patch.email = normalizeEmail(values.email);
    if (values.password !== undefined) {
        patch.passwordHash = await hashPassword(values.password);
    }

    try {
        const [account] = await db
            .update(accounts)
            .set(patch)
            .where(eq(accounts.id, id))
            .returning();

        if (!account) throw ApiError.notFound("Пользователь не найден");
        return account;
    } catch (error) {
        // Уникальный индекс по email — последний рубеж против гонки, когда
        // два пользователя одновременно меняют адрес на один и тот же.
        if (isUniqueViolation(error)) {
            throw ApiError.conflict("Этот email уже занят другим пользователем");
        }
        throw error;
    }
}

/**
 * Включение и отключение учётной записи.
 *
 * Используется администратором для подтверждения самостоятельно
 * зарегистрировавшихся врачей и для блокировки уволившихся.
 */
export async function setAccountActive(
    id: number,
    isActive: boolean,
): Promise<Account> {
    const [account] = await db
        .update(accounts)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(accounts.id, id))
        .returning();

    if (!account) {
        throw ApiError.notFound("Пользователь не найден");
    }
    return account;
}

export async function deleteWorkerProfile(id: number): Promise<void> {
    const [deleted] = await db
        .delete(workerProfiles)
        .where(eq(workerProfiles.id, id))
        .returning({ id: workerProfiles.id });

    if (!deleted) {
        throw ApiError.notFound("Профиль сотрудника не найден");
    }
}
