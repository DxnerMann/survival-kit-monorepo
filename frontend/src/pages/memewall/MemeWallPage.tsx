import {type CSSProperties, useCallback, useEffect, useRef, useState} from "react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Button from "@/components/ui/Button.tsx";
import MemeUploadDialog from "@/components/dialog/MemeUploadDialog.tsx";
import {deleteMeme, getMemes, uploadMeme} from "@/services/memeService.tsx";
import {ExternalLink, ImagePlus, Trash2, Upload} from "lucide-react";
import type {Meme} from "@/models/Meme.tsx";
import {isAdmin} from "@/services/tokenService.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import "@/pages/memewall/MemeWallPage.css";

const PAGE_SIZE = 20;

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

    const handleDelete = async (id: string) => {
        await deleteMeme(id);
        setMemes((current) => current.filter((meme) => meme.id !== id));
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
                            <img
                                src={`data:${meme.contentType};base64,${meme.img}`}
                                alt={meme.title || "Meme"}
                                loading="lazy"
                            />
                            <div className="memewall-meme__overlay">
                                <div className="memewall-meme__text">
                                    {meme.title && <h3>{meme.title}</h3>}
                                    {meme.description && <p>{meme.description}</p>}
                                    {!meme.title && !meme.description && <p>Kein Titel oder Beschreibung vorhanden.</p>}
                                </div>
                                {canDeleteMemes && (
                                    <button
                                        type="button"
                                        className="memewall-meme__delete"
                                        onClick={() => void handleDelete(meme.id)}
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

            <MemeUploadDialog
                isOpen={isUploadDialogOpen}
                onClose={() => setIsUploadDialogOpen(false)}
                onUpload={handleUpload}
            />
        </div>
    );
};

export default MemeWallPage;
