package com.survivalkit.backend.core.rank;

public record UserRankView(
        String userId,
        String username,
        int xp,
        String rankId,
        String rankLabel,
        String tier,
        String division,
        String color,
        String colorSoft,
        int xpIntoRank,
        int xpSpan,
        int xpRemaining,
        String nextLabel
) {
    public static UserRankView of(String userId, String username, int xp) {
        var safeXp = Math.max(0, xp);
        var rank = XpRules.Rank.forXp(safeXp);
        var next = rank.next();
        var span = next == null ? 0 : next.minXp() - rank.minXp();
        var into = next == null ? 0 : Math.min(span, safeXp - rank.minXp());
        var remaining = next == null ? 0 : Math.max(0, next.minXp() - safeXp);
        return new UserRankView(
                userId,
                username,
                safeXp,
                rank.name(),
                rank.label(),
                rank.tier(),
                rank.division(),
                rank.color(),
                rank.colorSoft(),
                into,
                span,
                remaining,
                next == null ? null : next.label()
        );
    }
}
