import type {ApiError} from '../models/ApiError.tsx'
import {api, apiFetch, checkResponse, getErrorText, resolveError} from "./api.tsx";
import type {DayOfWeek, Lecture} from "../models/Lecture.tsx";
import {useCallback, useEffect, useRef, useState} from "react";

const API_URL = api.baseUrl;

const lectureCache = new Map<string, Promise<Lecture[]>>();
const lectureNamesCache = new Map<string, Promise<string[]>>();

const DEBUG_TIME_OFFSET: { day: number; hours: number; minutes: number } =
    {
        day: 0,
        hours: 0,
        minutes: 0,
    };

const getNow = (): Date => {
    const real = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    const debug = new Date(real);
    debug.setDate(real.getDate() + DEBUG_TIME_OFFSET.day);
    debug.setHours(real.getHours() + DEBUG_TIME_OFFSET.hours, real.getMinutes() + DEBUG_TIME_OFFSET.minutes, real.getSeconds(), real.getMilliseconds());
    return debug;
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
    const response = await apiFetch(`${API_URL}/lecture/course?raplaUrl=${encodeURIComponent(raplaUrl)}`,
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

const getLecturesForWeek = async (weekOffset: number, course: string): Promise<Lecture[]> => {
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
                return res.json() as Promise<Lecture[]>;
            });

        lectureCache.set(cacheKey, promise);
    }

    return lectureCache.get(cacheKey)!;
};

const DAYS_OF_WEEK: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface CurrentLectureInfo {
    current: Lecture | null;
    next: Lecture[] | null;
}

const getCurrentAndNextLecture = async (course: string): Promise<CurrentLectureInfo> => {
    const now = getNow()
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const today = DAYS_OF_WEEK[todayIndex];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const hidden = _hiddenLectures ?? [];

    const cacheKey = `0-${course}`;
    let lectures: Lecture[];

    if (lectureCache.has(cacheKey)) {
        lectures = await lectureCache.get(cacheKey)!;
    } else {
        lectures = await getLecturesForWeek(0, course);
    }

    const todaysLectures = lectures
        .filter(l => l.day === today && l.type === "LECTURE")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const current = todaysLectures.filter(lecture => {
        const isHidden = hidden.some(hiddenText =>
            lecture.title.trim().includes(hiddenText.trim())
        );
        return !isHidden;
    }).find(l => l.startTime <= currentTime && currentTime < l.endTime) ?? null;

    const remainingToday = todaysLectures.filter(l => l.startTime > currentTime);

    const upcomingOtherDays = DAYS_OF_WEEK
        .slice(todayIndex + 1)
        .flatMap(day =>
            lectures
                .filter(l => l.day === day && l.type === "LECTURE")
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
        );

    const next = [...remainingToday, ...upcomingOtherDays];

    return { current, next };
};

const useCurrentAndNextLecture = (course: string | null) => {
    const [current, setCurrent] = useState<Lecture | null>(null);
    const [next, setNext] = useState<Lecture[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshRef = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => {
        if (!course) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrent(null);
            setNext(null);
            setLoading(false);
            setError(null);
            return;
        }

        const refresh = async () => {
            setLoading(true);
            setError(null);
            try {
                const { current, next } = await getCurrentAndNextLecture(course);
                setCurrent(current);
                setNext(next);

                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                if (current) {
                    const now = getNow()
                    const [hours, minutes] = current.endTime.split(":").map(Number);
                    const currentEnd = new Date(now);
                    currentEnd.setHours(hours, minutes, 0, 0);

                    const msUntilEnd = currentEnd.getTime() - now.getTime();
                    timeoutRef.current = setTimeout(() => refreshRef.current?.(), msUntilEnd);
                } else if (next && next[0] !== undefined && next[0].day === DAYS_OF_WEEK[getNow().getDay() === 0 ? 6 : new Date().getDay() - 1]) {
                    const now = getNow()
                    const [hours, minutes] = next[0].startTime.split(":").map(Number);
                    const nextStart = new Date(now);
                    nextStart.setHours(hours, minutes, 0, 0);

                    const msUntilNext = nextStart.getTime() - now.getTime();
                    timeoutRef.current = setTimeout(() => refreshRef.current?.(), msUntilNext);
                }
            } catch (err: unknown) {
                setCurrent(null);
                setNext(null);
                setError(getErrorText(err));
            } finally {
                setLoading(false);
            }
        };

        refreshRef.current = refresh;
        refresh();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [course]);

    const refresh = useCallback(() => refreshRef.current?.() ?? Promise.resolve(), []);

    return { current, next, loading, error, refresh };
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

let timerCourse: string | null = null;
const courseListeners = new Set<(course: string | null) => void>();

export const setTimerCourse = (course: string | null) => {
    timerCourse = course;
    courseListeners.forEach(l => l(course));
};

export const useTimerCourse = (): string | null => {
    const [course, setCourse] = useState<string | null>(timerCourse);

    useEffect(() => {
        courseListeners.add(setCourse);
        return () => { courseListeners.delete(setCourse); };
    }, []);

    return course;
};

let _hiddenLectures: string[] | null = null;
const hiddenLecturesListeners = new Set<(hiddenLectures: string[] | null) => void>();

export const setHiddenLectures = (lectures: string[] | null) => {
    _hiddenLectures = lectures;
    hiddenLecturesListeners.forEach(l => l(lectures));
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