import {useState} from "react";
import Dialog from "./Dialog";
import DialogActions from "./DialogActions";
import type {FeedbackType} from "../../../models/Feedback.tsx";
import {RichTextEditor} from "../RichTextEditor.tsx";
import {snackbarService} from "../../../services/snackBarService.tsx";

interface FeedbackDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        title: string;
        description: string;
        type: FeedbackType;
    }) => void;
}

export default function FeedbackDialog({
    isOpen,
    onCancel,
    onSubmit,
}: FeedbackDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<FeedbackType>("OTHER");

    const handleSubmit = () => {
        if (title === null || title === "") {
            snackbarService.showSnackbar({type: "error", text: "Titel kann nicht leer sein", showIcon: true});
            return;
        }

        if (description === null || description === "") {
            snackbarService.showSnackbar({type: "error", text: "Beschreibung kann nicht leer sein", showIcon: true});
            return;
        }

        onSubmit({
            title: title,
            description: description,
            type: type,
        });
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Beitrag verfassen"
            subtitle="Dein Beitrag wird öffentlich mit angabe deines Benutzernamens gepostet."
            onClose={onCancel}
        >
            <form className="dialog-form">
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
                    cancel={{text: "Abbrechen", onClick: onCancel}}
                    confirm={{text: "Absenden", onClick: handleSubmit}}
                />
            </form>
        </Dialog>
    );
}
