import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Bold, Download, FileText, Italic, Paperclip, Send, Strikethrough, Underline, X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import type {ChatAttachment, ChatMessage} from "@/models/ChatMessage.tsx";
import {chatLimits, chatService} from "@/services/chatService.tsx";
import {fetchProfileSettings} from "@/services/userService.tsx";
import {api, getErrorText} from "@/services/api.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {websocketChannels} from "@/services/websocketChannels.ts";
import {websocketService} from "@/services/websocketService.tsx";
import {WebSocketMessageType} from "@/models/WebSocketEnvelope.tsx";
import ChatFormattedText, {formatMarkers, wrapSelection} from "@/pages/chat/ChatFormattedText.tsx";
import "@/pages/chat/ChatPage.css";

const API_URL = api.baseUrl;
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime,.pdf,.zip,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

type PendingAttachment = {
    localId: string;
    file: File;
    previewUrl: string;
    uploaded?: ChatAttachment;
    uploading: boolean;
};

type Lightbox = {
    url: string;
    filename: string;
    kind: "IMAGE" | "GIF" | "VIDEO";
};

const mergeMessages = (history: ChatMessage[], current: ChatMessage[]): ChatMessage[] => {
    const ids = new Set(history.map(message => message.id));
    const clientIds = new Set(history.flatMap(message => message.clientId ? [message.clientId] : []));
    const pending = current.filter(message =>
        message.id.startsWith("pending-")
        && !ids.has(message.id)
        && !(message.clientId && clientIds.has(message.clientId))
    );
    return [...history, ...pending];
};

const formatChatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
    });

const downloadBlob = async (url: string, filename: string) => {
    const blob = await fetch(url).then(response => response.blob());
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
};

