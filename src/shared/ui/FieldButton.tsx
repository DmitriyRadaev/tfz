import React from 'react';
import { composeRenderProps, Button as RACButton, ButtonProps as RACButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';

export interface ButtonProps extends RACButtonProps {
    /** @default 'primary' */
    variant?: 'primary' | 'secondary' | 'destructive' | 'icon'
}

const button = tv({
    extend: focusRing,
    base: 'relative inline-flex items-center border-0 font-sans text-sm text-center transition rounded-md cursor-default p-1 flex items-center justify-center text-neutral-600 bg-transparent hover:bg-black/[5%] pressed:bg-black/10 disabled:bg-transparent [-webkit-tap-highlight-color:transparent]',
    variants: {
        isDisabled: {
            true: 'bg-neutral-100 text-neutral-300 forced-colors:text-[GrayText] border-black/5'
        }
    }
});

export function FieldButton(props: ButtonProps) {
    return (
        <RACButton
            {...props}
            className={composeRenderProps(
                props.className,
                (className, renderProps) => button({...renderProps, className})
            )}
        >
            {props.children}
        </RACButton>
    );
}
