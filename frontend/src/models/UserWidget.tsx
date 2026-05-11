export interface UserWidget {
    id: string,
    type: "LECTURE_PLAN" | "LECTURE_TIMER" | "EMPTY"
    x: number
    y: number
    width: number
    height: number
    data: string
}