const ChatMedia = ({
    attachment,
    onOpen,
}: {
    attachment: ChatAttachment;
    onOpen: (lightbox: Lightbox) => void;
}) => {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        chatService.fetchAttachmentBlob(attachment.id)
            .then(blob => {
                if (cancelled) {
                    return;
                }
                objectUrl = URL.createObjectURL(blob);
                setUrl(objectUrl);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [attachment.id]);

    if (attachment.kind === "IMAGE" || attachment.kind === "GIF") {
        return url
            ? (
                <button
                    type="button"
                    className="chat-media-open"
                    onClick={() => onOpen({url, filename: attachment.filename, kind: attachment.kind as "IMAGE" | "GIF"})}
                >
                    <img className="chat-media-image" src={url} alt={attachment.filename} />
                </button>
            )
            : <div className="chat-media-placeholder">Bild wird geladen…</div>;
    }

    if (attachment.kind === "VIDEO") {
        return url
            ? (
                <button
                    type="button"
                    className="chat-media-open"
                    onClick={() => onOpen({url, filename: attachment.filename, kind: "VIDEO"})}
                >
                    <video className="chat-media-video" src={url} muted playsInline preload="metadata" />
                </button>
            )
            : <div className="chat-media-placeholder">Video wird geladen…</div>;
    }

    const download = async () => {
        try {
            const blob = url ? await fetch(url).then(response => response.blob()) : await chatService.fetchAttachmentBlob(attachment.id);
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = attachment.filename;
            link.click();
            URL.revokeObjectURL(href);
        } catch (err: unknown) {
            snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
        }
    };

    return (
        <button type="button" className="chat-file-chip" onClick={() => void download()}>
            <FileText size={18} />
            <span className="chat-file-chip__name">{attachment.filename}</span>
            <Download size={16} />
        </button>
    );
};

const ChatPage = () => {
    const navigate = useNavigate();
    const [course, setCourse] = useState<string | null>(null);
    const [userId, setUserId] = useState("");
    const [username, setUsername] = useState("");
    const [profileColor, setProfileColor] = useState("#ffffff");
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState<PendingAttachment[]>([]);
    const [sending, setSending] = useState(false);
    const [lightbox, setLightbox] = useState<Lightbox | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pendingClientIdRef = useRef<string | null>(null);

    const channel = useMemo(() => course ? websocketChannels.courseChat(course) : null, [course]);

    const resizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) {
            return;
        }
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };

    const applyFormat = (marker: string) => {
        const el = textareaRef.current;
        const start = el?.selectionStart ?? draft.length;
        const end = el?.selectionEnd ?? draft.length;
        const next = wrapSelection(draft, start, end, marker);
        setDraft(next.value);
        requestAnimationFrame(() => {
            const field = textareaRef.current;
            if (!field) {
                return;
            }
            field.focus();
            field.setSelectionRange(next.start, next.end);
            field.style.height = "auto";
            field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
        });
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const profile = await fetchProfileSettings();
                if (cancelled) {
                    return;
                }
                setUserId(profile.userId);
                setUsername(profile.username);
                setProfileColor(profile.color || "#ffffff");
                const nextCourse = profile.course?.trim() || "";
                setCourse(nextCourse || null);
                if (!nextCourse) {
                    setLoading(false);
                    return;
                }
                const history = await chatService.getMessages();
                if (!cancelled) {
                    setMessages(prev => mergeMessages(history, prev));
                }
            } catch (err: unknown) {
                snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!channel) {
            return;
        }

        websocketService.connect();
        websocketService.joinChannel(channel);

        const unsubscribe = websocketService.subscribe(envelope => {
            if (envelope.type === WebSocketMessageType.ERROR && (envelope.channel == null || envelope.channel === channel)) {
                const payload = envelope.payload as {code?: string; message?: string};
                snackbarService.showSnackbar({
                    type: "error",
                    text: payload?.code ? getErrorText({errorCode: payload.code}) : (payload?.message ?? "Chat-Fehler"),
                    showIcon: true,
                });
                return;
            }
            if (envelope.channel !== channel) {
                return;
            }
            if (envelope.type === WebSocketMessageType.CHAT_CLEARED) {
                setMessages([]);
                return;
            }
            if (envelope.type === WebSocketMessageType.MESSAGE) {
                const incoming = envelope.payload as ChatMessage;
                if (!incoming?.id) {
                    return;
                }
                setMessages(prev => {
                    const idx = prev.findIndex(item =>
                        item.id === incoming.id
                        || (incoming.clientId != null && (item.clientId === incoming.clientId || item.id === `pending-${incoming.clientId}`))
                    );
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = incoming;
                        return next;
                    }
                    return [...prev, incoming];
                });
                if (incoming.clientId && pendingClientIdRef.current === incoming.clientId) {
                    pendingClientIdRef.current = null;
                }
            }
        });

        return () => {
            unsubscribe();
            websocketService.leaveChannel(channel);
        };
    }, [channel]);

    useEffect(() => {
        const el = listRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, pending, loading]);

    useEffect(() => {
        if (!lightbox) {
            return;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setLightbox(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox]);

    const addFiles = useCallback(async (files: FileList | File[]) => {
        const incoming = Array.from(files);
        const remaining = chatLimits.MAX_ATTACHMENTS - pending.length;
        if (remaining <= 0) {
            snackbarService.showSnackbar({
                type: "warning",
                text: `Maximal ${chatLimits.MAX_ATTACHMENTS} Anhänge pro Nachricht.`,
                showIcon: true,
            });
            return;
        }

        for (const file of incoming.slice(0, remaining)) {
            const localId = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
            const previewUrl = URL.createObjectURL(file);
            const item: PendingAttachment = {localId, file, previewUrl, uploading: true};
            setPending(prev => [...prev, item]);

            try {
                let durationMs: number | undefined;
                if (file.type.startsWith("video/")) {
                    durationMs = await chatService.getVideoDurationMs(file);
                    if (durationMs > chatLimits.MAX_VIDEO_SECONDS * 1000) {
                        throw new Error(`Videos dürfen höchstens ${chatLimits.MAX_VIDEO_SECONDS} Sekunden lang sein.`);
                    }
                }
                const uploaded = await chatService.uploadAttachment(file, durationMs);
                setPending(prev => prev.map(entry =>
                    entry.localId === localId ? {...entry, uploaded, uploading: false} : entry
                ));
            } catch (err: unknown) {
                URL.revokeObjectURL(previewUrl);
                setPending(prev => prev.filter(entry => entry.localId !== localId));
                snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
            }
        }
    }, [pending.length]);

    const removePending = (localId: string) => {
        setPending(prev => {
            const target = prev.find(item => item.localId === localId);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter(item => item.localId !== localId);
        });
    };

    const send = async () => {
        if (!channel || !course || sending) {
            return;
        }
        if (pending.some(item => item.uploading)) {
            return;
        }
        const text = draft.trim();
        const attachments = pending.flatMap(item => item.uploaded ? [item.uploaded] : []);
        const attachmentIds = attachments.map(item => item.id);
        if (!text && attachmentIds.length === 0) {
            return;
        }

        const clientId = crypto.randomUUID();
        const optimistic: ChatMessage = {
            id: `pending-${clientId}`,
            course,
            authorUserId: userId,
            authorUsername: username,
            text: text || null,
            createdAt: new Date().toISOString(),
            attachments,
            clientId,
            authorColor: profileColor,
        };

        setSending(true);
        pendingClientIdRef.current = clientId;
        setMessages(prev => [...prev, optimistic]);
        setDraft("");
        pending.forEach(item => URL.revokeObjectURL(item.previewUrl));
        setPending([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            const saved = await chatService.postMessage({
                text: text || null,
                attachmentIds,
                clientId,
            });
            pendingClientIdRef.current = null;
            setMessages(prev => {
                const idx = prev.findIndex(item =>
                    item.clientId === clientId || item.id === `pending-${clientId}` || item.id === saved.id
                );
                if (idx < 0) {
                    return [...prev, saved];
                }
                const next = [...prev];
                next[idx] = saved;
                return next;
            });
        } catch (err: unknown) {
            setMessages(prev => prev.filter(item => item.clientId !== clientId && item.id !== `pending-${clientId}`));
            pendingClientIdRef.current = null;
            if (!(err instanceof Error) || err.name === "TypeError") {
                snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
            }
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="chat-page"><div className="chat-status">Chat wird geladen…</div></div>;
    }

    if (!course) {
        return (
            <div className="chat-page">
                <div className="chat-empty">
                    <p>Der Kurs-Chat ist nur sichtbar, wenn du in deinem Profil einen Kurs gesetzt hast.</p>
                    <button type="button" className="chat-empty__action" onClick={() => navigate("/account")}>
                        Zum Profil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <div className="chat-list" ref={listRef}>
                {messages.length === 0 && (
                    <div className="chat-list-empty">Noch keine Nachrichten heute. Schreib die erste.</div>
                )}
                {messages.map(message => {
                    const mine = message.authorUserId === userId;
                    const pendingRow = message.id.startsWith("pending-");
                    return (
                        <div
                            key={message.id}
                            className={`chat-row${mine ? " chat-row--mine" : ""}${pendingRow ? " chat-row--pending" : ""}`}
                        >
                            {!mine && (
                                <img
                                    className="chat-avatar"
                                    style={{borderColor: message.authorColor || "#ffffff"}}
                                    src={`${API_URL}/profile/img/${message.authorUserId}`}
                                    alt=""
                                />
                            )}
                            <div className={`chat-bubble${mine ? " chat-bubble--mine" : ""}`}>
                                <div className="chat-bubble__meta">
                                    <span className="chat-bubble__author">{mine ? "Du" : message.authorUsername}</span>
                                    <span className="chat-bubble__time">{formatChatTime(message.createdAt)}</span>
                                </div>
                                {message.text && <ChatFormattedText text={message.text} />}
                                {message.attachments?.length > 0 && (
                                    <div className="chat-bubble__attachments">
                                        {message.attachments.map(attachment => (
                                            <ChatMedia key={attachment.id} attachment={attachment} onOpen={setLightbox} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {mine && (
                                <img
                                    className="chat-avatar"
                                    style={{borderColor: message.authorColor || profileColor}}
                                    src={`${API_URL}/profile/img/${message.authorUserId}`}
                                    alt=""
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <form
                className="chat-composer"
                onSubmit={event => {
                    event.preventDefault();
                    void send();
                }}
            >
                {pending.length > 0 && (
                    <div className="chat-pending">
                        {pending.map(item => (
                            <div key={item.localId} className="chat-pending__item">
                                {item.file.type.startsWith("image/")
                                    ? <img src={item.previewUrl} alt="" />
                                    : item.file.type.startsWith("video/")
                                        ? <video src={item.previewUrl} muted />
                                        : <span>{item.file.name}</span>
                                }
                                {item.uploading && <em>Upload…</em>}
                                <button type="button" onClick={() => removePending(item.localId)} aria-label="Anhang entfernen">×</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="chat-format-bar">
                    <button type="button" className="chat-format-btn" title="Fett" onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(formatMarkers.bold)}>
                        <Bold size={15} />
                    </button>
                    <button type="button" className="chat-format-btn" title="Kursiv" onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(formatMarkers.italic)}>
                        <Italic size={15} />
                    </button>
                    <button type="button" className="chat-format-btn" title="Unterstrichen" onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(formatMarkers.underline)}>
                        <Underline size={15} />
                    </button>
                    <button type="button" className="chat-format-btn" title="Durchgestrichen" onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(formatMarkers.strike)}>
                        <Strikethrough size={15} />
                    </button>
                </div>
                <div className="chat-composer__row">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPT}
                        hidden
                        onChange={event => {
                            if (event.target.files) {
                                void addFiles(event.target.files);
                            }
                            event.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        className="chat-icon-button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Datei anhängen"
                    >
                        <Paperclip size={20} />
                    </button>
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        rows={1}
                        placeholder="Nachricht an deinen Kurs…"
                        value={draft}
                        onChange={event => {
                            setDraft(event.target.value);
                            resizeTextarea();
                        }}
                        onKeyDown={event => {
                            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
                                event.preventDefault();
                                applyFormat(formatMarkers.bold);
                                return;
                            }
                            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
                                event.preventDefault();
                                applyFormat(formatMarkers.italic);
                                return;
                            }
                            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
                                event.preventDefault();
                                applyFormat(formatMarkers.underline);
                                return;
                            }
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void send();
                            }
                        }}
                    />
                    <button
                        type="submit"
                        className="chat-send"
                        disabled={sending || pending.some(item => item.uploading) || (!draft.trim() && pending.length === 0)}
                        aria-label="Senden"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>

            {lightbox && (
                <div className="chat-lightbox" onClick={() => setLightbox(null)}>
                    <div className="chat-lightbox__toolbar" onClick={event => event.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => void downloadBlob(lightbox.url, lightbox.filename).catch(err => {
                                snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
                            })}
                        >
                            <Download size={18} />
                            Download
                        </button>
                        <button type="button" onClick={() => setLightbox(null)} aria-label="Schließen">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="chat-lightbox__body">
                        {lightbox.kind === "VIDEO"
                            ? (
                                <video
                                    className="chat-lightbox__media"
                                    src={lightbox.url}
                                    controls
                                    autoPlay
                                    playsInline
                                    onClick={event => event.stopPropagation()}
                                />
                            )
                            : (
                                <img
                                    className="chat-lightbox__media"
                                    src={lightbox.url}
                                    alt={lightbox.filename}
                                    onClick={event => event.stopPropagation()}
                                />
                            )
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;
