import { useState, useCallback, useEffect } from "react";
import "./ProfilePictureDialog.css";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import Dialog from "./Dialog";
import Button from "../Button.tsx";
import { getCroppedImageBlob } from "../../../services/cropImageUtil.tsx";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif"];
const MAX_FILE_SIZE_MB = 8;

interface ProfilePictureDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (file: Blob, isGif: boolean) => Promise<void> | void;
}

export default function ProfilePictureDialog({
                                                 isOpen,
                                                 onClose,
                                                 onUpload,
                                             }: ProfilePictureDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isGif, setIsGif] = useState(false);

    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    useEffect(() => {
        return () => {
            if (imageSrc) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [imageSrc]);

    const resetState = useCallback(() => {
        setFile(null);
        setImageSrc(null);
        setIsGif(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setError(null);
        setIsSubmitting(false);
        setIsDraggingOver(false);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const applySelectedFile = useCallback((selected: File | undefined | null) => {
        if (!selected) return;

        if (!ALLOWED_TYPES.includes(selected.type)) {
            setError("Bitte wähle ein PNG-, JPG/JPEG- oder GIF-Bild aus.");
            return;
        }

        if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setError(`Die Datei darf maximal ${MAX_FILE_SIZE_MB} MB groß sein.`);
            return;
        }

        setError(null);
        setFile(selected);
        setIsGif(selected.type === "image/gif");
        setImageSrc(URL.createObjectURL(selected));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = "";
        applySelectedFile(selected);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const dropped = e.dataTransfer.files?.[0];
        applySelectedFile(dropped);
    };

    const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleConfirm = async () => {
        if (!file || !imageSrc) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (isGif) {
                await onUpload(file, true);
            } else {
                if (!croppedAreaPixels) return;
                const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, file.type);
                await onUpload(blob, false);
            }
            resetState();
            onClose();
        } catch {
            setError("Upload fehlgeschlagen. Bitte versuche es erneut.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            title="Profilbild ändern"
            subtitle="Lade ein Bild (PNG/JPG) oder GIF hoch"
            onClose={handleClose}
        >
            <div className="profile-picture-dialog-content">
                {!imageSrc && (
                    <label
                        className={`profile-picture-upload-area${isDraggingOver ? " profile-picture-upload-area-dragging" : ""}`}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif"
                            onChange={handleFileChange}
                            hidden
                        />
                        <span>
                            {isDraggingOver
                                ? "Bild hier loslassen"
                                : "Klicke oder ziehe ein Bild/GIF hierher"}
                        </span>
                    </label>
                )}

                {imageSrc && !isGif && (
                    <div className="profile-picture-cropper">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    </div>
                )}

                {imageSrc && isGif && (
                    <div className="profile-picture-gif-preview">
                        <img src={imageSrc} alt="GIF preview" />
                        <p className="profile-picture-gif-note">
                            GIFs werden ohne Zuschnitt hochgeladen, damit die Animation erhalten bleibt.
                        </p>
                    </div>
                )}

                {error && <p className="profile-picture-error">{error}</p>}

                {imageSrc && (
                    <div className="dialog-actions">
                        <Button
                            text="Abbrechen"
                            onClick={handleClose}
                            variant="secondary"
                            type="button"
                            fullWidth={true}
                        />
                        <Button
                            text={isSubmitting ? "Lädt hoch..." : "Bestätigen"}
                            onClick={handleConfirm}
                            variant="primary"
                            type="button"
                            fullWidth={true}
                        />
                    </div>
                )}
            </div>
        </Dialog>
    );
}