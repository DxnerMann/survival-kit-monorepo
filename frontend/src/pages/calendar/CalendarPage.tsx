import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import deLocale from "@fullcalendar/core/locales/de";
import { Book, Clock1, Download, MapPin, Settings, User, X } from "lucide-react";
import { api } from "@/services/api.tsx";
import type { DayOfWeek, Lecture } from "@/models/Lecture.tsx";
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

const WEEK_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const minutesOf = (time: string) => {
    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

const clock = (totalMinutes: number) => {
    const bounded = Math.min(24 * 60, Math.max(0, totalMinutes));
    const hours = Math.floor(bounded / 60);
    const minutes = bounded % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
};

const planTimeRange = (items: Lecture[]) => {
    if (items.length === 0) {
        return { min: "08:00:00", max: "18:00:00" };
    }
    const start = Math.min(...items.map((lecture) => minutesOf(lecture.startTime)));
    const end = Math.max(...items.map((lecture) => minutesOf(lecture.endTime)));
    return {
        min: clock(Math.floor(start / 60) * 60),
        max: clock(Math.ceil((end + 120) / 60) * 60),
    };
};

const hiddenStorageKey = (course: string) => `calendar-hidden:${course}`;

const readHiddenTitles = (course: string): string[] => {
    try {
        const stored = localStorage.getItem(hiddenStorageKey(course));
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
};

const isTitleHidden = (title: string, hidden: string[]) =>
    hidden.some((entry) => title.trim().includes(entry.trim()));

const STORED_FILE_KEY = "calendar-source";

const RAPLA_EXTRA_KEYS = ["user", "salt", "key", "day", "month", "year", "next", "pages"];

const readPlanSource = (params: URLSearchParams): string => {
    const source = params.get("source")?.trim() ?? "";
    const fileValues = params.getAll("file").map((value) => value.trim()).filter(Boolean);
    const base = source || fileValues[0] || "";
    if (!base.startsWith("http")) {
        return base;
    }

    let url: URL;
    try {
        url = new URL(base);
    } catch {
        return base;
    }

    const host = url.hostname.toLowerCase();
    const raplaHost = host === "rapla.dhbw.de" || (host.startsWith("rapla.") && host.endsWith(".dhbw.de"));
    if (!raplaHost) {
        return base;
    }

    const raplaFile = source ? fileValues[0] : fileValues[1];
    if (raplaFile && !url.searchParams.has("file")) {
        url.searchParams.set("file", raplaFile);
    }

    for (const key of RAPLA_EXTRA_KEYS) {
        if (url.searchParams.has(key)) {
            continue;
        }
        const extra = params.get(key);
        if (extra) {
            url.searchParams.set(key, extra);
        }
    }

    return url.toString();
};

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

const weekOffsetOf = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const day = target.getDay();
    const distanceToMonday = day === 0 ? -6 : 1 - day;
    target.setDate(target.getDate() + distanceToMonday);
    const currentMonday = mondayOfWeek(0);
    return Math.round((target.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
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

const readSemesterNames = async (course: string): Promise<string[]> => {
    const response = await fetch(
        `${api.baseUrl}/lecture/all?course=${encodeURIComponent(course)}`,
        { credentials: "omit" }
    );
    if (!response.ok) {
        throw new Error("names");
    }
    return response.json() as Promise<string[]>;
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

const hiddenDaysFor = (items: Lecture[], view: ViewMode) => {
    if (view === "day") {
        return [];
    }
    const days: number[] = [];
    if (!items.some((lecture) => lecture.day === "SUNDAY")) {
        days.push(0);
    }
    if (!items.some((lecture) => lecture.day === "SATURDAY")) {
        days.push(6);
    }
    return days;
};

const slotLayoutFor = (items: Lecture[], slotArea: number) => {
    const range = planTimeRange(items);
    const slots = Math.max(1, (minutesOf(range.max) - minutesOf(range.min)) / 30);
    const fitted = Math.floor(slotArea / slots);
    const minSlot = 22;
    const fits = fitted >= minSlot;
    return { range, height: fits ? fitted : minSlot, fits };
};

const PlanPane = ({
    lectures,
    date,
    view,
    weekOffset,
    slotArea,
    onEventClick,
}: {
    lectures: Lecture[];
    date: Date;
    view: ViewMode;
    weekOffset: number;
    slotArea: number;
    onEventClick: (info: EventClickArg) => void;
}) => {
    const dayName = WEEK_DAYS[(date.getDay() + 6) % 7];
    const dayLectures = lectures.filter((lecture) => lecture.day === dayName);
    const layoutSource = view === "day"
        ? (dayLectures.length > 0 ? dayLectures : lectures)
        : lectures;
    const layout = slotLayoutFor(layoutSource, slotArea);
    const hiddenDays = hiddenDaysFor(lectures, view);
    const events = useMemo(
        () => lectureConversionUtil.toCalendarEvents(lectures, COLORS, weekOffset),
        [lectures, weekOffset]
    );

    return (
        <div
            className={`cal-plan ${layout.fits ? "cal-plan--fit" : ""}`}
            style={{ "--cal-slot": `${layout.height}px` } as CSSProperties}
        >
            <FullCalendar
                key={`${view}-${toDateKey(date)}-${hiddenDays.join("")}-${layout.range.min}-${layout.range.max}`}
                plugins={[timeGridPlugin]}
                initialView={view === "day" ? "timeGridDay" : "timeGridWeek"}
                initialDate={toDateKey(date)}
                locale={deLocale}
                firstDay={1}
                headerToolbar={false}
                allDaySlot={false}
                nowIndicator
                height="100%"
                slotMinTime={layout.range.min}
                slotMaxTime={layout.range.max}
                scrollTime={layout.range.min}
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                hiddenDays={hiddenDays}
                eventMinHeight={0}
                slotEventOverlap={false}
                events={events}
                eventClick={onEventClick}
                eventContent={(arg) => <EventCard arg={arg} compact={view === "week"} />}
                dayHeaderFormat={{ weekday: "short" }}
                slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            />
        </div>
    );
};

const CalendarPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const source = readPlanSource(searchParams);
    const [standalone] = useState(isStandaloneDisplay);
    const [linkInput, setLinkInput] = useState("");

    const [view, setView] = useState<ViewMode>("week");
    const [weekOffset, setWeekOffset] = useState(0);
    const [dayIndex, setDayIndex] = useState(todayIndex);
    const [title, setTitle] = useState("Stundenplan");
    const [courseName, setCourseName] = useState("");
    const [semesterNames, setSemesterNames] = useState<string[]>([]);
    const [hiddenTitles, setHiddenTitles] = useState<string[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [weeks, setWeeks] = useState<Record<string, Lecture[]>>({});
    const [loading, setLoading] = useState(Boolean(source));
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<Lecture | null>(null);
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [iosInstallable, setIosInstallable] = useState(false);
    const [iosHint, setIosHint] = useState(false);

    const cacheRef = useRef(new Map<string, Lecture[]>());
    const bodyRef = useRef<HTMLDivElement>(null);
    const swipeRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const applyTransformRef = useRef<(x: number, animate: boolean) => void>(() => undefined);
    const shiftRef = useRef<(direction: 1 | -1) => void>(() => undefined);
    const settingsOpenRef = useRef(false);
    const selectedRef = useRef<Lecture | null>(null);
    const suppressClickRef = useRef(false);
    const [slotArea, setSlotArea] = useState(0);
    const loadedSource = useRef(source);
    if (loadedSource.current !== source) {
        loadedSource.current = source;
        cacheRef.current.clear();
        setWeeks({});
        setLoading(Boolean(source));
        setFailed(false);
    }

    const monday = useMemo(() => mondayOfWeek(weekOffset), [weekOffset]);
    const visibleDate = view === "day" ? addDays(monday, dayIndex) : monday;
    const rangeLabel = view === "day"
        ? formatDayTitle(visibleDate)
        : `${formatShort(monday)} – ${formatShort(addDays(monday, 6))}`;

    const lectures = weeks[String(weekOffset)] ?? [];
    const centerReady = weeks[String(weekOffset)] !== undefined;

    const panes = useMemo(() => [-1, 0, 1].map((delta) => {
        const date = view === "day" ? addDays(visibleDate, delta) : mondayOfWeek(weekOffset + delta);
        const offset = view === "day" ? weekOffsetOf(date) : weekOffset + delta;
        const paneLectures = (weeks[String(offset)] ?? [])
            .filter((lecture) => !isTitleHidden(lecture.title, hiddenTitles));
        return { date, offset, lectures: paneLectures };
    }), [view, visibleDate, weekOffset, weeks, hiddenTitles]);

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
        if (source) {
            localStorage.setItem(STORED_FILE_KEY, source);
        }
    }, [source]);

    useEffect(() => {
        if (!source || !("serviceWorker" in navigator)) {
            return;
        }
        navigator.serviceWorker.register("/calendar-sw.js").catch(() => undefined);
    }, [source]);

    useEffect(() => {
        if (!source) {
            return;
        }

        let cancelled = false;
        setSettingsOpen(false);
        readCourseName(source)
            .then(async (course) => {
                if (cancelled || !course) {
                    if (!cancelled) {
                        setTitle("Stundenplan");
                        setCourseName("");
                        setSemesterNames([]);
                    }
                    return;
                }
                setTitle(course);
                setCourseName(course);
                setHiddenTitles(readHiddenTitles(course));
                try {
                    const names = await readSemesterNames(course);
                    if (!cancelled) {
                        setSemesterNames(names);
                    }
                } catch {
                    if (!cancelled) {
                        setSemesterNames([]);
                    }
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTitle("Stundenplan");
                    setCourseName("");
                    setSemesterNames([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [source]);

    useEffect(() => {
        const node = bodyRef.current;
        if (!node) {
            return;
        }
        const measure = () => {
            const center = node.querySelector(".cal-swipe__page:nth-child(2)") ?? node;
            const header = center.querySelector(".fc-scrollgrid-section-header");
            const headerHeight = header?.getBoundingClientRect().height ?? 36;
            setSlotArea(Math.max(0, node.clientHeight - headerHeight));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [source, failed, loading, view, centerReady]);

    useEffect(() => {
        if (!source) {
            return;
        }

        const requested = weekOffset;
        let cancelled = false;
        const offsets = [requested - 1, requested, requested + 1];

        offsets.forEach((offset) => {
            const cacheKey = `${source}:${offset}`;
            const cached = cacheRef.current.get(cacheKey);
            if (cached) {
                setWeeks((current) => current[String(offset)] === cached ? current : { ...current, [String(offset)]: cached });
                if (offset === requested) {
                    setFailed(false);
                    setLoading(false);
                }
                return;
            }

            if (offset === requested) {
                setLoading(true);
                setFailed(false);
            }

            readWeek(source, offset)
                .then((nextLectures) => {
                    if (cancelled) {
                        return;
                    }
                    cacheRef.current.set(cacheKey, nextLectures);
                    setWeeks((current) => ({ ...current, [String(offset)]: nextLectures }));
                    if (offset === requested) {
                        setFailed(false);
                        setLoading(false);
                    }
                })
                .catch(() => {
                    if (!cancelled && offset === requested) {
                        setFailed(true);
                        setLoading(false);
                    }
                });
        });

        return () => {
            cancelled = true;
        };
    }, [source, weekOffset]);

    useEffect(() => {
        if (!source) {
            return;
        }

        const origin = window.location.origin;
        const startUrl = source
            ? `${origin}/calendar?source=${encodeURIComponent(source)}`
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
    }, [source, title]);

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

    const toggleVisible = (name: string) => {
        setHiddenTitles((current) => {
            const next = current.includes(name)
                ? current.filter((item) => item !== name)
                : [...current, name];
            if (courseName) {
                localStorage.setItem(hiddenStorageKey(courseName), JSON.stringify(next));
            }
            return next;
        });
    };

    shiftRef.current = shift;
    settingsOpenRef.current = settingsOpen;
    selectedRef.current = selected;

    const applyTransform = (x: number, animate: boolean) => {
        const track = trackRef.current;
        if (!track) {
            return;
        }
        track.style.transition = animate ? "transform 260ms ease-out" : "none";
        track.style.transform = `translate3d(calc(-33.333333% + ${x}px), 0, 0)`;
    };
    applyTransformRef.current = applyTransform;

    useLayoutEffect(() => {
        applyTransformRef.current(0, false);
    }, [weekOffset, dayIndex, view, centerReady]);

    useEffect(() => {
        const node = swipeRef.current;
        if (!node || !centerReady) {
            return;
        }

        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let mode: "undecided" | "x" | "y" = "undecided";
        let pointerId = -1;
        let animating = false;

        const onDown = (event: PointerEvent) => {
            if (animating || event.button !== 0 || settingsOpenRef.current || selectedRef.current) {
                return;
            }
            startX = event.clientX;
            startY = event.clientY;
            lastX = 0;
            mode = "undecided";
            pointerId = event.pointerId;
            suppressClickRef.current = false;
        };

        const onMove = (event: PointerEvent) => {
            if (event.pointerId !== pointerId || mode === "y" || animating) {
                return;
            }
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            if (mode === "undecided") {
                if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
                    return;
                }
                if (Math.abs(deltaY) > Math.abs(deltaX)) {
                    mode = "y";
                    return;
                }
                mode = "x";
                try {
                    node.setPointerCapture(event.pointerId);
                } catch {
                    // The pointer can already be gone. The swipe still follows the finger.
                }
            }
            lastX = deltaX;
            event.preventDefault();
            applyTransformRef.current(deltaX, false);
        };

        const onUp = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) {
                return;
            }
            pointerId = -1;
            if (mode !== "x") {
                return;
            }
            const width = node.clientWidth;
            const direction: 1 | -1 = lastX < 0 ? 1 : -1;
            const commit = Math.abs(lastX) > Math.min(72, width * 0.18);
            suppressClickRef.current = Math.abs(lastX) > 8;
            if (!commit) {
                applyTransformRef.current(0, true);
                return;
            }
            animating = true;
            const track = trackRef.current;
            if (!track) {
                animating = false;
                shiftRef.current(direction);
                return;
            }
            let settled = false;
            const settle = () => {
                if (settled) {
                    return;
                }
                settled = true;
                window.clearTimeout(fallback);
                track.removeEventListener("transitionend", finish);
                animating = false;
                shiftRef.current(direction);
            };
            const finish = (transitionEvent: TransitionEvent) => {
                if (transitionEvent.propertyName !== "transform") {
                    return;
                }
                settle();
            };
            const fallback = window.setTimeout(settle, 320);
            track.addEventListener("transitionend", finish);
            void track.offsetWidth;
            applyTransformRef.current(direction < 0 ? width : -width, true);
        };

        node.addEventListener("pointerdown", onDown);
        node.addEventListener("pointermove", onMove);
        node.addEventListener("pointerup", onUp);
        node.addEventListener("pointercancel", onUp);
        return () => {
            node.removeEventListener("pointerdown", onDown);
            node.removeEventListener("pointermove", onMove);
            node.removeEventListener("pointerup", onUp);
            node.removeEventListener("pointercancel", onUp);
        };
    }, [centerReady]);

    const openLink = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = linkInput.trim();
        if (!trimmed) {
            return;
        }
        navigate(`/calendar?source=${encodeURIComponent(trimmed)}`);
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
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        setSelected(info.event.extendedProps["lecture"] as Lecture);
    };

    return (
        <div className={`cal-app ${view === "day" ? "cal-app--day" : "cal-app--week"}`}>
            <header className="cal-app__header">
                <div className="cal-app__heading">
                    <h1 className="cal-app__title">{source ? title : "Stundenplan"}</h1>
                    {source && <p className="cal-app__range">{rangeLabel}</p>}
                </div>
                {source && (
                    <div className="cal-app__actions">
                        {(installPrompt || iosInstallable) && !standalone && (
                            <button type="button" className="cal-app__install" onClick={install} aria-label="App installieren">
                                <Download size={16} />
                            </button>
                        )}
                        <button
                            type="button"
                            className="cal-app__install"
                            onClick={() => setSettingsOpen(true)}
                            aria-label="Veranstaltungen filtern"
                        >
                            <Settings size={16} />
                        </button>
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

            {iosHint && !standalone && source && (
                <p className="cal-app__ios-hint">Teilen, dann „Zum Home-Bildschirm“.</p>
            )}

            <div ref={bodyRef} className="cal-app__body">
                {!source && (
                    <form className="cal-app__link-form" onSubmit={openLink}>
                        <label htmlFor="calendar-source">Rapla-Link</label>
                        <input
                            id="calendar-source"
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
                {source && failed && (
                    <p className="cal-app__message">Plan konnte nicht geladen werden.</p>
                )}
                {source && !failed && loading && lectures.length === 0 && (
                    <p className="cal-app__message">Wird geladen…</p>
                )}
                {source && !failed && !(loading && lectures.length === 0) && (
                    <div className="cal-swipe" ref={swipeRef}>
                        <div className="cal-swipe__track" ref={trackRef}>
                            {panes.map((pane) => (
                                <div className="cal-swipe__page" key={`${view}-${pane.offset}-${toDateKey(pane.date)}`}>
                                    <PlanPane
                                        lectures={pane.lectures}
                                        date={pane.date}
                                        view={view}
                                        weekOffset={pane.offset}
                                        slotArea={slotArea}
                                        onEventClick={onEventClick}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {settingsOpen && (
                <div className="cal-sheet-backdrop" onClick={() => setSettingsOpen(false)}>
                    <section
                        className="cal-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Veranstaltungen"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="cal-sheet__header">
                            <div>
                                <h2>Veranstaltungen</h2>
                            </div>
                            <button type="button" className="cal-sheet__close" onClick={() => setSettingsOpen(false)} aria-label="Schließen">
                                <X size={18} />
                            </button>
                        </div>
                        {semesterNames.length === 0 ? (
                            <p className="cal-settings__empty">Keine Veranstaltungen für dieses Semester.</p>
                        ) : (
                            <ul className="cal-settings__list">
                                {semesterNames.map((name) => (
                                    <li key={name}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={!hiddenTitles.includes(name)}
                                                onChange={() => toggleVisible(name)}
                                            />
                                            <span>{name}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}

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
