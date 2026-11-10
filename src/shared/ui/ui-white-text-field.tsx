"use client";

import clsx from "clsx";
import { InputHTMLAttributes, PropsWithRef, useId } from "react";

export type UiTextFieldProps = {
  className?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  inputProps?: PropsWithRef<InputHTMLAttributes<HTMLInputElement>>;
};

export function UiWhiteTextField({
                                   className,
                                   error,
                                   label,
                                   placeholder,
                                   inputProps,
                                 }: UiTextFieldProps) {
  const id = useId();

  return (
      <div className={clsx(className, "flex flex-col gap-1.5")}>
        {label && (
            <label htmlFor={id} className="text-sm font-medium text-gray-700">
              {label}
            </label>
        )}
        <input
            {...inputProps}
            id={id}
            placeholder={placeholder}
            suppressHydrationWarning
            className={clsx(
                inputProps?.className,
                "w-full h-11 rounded-lg border border-gray-300 text-base text-gray-700 px-3 bg-white",
                "transition-all duration-200",
                "placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-[#2E76AA] focus:border-transparent",
                "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            )}
        />
        {error && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
        )}
      </div>
  );
}