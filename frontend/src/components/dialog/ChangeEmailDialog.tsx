import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";
import {useState} from "react";
import {snackbarService} from "@/services/snackBarService.tsx";

interface ChangeEmailDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (newEmail: string) => void | Promise<void>;
    title: string;
    subtitle?: string;
    oldEmail: string;
}

export default function ChangeEmailDialog({
    isOpen,
    onCancel,
    onSubmit,
    title,
    subtitle,
    oldEmail,
}: ChangeEmailDialogProps) {
    const [newEmail, setNewEmail] = useState(oldEmail);
    const [submitting, setSubmitting] = useState(false);
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSubmit = async () => {
        if (submitting) {
            return;
        }

        if (newEmail === oldEmail) {
            onCancel();
            return;
        }

        if (!newEmail.match(EMAIL_REGEX)) {
            snackbarService.showSnackbar({type: "error", text: "Die eingegebene Email ist ungültig", showIcon: true});
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(newEmail);
            onCancel();
        } catch (error: unknown) {
            if (!(error instanceof Error)) {
                snackbarService.showSnackbar({type: "error", text: "Email konnte nicht geändert werden", showIcon: true});
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title={title}
            subtitle={subtitle}
            onClose={onCancel}
        >
            <form
                className="dialog-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="form-group">
                    <label htmlFor="new-email">Neue Email Adresse</label>
                    <input
                        id="new-email"
                        type="text"
                        placeholder={oldEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                    />
                </div>
                <DialogActions
                    cancel={{text: "Abbrechen", onClick: onCancel, disabled: submitting}}
                    confirm={{text: "Bestätigen", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
