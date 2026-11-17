export interface UserWidget {
    id: string
    type: "LECTURE_PLAN" | "LECTURE_TIMER" | "CLOCK" | "DIGRESSION_TIMER" | "FAV_GAMES" | "DAILY_CAT" | "DAILY_MEME" | "CURRENT_CAFFEINE" | "FEGEFEUER" | "COUNTER" | "EMPTY" | "LEADERBOARD" | "SECTION_HEADING"
    x: number
    y: number
    width: number
    height: number
    data: string
}