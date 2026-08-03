import "@/components/widgets/current-caffeine/CurrentCaffeine.css";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Fullscreen} from "lucide-react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {
    getCurrentBloodCaffeineMg,
    getTodayCaffeine,
    getTodayConsumedMg,
    getUserCaffeineEntries,
} from "@/services/caffeineService.tsx";
import {getErrorText} from "@/services/api.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";

const REFRESH_MS = 60_000;

const CurrentCaffeine = ({title, isPreview}: WidgetProps) => {
    const [inFullscreen, setInFullscreen] = useState(false);
    const [bloodMg, setBloodMg] = useState<number | null>(null);
    const [consumedMg, setConsumedMg] = useState<number | null>(null);
    const [loading, setLoading] = useState(!isPreview);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isPreview) {
            return;
        }
        if (getUserRole() === "GUEST") {
            setLoading(false);
            setError("Melde dich an, um dein Koffein zu tracken.");
            return;
        }

        let cancelled = false;

        const refresh = async () => {
            try {
                const [todayEntries, recentEntries] = await Promise.all([
                    getTodayCaffeine(),
                    getUserCaffeineEntries(),
                ]);
                if (cancelled) {
                    return;
                }
                setBloodMg(getCurrentBloodCaffeineMg(recentEntries));
                setConsumedMg(getTodayConsumedMg(todayEntries));
                setError(null);
            } catch (err: unknown) {
                if (!cancelled) {
                    setError(getErrorText(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        setLoading(true);
        refresh();
        const interval = setInterval(refresh, REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isPreview]);

    if (isPreview) {
        return <>
            <div className="current-caffeine-preview">
                <span className="current-caffeine__blood">120</span>
                <span className="current-caffeine__unit">mg</span>
                <span className="current-caffeine__consumed">180 mg heute</span>
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>;
    }

    const getWidgetContent = () => (
        <div className={`current-caffeine-widget ${inFullscreen ? "fullscreen" : ""}`}>
            <div className="widget-header">
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    onClick={() => setInFullscreen(!inFullscreen)}
                />
            </div>
            <div className="current-caffeine-body">
                {loading && <WidgetStatus status="loading" />}
                {!loading && error && <WidgetStatus status="error" message={error} />}
                {!loading && !error && (
                    <>
                        <div className="current-caffeine__primary">
                            <span className="current-caffeine__blood">{bloodMg ?? 0}</span>
                            <span className="current-caffeine__unit">mg</span>
                        </div>
                        <span className="current-caffeine__label">im Blut</span>
                        <span className="current-caffeine__consumed">
                            {consumedMg ?? 0} mg heute konsumiert
                        </span>
                    </>
                )}
            </div>
        </div>
    );

    return inFullscreen
        ? createPortal(getWidgetContent(), document.body)
        : getWidgetContent();
};

export default CurrentCaffeine;
