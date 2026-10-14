import {useEffect, useMemo, useRef, useState} from "react";
import {ChevronDown, Pen, Trash2} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Info from "@/components/ui/Info.tsx";
import Button from "@/components/ui/Button.tsx";
import CaffeineChart from "@/components/caffeine/CaffeineChart.tsx";
import EditCaffeinePresetDialog from "@/components/dialog/EditCaffeinePresetDialog.tsx";
import {
    addTodayCaffeineEntry,
    buildHalfLifeSeries,
    caffeineComment,
    CAFFEINE_PRESETS,
    customPresetLabel,
    deleteCaffeinePreset,
    getPeakMg,
    isGuestCaffeineMode,
    loadCaffeinePresets,
    loadTodayCaffeineEntries,
    PRESET_NAME_MAX_LENGTH,
    removeTodayCaffeineEntry,
    saveCaffeinePreset,
    sourceLabel,
    toDateTimeLocalValue,
    updateCaffeinePreset,
} from "@/services/caffeineService.tsx";
import type {CaffeinePreset} from "@/services/caffeineService.tsx";
import type {CaffeineEntry, CaffeineSource} from "@/models/CaffeineEntry.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {formatTimestamp} from "@/services/utils.tsx";
import "@/pages/caffeine-calculator/CaffeineCalculatorPage.css";

