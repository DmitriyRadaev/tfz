"use client";

import clsx from "clsx";
import {ReactNode, useEffect, useRef} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type UiTextAreaProps = {
    className?: string;
    children?: ReactNode;
    textAreaRef?: React.Ref<HTMLDivElement>;
    height?: string;
    contentKey?: string | number;
    isLoading?: boolean;
};

export function UiTextArea({
                               className,
                               children,
                               height,
                               contentKey,
                               isLoading,
                           }: UiTextAreaProps) {
    const heightProps = height ? height : "h-[40svh]";
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentKey === undefined) return;
        if (containerRef.current) {
            const timer = setTimeout(() => {
                containerRef.current?.scrollTo({top: 0, behavior: "smooth"});
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [contentKey]);

    if (isLoading) {
        return (
            <div
                className={clsx(
                    className,
                    heightProps,
                    "w-full",
                    "bg-white border border-gray-200 pt-3 px-4.25",
                    "shadow-sm rounded-xl",
                    "flex flex-col gap-3 animate-pulse"
                )}
            >
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 rounded w-4/5"></div>
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={clsx(
                className,
                heightProps,
                "bg-white  p-8 mb-8",
                "text-slate-700 text-lg"
            )}
        >
            {typeof children === "string" ? (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Абзац: 1.5 интерлиньяж + отступ первой строки 1.25em
                        p: ({children}) => (
                            <p
                                className="mb-2 last:mb-0 leading-6" // leading-6 = 24px = 16px × 1.5
                                // style={{ textIndent: '1.25em' }}
                            >
                                {children}
                            </p>
                        ),

                        // Ненумерованный список: отступ слева остаётся, но без text-indent внутри li
                        ul: ({children}) => (
                            <ul className="list-disc pl-6 mb-2">{children}</ul>
                        ),

                        // Элемент списка: без отступа первой строки (по стандарту)
                        li: ({children}) => (
                            <li className="mb-2" style={{textIndent: "0"}}>
                                {children}
                            </li>
                        ),

                        strong: ({children}) => (
                            <strong className="font-bold">{children}</strong>
                        ),
                        em: ({children}) => <em className="italic">{children}</em>,
                    }}
                >
                    {children}
                </ReactMarkdown>
            ) : (
                children
            )}
        </div>
    );
}
