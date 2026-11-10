import clsx from "clsx";
import Image from "next/image";

type UiHeaderVariant = "logo" | "withoutLogo";

interface UiHeaderProps {
    className?: string;
    variant?: UiHeaderVariant;
}

export function UiHeader({className, variant}: UiHeaderProps) {
    return (
        <header
            className={clsx(
                "flex items-center justify-center flex-col gap-[3svh] mt-[3svh]",
                className
            )}
        >
            {variant === "logo" && (
                <Image
                    src="/logo.png"
                    width={270}
                    height={97}
                    alt="Логотип приложения"
                />
            )}
            <div className="text-4xl w-80 font-normal text-center">
                Расчет показателя ТФЗ
            </div>
        </header>
    );
}
