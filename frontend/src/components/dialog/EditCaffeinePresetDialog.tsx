import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";
import {useEffect, useState} from "react";
import {PRESET_NAME_MAX_LENGTH} from "@/services/caffeineService.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";

interface EditCaffeinePresetDialogProps {
    isOpen: boolean;
    name: string;
    amountMg: number;
    onCancel: () => void;
    onSubmit: (name: string, amountMg: number) => void | Promise<void>;
}

export default function EditCaffeinePresetDialog({
    isOpen,
    name,
    amountMg,
    onCancel,
    onSubmit,
}: EditCaffeinePresetDialogProps) {
    const [draftName, setDraftName] = useState(name);
    const [draftAmount, setDraftAmount] = useState(String(amountMg));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setDraftName(name);
        setDraftAmount(String(amountMg));
    }, [isOpen, name, amountMg]);

    const handleSubmit = async () => {
        if (submitting) {
            return;
        }

        const trimmedName = draftName.trim();
        const parsedAmount = Number(draftAmount);
        if (!trimmedName || trimmedName.length > PRESET_NAME_MAX_LENGTH) {
            snackbarService.showSnackbar({
                type: "error",
                text: `Bitte einen Namen mit 1 bis ${PRESET_NAME_MAX_LENGTH} Zeichen eingeben.`,
                showIcon: true,
            });
            return;
        }
        if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 1000) {
            snackbarService.showSnackbar({
                type: "error",
                text: "Bitte eine Menge zwischen 1 und 1000 mg eingeben.",
                showIcon: true,
            });
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(trimmedName, parsedAmount);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Preset bearbeiten"
            onClose={onCancel}
        >
            <form
                className="dialog-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="form-group">
                    <label htmlFor="caffeine-preset-name">Name</label>
                    <input
                        id="caffeine-preset-name"
                        type="text"
                        maxLength={PRESET_NAME_MAX_LENGTH}
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="caffeine-preset-mg">Menge in mg (1–1000)</label>
                    <input
                        id="caffeine-preset-mg"
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        value={draftAmount}
                        onChange={(event) => setDraftAmount(event.target.value)}
                    />
                </div>
                <DialogActions
                    cancel={{text: "Abbrechen", onClick: onCancel, disabled: submitting}}
                    confirm={{text: submitting ? "Speichern..." : "Speichern", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
