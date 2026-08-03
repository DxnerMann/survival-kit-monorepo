import "./DailyCat.css";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import type {WidgetProps} from "../../../models/WidgetProps.tsx";
import {getDailyCat} from "../../../services/dailyEventService.tsx";
import {getErrorText} from "../../../services/api.tsx";
import {Fullscreen} from "lucide-react";
import WidgetStatus from "../../shared/WidgetStatus.tsx";

const DailyCat = ({title, isPreview} : WidgetProps) => {

    const [inFullscreen, setInFullscreen] = useState(false);
    const [catUrl, setCatUrl] = useState<string>();
    const [loading, setLoading] = useState(!isPreview);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isPreview) {
            return;
        }
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
    }, [isPreview]);

    if (isPreview) {
        return <>
            <div className="lecture-plan-widget-preview">
                <p>Tägliche Katze</p>
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>
    }

    const getWidgetContent = () => (
        <div className={`daily-cat-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            <div className="daily-cat-img-wrapper">
                {loading && <WidgetStatus status="loading" />}
                {!loading && error && <WidgetStatus status="error" message={error} />}
                {!loading && !error && catUrl && (
                    <img className="daily-cat-img" src={catUrl} alt="Daily cat" />
                )}
            </div>
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();

}

export default DailyCat;
