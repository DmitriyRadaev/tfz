import clsx from "clsx";
import {ButtonHTMLAttributes} from "react";

export type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function UiButton({className, ...props}: UiButtonProps) {
    return (
        <button
            {...props}
            className={clsx(
                className,
                "h-12 px-6 rounded-lg cursor-pointer flex items-center justify-center text-base font-medium",
                "bg-[#2E76AA] hover:bg-[#26628A] active:bg-[#1e4d73]",
                "text-white transition-colors duration-200",
                "shadow-md hover:shadow-lg",
                "disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none",
                "focus:outline-none focus:ring-2 focus:ring-[#2E76AA] focus:ring-offset-2"
            )}
        />
    );
}