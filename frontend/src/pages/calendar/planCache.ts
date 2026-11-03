import type { Lecture } from "@/models/Lecture.tsx";

const STORAGE_KEY = "calendar-plan";

export type StoredPlan = {
    title: string;
    courseName: string;
    semesterNames: string[];
    weeks: Record<string, Lecture[]>;
};

type Store = Record<string, StoredPlan>;

const emptyPlan = (): StoredPlan => ({
    title: "Stundenplan",
    courseName: "",
    semesterNames: [],
    weeks: {},
});

const isLecture = (value: unknown): value is Lecture => {
    if (!value || typeof value !== "object") {
        return false;
    }
    const lecture = value as Lecture;
    return typeof lecture.title === "string"
        && typeof lecture.type === "string"
        && typeof lecture.day === "string"
        && typeof lecture.startTime === "string"
        && typeof lecture.endTime === "string"
        && typeof lecture.lecturer === "string"
        && Array.isArray(lecture.rooms)
        && Array.isArray(lecture.courses);
};

export const sameLectures = (left: Lecture[], right: Lecture[]) => {
    if (left.length !== right.length) {
        return false;
    }
    return left.every((lecture, index) => {
        const other = right[index];
        return lecture.title === other.title
            && lecture.type === other.type
            && lecture.day === other.day
            && lecture.startTime === other.startTime
            && lecture.endTime === other.endTime
            && lecture.lecturer === other.lecturer
            && lecture.rooms.join("\u001f") === other.rooms.join("\u001f")
            && lecture.courses.join("\u001f") === other.courses.join("\u001f");
    });
};

const normalizePlan = (value: unknown): StoredPlan | null => {
    if (!value || typeof value !== "object") {
        return null;
    }
    const plan = value as StoredPlan;
    const weeks: Record<string, Lecture[]> = {};
    if (plan.weeks && typeof plan.weeks === "object") {
        for (const [monday, lectures] of Object.entries(plan.weeks)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(monday) || !Array.isArray(lectures) || !lectures.every(isLecture)) {
                continue;
            }
            weeks[monday] = lectures;
        }
    }
    return {
        title: typeof plan.title === "string" && plan.title.trim() ? plan.title : "Stundenplan",
        courseName: typeof plan.courseName === "string" ? plan.courseName : "",
        semesterNames: Array.isArray(plan.semesterNames)
            ? plan.semesterNames.filter((name): name is string => typeof name === "string")
            : [],
        weeks,
    };
};

let memoryStore: Store | null = null;

const readPersistedStore = (): Store => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }
        const store: Store = {};
        for (const [source, plan] of Object.entries(parsed)) {
            const normalized = normalizePlan(plan);
            if (normalized) {
                store[source] = normalized;
            }
        }
        return store;
    } catch {
        return {};
    }
};

const readStore = (): Store => {
    memoryStore ??= readPersistedStore();
    return memoryStore;
};

const writeStore = (store: Store) => {
    memoryStore = store;
    const persist = (value: Store) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    try {
        persist(store);
    } catch {
        const source = Object.keys(store).at(-1);
        if (!source) {
            return;
        }
        const plan = store[source];
        const weeks = Object.fromEntries(
            Object.entries(plan.weeks).sort((left, right) => right[0].localeCompare(left[0])).slice(0, 8)
        );
        try {
            persist({ [source]: { ...plan, weeks } });
            memoryStore = { [source]: { ...plan, weeks } };
        } catch {
            // Keep the in-memory plan when storage is full.
        }
    }
};

export const readStoredPlan = (source: string): StoredPlan | null => {
    if (!source) {
        return null;
    }
    return readStore()[source] ?? null;
};

export const rememberWeek = (source: string, mondayKey: string, lectures: Lecture[]) => {
    if (!source) {
        return;
    }
    const store = readStore();
    const current = store[source] ?? emptyPlan();
    const previous = current.weeks[mondayKey];
    if (previous && sameLectures(previous, lectures)) {
        return;
    }
    store[source] = {
        ...current,
        weeks: { ...current.weeks, [mondayKey]: lectures },
    };
    writeStore(store);
};

export const rememberCourse = (
    source: string,
    patch: Pick<StoredPlan, "title" | "courseName" | "semesterNames">
) => {
    if (!source) {
        return;
    }
    const store = readStore();
    const current = store[source] ?? emptyPlan();
    const namesMatch = current.semesterNames.length === patch.semesterNames.length
        && current.semesterNames.every((name, index) => name === patch.semesterNames[index]);
    if (current.title === patch.title && current.courseName === patch.courseName && namesMatch) {
        return;
    }
    store[source] = { ...current, ...patch };
    writeStore(store);
};
