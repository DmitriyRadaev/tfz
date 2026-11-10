import React from 'react';
import { composeRenderProps, Button as RACButton, ButtonProps as RACButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';

export interface ButtonProps extends RACButtonProps {
    /** @default 'primary' */
    variant?: 'primary' | 'secondary' | 'destructive' | 'quiet' | 'edit'
}

const button = tv({
    extend: focusRing,
    base: 'relative inline-flex items-center justify-center gap-2 border border-transparent h-9 box-border px-3.5 py-0 [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:w-8 font-sans text-sm text-center transition rounded-lg cursor-pointer [-webkit-tap-highlight-color:transparent]',
    variants: {
        variant: {
            primary: 'bg-blue-600 hover:bg-blue-700 pressed:bg-blue-800 text-white',
            secondary: 'border-black/10 bg-neutral-50 hover:bg-neutral-100 pressed:bg-neutral-200 text-neutral-800',
            destructive: 'bg-red-700 hover:bg-red-800 pressed:bg-red-900 text-white',
            quiet: 'border-0 bg-transparent hover:bg-neutral-200 pressed:bg-neutral-300 text-neutral-800 ',
            edit: 'w-max p-2.5 gap-1 bg-white shadow-md hover:bg-gray-100 pressed:bg-gray-200 text-gray-600 border-0',
        },
        isDisabled: {
            true: 'border-transparent bg-neutral-100 text-neutral-300 forced-colors:text-[GrayText]'
        },
        isPending: {
            true: 'text-transparent'
        }
    },
    defaultVariants: {
        variant: 'primary'
    },
    compoundVariants: [
        {
            variant: 'quiet',
            isDisabled: true,
            class: 'bg-transparent'
        },
        {
            variant: 'edit',
            isDisabled: true,
            class: 'bg-gray-50 text-gray-300 shadow-sm'
        }
    ]
});

export function Button(props: ButtonProps) {
    return (
        <RACButton
            {...props}
            className={composeRenderProps(
                props.className,
                (className, renderProps) => button({...renderProps, variant: props.variant, className})
            )}
        >
            {composeRenderProps(props.children, (children, {isPending}) => (
                <>
                    {children}
                    {isPending && (
                        <span aria-hidden className="flex absolute inset-0 justify-center items-center">
              <svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" stroke={props.variant === 'secondary' || props.variant === 'quiet' || props.variant === 'edit' ? 'light-dark(black, white)' : 'white'}>
                <circle cx="12" cy="12" r="10" strokeWidth="4" fill="none" className="opacity-25" />
                <circle cx="12" cy="12" r="10" strokeWidth="4" strokeLinecap="round" fill="none" pathLength="100" strokeDasharray="60 140" strokeDashoffset="0" />
              </svg>
            </span>
                    )}
                </>
            ))}
        </RACButton>
    );
}