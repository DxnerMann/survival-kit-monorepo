import Dialog from "./Dialog";
import "./FeedbackAnswerDialog.css";
import Button from "../Button.tsx";

interface DeleteDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onSubmit: () => void;
    title: string,
    subtitle: string
}

export default function DeleteDialog({
    isOpen,
    onCancel,
    onSubmit,
    title,
    subtitle
}: DeleteDialogProps) {

    const handleSubmit = () => {
        onSubmit();
    };

    return (
        <Dialog
            isOpen={isOpen}
            title={title}
            subtitle={subtitle}
            onClose={onCancel}
        >
            <form
                className="feedback-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="dialog-actions">
                    <Button
                        text={"Abbrechen"}
                        onClick={onCancel}
                        variant="secondary"
                        type="reset"
                        fullWidth={true}
                    />

                    <Button
                        text={"Bestätigen"}
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