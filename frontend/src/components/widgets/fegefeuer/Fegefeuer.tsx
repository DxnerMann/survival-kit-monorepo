import "@/components/widgets/fegefeuer/Fegefeuer.css";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {ChevronLeft, ChevronRight, Fullscreen, Settings} from "lucide-react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import Button from "@/components/ui/Button.tsx";
import Toggle from "@/components/ui/Toggle.tsx";

interface CustomCountdown {
    name: string;
    startDate: string;
    endDate: string;
    showProgress: boolean;
    countUp: boolean;
}

interface FegefeuerData {
    startDate: string;
    endDate: string;
    showProgress: boolean;
    countdowns: CustomCountdown[];
}

const STUDY_TITLE = "Tage bis Abschluss des Studiums";
const MAX_CUSTOM = 10;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const emptyCountdown = (): CustomCountdown => ({
    name: "",
    startDate: "",
    endDate: "",
    showProgress: false,
    countUp: false,
});

const isDate = (value: unknown): value is string => typeof value === "string" && DATE_PATTERN.test(value);

const readCountdown = (value: unknown): CustomCountdown | null => {
    if (!value || typeof value !== "object") {
        return null;
    }
    const raw = value as Partial<CustomCountdown>;
    const endDate = isDate(raw.endDate) ? raw.endDate : "";
    if (!endDate) {
        return null;
    }
    return {
        name: typeof raw.name === "string" ? raw.name.slice(0, 40) : "",
        startDate: isDate(raw.startDate) ? raw.startDate : "",
        endDate,
        showProgress: raw.showProgress === true,
        countUp: raw.countUp === true,
    };
};

const readData = (data: string): FegefeuerData => {
    const fallback: FegefeuerData = {startDate: "", endDate: "", showProgress: false, countdowns: []};
    if (!data) {
        return fallback;
    }
    try {
        const parsed = JSON.parse(data) as Partial<FegefeuerData>;
        const countdowns = Array.isArray(parsed.countdowns)
            ? parsed.countdowns.map(readCountdown).filter((item): item is CustomCountdown => item !== null).slice(0, MAX_CUSTOM)
            : [];
        return {
            startDate: isDate(parsed.startDate) ? parsed.startDate : "",
            endDate: isDate(parsed.endDate) ? parsed.endDate : "",
            showProgress: parsed.showProgress === true,
            countdowns,
        };
    } catch {
        return fallback;
    }
};

const berlinToday = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());

const daysBetween = (earlier: string, later: string): number | null => {
    if (!DATE_PATTERN.test(earlier) || !DATE_PATTERN.test(later)) {
        return null;
    }
    const [earlierYear, earlierMonth, earlierDay] = earlier.split("-").map(Number);
    const [laterYear, laterMonth, laterDay] = later.split("-").map(Number);
    const start = Date.UTC(earlierYear, earlierMonth - 1, earlierDay);
    const end = Date.UTC(laterYear, laterMonth - 1, laterDay);
    return Math.round((end - start) / 86_400_000);
};

const daysUntil = (endDate: string, today: string): number | null => {
    const diff = daysBetween(today, endDate);
    return diff == null ? null : Math.max(0, diff);
};

const daysSince = (date: string, today: string): number | null => {
    const diff = daysBetween(date, today);
    return diff == null ? null : Math.max(0, diff);
};

const progressPercent = (startDate: string, endDate: string, today: string): number | null => {
    if (!startDate || !endDate || startDate >= endDate) {
        return null;
    }
    const total = daysBetween(startDate, endDate);
    const elapsed = daysBetween(startDate, today);
    if (total == null || elapsed == null || total <= 0) {
        return null;
    }
    return Math.round(Math.min(100, Math.max(0, (elapsed / total) * 100)));
};

