import {useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {api} from "@/services/api.tsx";
import {useUserRank} from "@/services/userRankCache.ts";
import RankBadge from "@/components/rank/RankBadge.tsx";
import RankProgress from "@/components/rank/RankProgress.tsx";
import "@/components/rank/UserRankHover.css";

type UserRankHoverProps = {
    userId?: string | null;
    username: string;
    children: ReactNode;
};

const MARGIN = 8;

const placeTooltip = (anchor: DOMRect, width: number, height: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = anchor.left + anchor.width / 2 - width / 2;
    left = Math.min(viewportWidth - width - MARGIN, Math.max(MARGIN, left));

    const above = anchor.top - height - MARGIN;
    const below = anchor.bottom + MARGIN;
    let top = above >= MARGIN ? above : below;
    if (top + height > viewportHeight - MARGIN) {
        top = Math.max(MARGIN, viewportHeight - height - MARGIN);
    }
    return {top, left};
};

const UserRankHover = ({userId, username, children}: UserRankHoverProps) => {
    const rank = useUserRank(userId);
    const hostRef = useRef<HTMLSpanElement>(null);
    const tipRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [box, setBox] = useState<{top: number; left: number} | null>(null);
    const label = username.trim() || rank?.username || "Unbekannt";

    useLayoutEffect(() => {
        if (!open) {
            return;
        }
        const update = () => {
            const host = hostRef.current;
            const tip = tipRef.current;
            if (!host || !tip) {
                return;
            }
            const next = placeTooltip(host.getBoundingClientRect(), tip.offsetWidth, tip.offsetHeight);
            setBox(current => current && current.top === next.top && current.left === next.left ? current : next);
        };
        update();
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [open, rank]);

    return (
        <span
            ref={hostRef}
            className="user-rank-hover"
            style={rank ? {["--rank-color" as string]: rank.color} : undefined}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
        >
            {children}
            {open && createPortal(
                <span
                    ref={tipRef}
                    className="user-rank-tooltip"
                    style={{
                        top: box?.top ?? -9999,
                        left: box?.left ?? -9999,
                        visibility: box ? "visible" : "hidden",
                    }}
                >
                    <span className="user-rank-tooltip__head">
                        {userId && (
                            <img
                                className="user-rank-tooltip__avatar"
                                style={{borderColor: rank?.color ?? "var(--color-border)"}}
                                src={`${api.baseUrl}/profile/img/${userId}`}
                                alt=""
                            />
                        )}
                        <span className="user-rank-tooltip__meta">
                            <strong>{label}</strong>
                            <span>{rank?.rankLabel ?? "Bronze III"}</span>
                        </span>
                        {rank && (
                            <RankBadge tier={rank.tier} color={rank.color} colorSoft={rank.colorSoft} size={42} />
                        )}
                    </span>
                    {rank && (
                        <>
                            <RankProgress
                                color={rank.color}
                                colorSoft={rank.colorSoft}
                                into={rank.xpIntoRank}
                                span={rank.xpSpan}
                                complete={rank.nextLabel == null}
                            />
                            <span className="user-rank-tooltip__need">
                                {rank.nextLabel
                                    ? `Noch ${rank.xpRemaining} XP bis ${rank.nextLabel}`
                                    : "Höchster Rang"}
                            </span>
                        </>
                    )}
                </span>,
                document.body
            )}
        </span>
    );
};

export default UserRankHover;
