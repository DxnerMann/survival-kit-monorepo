import {useState, type ReactNode} from "react";
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

const UserRankHover = ({userId, username, children}: UserRankHoverProps) => {
    const rank = useUserRank(userId);
    const [anchor, setAnchor] = useState<DOMRect | null>(null);
    const label = username.trim() || rank?.username || "Unbekannt";

    return (
        <span
            className="user-rank-hover"
            style={rank ? {["--rank-color" as string]: rank.color} : undefined}
            onMouseEnter={event => setAnchor(event.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => setAnchor(null)}
            onFocus={event => setAnchor(event.currentTarget.getBoundingClientRect())}
            onBlur={() => setAnchor(null)}
        >
            {children}
            {anchor && createPortal(
                <span
                    className="user-rank-tooltip"
                    style={{
                        top: Math.max(8, anchor.top - 8),
                        left: Math.min(window.innerWidth - 248, Math.max(8, anchor.left + anchor.width / 2 - 116)),
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
