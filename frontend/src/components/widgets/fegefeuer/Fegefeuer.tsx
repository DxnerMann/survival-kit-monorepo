import "@/components/widgets/fegefeuer/Fegefeuer.css";
import {useEffect, useState} from "react";
import {Settings} from "lucide-react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import Button from "@/components/ui/Button.tsx";

interface FegefeuerData {
    endDate: string;
}

const TITLE = "Tage bis Abschluss des Studiums";

const readEndDate = (data: string): string => {
    if (!data) {
        return "";
    }
    try {
        const parsed = JSON.parse(data) as Partial<FegefeuerData>;
        return typeof parsed.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.endDate)
            ? parsed.endDate
            : "";
    } catch {
        return "";
    }
};

const berlinToday = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());

const daysUntil = (endDate: string, today: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
        return null;
    }
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
    const end = Date.UTC(endYear, endMonth - 1, endDay);
    const start = Date.UTC(todayYear, todayMonth - 1, todayDay);
    return Math.max(0, Math.round((end - start) / 86_400_000));
};

const FegefeuerFace = ({days}: {days: number | null}) => (
    <div className="fegefeuer-face">
        <span className="fegefeuer-days">{days == null ? "–" : days}</span>
        <span className="fegefeuer-caption">{TITLE}</span>
    </div>
);

const Fegefeuer = ({title, data, id, isPreview}: WidgetProps) => {
    const [endDate, setEndDate] = useState(() => readEndDate(data));
    const [draftDate, setDraftDate] = useState(() => readEndDate(data));
    const [inSettings, setInSettings] = useState(false);
    const [today, setToday] = useState(berlinToday);

    useEffect(() => {
        const timer = window.setInterval(() => setToday(berlinToday()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const days = daysUntil(endDate, today);

    const saveSettings = () => {
        setEndDate(draftDate);
        setInSettings(false);
        if (isPreview || getUserRole() === "GUEST") {
            return;
        }
        const payload: FegefeuerData = {endDate: draftDate};
        void dashboardService.saveWidgetData(id, JSON.stringify(payload));
    };

    if (isPreview) {
        return (
            <>
                <FegefeuerFace days={days} />
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    return (
        <div className="fegefeuer-widget">
            <div className="widget-header">
                {!inSettings && (
                    <Settings
                        className="widget-header-icon"
                        size={20}
                        onClick={() => {
                            setDraftDate(endDate);
                            setInSettings(true);
                        }}
                    />
                )}
            </div>
            {inSettings ? (
                <div className="settings-content">
                    <div className="settings-content-wrapper">
                        <p className="widget-settings-heading">Abschlussdatum</p>
                        <label className="fegefeuer-date-label" htmlFor={`fegefeuer-date-${id}`}>
                            Tag, an dem du das Studium abschließt
                            <input
                                id={`fegefeuer-date-${id}`}
                                className="fegefeuer-date"
                                type="date"
                                value={draftDate}
                                onChange={event => setDraftDate(event.target.value)}
                            />
                        </label>
                    </div>
                    <div className="widget-settings-buttons">
                        <Button text="Zurück" onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth />
                        <Button text="Speichern" onClick={saveSettings} variant="primary" type="submit" fullWidth />
                    </div>
                </div>
            ) : (
                <FegefeuerFace days={days} />
            )}
        </div>
    );
};

export default Fegefeuer;
