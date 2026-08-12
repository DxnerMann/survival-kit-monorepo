import {type ChangeEvent, type DragEvent, useCallback, useEffect, useState} from "react";
import Dialog from "@/components/dialog/Dialog.tsx";
import DialogActions from "@/components/dialog/DialogActions.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import "@/components/dialog/MemeUploadDialog.css";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
const MAX_FILE_SIZE_MB = 8;

interface MemeUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (data: { file: File; title?: string; description?: string }) => Promise<void> | void;
}

export default function MemeUploadDialog({isOpen, onClose, onUpload}: MemeUploadDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        return () => {
            if (previewSrc) {
                URL.revokeObjectURL(previewSrc);
            }
        };
    }, [previewSrc]);

    const resetState = useCallback(() => {
        if (previewSrc) {
            URL.revokeObjectURL(previewSrc);
        }

        setFile(null);
        setPreviewSrc(null);
        setTitle("");
        setDescription("");
        setIsDraggingOver(false);
        setIsSubmitting(false);
    }, [previewSrc]);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const applySelectedFile = useCallback((selected: File | undefined | null) => {
        if (!selected) return;

        if (!ALLOWED_TYPES.includes(selected.type)) {
            snackbarService.showSnackbar({type: "error", text: "Bitte wähle ein PNG-, JPG/JPEG- oder GIF-Bild aus.", showIcon: true});
            return;
        }

        if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            snackbarService.showSnackbar({type: "error", text: `Die Datei darf maximal ${MAX_FILE_SIZE_MB} MB groß sein.`, showIcon: true});
            return;
        }

        setFile(selected);
        setPreviewSrc((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return URL.createObjectURL(selected);
        });
    }, []);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = "";
        applySelectedFile(selected);
    };

    const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const dropped = e.dataTransfer.files?.[0];
        applySelectedFile(dropped);
    };

    const handleConfirm = async () => {
        if (!file) {
            snackbarService.showSnackbar({type: "warning", text: "Bitte wähle zuerst ein Meme aus.", showIcon: true});
            return;
        }

        setIsSubmitting(true);

        try {
            await onUpload({
                file,
                title,
                description,
            });
            snackbarService.showSnackbar({type: "success", text: "Meme wurde hochgeladen.", showIcon: true});
            resetState();
            onClose();
        } catch (error) {
            if (!(error instanceof Error)) {
                snackbarService.showSnackbar({type: "error", text: "Upload fehlgeschlagen. Bitte versuche es erneut.", showIcon: true});
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Meme hochladen"
            subtitle="PNG, JPG/JPEG oder GIF auswählen und optional Titel und Beschreibung ergänzen"
            onClose={handleClose}
        >
            <div className="meme-upload-dialog-content">
                <label
                    className={`meme-upload-area${isDraggingOver ? " meme-upload-area--dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif"
                        onChange={handleFileChange}
                        hidden
                    />
                    {previewSrc ? (
                        <img src={previewSrc} alt="Meme preview" className="meme-upload-preview" />
                    ) : (
                        <span>
                            {isDraggingOver
                                ? "Meme hier loslassen"
                                : "Klicke oder ziehe dein Meme hierher"}
                        </span>
                    )}
                </label>

                <div className="dialog-form meme-upload-fields">
                    <div className="form-group">
                        <label htmlFor="meme-title">Titel optional</label>
                        <input
                            id="meme-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titel"
                            maxLength={120}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="meme-description">Beschreibung optional</label>
                        <textarea
                            id="meme-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Beschreibung"
                            maxLength={500}
                        />
                    </div>
                </div>

                <DialogActions
                    cancel={{text: "Abbrechen", onClick: handleClose, type: "button"}}
                    confirm={{
                        text: isSubmitting ? "Lädt hoch..." : "Hochladen",
                        onClick: handleConfirm,
                        type: "button",
                        disabled: isSubmitting,
                    }}
                />
            </div>
        </Dialog>
    );
}