const CaffeineCalculatorPage = () => {
    const [source, setSource] = useState<CaffeineSource>("MONSTER");
    const [customName, setCustomName] = useState<string>("");
    const [customMg, setCustomMg] = useState<string>("");
    const [consumedAt, setConsumedAt] = useState<string>(() => toDateTimeLocalValue(new Date()));
    const [entries, setEntries] = useState<CaffeineEntry[]>([]);
    const [presets, setPresets] = useState<CaffeinePreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [editingPreset, setEditingPreset] = useState<CaffeinePreset | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const loadToday = async () => {
        const data = await loadTodayCaffeineEntries();
        setEntries(data);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadToday().catch(() => {
            if (!isGuestCaffeineMode()) {
                snackbarService.showSnackbar({
                    type: "error",
                    text: "Koffein-Einträge konnten nicht geladen werden.",
                    showIcon: true,
                });
            }
        });
        loadCaffeinePresets()
            .then(setPresets)
            .catch(() => setPresets([]));
    }, []);

    useEffect(() => {
        if (!pickerOpen) {
            return;
        }
        const onPointerDown = (event: MouseEvent) => {
            if (!pickerRef.current?.contains(event.target as Node)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [pickerOpen]);

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
                const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
                const parsed = selectedPreset?.amountMg ?? Number(customMg);
                const name = customName.trim();
                if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
                    snackbarService.showSnackbar({
                        type: "error",
                        text: "Bitte eine Menge zwischen 1 und 1000 mg eingeben.",
                        showIcon: true,
                    });
                    return;
                }
                if (!selectedPreset && (name.length < 1 || name.length > PRESET_NAME_MAX_LENGTH)) {
                    snackbarService.showSnackbar({
                        type: "error",
                        text: `Bitte einen Namen mit 1 bis ${PRESET_NAME_MAX_LENGTH} Zeichen eingeben.`,
                        showIcon: true,
                    });
                    return;
                }
                await addTodayCaffeineEntry(source, parsed, timestamp.toISOString());
                if (!selectedPreset) {
                    const saved = await saveCaffeinePreset(name, parsed);
                    setPresets((current) => current.some((preset) => preset.id === saved.id)
                        ? current
                        : [...current, saved]);
                    setSelectedPresetId(saved.id);
                    setCustomName("");
                }
            } else {
                await addTodayCaffeineEntry(source, undefined, timestamp.toISOString());
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

    const handleDeletePreset = async (id: string) => {
        const previous = presets;
        setPresets((current) => current.filter((preset) => preset.id !== id));
        if (selectedPresetId === id) {
            setSelectedPresetId(null);
            setSource("MONSTER");
            setCustomMg("");
        }
        try {
            await deleteCaffeinePreset(id);
        } catch {
            setPresets(previous);
        }
    };

    const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
    const selectedLabel = selectedPreset ? customPresetLabel(selectedPreset) : sourceLabel(source);

    const handleUpdatePreset = async (name: string, amountMg: number) => {
        if (!editingPreset) {
            return;
        }
        try {
            const saved = await updateCaffeinePreset(editingPreset.id, name, amountMg);
            setPresets((current) => current.map((preset) => preset.id === saved.id ? saved : preset));
            if (selectedPresetId === saved.id) {
                setCustomMg(String(saved.amountMg));
            }
            setEditingPreset(null);
            snackbarService.showSnackbar({
                type: "success",
                text: "Preset gespeichert.",
                showIcon: true,
            });
        } catch { /* empty */ }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await removeTodayCaffeineEntry(id);
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

                {isGuestCaffeineMode() && (
                    <Info
                        type="INFO"
                        text="Als Gast werden deine Einträge nur für heute lokal im Browser gespeichert. Sie werden nicht synchronisiert und sind morgen wieder weg."
                    />
                )}

                <div className="caffeine-calc-layout">
                    <div className="caffeine-calc-controls">
                        <label className="caffeine-calc-label" id="caffeine-source-label">
                            Was hast du zu dir genommen?
                        </label>
                        <div className="caffeine-calc-picker" ref={pickerRef}>
                            <button
                                type="button"
                                className="caffeine-calc-select caffeine-calc-picker-trigger"
                                aria-labelledby="caffeine-source-label"
                                aria-expanded={pickerOpen}
                                onClick={() => setPickerOpen((open) => !open)}
                            >
                                <span>{selectedLabel}</span>
                                <ChevronDown size={18} />
                            </button>
                            {pickerOpen && (
                                <ul className="caffeine-calc-picker-menu" role="listbox" aria-labelledby="caffeine-source-label">
                                    {CAFFEINE_PRESETS.map((preset) => (
                                        <li key={preset.source}>
                                            <button
                                                type="button"
                                                className={`caffeine-calc-picker-option${selectedPresetId == null && source === preset.source ? " caffeine-calc-picker-option--selected" : ""}`}
                                                onClick={() => {
                                                    setSource(preset.source);
                                                    setSelectedPresetId(null);
                                                    setPickerOpen(false);
                                                }}
                                            >
                                                {preset.label}
                                            </button>
                                        </li>
                                    ))}
                                    {presets.map((preset) => (
                                        <li key={preset.id} className="caffeine-calc-picker-custom">
                                            <button
                                                type="button"
                                                className={`caffeine-calc-picker-option${selectedPresetId === preset.id ? " caffeine-calc-picker-option--selected" : ""}`}
                                                onClick={() => {
                                                    setSource("OTHER");
                                                    setSelectedPresetId(preset.id);
                                                    setCustomMg(String(preset.amountMg));
                                                    setPickerOpen(false);
                                                }}
                                            >
                                                {customPresetLabel(preset)}
                                            </button>
                                            <div className="caffeine-calc-picker-actions">
                                                <button
                                                    type="button"
                                                    className="caffeine-calc-entry-delete"
                                                    aria-label={`${customPresetLabel(preset)} bearbeiten`}
                                                    onClick={() => {
                                                        setPickerOpen(false);
                                                        setEditingPreset(preset);
                                                    }}
                                                >
                                                    <Pen size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="caffeine-calc-entry-delete"
                                                    aria-label={`${customPresetLabel(preset)} löschen`}
                                                    onClick={() => handleDeletePreset(preset.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {source === "OTHER" && selectedPresetId == null && (
                            <div className="caffeine-calc-custom">
                                <label className="caffeine-calc-label" htmlFor="caffeine-custom-name">
                                    Name
                                </label>
                                <input
                                    id="caffeine-custom-name"
                                    className="caffeine-calc-input"
                                    type="text"
                                    maxLength={PRESET_NAME_MAX_LENGTH}
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="z.B. Mate"
                                />
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
            {editingPreset && (
                <EditCaffeinePresetDialog
                    isOpen={true}
                    name={editingPreset.name}
                    amountMg={editingPreset.amountMg}
                    onCancel={() => setEditingPreset(null)}
                    onSubmit={handleUpdatePreset}
                />
            )}
        </div>
    );
};

export default CaffeineCalculatorPage;
