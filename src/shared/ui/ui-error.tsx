import clsx from "clsx";
import React from "react";

export type UiErrorProps = {
    className?: string;
    children: React.ReactNode;
};

export function UiError({className, children}: UiErrorProps) {
    return (
        <div className={clsx(
            className,
            "flex items-center gap-3 w-full p-4 bg-linear-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg shadow-md"
        )}>
            <svg
                className="w-6 h-6 text-red-500 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <div className="flex flex-col">
                <span className="font-bold text-red-700">Ошибка загрузки</span>
                <span className="text-sm text-red-600">
          {children}
        </span>
            </div>
        </div>
    );
}