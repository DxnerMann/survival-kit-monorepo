import "@/components/widgets/leaderboard/Leaderboard.css";
import {useEffect, useState} from "react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import type {UserRank} from "@/models/UserRank.tsx";
import RankBadge from "@/components/rank/RankBadge.tsx";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";
import {getLeaderboard} from "@/services/rankService.tsx";

type LeaderboardRow = {
    username: string;
    xp: number;
    tier: string;
    color: string;
    colorSoft: string;
};

const previewRows: LeaderboardRow[] = [
    {username: "lena", xp: 4200, tier: "GOLD", color: "#e2b340", colorSoft: "#ffe7a3"},
    {username: "noah", xp: 2100, tier: "SILVER", color: "#b7c0cc", colorSoft: "#f4f7fb"},
    {username: "mia", xp: 640, tier: "BRONZE", color: "#cd7f32", colorSoft: "#f3d2a4"},
];

const toRow = (rank: UserRank): LeaderboardRow => ({
    username: rank.username,
    xp: rank.xp,
    tier: rank.tier,
    color: rank.color,
    colorSoft: rank.colorSoft,
});

const LeaderboardList = ({rows}: {rows: LeaderboardRow[]}) => (
    <ol className="leaderboard-widget__list">
        {rows.map((row, index) => (
            <li key={`${row.username}-${index}`} className="leaderboard-widget__row">
                <span className="leaderboard-widget__place">{index + 1}</span>
                <RankBadge tier={row.tier} color={row.color} colorSoft={row.colorSoft} size={28} />
                <span className="leaderboard-widget__name">{row.username}</span>
                <span className="leaderboard-widget__xp">{row.xp} XP</span>
            </li>
        ))}
    </ol>
);

const Leaderboard = ({title, isPreview}: WidgetProps) => {
    const [rows, setRows] = useState<LeaderboardRow[]>([]);
    const [loading, setLoading] = useState(!isPreview);

    useEffect(() => {
        if (isPreview) {
            return;
        }
        let cancelled = false;
        getLeaderboard()
            .then(entries => {
                if (!cancelled) {
                    setRows(entries.map(toRow));
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
    }, [isPreview]);

    if (isPreview) {
        return (
            <>
                <div className="leaderboard-widget leaderboard-widget--preview">
                    <LeaderboardList rows={previewRows} />
                </div>
                <h3 className="widget-title-preview">{title}</h3>
            </>
        );
    }

    return (
        <div className="leaderboard-widget">
            <h3 className="leaderboard-widget__title">{title}</h3>
            {loading && <WidgetStatus status="loading" />}
            {!loading && rows.length === 0 && <p className="leaderboard-widget__empty">Noch niemand sichtbar.</p>}
            {!loading && rows.length > 0 && <LeaderboardList rows={rows} />}
        </div>
    );
};

export default Leaderboard;
