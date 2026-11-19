import "@/components/widgets/cat/DailyCat.css";
import {useEffect, useState} from "react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {getDailyCat} from "@/services/dailyEventService.tsx";
import {getErrorText} from "@/services/api.tsx";
import {Fullscreen} from "lucide-react";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";
import ImageLightbox from "@/components/ui/ImageLightbox.tsx";

const DailyCat = ({title, isPreview} : WidgetProps) => {

    const [inFullscreen, setInFullscreen] = useState(false);
    const [catUrl, setCatUrl] = useState<string>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | undefined;
        setLoading(true);
        setError(null);
        getDailyCat()
            .then(blob => {
                if (cancelled) {
                    return;
                }
                objectUrl = URL.createObjectURL(blob);
                setCatUrl(objectUrl);
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
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, []);

    if (isPreview) {
        return <>
            <div className="daily-cat-preview">
                {catUrl && <img src={catUrl} alt="" />}
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>
    }

    return (
        <>
            <div className="daily-cat-widget">
                <div className="widget-header">
                    <button
                        type="button"
                        className="widget-header-icon"
                        aria-label="Vollbild"
                        onClick={() => setInFullscreen(true)}
                        disabled={!catUrl}
                    >
                        <Fullscreen size={20} />
                    </button>
                </div>
                <div className="daily-cat-img-wrapper">
                    {loading && <WidgetStatus status="loading" />}
                    {!loading && error && <WidgetStatus status="error" message={error} />}
                    {!loading && !error && catUrl && (
                        <img className="daily-cat-img" src={catUrl} alt="Tägliche Katze" />
                    )}
                </div>
            </div>
            {inFullscreen && catUrl && (
                <ImageLightbox
                    src={catUrl}
                    alt="Tägliche Katze"
                    onClose={() => setInFullscreen(false)}
                />
            )}
        </>
    );

}

export default DailyCat;
