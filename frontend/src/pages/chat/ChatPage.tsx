import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {flushSync} from "react-dom";
import {Bold, Download, FileText, Italic, Paperclip, Reply, Send, Smile, Strikethrough, Underline, X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import type {ChatAttachment, ChatMessage, ChatReaction, ChatReply} from "@/models/ChatMessage.tsx";
import {CHAT_PAGE_SIZE, chatCache, chatLimits, chatService} from "@/services/chatService.tsx";
import {fetchProfileSettings} from "@/services/userService.tsx";
import {api, getErrorText} from "@/services/api.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {websocketChannels} from "@/services/websocketChannels.ts";
import {chatUnread} from "@/services/chatUnread.ts";
import {websocketService} from "@/services/websocketService.tsx";
import {WebSocketMessageType} from "@/models/WebSocketEnvelope.tsx";
import ChatFormattedText, {ChatMentionText, formatMarkers, wrapSelection} from "@/pages/chat/ChatFormattedText.tsx";
import {filterMentionUsernames, mentionQueryAt, type MentionQuery} from "@/pages/chat/chatMentions.ts";
import {applyEmojiShortcuts, expandEmojiNotation} from "@/pages/chat/chatEmoji.ts";
import {ChatReactButton, ChatReactionBar, EmojiPicker} from "@/pages/chat/ChatReactions.tsx";
import {useTheme} from "@/context/ThemeContext.tsx";
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

const graphemeSegmenter = new Intl.Segmenter(undefined, {granularity: "grapheme"});

const isLoneEmoji = (text: string | null | undefined): boolean => {
    if (!text) {
        return false;
    }
    const trimmed = text.trim();
    if (!trimmed) {
        return false;
    }
    const parts = [...graphemeSegmenter.segment(trimmed)];
    if (parts.length !== 1) {
        return false;
    }
    const grapheme = parts[0].segment;
    if (/^[\p{L}\p{N}\p{P}\p{Z}]+$/u.test(grapheme)) {
        return false;
    }
    return /\p{Extended_Pictographic}|\p{Emoji}/u.test(grapheme);
};

const attachmentKey = (message: ChatMessage) =>
    (message.attachments ?? []).map(item => item.id).join("\0");

const isSameOutgoing = (pending: ChatMessage, message: ChatMessage) => {
    if (!pending.id.startsWith("pending-")) {
        return false;
    }
    if (message.clientId != null) {
        return pending.clientId === message.clientId || pending.id === `pending-${message.clientId}`;
    }
    return pending.authorUserId === message.authorUserId
        && (pending.text ?? "") === (message.text ?? "")
        && attachmentKey(pending) === attachmentKey(message);
};

const quoteLine = (text: string | null | undefined): string =>
    expandEmojiNotation(text ?? "").replace(/\s+/g, " ").trim();

const replyPreviewText = (message: ChatMessage): string => {
    const raw = quoteLine(message.text);
    if (raw) {
        return raw;
    }
    const kind = message.attachments?.[0]?.kind;
    if (kind === "IMAGE" || kind === "GIF") {
        return "Foto";
    }
    if (kind === "VIDEO") {
        return "Video";
    }
    if (message.attachments?.length) {
        return "Datei";
    }
    return "Nachricht";
};

const storedMessages = (messages: ChatMessage[]) =>
    messages.filter(message => !message.id.startsWith("pending-"));

const sortedMessages = (messages: ChatMessage[]) =>
    [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

const confirmMessage = (current: ChatMessage[], message: ChatMessage): ChatMessage[] => {
    let removedPending = false;
    const kept = current.filter(item => {
        if (item.id === message.id) {
            return false;
        }
        if (!removedPending && isSameOutgoing(item, message)) {
            removedPending = true;
            return false;
        }
        return true;
    });
    const alreadyShown = !removedPending && current.some(item => item.id === message.id) && kept.length + 1 === current.length;
    return alreadyShown ? current : sortedMessages([...kept, message]);
};

const absorbHistory = (history: ChatMessage[], current: ChatMessage[]): ChatMessage[] => {
    let next = current;
    let changed = false;

    for (const message of history) {
        if (next.some(item => item.id === message.id)) {
            continue;
        }
        const pendingIndex = next.findIndex(item => isSameOutgoing(item, message));
        next = pendingIndex >= 0
            ? [...next.filter((_, index) => index !== pendingIndex), message]
            : [...next, message];
        changed = true;
    }

    return changed ? sortedMessages(next) : current;
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
    const {theme} = useTheme();
    const [course, setCourse] = useState<string | null>(null);
    const [userId, setUserId] = useState("");
    const [username, setUsername] = useState("");
    const [profileColor, setProfileColor] = useState("#ffffff");
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasOlder, setHasOlder] = useState(false);
    const [draft, setDraft] = useState("");
    const [reply, setReply] = useState<ChatReply | null>(null);
    const [pending, setPending] = useState<PendingAttachment[]>([]);
    const [sending, setSending] = useState(false);
    const [lightbox, setLightbox] = useState<Lightbox | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [courseUsernames, setCourseUsernames] = useState<string[]>([]);
    const [mention, setMention] = useState<MentionQuery | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const emojiWrapRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pendingClientIdRef = useRef<string | null>(null);
    const sendingRef = useRef(false);
    const stickToBottomRef = useRef(true);
    const hasOlderRef = useRef(false);
    const loadingOlderRef = useRef(false);
    const loadOlderRef = useRef<() => Promise<boolean>>(async () => false);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    hasOlderRef.current = hasOlder;

    const channel = useMemo(() => course ? websocketChannels.courseChat(course) : null, [course]);
    const mentionHits = useMemo(
        () => (mention ? filterMentionUsernames(courseUsernames, mention.query).slice(0, 8) : []),
        [mention, courseUsernames],
    );

    const resizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) {
            return;
        }
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };

    const insertEmoji = (emoji: string) => {
        const field = textareaRef.current;
        const start = field?.selectionStart ?? draft.length;
        const end = field?.selectionEnd ?? draft.length;
        const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
        setDraft(next);
        setEmojiOpen(false);
        const cursor = start + emoji.length;
        requestAnimationFrame(() => {
            const input = textareaRef.current;
            if (!input) {
                return;
            }
            input.focus();
            input.setSelectionRange(cursor, cursor);
            input.style.height = "auto";
            input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
        });
    };

    const openEmojiPanel = () => {
        const field = textareaRef.current;
        if (!field) {
            return;
        }
        field.focus();
        const opener = (field as HTMLTextAreaElement & {showEmojiPicker?: () => void}).showEmojiPicker;
        if (typeof opener === "function") {
            opener.call(field);
            setEmojiOpen(false);
            return;
        }
        setEmojiOpen(open => !open);
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
                chatUnread.noteCourse(nextCourse || null);
                if (!nextCourse) {
                    setLoading(false);
                    return;
                }
                void chatService.getUsernames()
                    .then(names => {
                        if (!cancelled) {
                            setCourseUsernames(names.filter(name => name.trim().length > 0));
                        }
                    })
                    .catch(() => {});
                const cached = chatCache.read(nextCourse);
                if (cached && cached.messages.length > 0) {
                    setMessages(cached.messages);
                    setHasOlder(cached.hasOlder);
                    setLoading(false);
                    const newest = cached.messages[cached.messages.length - 1];
                    const fresh = await chatService.getMessages({
                        after: newest.createdAt,
                        afterId: newest.id,
                        limit: CHAT_PAGE_SIZE,
                    });
                    if (!cancelled && fresh.length > 0) {
                        setMessages(prev => absorbHistory(fresh, prev));
                    }
                    return;
                }
                const history = await chatService.getMessages({limit: CHAT_PAGE_SIZE});
                if (!cancelled) {
                    setHasOlder(history.length === CHAT_PAGE_SIZE);
                    setMessages(prev => absorbHistory(history, prev));
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
            const incomingCourse = (envelope.payload as {course?: string} | null)?.course?.trim();
            const forThisChat = envelope.channel === channel || (incomingCourse != null && incomingCourse === course);
            if (!forThisChat) {
                return;
            }
            if (envelope.type === WebSocketMessageType.CHAT_CLEARED) {
                chatCache.clear();
                setHasOlder(false);
                setMessages([]);
                return;
            }
            if (envelope.type === WebSocketMessageType.REACTION) {
                const update = envelope.payload as {messageId?: string; reactions?: ChatReaction[]};
                if (!update?.messageId) {
                    return;
                }
                setMessages(prev => prev.map(message => message.id === update.messageId
                    ? {...message, reactions: update.reactions ?? []}
                    : message));
                return;
            }
            if (envelope.type === WebSocketMessageType.MESSAGE) {
                const incoming = envelope.payload as ChatMessage;
                if (!incoming?.id) {
                    return;
                }
                setMessages(prev => confirmMessage(prev, incoming));
                if (incoming.clientId && pendingClientIdRef.current === incoming.clientId) {
                    pendingClientIdRef.current = null;
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [channel, course]);

    useEffect(() => {
        if (!course) {
            return;
        }

        let cancelled = false;
        const pull = async () => {
            try {
                const newest = storedMessages(messagesRef.current).at(-1);
                const history = newest
                    ? await chatService.getMessages({
                        after: newest.createdAt,
                        afterId: newest.id,
                        limit: CHAT_PAGE_SIZE,
                    })
                    : await chatService.getMessages({limit: CHAT_PAGE_SIZE});
                if (cancelled || history.length === 0) {
                    return;
                }
                if (!newest) {
                    setHasOlder(history.length === CHAT_PAGE_SIZE);
                }
                setMessages(prev => absorbHistory(history, prev));
            } catch {
                // A failed refresh must not clear messages that are already on screen.
            }
        };

        const timer = window.setInterval(() => void pull(), 4000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [course]);

    useEffect(() => {
        if (!course || loading) {
            return;
        }
        chatCache.write(course, messages, hasOlder);
    }, [course, messages, hasOlder, loading]);

    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el || loadingOlderRef.current) {
            return;
        }
        if (stickToBottomRef.current) {
            el.scrollTop = el.scrollHeight;
        }
        if (hasOlderRef.current && el.scrollHeight <= el.clientHeight + 1) {
            void loadOlderRef.current();
        }
    }, [messages, pending, loading]);

    useEffect(() => {
        if (!emojiOpen) {
            return;
        }
        const onPointerDown = (event: PointerEvent) => {
            if (!emojiWrapRef.current?.contains(event.target as Node)) {
                setEmojiOpen(false);
            }
        };
        window.addEventListener("pointerdown", onPointerDown);
        return () => window.removeEventListener("pointerdown", onPointerDown);
    }, [emojiOpen]);

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

    const loadOlder = async () => {
        if (!course || loadingOlderRef.current || !hasOlderRef.current) {
            return false;
        }
        const oldest = storedMessages(messagesRef.current)[0];
        if (!oldest) {
            return false;
        }
        loadingOlderRef.current = true;
        try {
            const page = await chatService.getMessages({
                before: oldest.createdAt,
                beforeId: oldest.id,
                limit: CHAT_PAGE_SIZE,
            });
            const el = listRef.current;
            const height = el?.scrollHeight ?? 0;
            const top = el?.scrollTop ?? 0;
            let added = 0;
            flushSync(() => {
                setMessages(prev => {
                    const ids = new Set(prev.map(message => message.id));
                    const older = page.filter(message => !ids.has(message.id));
                    added = older.length;
                    return older.length === 0 ? prev : [...older, ...prev];
                });
                setHasOlder(page.length === CHAT_PAGE_SIZE && added > 0);
            });
            if (el) {
                el.scrollTop = top + (el.scrollHeight - height);
            }
            return page.length > 0;
        } catch (err: unknown) {
            snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
            return false;
        } finally {
            loadingOlderRef.current = false;
        }
    };
    loadOlderRef.current = loadOlder;

    const onListScroll = () => {
        const el = listRef.current;
        if (!el) {
            return;
        }
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distanceFromBottom < 80;
        if (el.scrollTop < 160) {
            void loadOlder();
        }
    };

    const scrollToQuoted = async (messageId: string) => {
        stickToBottomRef.current = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            const target = document.getElementById(`chat-msg-${messageId}`);
            if (target) {
                target.scrollIntoView({behavior: "smooth", block: "center"});
                target.classList.add("chat-row--target");
                window.setTimeout(() => target.classList.remove("chat-row--target"), 1600);
                return;
            }
            if (!hasOlderRef.current) {
                return;
            }
            const loaded = await loadOlder();
            if (!loaded) {
                return;
            }
        }
    };

    const beginReply = (message: ChatMessage) => {
        if (message.id.startsWith("pending-")) {
            return;
        }
        setReply({
            messageId: message.id,
            authorUserId: message.authorUserId,
            authorUsername: message.authorUsername,
            authorColor: message.authorColor,
            text: replyPreviewText(message),
        });
        requestAnimationFrame(() => textareaRef.current?.focus());
    };

    const send = async () => {
        if (!channel || !course || sendingRef.current) {
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
        const replySnapshot = reply;
        const optimistic: ChatMessage = {
            id: `pending-${clientId}`,
            course,
            authorUserId: userId,
            authorUsername: username,
            text: text || null,
            createdAt: new Date().toISOString(),
            attachments,
            reply: replySnapshot,
            clientId,
            authorColor: profileColor,
        };

        sendingRef.current = true;
        stickToBottomRef.current = true;
        setSending(true);
        pendingClientIdRef.current = clientId;
        setMessages(prev => [...prev, optimistic]);
        setDraft("");
        setReply(null);
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
                replyToId: replySnapshot?.messageId ?? null,
            });
            pendingClientIdRef.current = null;
            setMessages(prev => confirmMessage(prev, saved));
        } catch (err: unknown) {
            setMessages(prev => prev.filter(item => item.clientId !== clientId && item.id !== `pending-${clientId}`));
            setReply(current => current ?? replySnapshot);
            pendingClientIdRef.current = null;
            if (!(err instanceof Error) || err.name === "TypeError") {
                snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
            }
        } finally {
            sendingRef.current = false;
            setSending(false);
        }
    };

    const setMessageReactions = useCallback((messageId: string, reactions: ChatReaction[]) => {
        setMessages(prev => prev.map(message => message.id === messageId ? {...message, reactions} : message));
    }, []);

    const syncMention = (value: string, cursor: number) => {
        setMention(mentionQueryAt(value, cursor));
    };

    const completeMention = (name: string) => {
        const field = textareaRef.current;
        const value = field?.value ?? draft;
        const cursor = field?.selectionStart ?? value.length;
        const active = mentionQueryAt(value, cursor);
        if (!active) {
            return;
        }
        const insert = `@${name} `;
        const nextValue = value.slice(0, active.start) + insert + value.slice(cursor);
        const nextCursor = active.start + insert.length;
        setDraft(nextValue);
        setMention(null);
        requestAnimationFrame(() => {
            const input = textareaRef.current;
            if (!input) {
                return;
            }
            input.focus();
            input.setSelectionRange(nextCursor, nextCursor);
            resizeTextarea();
        });
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
            <div className="chat-list" ref={listRef} onScroll={onListScroll}>
                {messages.length === 0 && (
                    <div className="chat-list-empty">Noch keine Nachrichten heute. Schreib die erste.</div>
                )}
                {messages.map((message, index) => {
                    const mine = message.authorUserId === userId;
                    const pendingRow = message.id.startsWith("pending-");
                    const loneEmoji = isLoneEmoji(message.text ? expandEmojiNotation(message.text) : message.text) && !(message.attachments?.length);
                    const previous = index > 0 ? messages[index - 1] : null;
                    const next = index < messages.length - 1 ? messages[index + 1] : null;
                    const continued = previous != null && previous.authorUserId === message.authorUserId;
                    const lastInRun = next == null || next.authorUserId !== message.authorUserId;
                    const authorColor = message.authorColor || "var(--color-text-primary)";
                    const authorLabel = message.authorUsername;
                    const replyButton = !mine && !pendingRow ? (
                        <button
                            type="button"
                            className="chat-reply-button"
                            aria-label="Antworten"
                            onClick={() => beginReply(message)}
                        >
                            <Reply size={15} />
                        </button>
                    ) : null;
                    const quotingSelf = message.reply?.authorUserId === userId;
                    const quoteColor = quotingSelf && mine
                        ? "#fff"
                        : (message.reply?.authorColor || "var(--color-text-primary)");
                    const quote = message.reply ? (
                        <button
                            type="button"
                            className="chat-quote"
                            onClick={() => void scrollToQuoted(message.reply!.messageId)}
                        >
                            <span
                                className="chat-quote__bar"
                                style={{background: message.reply.authorColor || "var(--color-text-primary)"}}
                            />
                            <span className="chat-quote__name" style={{color: quoteColor}}>
                                {quotingSelf ? "Du" : message.reply.authorUsername}
                            </span>
                            <span className="chat-quote__text">
                                <ChatMentionText text={quoteLine(message.reply.text)} usernames={courseUsernames} />
                            </span>
                        </button>
                    ) : null;
                    const avatar = (
                        <span className="chat-avatar-slot">
                            {lastInRun && (
                                <img
                                    className="chat-avatar"
                                    style={{borderColor: message.authorColor || (mine ? profileColor : "#ffffff")}}
                                    src={`${API_URL}/profile/img/${message.authorUserId}`}
                                    alt=""
                                />
                            )}
                        </span>
                    );
                    const reactButton = !pendingRow ? (
                        <ChatReactButton
                            theme={theme}
                            messageId={message.id}
                            reactions={message.reactions}
                            userId={userId}
                            username={username}
                            onChange={reactions => setMessageReactions(message.id, reactions)}
                        />
                    ) : null;
                    return (
                        <div
                            key={message.id}
                            id={`chat-msg-${message.id}`}
                            className={`chat-row${mine ? " chat-row--mine" : ""}${pendingRow ? " chat-row--pending" : ""}${continued ? " chat-row--continued" : ""}`}
                        >
                            {!mine && avatar}
                            <div className={`chat-message${mine ? " chat-message--mine" : ""}`}>
                            <div className="chat-message__line">
                            {mine && reactButton}
                            {loneEmoji ? (
                                <div className={`chat-emoji${mine ? " chat-emoji--mine" : ""}`}>
                                    {!mine && !continued && (
                                        <span className="chat-emoji-name">
                                            <span style={{color: authorColor}}>{authorLabel}</span>
                                            {replyButton}
                                        </span>
                                    )}
                                    {!mine && continued && replyButton}
                                    {quote}
                                    <ChatFormattedText text={message.text ?? ""} usernames={courseUsernames} />
                                    <span className="chat-emoji-time">{formatChatTime(message.createdAt)}</span>
                                </div>
                            ) : (
                                <div className={`chat-bubble${mine ? " chat-bubble--mine" : ""}${lastInRun ? " chat-bubble--tail" : ""}${!mine && continued ? " chat-bubble--reply" : ""}`}>
                                    {!mine && !continued && (
                                        <div className="chat-bubble__header">
                                            <span className="chat-bubble__author" style={{color: authorColor}}>{authorLabel}</span>
                                            {replyButton}
                                        </div>
                                    )}
                                    {!mine && continued && replyButton}
                                    {quote}
                                    {message.attachments?.length > 0 && (
                                        <div className="chat-bubble__attachments">
                                            {message.attachments.map(attachment => (
                                                <ChatMedia key={attachment.id} attachment={attachment} onOpen={setLightbox} />
                                            ))}
                                        </div>
                                    )}
                                    {message.text && (
                                        <div className={`chat-bubble__flow${message.attachments?.length ? " chat-bubble__flow--caption" : ""}`}>
                                            <ChatFormattedText text={message.text} usernames={courseUsernames} />
                                            <span className="chat-bubble__time">{formatChatTime(message.createdAt)}</span>
                                        </div>
                                    )}
                                    {!message.text && message.attachments?.length > 0 && (
                                        <span className="chat-bubble__time chat-bubble__time--below">{formatChatTime(message.createdAt)}</span>
                                    )}
                                </div>
                            )}
                            {!mine && reactButton}
                            </div>
                            {!pendingRow && (
                                <ChatReactionBar
                                    messageId={message.id}
                                    reactions={message.reactions}
                                    userId={userId}
                                    username={username}
                                    align={mine ? "end" : "start"}
                                    onChange={reactions => setMessageReactions(message.id, reactions)}
                                />
                            )}
                            </div>
                            {mine && avatar}
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
                {reply && (
                    <div className="chat-reply-draft">
                        <span
                            className="chat-reply-draft__bar"
                            style={{background: reply.authorColor || "var(--color-text-primary)"}}
                        />
                        <div className="chat-reply-draft__body">
                            <span
                                className="chat-reply-draft__name"
                                style={{color: reply.authorUserId === userId ? "var(--color-text-primary)" : (reply.authorColor || "var(--color-text-primary)")}}
                            >
                                {reply.authorUserId === userId ? "Du" : reply.authorUsername}
                            </span>
                            <span className="chat-reply-draft__text">
                                <ChatMentionText text={quoteLine(reply.text)} usernames={courseUsernames} />
                            </span>
                        </div>
                        <button
                            type="button"
                            className="chat-reply-draft__close"
                            aria-label="Antwort entfernen"
                            onClick={() => setReply(null)}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
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
                    <div className="chat-input-wrap" ref={emojiWrapRef}>
                        {emojiOpen && (
                            <EmojiPicker theme={theme} onSelect={insertEmoji} />
                        )}
                        {mentionHits.length > 0 && (
                            <ul className="chat-mention-list" role="listbox" aria-label="Benutzer">
                                {mentionHits.map((name, index) => (
                                    <li key={name}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={index === 0}
                                            className={`chat-mention-list__item${index === 0 ? " chat-mention-list__item--active" : ""}`}
                                            onMouseDown={event => event.preventDefault()}
                                            onClick={() => completeMention(name)}
                                        >
                                            @{name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <textarea
                            ref={textareaRef}
                            className="chat-input"
                            rows={1}
                            placeholder="Nachricht an deinen Kurs…"
                            value={draft}
                            onChange={event => {
                                const nativeEvent = event.nativeEvent;
                                const cursor = event.target.selectionStart ?? event.target.value.length;
                                if ("isComposing" in nativeEvent && nativeEvent.isComposing) {
                                    setDraft(event.target.value);
                                    syncMention(event.target.value, cursor);
                                    resizeTextarea();
                                    return;
                                }
                                const next = applyEmojiShortcuts(event.target.value, cursor);
                                setDraft(next.value);
                                syncMention(next.value, next.cursor);
                                requestAnimationFrame(() => {
                                    const input = textareaRef.current;
                                    if (!input) {
                                        return;
                                    }
                                    input.setSelectionRange(next.cursor, next.cursor);
                                    resizeTextarea();
                                });
                            }}
                            onBlur={() => setMention(null)}
                            onSelect={event => {
                                syncMention(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length);
                            }}
                            onKeyUp={event => {
                                if (event.key === "Tab") {
                                    return;
                                }
                                syncMention(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length);
                            }}
                            onKeyDown={event => {
                                if (event.key === "Tab" && mentionHits.length > 0) {
                                    event.preventDefault();
                                    completeMention(mentionHits[0]);
                                    return;
                                }
                                if (event.key === "Escape" && mention) {
                                    setMention(null);
                                    return;
                                }
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
                                    if (event.repeat || event.nativeEvent.isComposing) {
                                        return;
                                    }
                                    event.preventDefault();
                                    void send();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="chat-emoji-button"
                            aria-label="Emoji"
                            title="Emoji"
                            onMouseDown={event => event.preventDefault()}
                            onClick={openEmojiPanel}
                        >
                            <Smile size={18} />
                        </button>
                    </div>
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
