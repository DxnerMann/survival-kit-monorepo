import { useState } from "react";
import Dialog from "./Dialog";
import "./FeedbackDialog.css";
import Button from "../Button.tsx";
import type {FeedbackType} from "../../../models/Feedback.tsx";
import {RichTextEditor} from "../RichTextEditor.tsx";

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
    const [errorText, setErrorText] = useState("");
    const [type, setType] = useState<FeedbackType>("OTHER");

    const handleSubmit = () => {

        if (title === null || title === "") {
            setErrorText("Titel kann nicht leer sein");
            return
        }

        if (description === null || description === "") {
            setErrorText("Beschreibung kann nicht leer sein");
            return
        }

        setErrorText("");

        onSubmit({
            title: title,
            description: description,
            type: type
        });
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Beitrag verfassen"
            subtitle="Dein Beitrag wird öffentlich mit angabe deines Benutzernamens gepostet."
            onClose={onCancel}
        >
            <div className="error-text">
                <a>{errorText}</a>
            </div>
            <form
                className="feedback-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="form-group">
                    <label htmlFor="type">Typ</label>
                    <select
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        className="feedback-select"
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