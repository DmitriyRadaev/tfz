"use client";

import {
    useProfileQuery,
    useSetAccountActiveMutation,
    useWorkerProfilesQuery,
} from "@/entities/profile";
import type { WorkerProfile } from "@/shared/api/accountApi";
import { formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Skeleton } from "@/shared/ui/Skeleton";

const ROLE_BADGE: Record<string, string> = {
    SUPERADMIN: "bg-brand-100 text-brand-800",
    ADMIN: "bg-brand-50 text-brand-700",
    WORKER: "bg-neutral-100 text-neutral-700",
};

function fullName(user: WorkerProfile["user"]) {
    return [user.surname, user.name, user.patronymic].filter(Boolean).join(" ");
}

/**
 * Сотрудники и модерация регистраций.
 *
 * Врач регистрируется сам, но его учётная запись создаётся неактивной —
 * до подтверждения здесь он не видит ни одного пациента. Заявки показаны
 * первыми, чтобы администратор не искал их глазами по всему списку.
 */
export function WorkerProfilesTable() {
    const { data: profile } = useProfileQuery();
    const { data, isPending, isError, error } = useWorkerProfilesQuery();
    const setActiveMutation = useSetAccountActiveMutation();

    if (isPending) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-red-600">
                Не удалось загрузить список сотрудников
                {error instanceof Error ? `: ${error.message}` : ""}
            </p>
        );
    }

    if (!data || data.length === 0) {
        return (
            <p className="text-sm text-neutral-500">
                Сотрудники пока не зарегистрированы.
            </p>
        );
    }

    // Неподтверждённые — наверх: это то, что требует действия.
    const rows = [...data].sort((a, b) => {
        if (a.user.is_active !== b.user.is_active) return a.user.is_active ? 1 : -1;
        return fullName(a.user).localeCompare(fullName(b.user), "ru");
    });

    const pendingCount = rows.filter((row) => !row.user.is_active).length;

    return (
        <div className="space-y-4">
            {pendingCount > 0 && (
                <p className="rounded-lg border border-severity-medium-bg bg-severity-medium-bg px-3 py-2 text-sm text-severity-medium">
                    Заявок, ожидающих подтверждения: <strong>{pendingCount}</strong>.
                    До подтверждения доступа к данным пациентов у них нет.
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-neutral-200 text-left text-xs tracking-wide text-neutral-500 uppercase">
                            <th scope="col" className="py-2 pr-4 font-medium">
                                Сотрудник
                            </th>
                            <th scope="col" className="py-2 pr-4 font-medium">
                                Email
                            </th>
                            <th scope="col" className="py-2 pr-4 font-medium">
                                Место работы
                            </th>
                            <th scope="col" className="py-2 pr-4 font-medium">
                                Должность
                            </th>
                            <th scope="col" className="py-2 pr-4 font-medium">
                                Роль
                            </th>
                            <th scope="col" className="py-2 pr-4 font-medium">
                                Статус
                            </th>
                            <th scope="col" className="py-2 font-medium">
                                Действие
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {rows.map(({ id, user, work, position }) => {
                            const isSelf = profile?.id === user.id;
                            const isPendingRow =
                                setActiveMutation.isPending &&
                                setActiveMutation.variables?.id === user.id;

                            return (
                                <tr
                                    key={id}
                                    className={
                                        user.is_active ? "" : "bg-severity-medium-bg/40"
                                    }
                                >
                                    <td className="py-3 pr-4 font-medium text-ink">
                                        {fullName(user)}
                                        {isSelf && (
                                            <span className="ml-1 text-xs font-normal text-neutral-400">
                                                (вы)
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 text-neutral-600">
                                        {user.email}
                                    </td>
                                    <td className="py-3 pr-4 text-neutral-600">
                                        {work || "—"}
                                    </td>
                                    <td className="py-3 pr-4 text-neutral-600">
                                        {position || "—"}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                ROLE_BADGE[user.role] ??
                                                "bg-neutral-100 text-neutral-700"
                                            }`}
                                        >
                                            {user.role_display}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        {user.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-severity-light">
                                                <span
                                                    aria-hidden
                                                    className="h-1.5 w-1.5 rounded-full bg-severity-light"
                                                />
                                                Активен
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-severity-medium">
                                                <span
                                                    aria-hidden
                                                    className="h-1.5 w-1.5 rounded-full bg-severity-medium"
                                                />
                                                Ожидает подтверждения
                                            </span>
                                        )}
                                        <span className="mt-0.5 block text-xs text-neutral-400">
                                            с {formatDate(user.created_at)}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        {isSelf ? (
                                            <span className="text-xs text-neutral-400">
                                                —
                                            </span>
                                        ) : user.is_active ? (
                                            <ConfirmDialog
                                                title="Закрыть доступ?"
                                                description={
                                                    <>
                                                        <strong>{fullName(user)}</strong>{" "}
                                                        не сможет войти в систему, а все
                                                        его активные сессии будут
                                                        немедленно прерваны. Данные
                                                        пациентов и выполненные расчёты
                                                        сохранятся.
                                                    </>
                                                }
                                                confirmLabel="Закрыть доступ"
                                                isPending={isPendingRow}
                                                onConfirm={() =>
                                                    setActiveMutation.mutate({
                                                        id: user.id,
                                                        isActive: false,
                                                    })
                                                }
                                                trigger={
                                                    <Button
                                                        variant="quiet"
                                                        className="text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        Закрыть доступ
                                                    </Button>
                                                }
                                            />
                                        ) : (
                                            <Button
                                                variant="primary"
                                                className="h-8 text-xs"
                                                isPending={isPendingRow}
                                                isDisabled={isPendingRow}
                                                onPress={() =>
                                                    setActiveMutation.mutate({
                                                        id: user.id,
                                                        isActive: true,
                                                    })
                                                }
                                            >
                                                Подтвердить
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
