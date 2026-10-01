import {useState} from "react";
import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";
import type {FeedbackType} from "@/models/Feedback.tsx";
import {RichTextEditor} from "@/components/ui/RichTextEditor.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";

interface FeedbackDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        title: string;
        description: string;
        type: FeedbackType;
    }) => void | Promise<void>;
}

export default function FeedbackDialog({
    isOpen,
    onCancel,
    onSubmit,
}: FeedbackDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<FeedbackType>("OTHER");
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setType("OTHER");
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

        if (title === null || title === "") {
            snackbarService.showSnackbar({type: "error", text: "Titel kann nicht leer sein", showIcon: true});
            return;
        }

        if (description === null || description === "") {
            snackbarService.showSnackbar({type: "error", text: "Beschreibung kann nicht leer sein", showIcon: true});
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                title: title,
                description: description,
                type: type,
            });
            resetForm();
            onCancel();
        } catch (error: unknown) {
            if (!(error instanceof Error)) {
                snackbarService.showSnackbar({type: "error", text: "Beitrag konnte nicht gesendet werden", showIcon: true});
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Beitrag verfassen"
            subtitle="Dein Beitrag wird öffentlich mit Angabe deines Benutzernamens gepostet."
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
                    <label htmlFor="type">Typ</label>
                    <select
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        className="dialog-select"
                    >
                        <option value="OTHER">ALLGEMEIN</option>
                        <option value="FEEDBACK">FEEDBACK</option>
                        <option value="BUG">BUG</option>
                        <option value="IDEA">IDEE</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="titel">Titel</label>
                    <input
                        id="titel"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <RichTextEditor value={description} onChange={setDescription} />

                <DialogActions
                    cancel={{text: "Abbrechen", onClick: handleCancel, disabled: submitting}}
                    confirm={{text: "Absenden", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
