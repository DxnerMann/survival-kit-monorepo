import type {DayOfWeek, Lecture} from "../models/Lecture.tsx";

const DAY_INDEX: Record<DayOfWeek, number> = {
    MONDAY:    0,
    TUESDAY:   1,
    WEDNESDAY: 2,
    THURSDAY:  3,
    FRIDAY:    4,
    SATURDAY:  5,
    SUNDAY:    6,
};

const resolveDate = (day: DayOfWeek, weekOffset: number): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

    const target = new Date(monday);
    target.setDate(monday.getDate() + DAY_INDEX[day]);
    return toLocalDateString(target);
};

const hasSaturday = (lectures: Lecture[]) =>
    lectures.some((l) => l.day === "SATURDAY");

const getMonday = (weekOffset: number): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    today.setDate(today.getDate() + distanceToMonday + weekOffset * 7);
    return toLocalDateString(today);
};

const toCalendarEvents = (
    lectures: Lecture[],
    colors: Record<Lecture["type"], string>,
    weekOffset: number
) =>
    lectures.map((l) => {
        const date = resolveDate(l.day, weekOffset);
        const bg = colors[l.type];
        return {
            title: l.title,
            start: `${date}T${l.startTime}:00`,
            end:   `${date}T${l.endTime}:00`,
            backgroundColor: bg,
            borderColor: "transparent",
            textColor: getTextColor(bg),
            extendedProps: { lecture: l, textColor: getTextColor(bg) },
        };
    });

const getTextColor = (hex: string): string => {
    const [r, g, b] = hexToRgb(hex).map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.179 ? "#15283a" : "#ffffff";
};

const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace("#", "");
    const full = clean.length === 3
        ? clean.split("").map(c => c + c).join("")
        : clean;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export const lectureConvertionUtil = {
    hasSaturday,
    getMonday,
    resolveDate,
    toCalendarEvents,
    getTextColor,
    hexToRgb
}