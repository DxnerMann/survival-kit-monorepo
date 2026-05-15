export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface Lecture {
    title: string;
    type: "LECTURE" | "EXAM" | "OTHER";
    startTime: string;
    endTime: string;
    rooms: string[];
    lecturer: string;
    courses: string[];
    day: DayOfWeek;
}