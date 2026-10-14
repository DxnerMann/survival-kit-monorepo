import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Plus, Smile} from "lucide-react";
import type {ChatReaction} from "@/models/ChatMessage.tsx";
import {chatService} from "@/services/chatService.tsx";
import {getErrorText} from "@/services/api.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {emojiMartData} from "@/pages/chat/chatEmoji.ts";

const RECENT_KEY = "chat-recent-emojis";
const DEFAULT_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const MAX_RECENT = 6;
const COLLAPSED_REACTION_TYPES = 3;

type Theme = "light" | "dark";

export function EmojiPicker({theme, onSelect}: {theme: Theme; onSelect: (emoji: string) => void}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useEffect(() => {
        const host = hostRef.current;
        if (!host) {
            return;
        }
        let active = true;
        void import("emoji-mart").then(({Picker}) => {
            if (!active) {
                return;
            }
            const picker = new Picker({
                data: emojiMartData,
                theme,
                set: "native",
                previewPosition: "none",
                skinTonePosition: "search",
                maxFrequentRows: 1,
                perLine: 8,
                onEmojiSelect: (emoji: {native?: string}) => {
                    if (emoji.native) {
                        onSelectRef.current(emoji.native);
                    }
                },
            });
            host.replaceChildren(picker as unknown as Node);
        });
        return () => {
            active = false;
            host.replaceChildren();
        };
    }, [theme]);

    return <div ref={hostRef} className="chat-emoji-panel" />;
}

const readRecent = (): string[] => {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT);
    } catch {
        return [];
    }
};

const shownRecents = (): string[] => {
    const recent = readRecent();
    const padded = recent.length === 0 ? [...DEFAULT_EMOJIS] : [...recent];
    for (const emoji of DEFAULT_EMOJIS) {
        if (padded.length >= MAX_RECENT) {
            break;
        }
        if (!padded.includes(emoji)) {
            padded.push(emoji);
        }
    }
    return padded.slice(0, MAX_RECENT);
};

const rememberEmoji = (emoji: string) => {
    const next = [emoji, ...readRecent().filter(item => item !== emoji)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

const withReaction = (reactions: ChatReaction[] | undefined, emoji: string, userId: string, username: string): ChatReaction[] => {
    const current = reactions ?? [];
    if (current.some(reaction => reaction.emoji === emoji && reaction.userId === userId)) {
        return current;
    }
    return [...current, {emoji, userId, username}];
};

const withoutReaction = (reactions: ChatReaction[] | undefined, emoji: string, userId: string): ChatReaction[] =>
    (reactions ?? []).filter(reaction => !(reaction.emoji === emoji && reaction.userId === userId));

const placeAbove = (anchor: HTMLElement, panel: HTMLElement) => {
    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const margin = 8;
    let top = anchorRect.top - panelRect.height - margin;
    if (top < margin) {
        top = anchorRect.bottom + margin;
    }
    if (top + panelRect.height > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - panelRect.height - margin);
    }
    let left = anchorRect.left + anchorRect.width / 2 - panelRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelRect.width - margin));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
};

type ReactionGroup = {
    emoji: string;
    users: {userId: string; username: string}[];
    mine: boolean;
};

const groupReactions = (reactions: ChatReaction[] | undefined, userId: string): ReactionGroup[] => {
    const groups: ReactionGroup[] = [];
    for (const reaction of reactions ?? []) {
        let group = groups.find(item => item.emoji === reaction.emoji);
        if (!group) {
            group = {emoji: reaction.emoji, users: [], mine: false};
            groups.push(group);
        }
        if (!group.users.some(user => user.userId === reaction.userId)) {
            group.users.push({userId: reaction.userId, username: reaction.username});
        }
        if (reaction.userId === userId) {
            group.mine = true;
        }
    }
    return groups;
};

const changeReaction = async (
    messageId: string,
    emoji: string,
    action: "add" | "remove",
    reactions: ChatReaction[] | undefined,
    userId: string,
    username: string,
    onChange: (reactions: ChatReaction[]) => void,
) => {
    const previous = reactions ?? [];
    onChange(action === "add" ? withReaction(previous, emoji, userId, username) : withoutReaction(previous, emoji, userId));
    try {
        const update = action === "add"
            ? await chatService.addReaction(messageId, emoji)
            : await chatService.removeReaction(messageId, emoji);
        if (action === "add") {
            rememberEmoji(emoji);
        }
        onChange(update.reactions);
    } catch (err: unknown) {
        onChange(previous);
        snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
    }
};

