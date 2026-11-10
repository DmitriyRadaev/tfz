"use client";

import {ReactNode, useEffect} from "react";
import clsx from "clsx";

export interface UiImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}

export function UiImageModal({
                                 isOpen,
                                 onClose,
                                 children,
                                 className,
                             }: UiImageModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={onClose}
        >
            <div
                className={clsx(
                    "relative max-w-[95vw] max-h-[90vh] flex items-center justify-center",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Кнопка закрытия */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white text-3xl font-light hover:text-gray-300 z-10"
                    aria-label="Закрыть"
                >
                    &times;
                </button>

                {/* Картинка */}
                <div className="relative w-full h-full">
                    {children}
                </div>
            </div>
        </div>
    );
}