"use client";

import React, { CSSProperties } from 'react';
import {
    UNSTABLE_ToastRegion as ToastRegion,
    UNSTABLE_Toast as Toast,
    UNSTABLE_ToastQueue as ToastQueue,
    UNSTABLE_ToastContent as ToastContent,
    ToastProps,
    Button,
    Text
} from 'react-aria-components';
import {XIcon} from 'lucide-react';
import {composeTailwindRenderProps} from './utils';
import {flushSync} from 'react-dom';

// Интерфейс для контента тоста
interface MyToastContent {
    title: string;
    description?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

// Глобальная очередь тостов
export const queue = new ToastQueue<MyToastContent>({
    wrapUpdate(fn) {
        if ('startViewTransition' in document) {
            document.startViewTransition(() => {
                flushSync(fn);
            });
        } else {
            fn();
        }
    }
});

export function MyToastRegion() {
    return (
        <ToastRegion
            queue={queue}
            className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 rounded-lg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 z-50">
            {({toast}) => (
                <MyToast toast={toast}>
                    <ToastContent className="flex flex-col flex-1 min-w-0">
                        <Text slot="title" className="font-semibold text-white text-sm">{toast.content.title}</Text>
                        {toast.content.description && (
                            <Text slot="description" className="text-xs text-white">{toast.content.description}</Text>
                        )}
                    </ToastContent>
                    <Button
                        slot="close"
                        aria-label="Close"
                        className="flex flex-none appearance-none w-8 h-8 rounded-sm bg-transparent border-none text-white p-0 outline-none hover:bg-white/10 pressed:bg-white/15 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 items-center justify-center [-webkit-tap-highlight-color:transparent]">
                        <XIcon className="w-4 h-4" />
                    </Button>
                </MyToast>
            )}
        </ToastRegion>
    );
}

export function MyToast(props: ToastProps<MyToastContent>) {
    // Определяем цвет фона в зависимости от типа
    const getBackgroundColor = () => {
        switch (props.toast.content.type) {
            case 'success':
                return 'bg-blue-600';
            case 'error':
                return 'bg-red-600';
            case 'warning':
                return 'bg-yellow-600';
            case 'info':
            default:
                return 'bg-blue-600';
        }
    };

    return (
        <Toast
            {...props}
            style={{viewTransitionName: props.toast.key} as CSSProperties}
            className={composeTailwindRenderProps(
                props.className,
                `flex items-center gap-4 ${getBackgroundColor()} px-4 py-3 rounded-lg outline-none forced-colors:outline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 [view-transition-class:toast] font-sans w-[300px] shadow-lg`
            )}
        />
    );
}