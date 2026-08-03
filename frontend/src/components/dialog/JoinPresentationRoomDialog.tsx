import {useState} from "react";
import Dialog from "@/components/dialog/Dialog.tsx";
import DialogActions from "@/components/dialog/DialogActions.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";

interface JoinPresentationRoomDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (code: string) => Promise<void>;
}

export default function JoinPresentationRoomDialog({
    isOpen,
    onCancel,
    onSubmit,
}: JoinPresentationRoomDialogProps) {
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setCode("");
        setSubmitting(false);
    };

    const handleCancel = () => {
        resetForm();
        onCancel();
    };

    const handleSubmit = async () => {
        if (submitting) {
            return;
        }

        const trimmed = code.trim().toUpperCase();
        if (!trimmed) {
            snackbarService.showSnackbar({
                type: "error",
                text: "Bitte gib einen Raumcode ein.",
                showIcon: true,
            });
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(trimmed);
            resetForm();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Raum beitreten"
            subtitle="Gib den Code ein, den dir der Host geteilt hat. Funktioniert für private und öffentliche Räume."
            onClose={handleCancel}
        >
            <form
                className="dialog-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit();
                }}
            >
                <div className="form-group">
                    <label htmlFor="room-code">Raumcode</label>
                    <input
                        id="room-code"
                        type="text"
                        value={code}
                        maxLength={6}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="ABC123"
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                </div>

                <DialogActions
                    cancel={{text: "Abbrechen", onClick: handleCancel, disabled: submitting}}
                    confirm={{text: "Beitreten", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
