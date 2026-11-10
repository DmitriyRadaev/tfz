import * as React from "react";
import clsx from "clsx";

export type UiCheckBoxProps = React.ComponentPropsWithoutRef<"input">;

export function UiCheckBox({className, ...props}: UiCheckBoxProps) {
    return (
        <input
            {...props}
            type="checkbox"
            className={clsx(
                className,
                `
            w-5 h-5 
            appearance-none 
            border border-gray-400 rounded 
            transition duration-200 ease-in-out
            transform 
            checked:scale-110 
            checked:bg-[#63a0e2] 
            checked:border-[#7BAEE4]
            checked:[&:after]:content-['✔'] 
            checked:[&:after]:text-white 
            checked:[&:after]:text-xs
            checked:[&:after]:flex 
            checked:[&:after]:items-center 
            checked:[&:after]:justify-center
          `
            )}
        />
    );
}
