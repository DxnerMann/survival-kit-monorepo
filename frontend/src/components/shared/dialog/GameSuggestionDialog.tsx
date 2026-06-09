import { useState } from "react";
import Dialog from "./Dialog";
import "./GameSuggestionDialog.css";
import Button from "../Button.tsx";

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
    const [errorText, setErrorText] = useState("");

    const handleSubmit = () => {

        if (title === null || title === "") {
            setErrorText("Titel kann nicht leer sein");
            return
        }

        if (description === null || description === "") {
            setErrorText("Beschreibung kann nicht leer sein");
            return
        }

        if (url === null || url === "") {
            setErrorText("Url kann nicht leer sein");
            return
        }

        setErrorText("");

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
            <div className="error-text">
                <a>{errorText}</a>
            </div>
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