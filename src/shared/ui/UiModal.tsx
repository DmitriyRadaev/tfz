import {DialogTrigger, ModalOverlayProps} from 'react-aria-components';
import {Modal} from './Modal';
import {Dialog} from './Dialog';
import {JSX, ReactNode} from "react";

export type UiModalProps = {
    props?: JSX.IntrinsicAttributes & ModalOverlayProps;
    className?: string;
    children: ({ close }: { close: () => void }) => ReactNode;
    button?: ReactNode | string;
};

export function UiModal({props, className, children, button, } : UiModalProps) {
    return (
        <div className={className}>
            <DialogTrigger>
                {button}
                <Modal {...props}>
                    <Dialog>
                        {({ close }) => children({ close })}
                    </Dialog>
                </Modal>
            </DialogTrigger>
        </div>
    );
}
