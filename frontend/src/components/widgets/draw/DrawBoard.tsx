import "@/components/widgets/draw/DrawBoard.css";
import {useEffect, useRef, useState, type PointerEvent as ReactPointerEvent} from "react";
import {createPortal} from "react-dom";
import {Brush, Eraser, Fullscreen, RotateCcw, Settings} from "lucide-react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import Button from "@/components/ui/Button.tsx";
import {dashboardService} from "@/services/dashboardService.tsx";
import {drawService, type DrawBoard as DrawBoardState, type DrawPoint, type DrawStroke, type DrawTool} from "@/services/drawService.tsx";
import {websocketService} from "@/services/websocketService.tsx";
import {WebSocketMessageType} from "@/models/WebSocketEnvelope.tsx";
import {getUsernameFromToken, getUserRole} from "@/services/tokenService.tsx";

const BRUSH_MIN = 0.008;
const BRUSH_MAX = 0.06;
const HUE_COLORS = [
    "#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00",
    "#aaff00", "#00ff00", "#00ffaa", "#00ffff", "#00aaff",
    "#0055ff", "#4400ff", "#8800ff", "#cc00ff", "#ff00ff",
    "#ff0088", "#ff0044", "#ffffff", "#aaaaaa", "#555555", "#000000",
];

type Hsv = {h: number; s: number; v: number};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const hexToHsv = (hex: string): Hsv => {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(char => char + char).join("") : clean;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return {h: 0, s: 1, v: 1};
    }
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return {h, s: max === 0 ? 0 : delta / max, v: max};
};

const hsvToHex = (h: number, s: number, v: number) => {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const channel = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
    return `#${channel(r)}${channel(g)}${channel(b)}`;
};

const hueThumb = (hsv: Hsv) => {
    if (hsv.s < 0.08) {
        if (hsv.v < 0.2) return 97;
        if (hsv.v < 0.55) return 93;
        return 90;
    }
    return (hsv.h / 360) * 82;
};

type DrawEvent = {
    action?: string;
    withUsername?: string;
    voterUsername?: string;
    want?: boolean;
    cleared?: boolean;
    stroke?: DrawStroke;
};

const sameName = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase();

const readPartner = (raw: string) => {
    if (!raw) {
        return "";
    }
    try {
        const parsed = JSON.parse(raw) as {partnerUsername?: unknown};
        return typeof parsed.partnerUsername === "string" ? parsed.partnerUsername.trim() : "";
    } catch {
        return "";
    }
};

const cloneStroke = (stroke: DrawStroke): DrawStroke => ({
    ...stroke,
    points: stroke.points.map(point => [point[0], point[1]]),
});

const farEnough = (left: DrawPoint, right: DrawPoint) => {
    const dx = left[0] - right[0];
    const dy = left[1] - right[1];
    return dx * dx + dy * dy >= 0.000004;
};

const pointFrom = (event: {clientX: number; clientY: number}, canvas: HTMLCanvasElement): DrawPoint | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }
    return [
        Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    ];
};

const paintStroke = (context: CanvasRenderingContext2D, stroke: DrawStroke, square: number) => {
    if (stroke.points.length === 0) {
        return;
    }
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    const lineWidth = Math.max(1, stroke.width * square);
    context.lineWidth = lineWidth;
    if (stroke.points.length === 1) {
        const [x, y] = stroke.points[0];
        context.beginPath();
        context.arc(x * square, y * square, lineWidth / 2, 0, Math.PI * 2);
        context.fill();
        return;
    }
    context.beginPath();
    stroke.points.forEach(([x, y], index) => {
        const px = x * square;
        const py = y * square;
        if (index === 0) {
            context.moveTo(px, py);
        } else {
            context.lineTo(px, py);
        }
    });
    context.stroke();
};

