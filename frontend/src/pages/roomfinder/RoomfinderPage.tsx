import {useRef, useState} from "react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Button from "@/components/ui/Button.tsx";
import RoomDayPlan from "@/components/roomfinder/RoomDayPlan.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {
    berlinNowTime,
    berlinToday,
    checkRoom,
    findFreeRooms,
    formatBerlinClock,
    loadDaySchedule,
} from "@/services/roomfinderService.tsx";
import type {BusySlot, FreeRoom, RoomAvailability} from "@/models/Roomfinder.ts";
import "@/pages/roomfinder/RoomfinderPage.css";

type SearchMode = "free" | "check";

type AppliedSearch = {
    mode: SearchMode;
    date: string;
    time: string;
    endTime: string;
    near: string;
    room: string;
};

type DayPlan = {
    room: string;
    date: string;
    slots: BusySlot[];
    windowStart?: number;
    windowEnd?: number;
};

const ROOM_PATTERN = /^[A-Za-z]\d{2,}$/;
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

function warn(text: string) {
    snackbarService.showSnackbar({type: "warning", text, showIcon: true});
}

function normalizeRoom(value: string): string {
    return value.trim().toUpperCase();
}

const RoomfinderPage = () => {
    const [mode, setMode] = useState<SearchMode>("free");
    const [date, setDate] = useState(berlinToday);
    const [time, setTime] = useState(berlinNowTime);
    const [endTime, setEndTime] = useState("");
    const [near, setNear] = useState("");
    const [room, setRoom] = useState("");

    const [applied, setApplied] = useState<AppliedSearch | null>(null);
    const [rooms, setRooms] = useState<FreeRoom[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [windowUnix, setWindowUnix] = useState<{from: number; to: number} | null>(null);
    const [availability, setAvailability] = useState<RoomAvailability | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [plan, setPlan] = useState<DayPlan | null>(null);
    const planRequest = useRef(0);
    const [searching, setSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(false);

    const validate = (): AppliedSearch | null => {
        if (!date) {
            warn("Wähle ein Datum.");
            return null;
        }
        if (!TIME_PATTERN.test(time.trim())) {
            warn("Die Startzeit braucht das Format HH:mm.");
            return null;
        }
        if (endTime.trim() && !TIME_PATTERN.test(endTime.trim())) {
            warn("Die Endzeit braucht das Format HH:mm.");
            return null;
        }
        if (endTime.trim() && endTime.trim() <= time.trim()) {
            warn("Die Endzeit muss nach der Startzeit liegen.");
            return null;
        }
        if (mode === "free" && near.trim() && !ROOM_PATTERN.test(near.trim())) {
            warn("Der nahe Raum braucht einen Namen wie A171.");
            return null;
        }
        if (mode === "check" && !ROOM_PATTERN.test(room.trim())) {
            warn("Der Raum braucht einen Namen wie A171.");
            return null;
        }
        return {
            mode,
            date,
            time: time.trim(),
            endTime: endTime.trim(),
            near: mode === "free" ? normalizeRoom(near) : "",
            room: mode === "check" ? normalizeRoom(room) : "",
        };
    };

    const openPlan = async (targetRoom: string, search: AppliedSearch, windowStart?: number, windowEnd?: number) => {
        const requestId = ++planRequest.current;
        setSelectedRoom(targetRoom);
        setLoadingPlan(true);
        try {
            const schedule = await loadDaySchedule(targetRoom, search.date);
            if (requestId !== planRequest.current) return;
            setPlan({
                room: targetRoom,
                date: search.date,
                slots: schedule.busyDuring ?? [],
                windowStart,
                windowEnd,
            });
        } catch {
            if (requestId === planRequest.current) setPlan(null);
        } finally {
            if (requestId === planRequest.current) setLoadingPlan(false);
        }
    };

    const search = async () => {
        const next = validate();
        if (!next) return;
        planRequest.current += 1;
        setSearching(true);
        setLoadingPlan(false);
        setRooms([]);
        setContinuation(null);
        setAvailability(null);
        setSelectedRoom(null);
        setPlan(null);
        setWindowUnix(null);
        try {
            if (next.mode === "free") {
                const page = await findFreeRooms(next);
                setApplied(next);
                setRooms(page.data ?? []);
                setContinuation(page.continuation ?? null);
                setWindowUnix({from: page.fromUnix, to: page.toUnix});
            } else {
                const result = await checkRoom(next);
                setApplied(next);
                setAvailability(result);
                setWindowUnix({from: result.fromUnix, to: result.toUnix});
                await openPlan(result.room, next, result.fromUnix, result.toUnix);
            }
        } catch {
            setApplied(null);
        } finally {
            setSearching(false);
        }
    };

    const loadMore = async () => {
        if (!applied || !continuation) return;
        setLoadingMore(true);
        try {
            const page = await findFreeRooms({...applied, continuation});
            setRooms((current) => [...current, ...(page.data ?? [])]);
            setContinuation(page.continuation ?? null);
        } catch {
            /* snackbar already shown */
        } finally {
            setLoadingMore(false);
        }
    };

    const selectRoom = (target: FreeRoom) => {
        if (!applied || !windowUnix) return;
        void openPlan(target.room, applied, windowUnix.from, windowUnix.to);
    };

    const windowLabel = windowUnix
        ? `${formatBerlinClock(windowUnix.from)}–${formatBerlinClock(windowUnix.to)}`
        : "";

    return (
        <div className="survival-kit-page roomfinder-page">
            <SectionHeading heading="Roomfinder" subheading="by Rudi Regentonne" centered={false} />
            <form
                className="roomfinder-filters"
                onSubmit={(event) => {
                    event.preventDefault();
                    void search();
                }}
            >
                <div className="roomfinder-filters__action">
                    <fieldset className="roomfinder-mode">
                        <legend>Was suchst du?</legend>
                        <label className="roomfinder-option">
                            <input
                                type="radio"
                                name="roomfinder-mode"
                                checked={mode === "free"}
                                onChange={() => setMode("free")}
                            />
                            Freie Räume
                        </label>
                        <label className="roomfinder-option">
                            <input
                                type="radio"
                                name="roomfinder-mode"
                                checked={mode === "check"}
                                onChange={() => setMode("check")}
                            />
                            Einen Raum prüfen
                        </label>
                    </fieldset>

                    {mode === "free" ? (
                        <label className="roomfinder-field">
                            <span>In der Nähe von</span>
                            <input
                                value={near}
                                onChange={(event) => setNear(event.target.value)}
                                placeholder="z. B. A171"
                                autoCapitalize="characters"
                            />
                        </label>
                    ) : (
                        <label className="roomfinder-field">
                            <span>Raum</span>
                            <input
                                value={room}
                                onChange={(event) => setRoom(event.target.value)}
                                placeholder="z. B. A171"
                                autoCapitalize="characters"
                                required
                            />
                        </label>
                    )}

                    <Button text={searching ? "Suche…" : "Suchen"} type="submit" fullWidth disabled={searching} />
                </div>

                <div className="roomfinder-filters__when">
                    <label className="roomfinder-field">
                        <span>Datum</span>
                        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                    </label>
                    <div className="roomfinder-times">
                        <label className="roomfinder-field">
                            <span>Von</span>
                            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
                        </label>
                        <label className="roomfinder-field">
                            <span>Bis</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(event) => setEndTime(event.target.value)}
                            />
                        </label>
                    </div>
                    <p className="roomfinder-hint">Ohne Endzeit gilt ein Fenster von zwei Stunden.</p>
                </div>
            </form>

            {applied && (
            <div className={`roomfinder-board${plan ? " has-plan" : ""}`}>
                <section className="roomfinder-card roomfinder-results" aria-label="Suchergebnisse">
                    {applied.mode === "free" && (
                        <>
                            <header className="roomfinder-results__header">
                                <h2>Freie Räume{windowLabel ? ` · ${windowLabel}` : ""}</h2>
                                <p className="roomfinder-hint">Ein Raum zeigt die Belegung des Tages.</p>
                                {applied.near && <p className="roomfinder-hint">Sortiert nach Nähe zu {applied.near}.</p>}
                            </header>
                            <div className="roomfinder-results__scroll">
                                {rooms.length === 0 ? (
                                    <p className="roomfinder-placeholder">Keine freien Räume in diesem Zeitraum.</p>
                                ) : (
                                    <ul className="roomfinder-list">
                                        {rooms.map((entry) => (
                                            <li key={entry.room}>
                                                <button
                                                    type="button"
                                                    className={`roomfinder-room${selectedRoom === entry.room ? " is-selected" : ""}`}
                                                    onClick={() => selectRoom(entry)}
                                                    aria-pressed={selectedRoom === entry.room}
                                                >
                                                    <span className="roomfinder-room__name">{entry.room}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {continuation && (
                                <Button
                                    text={loadingMore ? "Lädt…" : "Mehr laden"}
                                    type="button"
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => void loadMore()}
                                    disabled={loadingMore}
                                />
                            )}
                        </>
                    )}

                    {applied?.mode === "check" && availability && (
                        <div className={`roomfinder-status${availability.isFree ? " is-free" : " is-busy"}`}>
                            <h2>{availability.room} ist {availability.isFree ? "frei" : "belegt"}</h2>
                            {windowLabel && <p className="roomfinder-status__window">{windowLabel}</p>}
                            {!availability.isFree && availability.busyDuring?.length > 0 && (
                                <div className="roomfinder-conflicts">
                                    <p className="roomfinder-conflicts__title">Belegungen im Zeitraum:</p>
                                    <ul className="roomfinder-conflicts__list">
                                        {availability.busyDuring.map((slot) => (
                                            <li key={`${slot.start}-${slot.end}`} className="roomfinder-conflict">
                                                <div className="roomfinder-conflict__header">
                                                    <span className="roomfinder-conflict__time">
                                                        {formatBerlinClock(slot.start)}–{formatBerlinClock(slot.end)}
                                                    </span>
                                                    {slot.summary && (
                                                        <span className="roomfinder-conflict__summary">{slot.summary}</span>
                                                    )}
                                                </div>
                                                {slot.courses && slot.courses.length > 0 && (
                                                    <div className="roomfinder-conflict__courses">
                                                        {slot.courses.map((course) => (
                                                            <span key={course} className="roomfinder-conflict__course-tag">
                                                                {course}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {(plan || loadingPlan) && (
                    <section className="roomfinder-card roomfinder-plan-card" aria-label="Tagesbelegung">
                        {loadingPlan && !plan && <p className="roomfinder-placeholder">Belegung wird geladen…</p>}
                        {plan && (
                            <RoomDayPlan
                                room={plan.room}
                                date={plan.date}
                                slots={plan.slots}
                                windowStart={plan.windowStart}
                                windowEnd={plan.windowEnd}
                            />
                        )}
                    </section>
                )}
            </div>
            )}
        </div>
    );
};

export default RoomfinderPage;
