import {useState} from "react";
import Dialog from "@/components/dialog/Dialog.tsx";
import DialogActions from "@/components/dialog/DialogActions.tsx";
import type {PresentationGameDifficulty} from "@/models/PresentationGameRoom.tsx";
import {PRESENTATION_DIFFICULTY_LABELS} from "@/models/PresentationGameRoom.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";

interface CreatePresentationRoomDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        name: string;
        isPublic: boolean;
        difficulty: PresentationGameDifficulty;
    }) => Promise<void>;
}

const DIFFICULTIES: PresentationGameDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export default function CreatePresentationRoomDialog({
    isOpen,
    onCancel,
    onSubmit,
}: CreatePresentationRoomDialogProps) {
    const [name, setName] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [difficulty, setDifficulty] = useState<PresentationGameDifficulty>("MEDIUM");
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setName("");
        setIsPublic(true);
        setDifficulty("MEDIUM");
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

        if (!name.trim()) {
            snackbarService.showSnackbar({
                type: "error",
                text: "Bitte gib einen Raumnamen ein.",
                showIcon: true,
            });
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({name: name.trim(), isPublic, difficulty});
            resetForm();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Raum erstellen"
            subtitle="Öffentliche Räume sind für deinen Kurs sichtbar. Private Räume sind nur per Code erreichbar."
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
                    <label htmlFor="room-name">Raumname</label>
                    <input
                        id="room-name"
                        type="text"
                        value={name}
                        maxLength={60}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <span className="form-group-label">Sichtbarkeit</span>
                    <div className="presentation-room-visibility">
                        <label className="presentation-room-visibility__option">
                            <input
                                type="radio"
                                name="visibility"
                                checked={isPublic}
                                onChange={() => setIsPublic(true)}
                            />
                            <span>Öffentlich (Kurs)</span>
                        </label>
                        <label className="presentation-room-visibility__option">
                            <input
                                type="radio"
                                name="visibility"
                                checked={!isPublic}
                                onChange={() => setIsPublic(false)}
                            />
                            <span>Privat (Code)</span>
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="room-difficulty">Schwierigkeit</label>
                    <select
                        id="room-difficulty"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as PresentationGameDifficulty)}
                    >
                        {DIFFICULTIES.map(level => (
                            <option key={level} value={level}>
                                {PRESENTATION_DIFFICULTY_LABELS[level]}
                            </option>
                        ))}
                    </select>
                </div>

                <DialogActions
                    cancel={{text: "Abbrechen", onClick: handleCancel, disabled: submitting}}
                    confirm={{text: "Erstellen", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
