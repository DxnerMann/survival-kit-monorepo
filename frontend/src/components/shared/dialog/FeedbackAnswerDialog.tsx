import {useState} from "react";
import Dialog from "./Dialog";
import DialogActions from "./DialogActions";
import {RichTextEditor} from "../RichTextEditor.tsx";
import {snackbarService} from "../../../services/snackBarService.tsx";

interface FeedbackAnswerDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        answer: string;
    }) => void;
    previousAnswer: string;
}

export default function FeedbackAnswerDialog({
    isOpen,
    onCancel,
    onSubmit,
    previousAnswer,
}: FeedbackAnswerDialogProps) {
    const [answer, setAnswer] = useState(previousAnswer);

    const handleSubmit = () => {
        if (answer === null || answer === "") {
            snackbarService.showSnackbar({type: "error", text: "Antwort kann nicht leer sein", showIcon: true});
            return;
        }

        onSubmit({
            answer: answer,
        });
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Antwort verfassen"
            subtitle="Die Antwort wird im Anschluss öffentlich sichtbar sein."
            onClose={onCancel}
        >
            <form
                className="dialog-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <RichTextEditor value={answer} onChange={setAnswer} />

                <DialogActions
                    cancel={{text: "Abbrechen", onClick: onCancel, type: "reset"}}
                    confirm={{text: "Antworten", onClick: handleSubmit, type: "submit"}}
                />
            </form>
        </Dialog>
    );
}
