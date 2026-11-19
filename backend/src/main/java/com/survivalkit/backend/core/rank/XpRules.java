package com.survivalkit.backend.core.rank;

/**
 * Change XP amounts, daily caps, and rank thresholds here.
 * A daily cap of 1 means the action counts once per Berlin day.
 * Rank.minXp is the total XP required to reach that rank.
 */
public final class XpRules {

    private XpRules() {}

    public enum Action {
        LOGGED_IN(15, 1),
        MEME_UPLOADED(60, 6),
        MEME_VOTE(5, 25),
        CHAT_MESSAGE(5, 25),
        CHAT_REACTION(1, 20),
        CAFFEINE_LOGGED(15, 8),
        IDEA_SUBMITTED(40, 3),
        FEEDBACK_VOTE(5, 20),
        GAME_SUGGESTED(30, 2),
        PRESENTATION_GAME(15, 4);

        private final int xp;
        private final int dailyCap;

        Action(int xp, int dailyCap) {
            this.xp = xp;
            this.dailyCap = dailyCap;
        }

        public int xp() {
            return xp;
        }

        public int dailyCap() {
            return dailyCap;
        }
    }

    public enum Rank {
        BRONZE_III("Bronze III", "BRONZE", "III", 0, "#cd7f32", "#f3d2a4"),
        BRONZE_II("Bronze II", "BRONZE", "II", 60, "#cd7f32", "#f3d2a4"),
        BRONZE_I("Bronze I", "BRONZE", "I", 160, "#cd7f32", "#f3d2a4"),
        SILVER_III("Silver III", "SILVER", "III", 290, "#b7c0cc", "#f4f7fb"),
        SILVER_II("Silver II", "SILVER", "II", 480, "#b7c0cc", "#f4f7fb"),
        SILVER_I("Silver I", "SILVER", "I", 720, "#b7c0cc", "#f4f7fb"),
        GOLD_III("Gold III", "GOLD", "III", 1060, "#e2b340", "#ffe7a3"),
        GOLD_II("Gold II", "GOLD", "II", 1500, "#e2b340", "#ffe7a3"),
        GOLD_I("Gold I", "GOLD", "I", 2070, "#e2b340", "#ffe7a3"),
        DIAMOND_III("Diamond III", "DIAMOND", "III", 2790, "#6ec6ff", "#e7f7ff"),
        DIAMOND_II("Diamond II", "DIAMOND", "II", 3720, "#6ec6ff", "#e7f7ff"),
        DIAMOND_I("Diamond I", "DIAMOND", "I", 4910, "#6ec6ff", "#e7f7ff"),
        PLATIN_III("Platin III", "PLATIN", "III", 6470, "#b388ff", "#f6edff"),
        PLATIN_II("Platin II", "PLATIN", "II", 8530, "#b388ff", "#f6edff"),
        PLATIN_I("Platin I", "PLATIN", "I", 11380, "#b388ff", "#f6edff"),
        GRANDMASTER("Grandmaster of Prokrastination", "GRANDMASTER", "", 15000, "#ff3d4f", "#ff9a3c");

        private final String label;
        private final String tier;
        private final String division;
        private final int minXp;
        private final String color;
        private final String colorSoft;

        Rank(String label, String tier, String division, int minXp, String color, String colorSoft) {
            this.label = label;
            this.tier = tier;
            this.division = division;
            this.minXp = minXp;
            this.color = color;
            this.colorSoft = colorSoft;
        }

        public String label() {
            return label;
        }

        public String tier() {
            return tier;
        }

        public String division() {
            return division;
        }

        public int minXp() {
            return minXp;
        }

        public String color() {
            return color;
        }

        public String colorSoft() {
            return colorSoft;
        }

        public static Rank forXp(int xp) {
            var current = BRONZE_III;
            for (var rank : values()) {
                if (xp >= rank.minXp) {
                    current = rank;
                }
            }
            return current;
        }

        public Rank next() {
            var values = values();
            var index = ordinal() + 1;
            return index < values.length ? values[index] : null;
        }
    }
}
