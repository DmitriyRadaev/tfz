"use client";

import { DialogTrigger } from "react-aria-components";

import { useProfileQuery } from "@/entities/profile";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { Modal } from "@/shared/ui/Modal";
import { ProfileDialog } from "./profile-dialog";

/**
 * Кнопка пользователя в шапке — открывает редактирование профиля.
 *
 * Инициалы и ФИО лежат внутри кнопки, а не рядом с ней: кликабельной должна
 * быть вся область, иначе попасть в аватар на мобильном неудобно.
 */
export function ProfileButton() {
    const { data: profile } = useProfileQuery();

    const initials = profile
        ? `${profile.surname[0] ?? ""}${profile.name[0] ?? ""}`.toUpperCase()
        : "";

    return (
        <DialogTrigger>
            <Button
                variant="quiet"
                className="h-auto gap-2 px-1.5 py-1 hover:bg-neutral-100"
                aria-label="Открыть профиль"
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                    {initials || "—"}
                </span>
                <span className="hidden text-sm font-medium text-ink xl:inline">
                    {profile ? `${profile.surname} ${profile.name}` : ""}
                </span>
            </Button>

            <Modal>
                <Dialog>{({ close }) => <ProfileDialog close={close} />}</Dialog>
            </Modal>
        </DialogTrigger>
    );
}