const shiftDate = (iso: string, days: number): string => {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

const FegefeuerFace = ({
    days,
    caption,
    progress,
    showArrows,
    canGoBack,
    canGoForward,
    onPrevious,
    onNext,
}: {
    days: number | null;
    caption: string;
    progress: number | null;
    showArrows: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    onPrevious: () => void;
    onNext: () => void;
}) => (
    <div className={`fegefeuer-face${progress != null ? " fegefeuer-face-progress" : ""}`}>
        {showArrows && (
            <button
                type="button"
                className="fegefeuer-arrow fegefeuer-arrow-left"
                onClick={onPrevious}
                disabled={!canGoBack}
                aria-label="Vorheriger Countdown"
            >
                <ChevronLeft size={22} />
            </button>
        )}
        {showArrows && (
            <button
                type="button"
                className="fegefeuer-arrow fegefeuer-arrow-right"
                onClick={onNext}
                disabled={!canGoForward}
                aria-label="Nächster Countdown"
            >
                <ChevronRight size={22} />
            </button>
        )}
        <span className="fegefeuer-days">{days == null ? "–" : days}</span>
        {progress != null && (
            <div className="fegefeuer-progress">
                <div
                    className="fegefeuer-progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Fortschritt"
                >
                    <div className="fegefeuer-progress-fill" style={{width: `${progress}%`}} />
                </div>
                <span className="fegefeuer-progress-value">{progress}%</span>
            </div>
        )}
        <span className="fegefeuer-caption">{caption}</span>
    </div>
);

const Fegefeuer = ({title, data, id, isPreview}: WidgetProps) => {
    const [saved, setSaved] = useState<FegefeuerData>(() => readData(data));
    const [draft, setDraft] = useState<FegefeuerData>(() => readData(data));
    const [pending, setPending] = useState<CustomCountdown>(emptyCountdown);
    const [inSettings, setInSettings] = useState(false);
    const [inFullscreen, setInFullscreen] = useState(false);
    const [settingsIndex, setSettingsIndex] = useState(0);
    const [viewIndex, setViewIndex] = useState(0);
    const [error, setError] = useState("");
    const [today, setToday] = useState(berlinToday);

    useEffect(() => {
        const timer = window.setInterval(() => setToday(berlinToday()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const slideCount = 1 + saved.countdowns.length;
    const safeViewIndex = Math.min(viewIndex, slideCount - 1);
    const canAdd = draft.countdowns.length < MAX_CUSTOM;
    const settingsCount = 1 + draft.countdowns.length + (canAdd ? 1 : 0);
    const isNewPage = settingsIndex > draft.countdowns.length;
    const customIndex = settingsIndex - 1;
    const currentCustom = settingsIndex === 0 ? null : isNewPage ? pending : draft.countdowns[customIndex];

    const openSettings = () => {
        setDraft(saved);
        setPending(emptyCountdown());
        setSettingsIndex(Math.min(safeViewIndex, saved.countdowns.length));
        setError("");
        setInSettings(true);
    };

    const pageTitle = () => {
        if (settingsIndex === 0) {
            return "Studium";
        }
        if (isNewPage) {
            return pending.countUp && !pending.startDate ? "Neuer Zähler" : "Neuer Countdown";
        }
        const item = draft.countdowns[customIndex];
        if (item?.name.trim()) {
            return item.name.trim();
        }
        if (item && !item.startDate && item.countUp) {
            return `Zähler ${customIndex + 1}`;
        }
        return `Countdown ${customIndex + 1}`;
    };

    const sectionHeading = () => {
        if (settingsIndex === 0) {
            return "Abschluss des Studiums";
        }
        if (currentCustom && !currentCustom.startDate && currentCustom.countUp) {
            return "Aufwärts zählen";
        }
        return "Countdown";
    };

    const updateCustom = (patch: Partial<CustomCountdown>) => {
        setError("");
        if (isNewPage) {
            setPending(current => ({...current, ...patch}));
            return;
        }
        setDraft(current => ({
            ...current,
            countdowns: current.countdowns.map((item, index) => index === customIndex ? {...item, ...patch} : item),
        }));
    };

    const removeCurrent = () => {
        if (settingsIndex === 0 || isNewPage) {
            return;
        }
        setDraft(current => ({
            ...current,
            countdowns: current.countdowns.filter((_, index) => index !== customIndex),
        }));
        setSettingsIndex(index => Math.max(0, index - 1));
        setError("");
    };

    const saveSettings = () => {
        if (draft.startDate && draft.endDate && draft.startDate >= draft.endDate) {
            setError("Der Beginn muss vor dem Ende liegen.");
            setSettingsIndex(0);
            return;
        }

        const countdowns = draft.countdowns.map(item => ({
            ...item,
            name: item.name.trim().slice(0, 40),
            startDate: isDate(item.startDate) ? item.startDate : "",
            endDate: isDate(item.endDate) ? item.endDate : "",
        }));

        for (let index = 0; index < countdowns.length; index++) {
            const item = countdowns[index];
            if (!item.endDate) {
                setError("Jeder Countdown braucht ein Enddatum.");
                setSettingsIndex(index + 1);
                return;
            }
            if (item.startDate && item.startDate >= item.endDate) {
                setError("Der Beginn muss vor dem Ende liegen.");
                setSettingsIndex(index + 1);
                return;
            }
        }

        const extra = {
            ...pending,
            name: pending.name.trim().slice(0, 40),
            startDate: isDate(pending.startDate) ? pending.startDate : "",
            endDate: isDate(pending.endDate) ? pending.endDate : "",
        };
        const pendingTouched = extra.name !== "" || extra.startDate !== "" || extra.endDate !== "";
        if (pendingTouched) {
            if (!extra.endDate) {
                setError("Der Countdown braucht ein Enddatum.");
                if (canAdd) {
                    setSettingsIndex(countdowns.length + 1);
                }
                return;
            }
            if (extra.startDate && extra.startDate >= extra.endDate) {
                setError("Der Beginn muss vor dem Ende liegen.");
                setSettingsIndex(countdowns.length + 1);
                return;
            }
            if (countdowns.length >= MAX_CUSTOM) {
                setError("Es sind höchstens 10 Countdowns möglich.");
                return;
            }
            countdowns.push(extra);
        }

        const next: FegefeuerData = {
            startDate: isDate(draft.startDate) ? draft.startDate : "",
            endDate: isDate(draft.endDate) ? draft.endDate : "",
            showProgress: draft.showProgress,
            countdowns,
        };
        setSaved(next);
        setDraft(next);
        setPending(emptyCountdown());
        setViewIndex(index => Math.min(index, countdowns.length));
        setError("");
        setInSettings(false);
        if (isPreview || getUserRole() === "GUEST") {
            return;
        }
        void dashboardService.saveWidgetData(id, JSON.stringify(next));
    };

    const activeCountdown = safeViewIndex === 0 ? null : saved.countdowns[safeViewIndex - 1];
    const days = safeViewIndex === 0
        ? (saved.endDate ? daysUntil(saved.endDate, today) : null)
        : activeCountdown
            ? (!activeCountdown.startDate && activeCountdown.countUp
                ? daysSince(activeCountdown.endDate, today)
                : daysUntil(activeCountdown.endDate, today))
            : null;
    const progress = safeViewIndex === 0
        ? (saved.showProgress ? progressPercent(saved.startDate, saved.endDate, today) : null)
        : (activeCountdown?.showProgress && activeCountdown.startDate
            ? progressPercent(activeCountdown.startDate, activeCountdown.endDate, today)
            : null);
    const caption = safeViewIndex === 0
        ? STUDY_TITLE
        : activeCountdown?.name || (!activeCountdown?.startDate && activeCountdown?.countUp ? "Tage seit dem Datum" : "Tage bis zum Datum");

    if (isPreview) {
        return (
            <>
                <div className="fegefeuer-preview">
                    <span className="fegefeuer-days">412</span>
                    <div className="fegefeuer-progress" aria-hidden="true">
                        <div className="fegefeuer-progress-track">
                            <div className="fegefeuer-progress-fill" style={{width: "64%"}} />
                        </div>
                    </div>
                    <span className="fegefeuer-caption">{STUDY_TITLE}</span>
                </div>
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    const rangeHint = (startDate: string, endDate: string, showProgress: boolean) => (
        showProgress && progressPercent(startDate, endDate, today) == null
            ? <p className="fegefeuer-hint">Der Balken erscheint, sobald Beginn und Ende gesetzt sind und der Beginn davor liegt.</p>
            : null
    );

    const widget = (
        <div className={`fegefeuer-widget${inFullscreen ? " fullscreen" : ""}`}>
            <div className="widget-header">
                {!inSettings && (
                    <Settings
                        className="widget-header-icon"
                        size={20}
                        aria-label="Einstellungen"
                        onClick={openSettings}
                    />
                )}
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    aria-label="Vollbild"
                    onClick={() => setInFullscreen(open => !open)}
                />
            </div>
            {inSettings ? (
                <div className="settings-content">
                    <div className="settings-content-wrapper">
                        <div className="fegefeuer-pager">
                            <button
                                type="button"
                                className="fegefeuer-pager-arrow"
                                onClick={() => {
                                    setError("");
                                    setSettingsIndex(index => Math.max(0, index - 1));
                                }}
                                disabled={settingsIndex === 0}
                                aria-label="Vorherige Einstellung"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="fegefeuer-pager-title">
                                <span>{pageTitle()}</span>
                                <span className="fegefeuer-pager-count">{settingsIndex + 1} / {settingsCount}</span>
                            </div>
                            <button
                                type="button"
                                className="fegefeuer-pager-arrow"
                                onClick={() => {
                                    setError("");
                                    setSettingsIndex(index => Math.min(settingsCount - 1, index + 1));
                                }}
                                disabled={settingsIndex >= settingsCount - 1}
                                aria-label="Nächste Einstellung"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <p className="widget-settings-heading">{sectionHeading()}</p>
                        {settingsIndex === 0 ? (
                            <div className="fegefeuer-settings-fields">
                                <label className="fegefeuer-date-label" htmlFor={`fegefeuer-start-${id}`}>
                                    Beginn des Studiums
                                    <input
                                        id={`fegefeuer-start-${id}`}
                                        className="fegefeuer-input"
                                        type="date"
                                        value={draft.startDate}
                                        max={draft.endDate ? shiftDate(draft.endDate, -1) : undefined}
                                        onChange={event => {
                                            setError("");
                                            setDraft(current => ({...current, startDate: event.target.value}));
                                        }}
                                    />
                                </label>
                                <label className="fegefeuer-date-label" htmlFor={`fegefeuer-end-${id}`}>
                                    Ende des Studiums
                                    <input
                                        id={`fegefeuer-end-${id}`}
                                        className="fegefeuer-input"
                                        type="date"
                                        value={draft.endDate}
                                        min={draft.startDate ? shiftDate(draft.startDate, 1) : undefined}
                                        onChange={event => {
                                            setError("");
                                            setDraft(current => ({...current, endDate: event.target.value}));
                                        }}
                                    />
                                </label>
                                <Toggle
                                    id={`fegefeuer-progress-${id}`}
                                    checked={draft.showProgress}
                                    onChange={checked => {
                                        setError("");
                                        setDraft(current => ({...current, showProgress: checked}));
                                    }}
                                    label="Fortschrittsbalken"
                                />
                                {rangeHint(draft.startDate, draft.endDate, draft.showProgress)}
                            </div>
                        ) : currentCustom && (
                            <div className="fegefeuer-settings-fields">
                                <label className="fegefeuer-date-label" htmlFor={`fegefeuer-name-${id}-${settingsIndex}`}>
                                    Bezeichnung
                                    <input
                                        id={`fegefeuer-name-${id}-${settingsIndex}`}
                                        className="fegefeuer-input"
                                        type="text"
                                        maxLength={40}
                                        value={currentCustom.name}
                                        placeholder="Optional"
                                        onChange={event => updateCustom({name: event.target.value})}
                                    />
                                </label>
                                <label className="fegefeuer-date-label" htmlFor={`fegefeuer-custom-start-${id}-${settingsIndex}`}>
                                    Startdatum (optional)
                                    <input
                                        id={`fegefeuer-custom-start-${id}-${settingsIndex}`}
                                        className="fegefeuer-input"
                                        type="date"
                                        value={currentCustom.startDate}
                                        max={currentCustom.endDate ? shiftDate(currentCustom.endDate, -1) : undefined}
                                        onChange={event => updateCustom({startDate: event.target.value})}
                                    />
                                </label>
                                <label className="fegefeuer-date-label" htmlFor={`fegefeuer-custom-end-${id}-${settingsIndex}`}>
                                    Enddatum
                                    <input
                                        id={`fegefeuer-custom-end-${id}-${settingsIndex}`}
                                        className="fegefeuer-input"
                                        type="date"
                                        value={currentCustom.endDate}
                                        min={currentCustom.startDate ? shiftDate(currentCustom.startDate, 1) : undefined}
                                        onChange={event => updateCustom({endDate: event.target.value})}
                                    />
                                </label>
                                {currentCustom.startDate ? (
                                    <>
                                        <Toggle
                                            checked={currentCustom.showProgress}
                                            onChange={checked => updateCustom({showProgress: checked})}
                                            label="Fortschrittsbalken"
                                        />
                                        {rangeHint(currentCustom.startDate, currentCustom.endDate, currentCustom.showProgress)}
                                    </>
                                ) : (
                                    <>
                                        <Toggle
                                            checked={currentCustom.countUp}
                                            onChange={checked => updateCustom({countUp: checked})}
                                            label={currentCustom.countUp ? "Aufwärts zählen" : "Abwärts zählen"}
                                        />
                                        <p className="fegefeuer-hint">
                                            {currentCustom.countUp
                                                ? "Gezählt werden die Tage seit dem Enddatum."
                                                : "Gezählt werden die Tage bis zum Enddatum."}
                                        </p>
                                    </>
                                )}
                                {settingsIndex > 0 && !isNewPage && (
                                    <Button text="Entfernen" onClick={removeCurrent} variant="transparent" type="button" fullWidth />
                                )}
                            </div>
                        )}
                        {error && <p className="fegefeuer-error" role="alert">{error}</p>}
                    </div>
                    <div className="widget-settings-buttons">
                        <Button text="Zurück" onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth />
                        <Button text="Speichern" onClick={saveSettings} variant="primary" type="submit" fullWidth />
                    </div>
                </div>
            ) : (
                <FegefeuerFace
                    days={days}
                    caption={caption}
                    progress={progress}
                    showArrows={slideCount > 1}
                    canGoBack={safeViewIndex > 0}
                    canGoForward={safeViewIndex < slideCount - 1}
                    onPrevious={() => setViewIndex(index => Math.max(0, index - 1))}
                    onNext={() => setViewIndex(index => Math.min(slideCount - 1, index + 1))}
                />
            )}
        </div>
    );

    return inFullscreen ? createPortal(widget, document.body) : widget;
};

export default Fegefeuer;
