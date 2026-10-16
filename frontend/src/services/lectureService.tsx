import type {ApiError} from "@/models/ApiError.tsx"
import type {LecturePlanResponse} from "@/models/LecturePlanResponse.tsx";
import {api, apiFetch, checkResponse, getErrorText, resolveError} from "@/services/api.tsx";
import type {DayOfWeek, Lecture} from "@/models/Lecture.tsx";
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from "react";
import {normalizeRaplaUrl} from "@/utils/raplaUrl.ts";
import {clockMinutes, selectCurrentTimerLectures} from "@/services/lectureTimerSelection.ts";

const API_URL = api.baseUrl;

const lectureCache = new Map<string, Promise<LecturePlanResponse>>();
const lectureNamesCache = new Map<string, Promise<string[]>>();

export const LECTURE_PLAN_STORAGE_KEY = "lecture-plan-settings";

const DEBUG_TIME: string | null = null; //"2026-10-01T09:30"

const parseDebugTime = (value: string): Date => {
    const normalized = value.trim().replace(" ", "T");
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
        throw new Error(`Invalid DEBUG_TIME "${value}". Use YYYY-MM-DDTHH:mm`);
    }

    const [, year, month, day, hours, minutes, seconds = "0"] = match;
    const debug = new Date();
    debug.setFullYear(Number(year), Number(month) - 1, Number(day));
    debug.setHours(Number(hours), Number(minutes), Number(seconds), 0);
    return debug;
};

const getNow = (): Date => {
    if (DEBUG_TIME) {
        return parseDebugTime(DEBUG_TIME);
    }

    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
};

