import {useState} from "react";
import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";
import {snackbarService} from "@/services/snackBarService.tsx";

interface GameSuggestionDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        title: string;
        description: string;
        url: string;
    }) => void | Promise<void>;
}

export default function GameSuggestionDialog({
    isOpen,
    onCancel,
    onSubmit,
}: GameSuggestionDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [url, setUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setUrl("");
        setSubmitting(false);
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

        if (url === null || url === "") {
            snackbarService.showSnackbar({type: "error", text: "Url kann nicht leer sein", showIcon: true});
            return;
        }

        try {
            const parsed = new URL(url);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                snackbarService.showSnackbar({
                    type: "error",
                    text: "Url muss mit http:// oder https:// beginnen",
                    showIcon: true,
                });
                return;
            }
        } catch {
            snackbarService.showSnackbar({type: "error", text: "Url ist ungültig", showIcon: true});
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                title: title,
                description: description,
                url,
            });
            resetForm();
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        resetForm();
        onCancel();
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Neues Spiel vorschlagen"
            subtitle="Dein Vorschlag wird im Anschluss von einem Admin geprüft und gegebenenfalls zur Liste hinzugefügt."
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
                    <label htmlFor="title">Titel</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Beschreibung</label>
                    <textarea
                        id="description"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="url">URL</label>
                    <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>

                <DialogActions
                    cancel={{text: "Abbrechen", onClick: handleCancel, disabled: submitting}}
                    confirm={{text: "Absenden", type: "submit", disabled: submitting}}
                />
            </form>
        </Dialog>
    );
}
