import "./Dialog.css";
import type {ReactNode} from "react";

interface DialogProps {
    isOpen: boolean;
    title: string;
    subtitle: string
    children: ReactNode;
    onClose: () => void;
}

export default function Dialog({
                            isOpen,
                            title,
                            subtitle,
                            children,
                            onClose,
                               }: DialogProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div
                className="dialog-container"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="dialog-header">
                    <h2>{title}</h2>
                    <h5 className="dialog-subheading" >{subtitle}</h5>
                </div>

                <div className="dialog-content">
                    {children}
                </div>
            </div>
        </div>
    );
}