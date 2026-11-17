export type UserRank = {
    userId: string;
    username: string;
    xp: number;
    rankId: string;
    rankLabel: string;
    tier: string;
    division: string;
    color: string;
    colorSoft: string;
    xpIntoRank: number;
    xpSpan: number;
    xpRemaining: number;
    nextLabel: string | null;
};
