import {type CSSProperties, useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Button from "@/components/ui/Button.tsx";
import MemeUploadDialog from "@/components/dialog/MemeUploadDialog.tsx";
import {deleteMeme, getMemes, uploadMeme} from "@/services/memeService.tsx";
import {ExternalLink, ImagePlus, Trash2, Upload, X} from "lucide-react";
import type {Meme} from "@/models/Meme.tsx";
import {isAdmin} from "@/services/tokenService.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import "@/pages/memewall/MemeWallPage.css";

const PAGE_SIZE = 20;

const memeSrc = (meme: Meme) => `data:${meme.contentType};base64,${meme.img}`;

const authorLabel = (meme: Meme) => {
    const name = meme.authorUsername?.trim();
    return `erstellt von ${name || "Unbekannt"}`;
};

const newestMemeId = (memes: Meme[]): string | null => {
    return memes.reduce<Meme | null>((latest, meme) => {
        if (!latest) {
            return meme;
        }
        const latestTime = Date.parse(latest.addedAt);
        const memeTime = Date.parse(meme.addedAt);
        if (memeTime !== latestTime) {
            return memeTime > latestTime ? meme : latest;
        }
        return meme.id > latest.id ? meme : latest;
    }, null)?.id ?? null;
};

const MemeLightbox = ({meme, onClose}: {meme: Meme; onClose: () => void}) => {
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
    }, [measure]);

    return createPortal(
        <div className="meme-lightbox" role="dialog" aria-modal="true" aria-label={meme.title || "Meme"} onClick={onClose}>
            <button
                type="button"
                className="meme-lightbox__close"
                onClick={onClose}
                aria-label="Schließen"
            >
                <X size={22} />
            </button>
            <div className="meme-lightbox__stage" ref={stageRef} onClick={(event) => event.stopPropagation()}>
                <img
                    ref={imageRef}
                    className="meme-lightbox__img"
                    src={memeSrc(meme)}
                    alt={meme.title || "Meme"}
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

const memePlacementStyle = (id: string, index: number): CSSProperties & Record<string, string> => {
    const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const rotate = ((seed % 9) - 4) * 0.7;
    const offset = ((seed + index) % 5) * 0.35;

    return {
        "--meme-rotate": `${rotate}deg`,
        "--meme-offset": `${offset}rem`,
    };
};

const MemeWallPage = () => {
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [memes, setMemes] = useState<Meme[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const canDeleteMemes = isAdmin();

    const loadFirstPage = useCallback(async () => {
        setIsLoading(true);

        try {
            const page = await getMemes(PAGE_SIZE);
            setMemes(page.data);
            setContinuation(page.continuation);
            setHasMore(Boolean(page.continuation));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadNextPage = useCallback(async () => {
        if (isLoading || !hasMore || !continuation) {
            return;
        }

        setIsLoading(true);

        try {
            const page = await getMemes(PAGE_SIZE, continuation);
            setMemes((current) => [...current, ...page.data]);
            setContinuation(page.continuation);
            setHasMore(Boolean(page.continuation));
        } finally {
            setIsLoading(false);
        }
    }, [continuation, hasMore, isLoading]);

    useEffect(() => {
        void loadFirstPage();
    }, [loadFirstPage]);

    useEffect(() => {
        const sentinel = sentinelRef.current;

        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                void loadNextPage();
            }
        }, {rootMargin: "400px"});

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [loadNextPage]);

    const handleUpload = async (data: { file: File; title?: string; description?: string }) => {
        await uploadMeme(data);
        await loadFirstPage();
    };

    const closeLightbox = useCallback(() => setSelectedMeme(null), []);
    const newestId = newestMemeId(memes);

    const handleDelete = async (id: string) => {
        await deleteMeme(id);
        setMemes((current) => current.filter((meme) => meme.id !== id));
        setSelectedMeme((current) => current?.id === id ? null : current);
        snackbarService.showSnackbar({type: "success", text: "Meme wurde gelöscht.", showIcon: true});
    };

    return (
        <div className="survival-kit-page">
            <div className="memewall-page">
                <SectionHeading
                    heading="Memewand"
                    subheading="Teile die besten Memes aus deinem Kurs."
                    centered={false}
                />

                <div className="memewall-page__top-grid">
                    <section className="memewall-card memewall-card--guide">
                        <div className="memewall-card__icon">
                            <ExternalLink size={28} />
                        </div>
                        <div className="memewall-card__content">
                            <h2>Memes erstellen</h2>
                            <p>
                                Du hast noch kein fertiges Meme? Auf imgflip kannst du schnell Vorlagen auswählen,
                                Text ergänzen und dein Meme anschließend hier hochladen.
                            </p>
                            <a
                                className="memewall-card__link"
                                href="https://imgflip.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                imgflip.com öffnen
                            </a>
                        </div>
                    </section>

                    <section className="memewall-card memewall-card--upload">
                        <div className="memewall-card__icon">
                            <ImagePlus size={30} />
                        </div>
                        <div className="memewall-card__content">
                            <h2>Meme teilen</h2>
                            <p>
                                Lade ein PNG, JPG/JPEG oder GIF hoch. Titel und Beschreibung sind optional.
                            </p>
                            <Button
                                text="Meme hochladen"
                                onClick={() => setIsUploadDialogOpen(true)}
                                variant="primary"
                            />
                        </div>
                        <Upload className="memewall-card__watermark" aria-hidden="true" />
                    </section>
                </div>

                <div className="memewall-gallery" aria-live="polite">
                    {memes.map((meme, index) => (
                        <article
                            key={meme.id}
                            className="memewall-meme"
                            style={memePlacementStyle(meme.id, index)}
                        >
                            {meme.id === newestId && (
                                <span className="memewall-meme__badge">Neuste</span>
                            )}
                            <button
                                type="button"
                                className="memewall-meme__open"
                                onClick={() => setSelectedMeme(meme)}
                                aria-label={meme.title ? `${meme.title} öffnen` : "Meme öffnen"}
                            >
                                <img
                                    src={memeSrc(meme)}
                                    alt={meme.title || "Meme"}
                                    loading="lazy"
                                />
                            </button>
                            <div className="memewall-meme__overlay">
                                <div className="memewall-meme__text">
                                    {meme.title && <h3>{meme.title}</h3>}
                                    {!meme.title && !meme.description && <p>Kein Titel oder Beschreibung vorhanden.</p>}
                                    <p className="memewall-meme__author">{authorLabel(meme)}</p>
                                    {meme.description && <p>{meme.description}</p>}
                                </div>
                                {canDeleteMemes && (
                                    <button
                                        type="button"
                                        className="memewall-meme__delete"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void handleDelete(meme.id);
                                        }}
                                        aria-label="Meme löschen"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>

                {!isLoading && memes.length === 0 && (
                    <p className="memewall-gallery__empty">Noch keine Memes auf dieser Memewand.</p>
                )}

                <div ref={sentinelRef} className="memewall-gallery__sentinel" aria-hidden="true" />
                {isLoading && <p className="memewall-gallery__loading">Memes werden geladen...</p>}
            </div>

            {selectedMeme && <MemeLightbox meme={selectedMeme} onClose={closeLightbox} />}

            <MemeUploadDialog
                isOpen={isUploadDialogOpen}
                onClose={() => setIsUploadDialogOpen(false)}
                onUpload={handleUpload}
            />
        </div>
    );
};

export default MemeWallPage;
