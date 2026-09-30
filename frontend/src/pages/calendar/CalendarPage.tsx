import { useEffect, useMemo, useRef, useState, type FormEvent, type TouchEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import deLocale from "@fullcalendar/core/locales/de";
import { Book, Clock1, Download, MapPin, User, X } from "lucide-react";
import { api } from "@/services/api.tsx";
import type { Lecture } from "@/models/Lecture.tsx";
import type { LecturePlanResponse } from "@/models/LecturePlanResponse.tsx";
import { lectureConversionUtil } from "@/services/lectureConversionUtil.tsx";
import "@/pages/calendar/CalendarPage.css";

const COLORS: Record<Lecture["type"], string> = {
    LECTURE: "#bc0101",
    EXAM: "#e8ba02",
    OTHER: "#bdbdbd",
};

const TYPE_LABELS: Record<Lecture["type"], string> = {
    LECTURE: "Vorlesung",
    EXAM: "Prüfung",
    OTHER: "Sonstiges",
};

const STORED_FILE_KEY = "calendar-file";

type ViewMode = "week" | "day";

type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
};

const isStandaloneDisplay = () =>
    window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const todayIndex = () => {
    const day = startOfToday().getDay();
    return day === 0 ? 6 : day - 1;
};

const mondayOfWeek = (weekOffset: number) => {
    const today = startOfToday();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);
    return monday;
};

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(date.getDate() + days);
    return next;
};

const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatShort = (date: Date) =>
    new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(date);

const formatDayTitle = (date: Date) =>
    new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);

const readCourseName = async (file: string): Promise<string> => {
    const response = await fetch(
        `${api.baseUrl}/lecture/course?raplaUrl=${encodeURIComponent(file)}`,
        { credentials: "omit" }
    );
    if (!response.ok) {
        throw new Error("course");
    }
    const text = (await response.text()).trim();
    if (text.startsWith('"')) {
        return JSON.parse(text) as string;
    }
    return text;
};

const readWeek = async (file: string, weekOffset: number): Promise<Lecture[]> => {
    const response = await fetch(
        `${api.baseUrl}/lecture/week?weekOffset=${weekOffset}&raplaUrl=${encodeURIComponent(file)}`,
        { credentials: "omit" }
    );
    if (!response.ok) {
        throw new Error("week");
    }
    const data = await response.json() as LecturePlanResponse;
    return data.lectures ?? [];
};

const EventCard = ({ arg, compact }: { arg: EventContentArg; compact: boolean }) => {
    const lecture = arg.event.extendedProps["lecture"] as Lecture;
    const textColor = arg.event.extendedProps["textColor"] as string;
    return (
        <div className={`cal-event ${compact ? "cal-event--compact" : ""}`} style={{ color: textColor }}>
            <span className="cal-event__title">{lecture.title}</span>
            {lecture.rooms.length > 0 && <span className="cal-event__meta">{lecture.rooms.join(", ")}</span>}
        </div>
    );
};

const CalendarPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryFile = searchParams.get("file")?.trim() ?? "";
    const [standalone] = useState(isStandaloneDisplay);
    const file = queryFile;
    const [linkInput, setLinkInput] = useState("");

    const [view, setView] = useState<ViewMode>("week");
    const [weekOffset, setWeekOffset] = useState(0);
    const [dayIndex, setDayIndex] = useState(todayIndex);
    const [title, setTitle] = useState("Stundenplan");
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(Boolean(file));
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<Lecture | null>(null);
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [iosInstallable, setIosInstallable] = useState(false);
    const [iosHint, setIosHint] = useState(false);

    const cacheRef = useRef(new Map<number, Lecture[]>());
    const touchRef = useRef<{ x: number; y: number } | null>(null);

    const monday = useMemo(() => mondayOfWeek(weekOffset), [weekOffset]);
    const visibleDate = view === "day" ? addDays(monday, dayIndex) : monday;
    const rangeLabel = view === "day"
        ? formatDayTitle(visibleDate)
        : `${formatShort(monday)} – ${formatShort(addDays(monday, 6))}`;

    const hiddenDays = useMemo(() => {
        if (view === "day") {
            return [];
        }
        const days: number[] = [];
        if (!lectures.some((lecture) => lecture.day === "SUNDAY")) {
            days.push(0);
        }
        if (!lectures.some((lecture) => lecture.day === "SATURDAY")) {
            days.push(6);
        }
        return days;
    }, [lectures, view]);

    const events = useMemo(
        () => lectureConversionUtil.toCalendarEvents(lectures, COLORS, weekOffset),
        [lectures, weekOffset]
    );

    const scrollTime = useMemo(() => {
        if (weekOffset !== 0) {
            return "08:00:00";
        }
        const hour = Math.max(7, new Date().getHours() - 1);
        return `${String(Math.min(hour, 18)).padStart(2, "0")}:00:00`;
    }, [weekOffset]);

    useEffect(() => {
        document.documentElement.classList.add("calendar-app-active");
        const previousTitle = document.title;
        const previousLang = document.documentElement.lang;
        document.documentElement.lang = "de";
        return () => {
            document.documentElement.classList.remove("calendar-app-active");
            document.title = previousTitle;
            document.documentElement.lang = previousLang;
        };
    }, []);

    useEffect(() => {
        document.title = title;
    }, [title]);

    useEffect(() => {
        if (queryFile) {
            localStorage.setItem(STORED_FILE_KEY, queryFile);
        }
    }, [queryFile]);

    useEffect(() => {
        if (!file || !("serviceWorker" in navigator)) {
            return;
        }
        navigator.serviceWorker.register("/calendar-sw.js").catch(() => undefined);
    }, [file]);

    useEffect(() => {
        if (!file) {
            return;
        }

        let cancelled = false;
        readCourseName(file)
            .then((course) => {
                if (!cancelled && course) {
                    setTitle(course);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTitle("Stundenplan");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [file]);

    useEffect(() => {
        if (!file) {
            return;
        }

        const cached = cacheRef.current.get(weekOffset);
        if (cached) {
            setLectures(cached);
            setFailed(false);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setFailed(false);
        readWeek(file, weekOffset)
            .then((nextLectures) => {
                if (cancelled) {
                    return;
                }
                cacheRef.current.set(weekOffset, nextLectures);
                setLectures(nextLectures);
            })
            .catch(() => {
                if (!cancelled) {
                    setLectures([]);
                    setFailed(true);
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
    }, [file, weekOffset]);

    useEffect(() => {
        if (!file) {
            return;
        }

        const origin = window.location.origin;
        const startUrl = queryFile
            ? `${origin}/calendar?file=${encodeURIComponent(queryFile)}`
            : `${origin}/calendar`;
        const manifest = {
            id: startUrl,
            name: title,
            short_name: title.length > 12 ? "Plan" : title,
            start_url: startUrl,
            scope: `${origin}/calendar`,
            display: "standalone",
            orientation: "portrait",
            background_color: "#0f111b",
            theme_color: "#0f111b",
            icons: [
                { src: `${origin}/pwa/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
                { src: `${origin}/pwa/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
            ],
        };
        const manifestUrl = URL.createObjectURL(new Blob(
            [JSON.stringify(manifest)],
            { type: "application/manifest+json" }
        ));

        const link = document.createElement("link");
        link.rel = "manifest";
        link.href = manifestUrl;
        document.head.appendChild(link);

        const appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = "/pwa/icon-512.png";
        document.head.appendChild(appleIcon);

        const metas: Array<[string, string]> = [
            ["apple-mobile-web-app-capable", "yes"],
            ["mobile-web-app-capable", "yes"],
            ["apple-mobile-web-app-status-bar-style", "black-translucent"],
            ["apple-mobile-web-app-title", title],
            ["theme-color", "#0f111b"],
        ];
        const metaNodes = metas.map(([name, content]) => {
            const meta = document.createElement("meta");
            meta.name = name;
            meta.content = content;
            document.head.appendChild(meta);
            return meta;
        });

        const onInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as InstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", onInstallPrompt);

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIosInstallable(ios && !isStandaloneDisplay());

        return () => {
            link.remove();
            appleIcon.remove();
            metaNodes.forEach((meta) => meta.remove());
            URL.revokeObjectURL(manifestUrl);
            window.removeEventListener("beforeinstallprompt", onInstallPrompt);
        };
    }, [file, queryFile, title]);

    const shift = (direction: 1 | -1) => {
        setSelected(null);
        if (view === "week") {
            setWeekOffset((current) => current + direction);
            return;
        }

        setDayIndex((current) => {
            const next = current + direction;
            if (next > 6) {
                setWeekOffset((week) => week + 1);
                return 0;
            }
            if (next < 0) {
                setWeekOffset((week) => week - 1);
                return 6;
            }
            return next;
        });
    };

    const onTouchStart = (event: TouchEvent) => {
        if (selected) {
            return;
        }
        const touch = event.changedTouches[0];
        touchRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start || selected || !file) {
            return;
        }
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY)) {
            return;
        }
        shift(deltaX < 0 ? 1 : -1);
    };

    const openLink = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = linkInput.trim();
        if (!trimmed) {
            return;
        }
        navigate(`/calendar?file=${encodeURIComponent(trimmed)}`);
    };

    const install = async () => {
        if (!installPrompt) {
            setIosHint((open) => !open);
            return;
        }
        await installPrompt.prompt();
        setInstallPrompt(null);
    };

    const onEventClick = (info: EventClickArg) => {
        info.jsEvent.preventDefault();
        setSelected(info.event.extendedProps["lecture"] as Lecture);
    };

    return (
        <div className={`cal-app ${view === "day" ? "cal-app--day" : "cal-app--week"}`}>
            <header className="cal-app__header">
                <div className="cal-app__heading">
                    <h1 className="cal-app__title">{file ? title : "Stundenplan"}</h1>
                    {file && <p className="cal-app__range">{rangeLabel}</p>}
                </div>
                {file && (
                    <div className="cal-app__actions">
                        {(installPrompt || iosInstallable) && !standalone && (
                            <button type="button" className="cal-app__install" onClick={install} aria-label="App installieren">
                                <Download size={16} />
                            </button>
                        )}
                        <div className="cal-app__toggle" role="group" aria-label="Ansicht">
                            <button
                                type="button"
                                className={view === "week" ? "is-active" : ""}
                                aria-pressed={view === "week"}
                                onClick={() => setView("week")}
                            >
                                Woche
                            </button>
                            <button
                                type="button"
                                className={view === "day" ? "is-active" : ""}
                                aria-pressed={view === "day"}
                                onClick={() => setView("day")}
                            >
                                Tag
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {iosHint && !standalone && file && (
                <p className="cal-app__ios-hint">Teilen, dann „Zum Home-Bildschirm“.</p>
            )}

            <div
                className="cal-app__body"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {!file && (
                    <form className="cal-app__link-form" onSubmit={openLink}>
                        <label htmlFor="calendar-file">Rapla-Link</label>
                        <input
                            id="calendar-file"
                            type="url"
                            inputMode="url"
                            autoComplete="off"
                            placeholder="https://rapla.dhbw.de/…"
                            value={linkInput}
                            onChange={(event) => setLinkInput(event.target.value)}
                        />
                        <button type="submit" disabled={linkInput.trim() === ""}>Öffnen</button>
                    </form>
                )}
                {file && failed && (
                    <p className="cal-app__message">Plan konnte nicht geladen werden.</p>
                )}
                {file && !failed && loading && lectures.length === 0 && (
                    <p className="cal-app__message">Wird geladen…</p>
                )}
                {file && !failed && !(loading && lectures.length === 0) && (
                    <FullCalendar
                        key={`${view}-${toDateKey(visibleDate)}-${hiddenDays.join("")}`}
                        plugins={[timeGridPlugin]}
                        initialView={view === "day" ? "timeGridDay" : "timeGridWeek"}
                        initialDate={toDateKey(visibleDate)}
                        locale={deLocale}
                        firstDay={1}
                        headerToolbar={false}
                        allDaySlot={false}
                        nowIndicator
                        height="100%"
                        slotMinTime="07:00:00"
                        slotMaxTime="21:00:00"
                        scrollTime={scrollTime}
                        slotDuration="00:30:00"
                        slotLabelInterval="01:00:00"
                        hiddenDays={hiddenDays}
                        events={events}
                        eventClick={onEventClick}
                        eventContent={(arg) => <EventCard arg={arg} compact={view === "week"} />}
                        dayHeaderFormat={{ weekday: "short" }}
                        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                    />
                )}
            </div>

            {selected && (
                <div className="cal-sheet-backdrop" onClick={() => setSelected(null)}>
                    <section
                        className="cal-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label={selected.title}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="cal-sheet__header">
                            <div>
                                <h2>{selected.title}</h2>
                                <span className={`cal-sheet__badge cal-sheet__badge--${selected.type.toLowerCase()}`}>
                                    {TYPE_LABELS[selected.type]}
                                </span>
                            </div>
                            <button type="button" className="cal-sheet__close" onClick={() => setSelected(null)} aria-label="Schließen">
                                <X size={18} />
                            </button>
                        </div>
                        <dl className="cal-sheet__list">
                            <div>
                                <dt><Clock1 size={14} /> Zeit</dt>
                                <dd>{selected.startTime} – {selected.endTime}</dd>
                            </div>
                            <div>
                                <dt><User size={14} /> Dozent*in</dt>
                                <dd>{selected.lecturer || "—"}</dd>
                            </div>
                            <div>
                                <dt><MapPin size={14} /> Räume</dt>
                                <dd>{selected.rooms.length ? selected.rooms.join(", ") : "—"}</dd>
                            </div>
                            <div>
                                <dt><Book size={14} /> Kurse</dt>
                                <dd>{selected.courses.length ? selected.courses.join(", ") : "—"}</dd>
                            </div>
                        </dl>
                    </section>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
