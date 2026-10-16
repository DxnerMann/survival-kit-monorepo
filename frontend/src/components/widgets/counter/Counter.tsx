import "@/components/widgets/counter/Counter.css";
import {useEffect, useRef, useState} from "react";
import {ChevronLeft, ChevronRight, Settings} from "lucide-react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import Button from "@/components/ui/Button.tsx";

interface CounterItem {
    id: string;
    name: string;
    step: number;
    value: number;
}

interface CounterData {
    revision: number;
    counters: CounterItem[];
}

interface PendingCounter {
    name: string;
    step: number;
}

const MAX_COUNTERS = 10;
const NAME_LIMIT = 40;
const MIN_STEP = 1;
const MAX_STEP = 999;
const VALUE_LIMIT = 1_000_000_000;

const emptyData = (): CounterData => ({revision: 0, counters: []});

const emptyPending = (): PendingCounter => ({name: "", step: 1});

const storageKey = (id: string) => `counter-widget:${id}`;

const clampValue = (value: number) => Math.max(-VALUE_LIMIT, Math.min(VALUE_LIMIT, Math.trunc(value)));

const isStep = (value: number) => Number.isInteger(value) && value >= MIN_STEP && value <= MAX_STEP;

const readCounter = (value: unknown): CounterItem | null => {
    if (!value || typeof value !== "object") {
        return null;
    }
    const raw = value as Partial<CounterItem>;
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, NAME_LIMIT) : "";
    const step = typeof raw.step === "number" ? raw.step : Number.NaN;
    const count = typeof raw.value === "number" ? raw.value : Number.NaN;
    if (!name || !isStep(step) || !Number.isInteger(count)) {
        return null;
    }
    return {
        id: typeof raw.id === "string" && raw.id.trim() !== "" ? raw.id : crypto.randomUUID(),
        name,
        step,
        value: clampValue(count),
    };
};

const readCounterData = (data: string): CounterData => {
    if (!data) {
        return emptyData();
    }
    try {
        const parsed = JSON.parse(data) as Partial<CounterData>;
        const counters = Array.isArray(parsed.counters)
            ? parsed.counters.map(readCounter).filter((item): item is CounterItem => item !== null).slice(0, MAX_COUNTERS)
            : [];
        const revision = typeof parsed.revision === "number" && Number.isInteger(parsed.revision) && parsed.revision >= 0
            ? parsed.revision
            : 0;
        return {revision, counters};
    } catch {
        return emptyData();
    }
};

const readStoredCounters = (id: string): CounterData | null => {
    if (!id) {
        return null;
    }
    try {
        const raw = localStorage.getItem(storageKey(id));
        if (!raw) {
            return null;
        }
        return readCounterData(raw);
    } catch {
        return null;
    }
};

const resolveCounters = (id: string, data: string): CounterData => {
    const fromWidget = readCounterData(data);
    const fromLocal = readStoredCounters(id);
    if (fromLocal && fromLocal.revision > fromWidget.revision) {
        return fromLocal;
    }
    return fromWidget;
};

const saveChains = new Map<string, Promise<void>>();

const persistCounters = (id: string, next: CounterData) => {
    const payload = JSON.stringify(next);
    try {
        if (id) {
            localStorage.setItem(storageKey(id), payload);
        }
    } catch {
        // Ignore private mode and quota failures. The in-memory value still updates.
    }
    if (!id || id.startsWith("default-") || getUserRole() === "GUEST") {
        return;
    }
    const previous = saveChains.get(id) ?? Promise.resolve();
    const queued = previous
        .catch(() => undefined)
        .then(() => dashboardService.saveWidgetData(id, payload))
        .then(() => undefined)
        .catch(() => undefined);
    saveChains.set(id, queued);
};

const CounterFace = ({
    value,
    caption,
    step,
    showArrows,
    canGoBack,
    canGoForward,
    onPrevious,
    onNext,
    onDecrement,
    onIncrement,
}: {
    value: number;
    caption: string;
    step: number;
    showArrows: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onDecrement: () => void;
    onIncrement: () => void;
}) => (
    <div className="counter-face">
        {showArrows && (
            <button
                type="button"
                className="counter-arrow counter-arrow-left"
                onClick={onPrevious}
                disabled={!canGoBack}
                aria-label="Vorheriger Zähler"
            >
                <ChevronLeft size={22} />
            </button>
        )}
        {showArrows && (
            <button
                type="button"
                className="counter-arrow counter-arrow-right"
                onClick={onNext}
                disabled={!canGoForward}
                aria-label="Nächster Zähler"
            >
                <ChevronRight size={22} />
            </button>
        )}
        <span className="counter-value">
            {value < 0 && <span className="counter-sign">−</span>}
            {Math.abs(value)}
        </span>
        <span className="counter-caption">{caption}</span>
        <div className="counter-actions">
            <button type="button" className="counter-step" onClick={onDecrement} aria-label={`Um ${step} verringern`}>
                −{step}
            </button>
            <button type="button" className="counter-step counter-step-up" onClick={onIncrement} aria-label={`Um ${step} erhöhen`}>
                +{step}
            </button>
        </div>
    </div>
);

