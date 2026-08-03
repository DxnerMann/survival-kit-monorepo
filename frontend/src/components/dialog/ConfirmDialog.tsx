import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    onCancel: () => void;
    onConfirm: () => void;
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
    return (
        <Dialog
            isOpen={isOpen}
            title={title}
            subtitle={subtitle}
            onClose={onCancel}
            closeOnOverlayClick={closeOnOverlayClick}
            footer={
                <DialogActions
                    cancel={{text: cancelText, onClick: onCancel, type: "button"}}
                    confirm={{text: confirmText, onClick: onConfirm, type: "button"}}
                />
            }
        />
    );
}
