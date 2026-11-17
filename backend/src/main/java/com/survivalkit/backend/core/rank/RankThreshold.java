package com.survivalkit.backend.core.rank;

import java.util.Arrays;
import java.util.List;

public record RankThreshold(
        String id,
        String label,
        String tier,
        String division,
        int minXp,
        String color,
        String colorSoft
) {
    public static List<RankThreshold> all() {
        return Arrays.stream(XpRules.Rank.values())
                .map(rank -> new RankThreshold(
                        rank.name(),
                        rank.label(),
                        rank.tier(),
                        rank.division(),
                        rank.minXp(),
                        rank.color(),
                        rank.colorSoft()
                ))
                .toList();
    }
}
