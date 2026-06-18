export interface UserWidget {
    id: string
    type: "LECTURE_PLAN" | "LECTURE_TIMER" | "CLOCK" | "DIGRESSION_TIMER" | "FAV_GAMES" | "DAILY_CAT" | "EMPTY"
    x: number
    y: number
    width: number
    height: number
    data: string
}