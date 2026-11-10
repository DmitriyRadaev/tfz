import clsx from "clsx";
import Link from "next/link";

export type UiLinkProps = {} & Parameters<typeof Link>[0]

export function UiLink({className, ...props}: UiLinkProps) {
    return (
        <Link
            {...props}
            className={clsx(
                className,
                "text-[#2E76AA] hover:text-[#26628A] text-[20px] font-normal cursor-pointer",
            )}
        />
    );
}