const getAvailableCourses = async (): Promise<string[]> => {
    try {
        const response = await apiFetch(`${API_URL}/profile/courses`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (response.ok) {
            return await response.json();
        } else {
            return [];
        }
    } catch {
        return [];
    }
}

const extractCourse = async (raplaUrl: string): Promise<string> => {
    const response = await apiFetch(`${API_URL}/lecture/course?raplaUrl=${encodeURIComponent(normalizeRaplaUrl(raplaUrl))}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    await checkResponse(response);

    return await response.text();
}

const getLecturesForWeek = async (weekOffset: number, course: string): Promise<LecturePlanResponse> => {
    const cacheKey = `${weekOffset}-${course}`;

    if (!lectureCache.has(cacheKey)) {
        const promise = apiFetch(
            `${API_URL}/lecture/week?weekOffset=${weekOffset}&course=${course}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
            .then(async res => {
                if (!res.ok) {
                    const apiError: ApiError = await res.json();
                    resolveError(apiError);
                    throw apiError;
                }
                return res.json() as Promise<LecturePlanResponse>;
            });

        void promise.catch(() => {
            if (lectureCache.get(cacheKey) === promise) {
                lectureCache.delete(cacheKey);
            }
        });
        lectureCache.set(cacheKey, promise);
    }

    return lectureCache.get(cacheKey)!;
};

const DAYS_OF_WEEK: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const millisecondsUntil = (time: string, now: Date): number => {
    const [hours, minutes] = time.split(":").map(Number);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    return target.getTime() - now.getTime();
};

interface CurrentLectureInfo {
    current: Lecture[];
    next: Lecture[] | null;
}

const getCurrentAndNextLecture = async (course: string): Promise<CurrentLectureInfo> => {
    const now = getNow()
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const today = DAYS_OF_WEEK[todayIndex];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const hidden = selection.hiddenLectures;

    const cacheKey = `0-${course}`;
    let lectures: Lecture[];

    if (lectureCache.has(cacheKey)) {
        const response = await lectureCache.get(cacheKey)!;
        lectures = response.lectures;
    } else {
        const response = await getLecturesForWeek(0, course);
        lectures = response.lectures;
    }

    const isVisible = (lecture: Lecture) =>
        !hidden.some(hiddenText => lecture.title.trim().includes(hiddenText.trim()));

    const lecturesOn = (day: DayOfWeek) =>
        lectures
            .filter(l => l.day === day && l.type === "LECTURE" && isVisible(l))
            .sort((a, b) => clockMinutes(a.startTime) - clockMinutes(b.startTime) || a.title.localeCompare(b.title));

    const todaysLectures = lecturesOn(today);
    const overlapping = todaysLectures.filter(lecture => {
        const start = clockMinutes(lecture.startTime);
        const end = clockMinutes(lecture.endTime);
        return start <= nowMinutes && nowMinutes < end;
    });
    const current = selectCurrentTimerLectures(overlapping);

    const remainingToday = todaysLectures.filter(lecture => clockMinutes(lecture.startTime) > nowMinutes);

    const upcomingOtherDays = DAYS_OF_WEEK
        .slice(todayIndex + 1)
        .flatMap(day => lecturesOn(day));

    const next = [...remainingToday, ...upcomingOtherDays];

    return { current, next };
};

const useCurrentAndNextLecture = (course: string | null) => {
    const [current, setCurrent] = useState<Lecture[]>([]);
    const [next, setNext] = useState<Lecture[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshRef = useRef<(() => Promise<void>) | null>(null);
    const requestId = useRef(0);

    useEffect(() => {
        if (!course) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrent([]);
            setNext(null);
            setLoading(false);
            setError(null);
            return;
        }

        const refresh = async (silent = false) => {
            const id = ++requestId.current;
            if (!silent) {
                setLoading(true);
            }
            setError(null);
            try {
                const { current, next } = await getCurrentAndNextLecture(course);
                if (id !== requestId.current) {
                    return;
                }
                setCurrent(current);
                setNext(next);

                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                const now = getNow();
                const todayName = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1];
                const delays = current.map(lecture => millisecondsUntil(lecture.endTime, now));
                const upcomingToday = next?.find(lecture => lecture.day === todayName);
                if (upcomingToday) {
                    delays.push(millisecondsUntil(upcomingToday.startTime, now));
                }
                const nextDelay = delays.filter(delay => delay > 0).sort((left, right) => left - right)[0];
                if (nextDelay !== undefined) {
                    timeoutRef.current = setTimeout(() => refreshRef.current?.(), nextDelay);
                }
            } catch (err: unknown) {
                if (id !== requestId.current) {
                    return;
                }
                setCurrent([]);
                setNext(null);
                setError(getErrorText(err));
            } finally {
                if (id === requestId.current) {
                    setLoading(false);
                }
            }
        };

        refreshRef.current = () => refresh(false);
        refresh();

        const onHiddenLecturesChanged = () => {
            void refresh(true);
        };
        hiddenLecturesListeners.add(onHiddenLecturesChanged);

        return () => {
            hiddenLecturesListeners.delete(onHiddenLecturesChanged);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [course]);

    const refresh = useCallback(() => refreshRef.current?.() ?? Promise.resolve(), []);

    const pending = Boolean(course) && next === null && error === null;
    return { current, next, loading: loading || pending, error, refresh };
};

const getLectureNamesForSemester = (course: string): Promise<string[]> => {
    if (course === "") {
        return Promise.resolve([]);
    }

    if (!lectureNamesCache.has(course)) {
        lectureNamesCache.set(course, (async () => {
            const response = await apiFetch(
                `${API_URL}/lecture/all?course=${course}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            await checkResponse(response);
            return await response.json();
        })());
    }

    return lectureNamesCache.get(course)!;
}

const isToday = (day: string) =>
{
    const now = getNow();
    return DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1] === day;
}

const isTomorrow = (day: string) =>
{
    const now = getNow();
    return DAYS_OF_WEEK[(now.getDay() + 1) === 0 ? 6 : now.getDay()] === day;
}

type TimerPlanSelection = {
    course: string | null;
    hiddenLectures: string[];
};

const emptySelection = (): TimerPlanSelection => ({ course: null, hiddenLectures: [] });

let selection: TimerPlanSelection = emptySelection();
let publishedCourse: string | null = null;
let publishedHidden: string[] = [];
const courseListeners = new Set<() => void>();
const hiddenLecturesListeners = new Set<(hiddenLectures: string[] | null) => void>();

const normalizeCourse = (course: string | null | undefined): string | null => {
    const trimmed = course?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
};

const sameHidden = (left: string[], right: string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const normalizeSelection = (
    course: string | null | undefined,
    hiddenLectures: string[] | null | undefined
): TimerPlanSelection => ({
    course: normalizeCourse(course),
    hiddenLectures: Array.isArray(hiddenLectures) ? [...hiddenLectures] : [],
});

const stageTimerPlan = (course: string | null | undefined, hiddenLectures?: string[] | null) => {
    selection = normalizeSelection(course, hiddenLectures ?? selection.hiddenLectures);
};

/** Publishes the plan and notifies the timer if the course or hidden lectures changed. */
export const publishTimerPlan = (course: string | null | undefined, hiddenLectures?: string[] | null) => {
    stageTimerPlan(course, hiddenLectures);
    const courseChanged = selection.course !== publishedCourse;
    const hiddenChanged = !sameHidden(selection.hiddenLectures, publishedHidden);
    if (!courseChanged && !hiddenChanged) {
        return;
    }
    publishedCourse = selection.course;
    publishedHidden = selection.hiddenLectures;
    if (courseChanged) {
        courseListeners.forEach(listener => listener());
    }
    if (hiddenChanged) {
        hiddenLecturesListeners.forEach(listener => listener(selection.hiddenLectures));
    }
};

export const applyStoredLecturePlan = (data: string) => {
    if (!data) {
        return;
    }
    try {
        const parsed = JSON.parse(data) as { course?: string | null; hiddenLectures?: string[] };
        publishTimerPlan(parsed.course ?? null, parsed.hiddenLectures ?? []);
    } catch {
        // Ignore broken widget data; the plan widget falls back to its defaults.
    }
};

export const restoreGuestTimerPlan = () => {
    try {
        applyStoredLecturePlan(localStorage.getItem(LECTURE_PLAN_STORAGE_KEY) ?? "");
    } catch {
        // localStorage can be unavailable in private mode.
    }
};

const subscribeTimerCourse = (listener: () => void) => {
    courseListeners.add(listener);
    return () => {
        courseListeners.delete(listener);
    };
};

const getTimerCourse = () => selection.course;

export const setTimerCourse = (course: string | null) => {
    publishTimerPlan(course, selection.hiddenLectures);
};

export const useTimerCourse = (): string | null =>
    useSyncExternalStore(subscribeTimerCourse, getTimerCourse, getTimerCourse);

export const setHiddenLectures = (lectures: string[] | null) => {
    publishTimerPlan(selection.course, lectures);
};

export const lectureService = {
    getAvailableCourses,
    extractCourse,
    getLecturesForWeek,
    getLectureNamesForSemester,
    getCurrentAndNextLecture,
    useCurrentAndNextLecture,
    getNow,
    isToday,
    isTomorrow,
    setHiddenLectures
}