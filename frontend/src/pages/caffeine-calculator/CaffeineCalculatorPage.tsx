import {useEffect, useMemo, useState} from "react";
import {Trash2} from "lucide-react";
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import Info from "../../components/shared/Info.tsx";
import Button from "../../components/shared/Button.tsx";
import CaffeineChart from "../../components/CaffeineChart.tsx";
import {
    addCaffeine,
    buildHalfLifeSeries,
    caffeineComment,
    CAFFEINE_PRESETS,
    deleteCaffeine,
    getPeakMg,
    getTodayCaffeine,
    sourceLabel,
    toDateTimeLocalValue,
} from "../../services/caffeineService.tsx";
import type {CaffeineEntry, CaffeineSource} from "../../models/CaffeineEntry.tsx";
import {snackbarService} from "../../services/snackBarService.tsx";
import {formatTimestamp} from "../../services/utils.tsx";
import './CaffeineCalculatorPage.css';

const CaffeineCalculatorPage = () => {
    const [source, setSource] = useState<CaffeineSource>("MONSTER");
    const [customMg, setCustomMg] = useState<string>("");
    const [consumedAt, setConsumedAt] = useState<string>(() => toDateTimeLocalValue(new Date()));
    const [entries, setEntries] = useState<CaffeineEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadToday = async () => {
        const data = await getTodayCaffeine();
        setEntries(data);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadToday().catch(() => {
            snackbarService.showSnackbar({
                type: "error",
                text: "Koffein-Einträge konnten nicht geladen werden.",
                showIcon: true,
            });
        });
    }, []);

    const series = useMemo(() => buildHalfLifeSeries(entries), [entries]);
    const peakMg = useMemo(() => getPeakMg(series), [series]);
    const comment = useMemo(() => caffeineComment(peakMg), [peakMg]);
    const totalLogged = useMemo(
        () => entries.reduce((sum, e) => sum + e.amountMg, 0),
        [entries]
    );

    const handleAdd = async () => {
        try {
            setLoading(true);
            const timestamp = new Date(consumedAt);
            if (Number.isNaN(timestamp.getTime())) {
                snackbarService.showSnackbar({
                    type: "error",
                    text: "Bitte einen gültigen Zeitpunkt wählen.",
                    showIcon: true,
                });
                return;
            }

            if (source === "OTHER") {
                const parsed = Number(customMg);
                if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
                    snackbarService.showSnackbar({
                        type: "error",
                        text: "Bitte eine Menge zwischen 1 und 1000 mg eingeben.",
                        showIcon: true,
                    });
                    return;
                }
                await addCaffeine(source, parsed, timestamp.toISOString());
            } else {
                await addCaffeine(source, undefined, timestamp.toISOString());
            }
            setCustomMg("");
            setConsumedAt(toDateTimeLocalValue(new Date()));
            await loadToday();
            snackbarService.showSnackbar({
                type: "success",
                text: "Koffein geloggt. Der Graph aktualisiert sich.",
                showIcon: true,
            });
        } catch { /* empty */ } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await deleteCaffeine(id);
            await loadToday();
            snackbarService.showSnackbar({
                type: "success",
                text: "Eintrag gelöscht.",
                showIcon: true,
            });
        } catch { /* empty */ } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="survival-kit-page">
            <div className="caffeine-calc-page">
                <SectionHeading
                    heading={"Der Koffeinrechner"}
                    subheading={"Halbwertszeit-Näherung für deine Dosis über den heutigen Tag."}
                    centered={false}
                />

                <div className="caffeine-calc-layout">
                    <div className="caffeine-calc-controls">
                        <label className="caffeine-calc-label" htmlFor="caffeine-source">
                            Was hast du zu dir genommen?
                        </label>
                        <select
                            id="caffeine-source"
                            className="caffeine-calc-select"
                            value={source}
                            onChange={(e) => setSource(e.target.value as CaffeineSource)}
                        >
                            {CAFFEINE_PRESETS.map((preset) => (
                                <option key={preset.source} value={preset.source}>
                                    {preset.label}
                                </option>
                            ))}
                        </select>

                        {source === "OTHER" && (
                            <div className="caffeine-calc-custom">
                                <label className="caffeine-calc-label" htmlFor="caffeine-custom-mg">
                                    Menge in mg (1–1000)
                                </label>
                                <input
                                    id="caffeine-custom-mg"
                                    className="caffeine-calc-input"
                                    type="number"
                                    min={1}
                                    max={1000}
                                    step={1}
                                    value={customMg}
                                    onChange={(e) => setCustomMg(e.target.value)}
                                    placeholder="z.B. 160"
                                />
                            </div>
                        )}

                        <div className="caffeine-calc-custom">
                            <label className="caffeine-calc-label" htmlFor="caffeine-consumed-at">
                                Zeitpunkt
                            </label>
                            <input
                                id="caffeine-consumed-at"
                                className="caffeine-calc-input"
                                type="datetime-local"
                                value={consumedAt}
                                onChange={(e) => setConsumedAt(e.target.value)}
                            />
                        </div>

                        <Button
                            text={loading ? "Speichern..." : "Dosis hinzufügen"}
                            onClick={handleAdd}
                            variant="primary"
                            disabled={loading}
                            fullWidth={true}
                        />

                        <div className="caffeine-calc-meta">
                            <p>Heute geloggt: <span className="important-text">{totalLogged} mg</span></p>
                            <p>Aktueller Peak (Näherung): <span className="important-text">{Math.round(peakMg)} mg</span></p>
                        </div>

                        <Info type="INFO" text={comment} />

                        {peakMg > 400 && (
                            <Info
                                type="WARNING"
                                text="Warnung: Dein geschätzter Peak liegt über 400 mg. Die EFSA empfiehlt Erwachsenen maximal etwa 400 mg Koffein pro Tag."
                            />
                        )}
                    </div>

                    <div className="caffeine-calc-entries">
                        <h3 className="caffeine-calc-entries-title">Heute konsumiert</h3>
                        {entries.length === 0 ? (
                            <p className="caffeine-calc-entries-empty">Noch keine Einträge für heute.</p>
                        ) : (
                            <ul className="caffeine-calc-entries-list">
                                {[...entries].reverse().map((entry) => (
                                    <li key={entry.id} className="caffeine-calc-entry">
                                        <div className="caffeine-calc-entry-info">
                                            <span className="caffeine-calc-entry-source">
                                                {sourceLabel(entry.source)}
                                            </span>
                                            <span className="caffeine-calc-entry-meta">
                                                {entry.amountMg} mg · {formatTimestamp(entry.consumedAt)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="caffeine-calc-entry-delete"
                                            aria-label="Eintrag löschen"
                                            disabled={deletingId === entry.id}
                                            onClick={() => handleDelete(entry.id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="caffeine-calc-chart-wrap">
                        <CaffeineChart
                            data={series}
                            title="Halbwertszeit-Näherung (heute)"
                            showWarningLine={true}
                        />
                        <p className="caffeine-calc-footnote">
                            Näherung mit einer Halbwertszeit von 5 Stunden. Kein medizinischer Rat.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaffeineCalculatorPage;
