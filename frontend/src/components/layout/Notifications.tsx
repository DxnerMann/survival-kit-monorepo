import {useEffect, useRef, useState, type ReactNode} from "react";
import {useNavigate} from "react-router-dom";
import {Bell, Heart, MessageSquare, MessageSquareX, Shield, ThumbsUp, Trash2} from "lucide-react";
import {getMyActivities} from "@/services/activityService.tsx";
import {getAnsweredFeedback} from "@/services/feedbackService.tsx";
import {getUsername} from "@/services/userService.tsx";
import {websocketService} from "@/services/websocketService.tsx";
import {WebSocketMessageType} from "@/models/WebSocketEnvelope.tsx";
import "@/components/layout/Notifications.css";

const SEEN_FOR_MS = 24 * 60 * 60 * 1000;

type SeenMap = Record<string, number>;

const storageKey = () => `lsk-notifications-seen:${getUsername() || "user"}`;

const readSeen = (): SeenMap => {
    try {
        const raw = localStorage.getItem(storageKey());
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as SeenMap;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const writeSeen = (seen: SeenMap) => {
    localStorage.setItem(storageKey(), JSON.stringify(seen));
};

const markSeen = (seen: SeenMap, ids: string[]): SeenMap => {
    const now = Date.now();
    let next = seen;
    for (const id of ids) {
        if (next[id] != null) {
            continue;
        }
        if (next === seen) {
            next = {...seen};
        }
        next[id] = now;
    }
    if (next !== seen) {
        writeSeen(next);
    }
    return next;
};

type ActivityKind =
    | "FEEDBACK_ANSWERED"
    | "FEEDBACK_DELETED"
    | "FEEDBACK_LIKED"
    | "MEME_DELETED"
    | "MEME_LIKED"
    | "ROLE_CHANGED";

const STORED_KINDS = new Set<ActivityKind>([
    "FEEDBACK_DELETED",
    "FEEDBACK_LIKED",
    "MEME_DELETED",
    "MEME_LIKED",
    "ROLE_CHANGED",
]);

const isActivityKind = (kind: string): kind is ActivityKind => STORED_KINDS.has(kind as ActivityKind);

type ActivityNotice = {
    id: string;
    kind: ActivityKind;
    title: string;
    actorUsername?: string;
    subjectId?: string;
};

const quoted = (title: string) => {
    const value = title.trim();
    return value ? ` '${value}'` : "";
};

const noticeText = (item: ActivityNotice) => {
    if (item.kind === "MEME_DELETED") {
        const admin = item.actorUsername?.trim();
        const by = admin ? admin : "einem Admin";
        return item.title
            ? `Dein Meme '${item.title}' wurde von ${by} gelöscht.`
            : `Dein Meme wurde von ${by} gelöscht.`;
    }
    if (item.kind === "MEME_LIKED") {
        const user = item.actorUsername?.trim() || "Jemand";
        const title = item.title?.trim();
        return title ? `${user} gefällt dein Meme ${title}` : `${user} gefällt dein Meme`;
    }
    if (item.kind === "FEEDBACK_DELETED") {
        return `Dein Feedback${quoted(item.title)} wurde von einem Admin bearbeitet und gelöscht.`;
    }
    if (item.kind === "FEEDBACK_LIKED") {
        const user = item.actorUsername?.trim() || "Jemand";
        return `${user} gefällt dein Feedback${quoted(item.title)}.`;
    }
    if (item.kind === "ROLE_CHANGED") {
        const admin = item.actorUsername?.trim();
        const by = admin ? ` von ${admin}` : "";
        const role = item.title === "ADMIN" ? "Admin" : item.title === "USER" ? "Nutzer" : "";
        return role
            ? `Deine Rolle wurde${by} zu ${role} geändert.`
            : `Deine Rolle wurde${by} geändert.`;
    }
    return `Dein Feedback-Beitrag '${item.title}' wurde von einem Admin beantwortet.`;
};

const noticeIcon = (kind: ActivityKind): ReactNode => {
    if (kind === "MEME_LIKED") {
        return <Heart size={18} />;
    }
    if (kind === "MEME_DELETED") {
        return <Trash2 size={18} />;
    }
    if (kind === "FEEDBACK_LIKED") {
        return <ThumbsUp size={18} />;
    }
    if (kind === "FEEDBACK_DELETED") {
        return <MessageSquareX size={18} />;
    }
    if (kind === "ROLE_CHANGED") {
        return <Shield size={18} />;
    }
    return <MessageSquare size={18} />;
};

const isVisible = (item: ActivityNotice, seen: SeenMap, now: number) => {
    const seenAt = seen[item.id];
    if (seenAt == null) {
        return true;
    }
    return now - seenAt < SEEN_FOR_MS;
};

const Notifications = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<ActivityNotice[]>([]);
    const [seen, setSeen] = useState<SeenMap>(() => readSeen());
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            Promise.all([getAnsweredFeedback(), getMyActivities()])
                .then(([feedback, activities]) => {
                    if (cancelled) {
                        return;
                    }
                    const stored = activities
                        .filter((item): item is typeof item & {kind: ActivityKind} => isActivityKind(item.kind))
                        .map(item => ({
                            id: item.id,
                            kind: item.kind,
                            title: item.title?.trim() ?? "",
                            actorUsername: item.actorUsername?.trim() || undefined,
                            subjectId: item.subjectId?.trim() || undefined,
                        }));
                    const answers = feedback.map(item => ({
                        id: item.id,
                        kind: "FEEDBACK_ANSWERED" as const,
                        title: item.title,
                    }));
                    setItems([...stored, ...answers]);
                })
                .catch(() => {
                    // Keep the current list when a refresh fails.
                });
        };

        load();
        const timer = window.setInterval(load, 20000);
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                load();
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        websocketService.connect();
        const unsubscribe = websocketService.subscribe(envelope => {
            if (envelope.type === WebSocketMessageType.ACTIVITY) {
                load();
            }
        });

        return () => {
            cancelled = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }
        setSeen(current => markSeen(current, items.map(item => item.id)));
    }, [open, items]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const now = Date.now();
    const visible = items.filter(item => isVisible(item, seen, now));
    const unseenCount = visible.filter(item => seen[item.id] == null).length;

    const openItem = (item: ActivityNotice) => {
        setOpen(false);
        if (item.kind === "MEME_DELETED" || item.kind === "MEME_LIKED") {
            navigate("/memewall");
            return;
        }
        if (item.kind === "ROLE_CHANGED") {
            navigate("/account");
            return;
        }
        if (item.kind === "FEEDBACK_DELETED") {
            navigate("/ideas");
            return;
        }
        const feedbackId = item.subjectId || item.id;
        navigate(`/ideas?feedback=${encodeURIComponent(feedbackId)}`);
    };

    return (
        <div className="notifications" ref={rootRef}>
            <button
                type="button"
                className={`notifications-button${open ? " notifications-button--open" : ""}`}
                aria-label="Benachrichtigungen"
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
            >
                <Bell size={20} />
                {unseenCount > 0 && (
                    <span className="notifications-badge">{unseenCount > 9 ? "9+" : unseenCount}</span>
                )}
            </button>
            {open && (
                <div className="notifications-overlay" role="dialog" aria-label="Aktivitäten">
                    <h2>Aktivitäten</h2>
                    {visible.length > 0 ? (
                        <div className="notifications-list">
                            {visible.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="notifications-item"
                                    onClick={() => openItem(item)}
                                >
                                    <span className={`notifications-item-icon notifications-item-icon--${item.kind.toLowerCase().split("_").join("-")}`}>
                                        {noticeIcon(item.kind)}
                                    </span>
                                    <span className="notifications-item-text">{noticeText(item)}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="notifications-empty">Keine Aktivitäten.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