export function ChatReactButton({
    theme,
    messageId,
    reactions,
    userId,
    username,
    onChange,
}: {
    theme: Theme;
    messageId: string;
    reactions?: ChatReaction[];
    userId: string;
    username: string;
    onChange: (reactions: ChatReaction[]) => void;
}) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [recents, setRecents] = useState(shownRecents);

    useLayoutEffect(() => {
        const anchor = buttonRef.current;
        const panel = panelRef.current;
        if (!open || !anchor || !panel) {
            return;
        }
        const place = () => placeAbove(anchor, panel);
        place();
        const observer = new ResizeObserver(place);
        observer.observe(panel);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [open, pickerOpen, recents]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
            setPickerOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                setPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const pick = (emoji: string) => {
        setOpen(false);
        setPickerOpen(false);
        setRecents(shownRecents());
        void changeReaction(messageId, emoji, "add", reactions, userId, username, next => {
            onChange(next);
            setRecents(shownRecents());
        });
    };

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`chat-react-trigger${open ? " chat-react-trigger--open" : ""}`}
                aria-label="Mit Emoji reagieren"
                title="Reagieren"
                onClick={() => {
                    setRecents(shownRecents());
                    setPickerOpen(false);
                    setOpen(current => !current);
                }}
            >
                <Smile size={16} />
            </button>
            {open && createPortal(
                <div ref={panelRef} className="chat-react-panel">
                    {pickerOpen && (
                        <div className="chat-react-picker">
                            <EmojiPicker theme={theme} onSelect={pick} />
                        </div>
                    )}
                    <div className="chat-react-recents">
                        {recents.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                className="chat-react-recents__emoji"
                                onClick={() => pick(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="chat-react-recents__more"
                            aria-label="Weiteres Emoji"
                            title="Weiteres Emoji"
                            onClick={() => setPickerOpen(current => !current)}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}

export function ChatReactionBar({
    messageId,
    reactions,
    userId,
    username,
    align,
    onChange,
}: {
    messageId: string;
    reactions?: ChatReaction[];
    userId: string;
    username: string;
    align: "start" | "end";
    onChange: (reactions: ChatReaction[]) => void;
}) {
    const groups = groupReactions(reactions, userId);
    const [expanded, setExpanded] = useState(false);
    const [whoEmoji, setWhoEmoji] = useState<string | null>(null);
    const whoAnchor = useRef<HTMLButtonElement | null>(null);
    const whoRef = useRef<HTMLDivElement>(null);
    const visible = expanded ? groups : groups.slice(0, COLLAPSED_REACTION_TYPES);
    const hiddenCount = groups.length - COLLAPSED_REACTION_TYPES;
    const whoGroup = groups.find(group => group.emoji === whoEmoji) ?? null;

    useLayoutEffect(() => {
        const anchor = whoAnchor.current;
        const panel = whoRef.current;
        if (!whoGroup || !anchor || !panel) {
            return;
        }
        const place = () => placeAbove(anchor, panel);
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [whoGroup]);

    useEffect(() => {
        if (!whoEmoji) {
            return;
        }
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (whoRef.current?.contains(target) || whoAnchor.current?.contains(target)) {
                return;
            }
            setWhoEmoji(null);
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [whoEmoji]);

    if (groups.length === 0) {
        return null;
    }

    const remove = (emoji: string) => {
        setWhoEmoji(null);
        void changeReaction(messageId, emoji, "remove", reactions, userId, username, onChange);
    };

    return (
        <>
            <div className={`chat-reactions${align === "end" ? " chat-reactions--end" : ""}`}>
                <div className="chat-reactions__group">
                    {visible.map(group => (
                        <button
                            key={group.emoji}
                            type="button"
                            ref={group.emoji === whoEmoji ? whoAnchor : undefined}
                            className={`chat-reactions__chip${group.mine ? " chat-reactions__chip--mine" : ""}`}
                            aria-label={`${group.emoji}, ${group.users.length} ${group.users.length === 1 ? "Reaktion" : "Reaktionen"}`}
                            onMouseEnter={() => setWhoEmoji(group.emoji)}
                            onClick={() => {
                                if (group.mine) {
                                    remove(group.emoji);
                                    return;
                                }
                                setWhoEmoji(group.emoji);
                            }}
                        >
                            <span>{group.emoji}</span>
                            {group.users.length > 1 && <span className="chat-reactions__count">{group.users.length}</span>}
                        </button>
                    ))}
                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            className="chat-reactions__more"
                            aria-label={expanded ? "Weniger Reaktionen" : "Weitere Reaktionen"}
                            onClick={() => {
                                setWhoEmoji(null);
                                setExpanded(current => !current);
                            }}
                        >
                            +
                        </button>
                    )}
                </div>
            </div>
            {whoGroup && createPortal(
                <div ref={whoRef} className="chat-react-who" role="dialog" aria-label="Wer reagiert hat">
                    <ul>
                        {whoGroup.users.map(user => (
                            <li key={user.userId}>
                                {user.userId === userId ? (
                                    <button type="button" onClick={() => remove(whoGroup.emoji)}>
                                        <span>{whoGroup.emoji}</span>
                                        Du
                                    </button>
                                ) : (
                                    <span>
                                        <span>{whoGroup.emoji}</span>
                                        {user.username}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>,
                document.body,
            )}
        </>
    );
}
