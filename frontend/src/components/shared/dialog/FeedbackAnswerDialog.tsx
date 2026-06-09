import { useState } from "react";
import Dialog from "./Dialog";
import "./FeedbackAnswerDialog.css";
import Button from "../Button.tsx";
import {RichTextEditor} from "../RichTextEditor.tsx";

interface FeedbackAnswerDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: (data: {
        answer: string;
    }) => void;
    previousAnswer: string
}

export default function FeedbackAnswerDialog({
    isOpen,
    onCancel,
    onSubmit,
    previousAnswer
                                       }: FeedbackAnswerDialogProps) {
    const [answer, setAnswer] = useState(previousAnswer);
    const [errorText, setErrorText] = useState("");

    const handleSubmit = () => {

        if (answer === null || answer === "") {
            setErrorText("Antwort kann nicht leer sein");
            return
        }

        setErrorText("");

        onSubmit({
            answer: answer
        });
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Antwort verfassen"
            subtitle="Die Antwort wird im Anschluss öffentlich sichtbar sein."
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
                <RichTextEditor value={answer} onChange={setAnswer} />

                <div className="dialog-actions">
                    <Button
                        text={"Abbrechen"}
                        onClick={onCancel}
                        variant="secondary"
                        type="reset"
                        fullWidth={true}
                    />

                    <Button
                        text={"Antworten"}
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