import {useState} from "react";
import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
    cancelText?: string;
    confirmText?: string;
    closeOnOverlayClick?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    title,
    subtitle,
    onCancel,
    onConfirm,
    cancelText = "Abbrechen",
    confirmText = "Bestätigen",
    closeOnOverlayClick = true,
}: ConfirmDialogProps) {
    const [pending, setPending] = useState(false);

    const handleConfirm = async () => {
        if (pending) {
            return;
        }
        setPending(true);
        try {
            await onConfirm();
        } finally {
            setPending(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title={title}
            subtitle={subtitle}
            onClose={onCancel}
            closeOnOverlayClick={closeOnOverlayClick}
            footer={
                <DialogActions
                    cancel={{text: cancelText, onClick: onCancel, type: "button", disabled: pending}}
                    confirm={{text: confirmText, onClick: () => void handleConfirm(), type: "button", disabled: pending}}
                />
            }
        />
    );
}
