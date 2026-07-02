import { useState } from "react";
import Dialog from "./Dialog";
import "./GameSuggestionDialog.css";
import Button from "../Button.tsx";
import {snackbarService} from "../../../services/snackBarService.tsx";

interface GameSuggestionDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        title: string;
        description: string;
        url: string;
    }) => void;
}

export default function GameSuggestionDialog({
                                                 isOpen,
                                                 onCancel,
                                                 onSubmit,
                                             }: GameSuggestionDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [url, setUrl] = useState("");

    const handleSubmit = () => {

        if (title === null || title === "") {
            snackbarService.showSnackbar({type: "error", text:"Titel kann nicht leer sein", showIcon: true });
            return
        }

        if (description === null || description === "") {
            snackbarService.showSnackbar({type: "error", text:"Beschreibung kann nicht leer sein", showIcon: true });
            return
        }

        if (url === null || url === "") {
            snackbarService.showSnackbar({type: "error", text:"Url kann nicht leer sein", showIcon: true });
            return
        }

        onSubmit({
            title: title,
            description: description,
            url,
        });
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Neues Spiel vorschlagen"
            subtitle="Dein Vorschlag wird im Anschluss von einem Admin geprüft und gegebenenfalls zur Liste hinzugefügt."
            onClose={onCancel}
        >
            <form
                className="game-suggestion-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
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
                    <label htmlFor="description">
                        Beschreibung
                    </label>
                    <textarea
                        id="description"
                        rows={5}
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
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

                <div className="dialog-actions">
                    <Button
                        text={"Abbrechen"}
                        onClick={onCancel}
                        variant="secondary"
                        type="reset"
                        fullWidth={true}
                    />

                    <Button
                        text={"Absenden"}
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