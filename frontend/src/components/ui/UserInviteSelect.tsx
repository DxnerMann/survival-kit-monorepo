import {useEffect, useId, useMemo, useRef, useState, type CSSProperties} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";

type UserInviteSelectProps = {
    usernames: string[];
    selected: string[];
    onChange: (usernames: string[]) => void;
    emptyHint?: string;
};

const UserInviteSelect = ({usernames, selected, onChange, emptyHint}: UserInviteSelectProps) => {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const emptyRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

    const available = useMemo(() => {
        const chosen = new Set(selected.map(name => name.toLowerCase()));
        const needle = query.trim().toLowerCase();
        return usernames.filter(name => {
            if (chosen.has(name.toLowerCase())) {
                return false;
            }
            return needle === "" || name.toLowerCase().includes(needle);
        });
    }, [query, selected, usernames]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const placeMenu = () => {
            const rect = rootRef.current?.getBoundingClientRect();
            if (!rect) {
                return;
            }
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpward = spaceBelow < 220 && rect.top > spaceBelow;
            setMenuStyle({
                position: "fixed",
                top: openUpward ? "auto" : rect.bottom + 6,
                bottom: openUpward ? window.innerHeight - rect.top + 6 : "auto",
                left: rect.left,
                width: rect.width,
                zIndex: 100000,
            });
        };
        placeMenu();
        window.addEventListener("resize", placeMenu);
        window.addEventListener("scroll", placeMenu, true);
        return () => {
            window.removeEventListener("resize", placeMenu);
            window.removeEventListener("scroll", placeMenu, true);
        };
    }, [open, available.length]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target) || emptyRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const add = (username: string) => {
        onChange([...selected, username]);
        setQuery("");
        setOpen(true);
    };

    const remove = (username: string) => {
        onChange(selected.filter(name => name !== username));
    };

    return (
        <div className="lecture-plan-invite" ref={rootRef}>
            {selected.length > 0 && (
                <ul className="lecture-plan-invite__chips">
                    {selected.map(username => (
                        <li key={username}>
                            <span>{username}</span>
                            <button type="button" aria-label={`${username} entfernen`} onClick={() => remove(username)}>
                                <X size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <input
                type="search"
                value={query}
                placeholder="Benutzername suchen"
                aria-label="Benutzername suchen"
                aria-expanded={open}
                aria-controls={listId}
                autoComplete="off"
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        if (available.length > 0) {
                            add(available[0]);
                        }
                    }
                    if (event.key === "Escape") {
                        setOpen(false);
                    }
                }}
            />
            {emptyHint && usernames.length === 0 && <p className="lecture-plan-invite__hint">{emptyHint}</p>}
            {open && available.length > 0 && createPortal(
                <ul className="lecture-plan-invite__menu" id={listId} role="listbox" ref={menuRef} style={menuStyle}>
                    {available.map(username => (
                        <li key={username}>
                            <button type="button" role="option" onClick={() => add(username)}>
                                {username}
                            </button>
                        </li>
                    ))}
                </ul>,
                document.body
            )}
            {open && usernames.length > 0 && available.length === 0 && createPortal(
                <div className="lecture-plan-invite__menu lecture-plan-invite__menu--empty" ref={emptyRef} style={menuStyle}>
                    Kein passender Benutzername.
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserInviteSelect;
