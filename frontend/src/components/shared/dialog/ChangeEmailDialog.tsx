import Dialog from "./Dialog";
import DialogActions from "./DialogActions";
import {useState} from "react";
import {snackbarService} from "../../../services/snackBarService.tsx";

interface ChangeEmailDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (newEmail: string) => void;
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
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSubmit = () => {
        if (newEmail === oldEmail) {
            onCancel();
            return;
        }

        if (newEmail.match(EMAIL_REGEX)) {
            onSubmit(newEmail);
        } else {
            snackbarService.showSnackbar({type: "error", text: "Die eingegebene Email ist ungültig", showIcon: true});
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
                    cancel={{text: "Abbrechen", onClick: onCancel, type: "reset"}}
                    confirm={{text: "Bestätigen", onClick: handleSubmit, type: "submit"}}
                />
            </form>
        </Dialog>
    );
}