const Counter = ({title, data, id, isPreview}: WidgetProps) => {
    const [saved, setSaved] = useState<CounterData>(() => resolveCounters(id, data));
    const [draft, setDraft] = useState<CounterData>(() => resolveCounters(id, data));
    const [pending, setPending] = useState<PendingCounter>(emptyPending);
    const [inSettings, setInSettings] = useState(false);
    const [settingsIndex, setSettingsIndex] = useState(0);
    const [viewIndex, setViewIndex] = useState(0);
    const [error, setError] = useState("");
    const savedRef = useRef(saved);

    useEffect(() => {
        if (isPreview) {
            return;
        }
        const fromWidget = readCounterData(data);
        const fromLocal = readStoredCounters(id);
        if (fromLocal && fromLocal.revision > fromWidget.revision) {
            persistCounters(id, fromLocal);
        }
    }, [data, id, isPreview]);

    const safeViewIndex = saved.counters.length === 0 ? 0 : Math.min(viewIndex, saved.counters.length - 1);
    const active = saved.counters[safeViewIndex] ?? null;
    const canAdd = draft.counters.length < MAX_COUNTERS;
    const settingsCount = draft.counters.length + (canAdd ? 1 : 0);
    const isNewPage = settingsIndex >= draft.counters.length;
    const currentDraft = isNewPage ? null : draft.counters[settingsIndex];

    const openSettings = () => {
        const current = savedRef.current;
        setDraft(current);
        setPending(emptyPending());
        setSettingsIndex(current.counters.length === 0 ? 0 : Math.min(safeViewIndex, current.counters.length - 1));
        setError("");
        setInSettings(true);
    };

    const commit = (next: CounterData) => {
        savedRef.current = next;
        setSaved(next);
        setDraft(next);
        if (!isPreview) {
            persistCounters(id, next);
        }
    };

    const adjust = (direction: 1 | -1) => {
        const current = savedRef.current;
        const index = current.counters.length === 0 ? -1 : Math.min(viewIndex, current.counters.length - 1);
        const item = index >= 0 ? current.counters[index] : null;
        if (!item) {
            return;
        }
        const counters = current.counters.map((entry, entryIndex) => entryIndex === index
            ? {...entry, value: clampValue(entry.value + direction * entry.step)}
            : entry);
        commit({revision: current.revision + 1, counters});
    };

    const pageTitle = () => {
        if (isNewPage) {
            return "Neuer Zähler";
        }
        return currentDraft?.name.trim() || `Zähler ${settingsIndex + 1}`;
    };

    const updateDraft = (patch: Partial<CounterItem>) => {
        setError("");
        setDraft(current => ({
            ...current,
            counters: current.counters.map((item, index) => index === settingsIndex ? {...item, ...patch} : item),
        }));
    };

    const updatePending = (patch: Partial<PendingCounter>) => {
        setError("");
        setPending(current => ({...current, ...patch}));
    };

    const onStepChange = (raw: string, apply: (step: number) => void) => {
        if (raw === "") {
            apply(0);
            return;
        }
        const parsed = Number(raw);
        if (Number.isInteger(parsed)) {
            apply(parsed);
        }
    };

    const removeCurrent = () => {
        if (isNewPage) {
            return;
        }
        setDraft(current => ({
            ...current,
            counters: current.counters.filter((_, index) => index !== settingsIndex),
        }));
        setSettingsIndex(index => Math.max(0, index - 1));
        setError("");
    };

    const saveSettings = () => {
        const counters = draft.counters.map(item => ({
            ...item,
            name: item.name.trim().slice(0, NAME_LIMIT),
        }));

        for (let index = 0; index < counters.length; index++) {
            const item = counters[index];
            if (!item.name) {
                setError("Jeder Zähler braucht einen Namen.");
                setSettingsIndex(index);
                return;
            }
            if (!isStep(item.step)) {
                setError("Die Schrittweite muss zwischen 1 und 999 liegen.");
                setSettingsIndex(index);
                return;
            }
        }

        const extraName = pending.name.trim().slice(0, NAME_LIMIT);
        if (extraName !== "") {
            if (!isStep(pending.step)) {
                setError("Die Schrittweite muss zwischen 1 und 999 liegen.");
                if (canAdd) {
                    setSettingsIndex(counters.length);
                }
                return;
            }
            if (counters.length >= MAX_COUNTERS) {
                setError("Es sind höchstens 10 Zähler möglich.");
                return;
            }
            counters.push({
                id: crypto.randomUUID(),
                name: extraName,
                step: pending.step,
                value: 0,
            });
        }

        const next: CounterData = {
            revision: savedRef.current.revision + 1,
            counters,
        };
        const added = counters.length > savedRef.current.counters.length;
        commit(next);
        setPending(emptyPending());
        setViewIndex(added ? counters.length - 1 : Math.min(safeViewIndex, Math.max(0, counters.length - 1)));
        setError("");
        setInSettings(false);
    };

    if (isPreview) {
        return (
            <>
                <div className="counter-preview">
                    <span className="counter-value">12</span>
                    <span className="counter-caption">Kaffee</span>
                    <div className="counter-actions" aria-hidden="true">
                        <span className="counter-step">−1</span>
                        <span className="counter-step counter-step-up">+1</span>
                    </div>
                </div>
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    const stepField = (fieldId: string, step: number, onChange: (step: number) => void) => (
        <label className="counter-field" htmlFor={fieldId}>
            Schrittweite
            <input
                id={fieldId}
                className="counter-input"
                type="number"
                inputMode="numeric"
                min={MIN_STEP}
                max={MAX_STEP}
                step={1}
                value={step === 0 ? "" : String(step)}
                onChange={event => onStepChange(event.target.value, onChange)}
            />
        </label>
    );

    return (
        <div className="counter-widget">
            <div className="widget-header">
                {!inSettings && (
                    <button type="button" className="counter-settings" onClick={openSettings} aria-label="Einstellungen">
                        <Settings size={20} />
                    </button>
                )}
            </div>
            {inSettings ? (
                <div className="settings-content">
                    <div className="settings-content-wrapper">
                        {settingsCount > 1 && (
                            <div className="counter-pager">
                                <button
                                    type="button"
                                    className="counter-pager-arrow"
                                    onClick={() => {
                                        setError("");
                                        setSettingsIndex(index => Math.max(0, index - 1));
                                    }}
                                    disabled={settingsIndex === 0}
                                    aria-label="Vorherige Einstellung"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="counter-pager-title">
                                    <span>{pageTitle()}</span>
                                    <span className="counter-pager-count">{settingsIndex + 1} / {settingsCount}</span>
                                </div>
                                <button
                                    type="button"
                                    className="counter-pager-arrow"
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
                        )}
                        <p className="widget-settings-heading">{isNewPage ? "Neuer Zähler" : "Zähler"}</p>
                        {isNewPage ? (
                            <div className="counter-settings-fields">
                                <label className="counter-field" htmlFor={`counter-name-${id}-new`}>
                                    Name
                                    <input
                                        id={`counter-name-${id}-new`}
                                        className="counter-input"
                                        type="text"
                                        maxLength={NAME_LIMIT}
                                        value={pending.name}
                                        placeholder="z. B. Kaffee"
                                        onChange={event => updatePending({name: event.target.value})}
                                    />
                                </label>
                                {stepField(`counter-step-${id}-new`, pending.step, step => updatePending({step}))}
                                <p className="counter-hint">Ein Klick zählt um diese Schrittweite hoch oder runter. Der Stand bleibt gespeichert.</p>
                            </div>
                        ) : currentDraft && (
                            <div className="counter-settings-fields">
                                <label className="counter-field" htmlFor={`counter-name-${id}-${settingsIndex}`}>
                                    Name
                                    <input
                                        id={`counter-name-${id}-${settingsIndex}`}
                                        className="counter-input"
                                        type="text"
                                        maxLength={NAME_LIMIT}
                                        value={currentDraft.name}
                                        placeholder="z. B. Kaffee"
                                        onChange={event => updateDraft({name: event.target.value})}
                                    />
                                </label>
                                {stepField(`counter-step-${id}-${settingsIndex}`, currentDraft.step, step => updateDraft({step}))}
                                <p className="counter-hint">Stand: {currentDraft.value}. Ein Klick zählt um die Schrittweite.</p>
                                <Button text="Entfernen" onClick={removeCurrent} variant="transparent" type="button" fullWidth />
                            </div>
                        )}
                        {error && <p className="counter-error" role="alert">{error}</p>}
                    </div>
                    <div className="widget-settings-buttons">
                        <Button text="Zurück" onClick={() => setInSettings(false)} variant="secondary" type="reset" fullWidth />
                        <Button text="Speichern" onClick={saveSettings} variant="primary" type="submit" fullWidth />
                    </div>
                </div>
            ) : active ? (
                <CounterFace
                    value={active.value}
                    caption={active.name}
                    step={active.step}
                    showArrows={saved.counters.length > 1}
                    canGoBack={safeViewIndex > 0}
                    canGoForward={safeViewIndex < saved.counters.length - 1}
                    onPrevious={() => setViewIndex(index => Math.max(0, index - 1))}
                    onNext={() => setViewIndex(index => Math.min(saved.counters.length - 1, index + 1))}
                    onDecrement={() => adjust(-1)}
                    onIncrement={() => adjust(1)}
                />
            ) : (
                <div className="counter-empty">
                    <span className="counter-caption">Noch kein Zähler</span>
                    <p className="counter-hint">Lege bis zu 10 Zähler in den Einstellungen an.</p>
                </div>
            )}
        </div>
    );
};

export default Counter;
