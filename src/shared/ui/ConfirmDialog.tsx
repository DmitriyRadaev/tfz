"use client";

import { DialogTrigger, Heading } from "react-aria-components";
import type { ReactNode } from "react";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
    /** Элемент, открывающий диалог. Обязан быть кнопкой react-aria. */
    trigger: ReactNode;
    title: string;
    /** Что именно произойдёт. Пишите последствия, а не «вы уверены?». */
    description: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    isPending?: boolean;
    onConfirm: () => void;
};

/**
 * Подтверждение необратимого действия.
 *
 * Выделен в отдельный компонент, потому что удаление пациента и удаление
 * приёма должны выглядеть и вести себя одинаково. Кнопка подтверждения
 * намеренно красная и не стоит под курсором по умолчанию: фокус забирает
 * «Отмена», чтобы случайный Enter ничего не стёр.
 */
export function ConfirmDialog({
    trigger,
    title,
    description,
    confirmLabel = "Удалить",
    cancelLabel = "Отмена",
    isPending = false,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <DialogTrigger>
            {trigger}
            <Modal>
                <Dialog role="alertdialog">
                    {({ close }) => (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <span
                                    aria-hidden
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                        />
                                    </svg>
                                </span>

                                <div className="min-w-0">
                                    <Heading
                                        slot="title"
                                        className="text-base font-semibold text-ink"
                                    >
                                        {title}
                                    </Heading>
                                    <div className="mt-1 text-sm leading-relaxed text-neutral-600">
                                        {description}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    onPress={close}
                                    isDisabled={isPending}
                                    autoFocus
                                >
                                    {cancelLabel}
                                </Button>
                                <Button
                                    variant="destructive"
                                    isPending={isPending}
                                    isDisabled={isPending}
                                    onPress={() => {
                                        onConfirm();
                                        close();
                                    }}
                                >
                                    {confirmLabel}
                                </Button>
                            </div>
                        </div>
                    )}
                </Dialog>
            </Modal>
        </DialogTrigger>
    );
}
