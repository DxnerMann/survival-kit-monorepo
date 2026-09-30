import {useState} from "react";
import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";
import {RichTextEditor} from "@/components/ui/RichTextEditor.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";

interface FeedbackAnswerDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        answer: string;
    }) => void | Promise<void>;
    previousAnswer: string;
}

export default function FeedbackAnswerDialog({
    isOpen,
    onCancel,
    onSubmit,
    previousAnswer,
}: FeedbackAnswerDialogProps) {
    const [answer, setAnswer] = useState(previousAnswer);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (submitting) {
            return;
        }

        if (answer === null || answer === "") {
            snackbarService.showSnackbar({type: "error", text: "Antwort kann nicht leer sein", showIcon: true});
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                answer: answer,
            });
            onCancel();
        } catch (error: unknown) {
            if (!(error instanceof Error)) {
                snackbarService.showSnackbar({type: "error", text: "Antwort konnte nicht gesendet werden", showIcon: true});
            }
        } finally {
            setSubmitting(false);
        }
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
                    cancel={{text: "Abbrechen", onClick: onCancel, disabled: submitting}}
                    confirm={{text: "Antworten", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
