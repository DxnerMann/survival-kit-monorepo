import {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import "@/components/ui/ImageLightbox.css";

type ImageLightboxProps = {
    src: string;
    alt: string;
    onClose: () => void;
};

const ImageLightbox = ({src, alt, onClose}: ImageLightboxProps) => {
    const stageRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [frame, setFrame] = useState<{width: number; height: number} | null>(null);

    const measure = useCallback(() => {
        const stage = stageRef.current;
        const image = imageRef.current;
        if (!stage || !image?.naturalWidth || !image.naturalHeight) {
            return;
        }
        const scale = Math.min(
            stage.clientWidth / image.naturalWidth,
            stage.clientHeight / image.naturalHeight
        );
        setFrame({
            width: Math.max(1, Math.floor(image.naturalWidth * scale)),
            height: Math.max(1, Math.floor(image.naturalHeight * scale)),
        });
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) {
            return;
        }
        const observer = new ResizeObserver(() => measure());
        observer.observe(stage);
        measure();
        return () => observer.disconnect();
    }, [measure, src]);

    return createPortal(
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
            <button
                type="button"
                className="image-lightbox__close"
                onClick={onClose}
                aria-label="Schließen"
            >
                <X size={22} />
            </button>
            <div className="image-lightbox__stage" ref={stageRef} onClick={(event) => event.stopPropagation()}>
                <img
                    ref={imageRef}
                    className="image-lightbox__img"
                    src={src}
                    alt={alt}
                    onLoad={measure}
                    style={{
                        width: frame?.width,
                        height: frame?.height,
                        opacity: frame ? 1 : 0,
                    }}
                />
            </div>
        </div>,
        document.body
    );
};

export default ImageLightbox;