const paintBoard = (canvas: HTMLCanvasElement, strokes: DrawStroke[], square: number) => {
    const context = canvas.getContext("2d");
    if (!context || square < 2) {
        return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.max(1, Math.floor(square * ratio));
    if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
    }
    canvas.style.width = `${square}px`;
    canvas.style.height = `${square}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, square, square);
    context.lineCap = "round";
    context.lineJoin = "round";
    strokes.forEach(stroke => paintStroke(context, stroke, square));
    context.globalCompositeOperation = "source-over";
};

const DrawBoard = ({title, data, id, isPreview}: WidgetProps) => {
    const [partner, setPartner] = useState(() => readPartner(data));
    const [displayName, setDisplayName] = useState(() => readPartner(data));
    const [status, setStatus] = useState<DrawBoardState["status"]>("idle");
    const [channel, setChannel] = useState<string | null>(null);
    const [inFullscreen, setInFullscreen] = useState(false);
    const [inSettings, setInSettings] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<string[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [selfWantsReset, setSelfWantsReset] = useState(false);
    const [partnerWantsReset, setPartnerWantsReset] = useState(false);
    const [tool, setTool] = useState<DrawTool>("pen");
    const [color, setColor] = useState("#bc0101");
    const [hsv, setHsv] = useState<Hsv>(() => hexToHsv("#bc0101"));
    const [brush, setBrush] = useState(0.02);
    const [openTool, setOpenTool] = useState<"color" | "size" | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const strokesRef = useRef<DrawStroke[]>([]);
    const squareRef = useRef(0);
    const paintRef = useRef<() => void>(() => undefined);
    const partnerRef = useRef(partner);
    const channelRef = useRef(channel);
    const statusRef = useRef(status);
    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const brushRef = useRef(brush);
    const hsvRef = useRef(hsv);
    const [boardSize, setBoardSize] = useState(0);
    const toolsRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    const sizeRef = useRef<HTMLDivElement>(null);
    const openToolRef = useRef(openTool);
    const activeIdRef = useRef<string | null>(null);
    const liveTimer = useRef<number | null>(null);
    const pendingIds = useRef<Set<string>>(new Set());
    const applyRef = useRef<(board: DrawBoardState) => void>(() => undefined);
    const loadRef = useRef<() => Promise<void>>(async () => undefined);

    partnerRef.current = partner;
    channelRef.current = channel;
    statusRef.current = status;
    toolRef.current = tool;
    colorRef.current = color;
    brushRef.current = brush;
    hsvRef.current = hsv;
    openToolRef.current = openTool;

    const canDraw = inFullscreen && status === "open" && !inSettings && !isPreview;
    const name = displayName || partner;
    const heading = name ? `DRAW mit ${name}` : "DRAW";

    paintRef.current = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        paintBoard(canvas, strokesRef.current, squareRef.current);
    };

    applyRef.current = (board) => {
        const serverIds = new Set(board.strokes.map(stroke => stroke.id));
        const kept = activeIdRef.current
            ? strokesRef.current.filter(stroke => stroke.id === activeIdRef.current || (pendingIds.current.has(stroke.id) && !serverIds.has(stroke.id)))
            : strokesRef.current.filter(stroke => pendingIds.current.has(stroke.id) && !serverIds.has(stroke.id));
        pendingIds.current.forEach(strokeId => {
            if (serverIds.has(strokeId)) {
                pendingIds.current.delete(strokeId);
            }
        });
        strokesRef.current = board.status === "open" ? [...board.strokes.filter(stroke => stroke.id !== activeIdRef.current), ...kept] : [];
        if (board.status !== "open") {
            activeIdRef.current = null;
        }
        setStatus(board.status);
        setChannel(board.channel);
        setDisplayName(board.partnerUsername || (board.status === "open" ? "" : partnerRef.current));
        setSelfWantsReset(board.selfWantsReset);
        setPartnerWantsReset(board.partnerWantsReset);
        setLoadError(false);
        paintRef.current();
    };

    useEffect(() => {
        setPartner(readPartner(data));
    }, [data]);

    useEffect(() => {
        if (isPreview || getUserRole() === "GUEST") {
            strokesRef.current = [];
            setStatus("idle");
            setChannel(null);
            setDisplayName(partner);
            setLoadError(false);
            paintRef.current();
            return;
        }

        strokesRef.current = [];
        paintRef.current();
        let stop = false;
        let timer = 0;
        const load = async () => {
            const board = await drawService.loadBoard(partner);
            if (stop) {
                return;
            }
            if (!board) {
                setLoadError(true);
            } else {
                applyRef.current(board);
            }
            if (stop) {
                return;
            }
            const wait = statusRef.current === "open" ? 15000 : 4000;
            timer = window.setTimeout(() => void load(), wait);
        };
        loadRef.current = load;
        void load();
        return () => {
            stop = true;
            window.clearTimeout(timer);
        };
    }, [isPreview, partner]);

    useEffect(() => {
        if (isPreview || status !== "open" || !channel) {
            return;
        }
        websocketService.connect();
        websocketService.joinChannel(channel);
        return () => websocketService.leaveChannel(channel);
    }, [channel, isPreview, status]);

    useEffect(() => {
        if (isPreview) {
            return;
        }
        websocketService.connect();
        return websocketService.subscribe(envelope => {
            const payload = envelope.payload as DrawEvent | null;
            if (!payload || typeof payload !== "object") {
                return;
            }
            if ((payload.action === "paired" || payload.action === "unpaired")
                && payload.withUsername
                && partnerRef.current
                && sameName(payload.withUsername, partnerRef.current)) {
                void loadRef.current();
                return;
            }
            if (!channelRef.current || envelope.channel !== channelRef.current || envelope.type !== WebSocketMessageType.MESSAGE) {
                return;
            }
            if (payload.action === "stroke" && payload.stroke && isIncomingStroke(payload.stroke)) {
                if (payload.stroke.id === activeIdRef.current) {
                    return;
                }
                const next = strokesRef.current.filter(stroke => stroke.id !== payload.stroke?.id);
                next.push(payload.stroke);
                strokesRef.current = next;
                pendingIds.current.delete(payload.stroke.id);
                paintRef.current();
                return;
            }
            if (payload.action === "reset") {
                if (payload.cleared) {
                    strokesRef.current = [];
                    activeIdRef.current = null;
                    pendingIds.current.clear();
                    setSelfWantsReset(false);
                    setPartnerWantsReset(false);
                    paintRef.current();
                    return;
                }
                const mine = sameName(payload.voterUsername ?? "", getUsernameFromToken() ?? "");
                if (mine) {
                    setSelfWantsReset(payload.want === true);
                } else {
                    setPartnerWantsReset(payload.want === true);
                }
            }
        });
    }, [isPreview]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) {
            return;
        }
        const measure = () => {
            const next = Math.max(0, Math.floor(Math.min(stage.clientWidth, stage.clientHeight)));
            squareRef.current = next;
            setBoardSize(current => current === next ? current : next);
            paintRef.current();
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [inFullscreen, inSettings, status, partner, isPreview]);

    useEffect(() => {
        if (!inFullscreen) {
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (openToolRef.current) {
                    setOpenTool(null);
                    return;
                }
                setInFullscreen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [inFullscreen]);

    useEffect(() => {
        if (!query || query.trim().length < 2 || isPreview || getUserRole() === "GUEST") {
            setResults([]);
            setSearching(false);
            return;
        }
        let stop = false;
        setSearching(true);
        const timer = window.setTimeout(() => {
            void drawService.searchUsers(query.trim())
                .then(names => {
                    if (!stop) {
                        setResults(names);
                    }
                })
                .catch(() => {
                    if (!stop) {
                        setResults([]);
                    }
                })
                .finally(() => {
                    if (!stop) {
                        setSearching(false);
                    }
                });
        }, 250);
        return () => {
            stop = true;
            window.clearTimeout(timer);
        };
    }, [isPreview, query]);

    const sendLive = (stroke: DrawStroke) => {
        if (!channelRef.current) {
            return;
        }
        websocketService.sendMessage(channelRef.current, {action: "stroke", stroke});
    };

    const scheduleLive = () => {
        if (liveTimer.current != null) {
            return;
        }
        liveTimer.current = window.setTimeout(() => {
            liveTimer.current = null;
            const stroke = strokesRef.current.find(item => item.id === activeIdRef.current);
            if (stroke) {
                sendLive(cloneStroke(stroke));
            }
        }, 60);
    };

    const finishStroke = () => {
        if (liveTimer.current != null) {
            window.clearTimeout(liveTimer.current);
            liveTimer.current = null;
        }
        const stroke = strokesRef.current.find(item => item.id === activeIdRef.current);
        activeIdRef.current = null;
        if (!stroke) {
            return;
        }
        const copy = cloneStroke(stroke);
        pendingIds.current.add(copy.id);
        sendLive(copy);
        void drawService.commitStroke(partnerRef.current, copy);
    };

    const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!canDraw || event.button !== 0) {
            return;
        }
        const canvas = canvasRef.current;
        const point = canvas ? pointFrom(event, canvas) : null;
        if (!canvas || !point) {
            return;
        }
        canvas.setPointerCapture(event.pointerId);
        const stroke: DrawStroke = {
            id: crypto.randomUUID(),
            tool: toolRef.current,
            color: colorRef.current,
            width: brushRef.current,
            points: [point],
        };
        activeIdRef.current = stroke.id;
        strokesRef.current = [...strokesRef.current, stroke];
        paintRef.current();
        scheduleLive();
    };

    const moveStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !activeIdRef.current) {
            return;
        }
        const point = pointFrom(event, canvas);
        const stroke = strokesRef.current.find(item => item.id === activeIdRef.current);
        const last = stroke?.points[stroke.points.length - 1];
        if (!point || !stroke || !last || !farEnough(last, point)) {
            return;
        }
        if (stroke.points.length >= 250) {
            return;
        }
        stroke.points.push(point);
        paintRef.current();
        scheduleLive();
    };

    const savePartner = async (username: string) => {
        if (!id || id.startsWith("default-") || getUserRole() === "GUEST") {
            return;
        }
        await dashboardService.saveWidgetData(id, JSON.stringify({partnerUsername: username}));
    };

    const choose = async (username: string) => {
        if (sameName(partner, username)) {
            setInSettings(false);
            return;
        }
        const previous = partner;
        await savePartner(username);
        setPartner(username);
        setQuery("");
        setResults([]);
        setInSettings(false);
        if (previous) {
            void drawService.unpair(previous);
        }
        const board = await drawService.openBoard(username);
        applyRef.current(board);
    };

    const disconnect = async () => {
        const previous = partner;
        await savePartner("");
        setPartner("");
        setQuery("");
        setResults([]);
        if (previous) {
            void drawService.unpair(previous);
        }
    };

    const vote = async (want: boolean) => {
        if (status !== "open") {
            return;
        }
        setSelfWantsReset(want);
        const board = await drawService.voteReset(partner, want);
        if (board) {
            applyRef.current(board);
        }
    };

    useEffect(() => {
        if (!openTool) {
            return;
        }
        const onPointerDown = (event: PointerEvent) => {
            if (toolsRef.current?.contains(event.target as Node)) {
                return;
            }
            setOpenTool(null);
        };
        window.addEventListener("pointerdown", onPointerDown);
        return () => window.removeEventListener("pointerdown", onPointerDown);
    }, [openTool]);

    const commitColor = (next: Hsv) => {
        const safe = {h: (next.h + 360) % 360, s: clamp01(next.s), v: clamp01(next.v)};
        hsvRef.current = safe;
        setHsv(safe);
        setColor(hsvToHex(safe.h, safe.s, safe.v));
        setTool("pen");
    };

    const applyHue = (clientY: number) => {
        const rect = hueRef.current?.getBoundingClientRect();
        if (!rect || rect.height === 0) {
            return;
        }
        const pos = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        const current = hsvRef.current;
        if (pos > 88) {
            const value = pos > 96 ? 0 : pos > 92 ? 0.33 : 0.67;
            commitColor({...current, s: 0, v: value});
            return;
        }
        commitColor({
            h: (pos / 82) * 360,
            s: current.s < 0.08 ? 1 : current.s,
            v: current.s < 0.08 ? 1 : current.v,
        });
    };

    const applyField = (clientX: number, clientY: number) => {
        const rect = fieldRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return;
        }
        commitColor({
            h: hsvRef.current.h,
            s: clamp01((clientX - rect.left) / rect.width),
            v: clamp01(1 - (clientY - rect.top) / rect.height),
        });
    };

    const applySize = (clientY: number) => {
        const rect = sizeRef.current?.getBoundingClientRect();
        if (!rect || rect.height === 0) {
            return;
        }
        const ratio = clamp01((clientY - rect.top) / rect.height);
        setBrush(BRUSH_MAX - ratio * (BRUSH_MAX - BRUSH_MIN));
        setTool("pen");
    };

    const capture = (event: ReactPointerEvent<HTMLDivElement>) => {
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            /* pointer is no longer active */
        }
    };

    if (isPreview) {
        return (
            <>
                <div className="draw-preview" aria-hidden="true">
                    <span>DRAW</span>
                </div>
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    if (getUserRole() === "GUEST") {
        return (
            <div className="draw-widget">
                <p className="draw-hint">DRAW gibt es für angemeldete Konten.</p>
            </div>
        );
    }

    const canvasMessage = loadError
        ? "Die Fläche konnte nicht geladen werden."
        : status === "waiting"
                ? `Wartet, bis ${name} dich auch auswählt.`
                : status === "unknown"
                    ? "Diesen Benutzernamen gibt es nicht."
                    : status === "self"
                        ? "Du kannst nicht mit dir selbst malen."
                        : "";

    const resetLabel = status !== "open"
        ? "Leeren"
        : partnerWantsReset && !selfWantsReset
            ? `${name} möchte leeren`
            : selfWantsReset
                ? `Wartet auf ${name}`
                : "Leeren";
    const brushDot = 6 + ((brush - BRUSH_MIN) / (BRUSH_MAX - BRUSH_MIN)) * 12;
    const brushThumb = (1 - (brush - BRUSH_MIN) / (BRUSH_MAX - BRUSH_MIN)) * 100;

    const widget = (
        <div className={`draw-widget${inFullscreen ? " fullscreen" : ""}`}>
            <div className="widget-header">
                <Settings
                    className="widget-header-icon"
                    size={20}
                    aria-label="Einstellungen"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => setInSettings(open => !open)}
                />
                <Fullscreen
                    className="widget-header-icon"
                    size={20}
                    aria-label="Vollbild"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => setInFullscreen(open => !open)}
                />
            </div>
            {inSettings ? (
                <div className="draw-settings" onPointerDown={event => event.stopPropagation()}>
                    <p className="draw-heading">{heading}</p>
                    <label className="draw-field">
                        <span>Benutzername</span>
                        <input
                            value={query}
                            placeholder="Benutzername"
                            aria-label="Benutzername"
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={event => {
                                if (event.key !== "Enter") {
                                    return;
                                }
                                const exact = results.find(result => sameName(result, query));
                                if (exact) {
                                    void choose(exact);
                                }
                            }}
                        />
                    </label>
                    {searching && <p className="draw-hint">Suche läuft…</p>}
                    {!searching && query.trim().length >= 2 && results.length === 0 && (
                        <p className="draw-hint">Niemand gefunden.</p>
                    )}
                    {query.trim().length > 0 && query.trim().length < 2 && (
                        <p className="draw-hint">Mindestens 2 Zeichen.</p>
                    )}
                    <ul className="draw-results">
                        {results.map(result => (
                            <li key={result}>
                                <button type="button" className="draw-result" onClick={() => void choose(result)}>
                                    {result}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {partner && (
                        <p className="draw-partner">Ausgewählt: {name}</p>
                    )}
                    <p className="draw-hint">Jede Nacht wird geleert. Zu zweit nur, wenn ihr beide leert.</p>
                    <div className="draw-settings-actions">
                        {partner && <Button text="Trennen" variant="secondary" fullWidth onClick={() => void disconnect()} />}
                        <Button text="Zurück" variant="secondary" fullWidth onClick={() => setInSettings(false)} />
                    </div>
                </div>
            ) : (
                <div className="draw-body">
                        {inFullscreen && (
                            <div className="draw-tools" ref={toolsRef} onPointerDown={event => event.stopPropagation()}>
                                <div className={`draw-slot${openTool === "color" ? " is-open" : ""}`}>
                                    {openTool === "color" ? (
                                        <>
                                            <div
                                                ref={hueRef}
                                                className="draw-hue"
                                                style={{background: `linear-gradient(to bottom, ${HUE_COLORS.join(", ")})`}}
                                                onPointerDown={event => {
                                                    applyHue(event.clientY);
                                                    capture(event);
                                                }}
                                                onPointerMove={event => {
                                                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                                                        return;
                                                    }
                                                    applyHue(event.clientY);
                                                }}
                                            >
                                                <span className="draw-hue-thumb" style={{top: `${hueThumb(hsv)}%`, background: color}} />
                                            </div>
                                            <div
                                                ref={fieldRef}
                                                className="draw-color-field"
                                                style={{backgroundColor: `hsl(${hsv.h} 100% 50%)`}}
                                                onPointerDown={event => {
                                                    applyField(event.clientX, event.clientY);
                                                    capture(event);
                                                }}
                                                onPointerMove={event => {
                                                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                                                        return;
                                                    }
                                                    applyField(event.clientX, event.clientY);
                                                }}
                                            >
                                                <span className="draw-field-cursor" style={{left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`}} />
                                            </div>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className="draw-dot draw-dot--color"
                                            style={{background: color}}
                                            aria-label="Farbe"
                                            onClick={() => setOpenTool("color")}
                                        />
                                    )}
                                </div>
                                <div className={`draw-slot${openTool === "size" ? " is-open" : ""}`}>
                                    {openTool === "size" ? (
                                        <div
                                            ref={sizeRef}
                                            className="draw-slider"
                                            onPointerDown={event => {
                                                applySize(event.clientY);
                                                capture(event);
                                            }}
                                            onPointerMove={event => {
                                                if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                                                    return;
                                                }
                                                applySize(event.clientY);
                                            }}
                                        >
                                            <span className="draw-slider-thumb" style={{top: `${brushThumb}%`, width: brushDot, height: brushDot}} />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="draw-dot"
                                            aria-label="Pinselgröße"
                                            onClick={() => setOpenTool("size")}
                                        >
                                            <span style={{width: brushDot, height: brushDot}} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className={`draw-dot${tool === "pen" ? " is-active" : ""}`}
                                    aria-label="Pinsel"
                                    aria-pressed={tool === "pen"}
                                    onClick={() => {
                                        setOpenTool(null);
                                        setTool("pen");
                                    }}
                                >
                                    <Brush size={15} />
                                </button>
                                <button
                                    type="button"
                                    className={`draw-dot${tool === "eraser" ? " is-active" : ""}`}
                                    aria-label="Radierer"
                                    aria-pressed={tool === "eraser"}
                                    onClick={() => {
                                        setOpenTool(null);
                                        setTool(current => current === "eraser" ? "pen" : "eraser");
                                    }}
                                >
                                    <Eraser size={15} />
                                </button>
                                <button
                                    type="button"
                                    className={`draw-dot draw-dot--reset${partnerWantsReset || selfWantsReset ? " is-alert" : ""}`}
                                    aria-label={resetLabel}
                                    disabled={status !== "open"}
                                    onClick={() => void vote(!selfWantsReset)}
                                >
                                    <RotateCcw size={15} />
                                </button>
                            </div>
                        )}
                        <div className="draw-stage" ref={stageRef}>
                            <div className="draw-board" style={{width: boardSize, height: boardSize}}>
                                <canvas
                                    ref={canvasRef}
                                    className={`draw-canvas${canDraw ? " is-drawing" : ""}`}
                                    onPointerDown={startStroke}
                                    onPointerMove={moveStroke}
                                    onPointerUp={finishStroke}
                                    onPointerCancel={finishStroke}
                                />
                                <p className="draw-canvas-title">{heading}</p>
                                {canvasMessage && <p className="draw-canvas-message">{canvasMessage}</p>}
                            </div>
                        </div>
                    </div>
            )}
        </div>
    );

    return inFullscreen ? createPortal(widget, document.body) : widget;
};

const isIncomingStroke = (value: DrawStroke): value is DrawStroke => {
    return typeof value.id === "string" && Array.isArray(value.points);
};

export default DrawBoard;
