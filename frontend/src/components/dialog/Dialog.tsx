import "@/components/dialog/Dialog.css";
import {useEffect, type ReactNode} from "react";
import {lockBodyScroll, unlockBodyScroll} from "@/services/bodyScrollLock.ts";

export interface DialogProps {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    children?: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    closeOnOverlayClick?: boolean;
}

export default function Dialog({
    isOpen,
    title,
    subtitle,
    children,
    footer,
    onClose,
    closeOnOverlayClick = true,
}: DialogProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="dialog-overlay"
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className="dialog-container"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                <div className="dialog-header">
                    <h2 id="dialog-title">{title}</h2>
                    {subtitle && <h5 className="dialog-subheading">{subtitle}</h5>}
                </div>

                {children != null && (
                    <div className="dialog-content">
                        {children}
                    </div>
                )}

                {footer != null && (
                    <div className="dialog-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
