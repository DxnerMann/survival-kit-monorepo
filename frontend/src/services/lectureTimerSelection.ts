import type {DayOfWeek, Lecture} from "@/models/Lecture.tsx";

const WEEK_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export const clockMinutes = (time: string): number => {
    const [hours = "0", minutes = "0"] = time.split(":");
    return Number(hours) * 60 + Number(minutes);
};

export const selectCurrentTimerLectures = (
    overlapping: Lecture[],
    random: () => number = Math.random
): Lecture[] => {
    if (overlapping.length <= 1) {
        return overlapping;
    }

    const sorted = [...overlapping].sort((left, right) =>
        clockMinutes(left.startTime) - clockMinutes(right.startTime)
        || left.title.localeCompare(right.title)
    );
    const earliestStart = clockMinutes(sorted[0].startTime);
    const tiedForEarliest = sorted.filter(lecture => clockMinutes(lecture.startTime) === earliestStart);
    const later = sorted.filter(lecture => clockMinutes(lecture.startTime) !== earliestStart);
    const pick = (items: Lecture[]) =>
        items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];

    if (tiedForEarliest.length === 1) {
        return [tiedForEarliest[0], pick(later)];
    }

    const primary = pick(tiedForEarliest);
    const pool = tiedForEarliest.filter(lecture => lecture !== primary).concat(later);
    return [primary, pick(pool)];
};

const nextDate = (iso: string) => {
    const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    const nextDay = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
};

const dayDistance = (day: DayOfWeek, today: DayOfWeek) => {
    const from = WEEK_DAYS.indexOf(today);
    const to = WEEK_DAYS.indexOf(day);
    return (to - from + WEEK_DAYS.length) % WEEK_DAYS.length;
};

/** Own events replace lectures that happen at the same time. Later events join the upcoming list. */
export const preferCustomEvents = (
    current: Lecture[],
    upcoming: Lecture[],
    events: {lecture: Lecture; date: string; declined: boolean}[],
    today: string,
    todayName: DayOfWeek,
    nowMinutes: number,
): {current: Lecture[]; next: Lecture[]} => {
    const running = (event: {lecture: Lecture; date: string}) => {
        if (event.date !== today) {
            return false;
        }
        const start = clockMinutes(event.lecture.startTime);
        const end = clockMinutes(event.lecture.endTime);
        return start <= nowMinutes && nowMinutes < end;
    };
    const accepted = events.filter((event) => running(event) && !event.declined);
    const declined = events.filter((event) => running(event) && event.declined);
    const tomorrow = nextDate(today);
    const later = events.filter((event) =>
        (event.date === today && clockMinutes(event.lecture.startTime) > nowMinutes)
        || event.date === tomorrow
    );
    const next = [
        ...upcoming.map((lecture) => ({lecture, declined: false})),
        ...later,
    ].sort((left, right) =>
        dayDistance(left.lecture.day, todayName) - dayDistance(right.lecture.day, todayName)
        || Number(left.declined) - Number(right.declined)
        || clockMinutes(left.lecture.startTime) - clockMinutes(right.lecture.startTime)
        || left.lecture.title.localeCompare(right.lecture.title)
    ).map((event) => event.lecture);
    const shown = accepted.length > 0
        ? accepted
        : current.length > 0
            ? current.map((lecture) => ({lecture}))
            : declined;
    return {
        current: shown.map((event) => event.lecture),
        next,
    };
};
