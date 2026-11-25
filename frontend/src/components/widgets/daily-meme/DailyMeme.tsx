import "@/components/widgets/daily-meme/DailyMeme.css";
import {useEffect, useRef, useState} from "react";
import {Fullscreen, Images} from "lucide-react";
import ImageLightbox from "@/components/ui/ImageLightbox.tsx";
import {useNavigate} from "react-router-dom";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import type {Meme} from "@/models/Meme.tsx";
import {getDailyMeme} from "@/services/memeService.tsx";
import {getErrorText} from "@/services/api.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";

const memeSrc = (meme: Meme) => `data:${meme.contentType};base64,${meme.img}`;

const COVER_SIMILARITY = 0.8;

const DailyMeme = ({title, isPreview}: WidgetProps) => {
    const navigate = useNavigate();
    const bodyRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [meme, setMeme] = useState<Meme | null>(null);
    const [fit, setFit] = useState<"cover" | "contain">("cover");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inFullscreen, setInFullscreen] = useState(false);

    const updateFit = () => {
        const image = imageRef.current;
        const box = bodyRef.current;
        if (!image || !box || !image.naturalWidth || !image.naturalHeight || !box.clientWidth || !box.clientHeight) {
            return;
        }
        const imageRatio = image.naturalWidth / image.naturalHeight;
        const boxRatio = box.clientWidth / box.clientHeight;
        const similarity = Math.min(imageRatio, boxRatio) / Math.max(imageRatio, boxRatio);
        setFit(similarity >= COVER_SIMILARITY ? "cover" : "contain");
    };

    useEffect(() => {
        if (getUserRole() === "GUEST") {
            setLoading(false);
            setError("Melde dich an, um das Tagesmeme zu sehen.");
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        getDailyMeme()
            .then((next) => {
                if (!cancelled) {
                    setMeme(next);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(getErrorText(err));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const box = bodyRef.current;
        if (!box || !meme) {
            return;
        }
        const observer = new ResizeObserver(() => updateFit());
        observer.observe(box);
        updateFit();
        return () => observer.disconnect();
    }, [meme]);

    if (isPreview) {
        return <>
            <div className="daily-meme-preview">
                {meme && (
                    <img src={memeSrc(meme)} alt="" />
                )}
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>;
    }

    return (
        <div className="daily-meme-widget">
            <div className="daily-meme-body" ref={bodyRef}>
                {loading && <WidgetStatus status="loading" />}
                {!loading && error && <WidgetStatus status="error" message={error} />}
                {!loading && !error && !meme && (
                    <p className="daily-meme-empty">Auf der Memewand deines Kurses gibt es noch kein Meme.</p>
                )}
                {!loading && !error && meme && (
                    <img
                        ref={imageRef}
                        className="daily-meme-img"
                        src={memeSrc(meme)}
                        alt={meme.title || "Tagesmeme"}
                        style={{objectFit: fit}}
                        onLoad={updateFit}
                    />
                )}
            </div>
            <div className="widget-header">
                <button
                    type="button"
                    className="widget-header-icon"
                    aria-label="Zur Memewand"
                    onClick={() => navigate("/memewall")}
                >
                    <Images size={20} />
                </button>
                {meme && (
                    <button
                        type="button"
                        className="widget-header-icon"
                        aria-label="Vollbild"
                        onClick={() => setInFullscreen(true)}
                    >
                        <Fullscreen size={20} />
                    </button>
                )}
            </div>
            {inFullscreen && meme && (
                <ImageLightbox
                    src={memeSrc(meme)}
                    alt={meme.title || "Tagesmeme"}
                    onClose={() => setInFullscreen(false)}
                />
            )}
        </div>
    );
};

export default DailyMeme;
