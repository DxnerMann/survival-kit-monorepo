import Dialog from "./Dialog";
import "./FeedbackAnswerDialog.css";
import Button from "../Button.tsx";
import {useState} from "react";
import {snackbarService} from "../../../services/snackBarService.tsx";

interface ChangeEmailDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (newEmail: string) => void;
    title: string,
    subtitle: string,
    oldEmail: string,
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
        }

        if (newEmail.match(EMAIL_REGEX)) {
            onSubmit(newEmail);
        } else {
            snackbarService.showSnackbar({type: "error", text:"Die eingegebene Email ist ungültig", showIcon: true });
            return
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
                className="feedback-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="form-group">
                    <label htmlFor="titel">Neue Email Adresse</label>
                    <input
                        id="titel"
                        type="text"
                        placeholder={oldEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                    />
                </div>
                <div className="dialog-actions">
                    <Button
                        text={"Abbrechen"}
                        onClick={onCancel}
                        variant="secondary"
                        type="reset"
                        fullWidth={true}
                    />

                    <Button
                        text={"Bestätigen"}
                        onClick={handleSubmit}
                        variant="primary"
                        type="submit"
                        fullWidth={true}
                    />
                </div>
            </form>
        </Dialog>
    );
}