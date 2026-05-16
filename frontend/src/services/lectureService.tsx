import {api} from "./api.tsx";
import {authService} from "./authService.tsx";
import type {DayOfWeek, Lecture} from "../models/Lecture.tsx";
import {useCallback, useEffect, useRef, useState} from "react";

const API_URL = api.baseUrl;

const lectureCache = new Map<string, Promise<Lecture[]>>();

const DEBUG_TIME_OFFSET: { day: number; hours: number; minutes: number } | null = {
    day: -4,
    hours: -1,
    minutes: 0,
};

const getNow = (): Date => {
    const real = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    if (!DEBUG_TIME_OFFSET) return real;

    const debug = new Date(real);
    debug.setDate(real.getDate() + DEBUG_TIME_OFFSET.day);
    debug.setHours(real.getHours() + DEBUG_TIME_OFFSET.hours, real.getMinutes() + DEBUG_TIME_OFFSET.minutes, real.getSeconds(), real.getMilliseconds());
    return debug;
};

const getAvailableCourses =  async () : Promise<string[]> => {
    try {

        const response = await fetch(`${API_URL}/profile/courses`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (response.ok) {
            return await response.json();
        }
        else {
            return [];
        }
    } catch {
        return [];
    }
}

const getCourseOrExtract =  async (raplaUrl? : string) : Promise<string> => {

    let response;

    if (raplaUrl) {
        response = await fetch(
            `${API_URL}/profile/course?raplaUrl=${encodeURIComponent(raplaUrl)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

    } else {
        const token = authService.getToken();

        response = await fetch(`${API_URL}/profile/course`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,

                'Content-Type': 'application/json',
            }
        });
    }

    if (response.ok) {
        return await response.text();
    } else {
        throw new Error("Failed to get Course");
    }
}

const getLecturesForWeek = async (weekOffset: number, course: string): Promise<Lecture[]> => {
    const cacheKey = `${weekOffset}-${course}`;

    if (!lectureCache.has(cacheKey)) {
        const promise = fetch(
            `${API_URL}/lecture/week?weekOffset=${weekOffset}&course=${course}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
        .then(res => {
            if (!res.ok) {
                lectureCache.delete(cacheKey);
                throw new Error("Failed to get Lectures for Week");
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
    next: Lecture | null;
}

const getCurrentAndNextLecture = async (course: string): Promise<CurrentLectureInfo> => {
    const now = getNow()
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const today = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1]; // JS: Sun=0, Mon=1 → remap
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const cacheKey = `0-${course}`;
    let lectures: Lecture[];

    if (lectureCache.has(cacheKey)) {
        lectures = await lectureCache.get(cacheKey)!;
    } else {
        lectures = await getLecturesForWeek(0, course);
    }

    const todaysLectures = lectures
        .filter(l => l.day === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const current = todaysLectures.find(l => l.startTime <= currentTime && currentTime < l.endTime) ?? null;
    let next = todaysLectures.find(l => l.startTime > currentTime) ?? null;
    if (!next) {
        next = DAYS_OF_WEEK
            .slice(todayIndex + 1)
            .flatMap(day =>
                lectures
                    .filter(l => l.day === day)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
            )
            .at(0) ?? null;
    }
    return { current, next };
};

const useCurrentAndNextLecture = (course: string | null) => {
    const [current, setCurrent] = useState<Lecture | null>(null);
    const [next, setNext] = useState<Lecture | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshRef = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => {
        if (!course) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrent(null);
            setNext(null);
            return;
        }

        const refresh = async () => {
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
            } else if (next && next.day === DAYS_OF_WEEK[getNow().getDay() === 0 ? 6 : new Date().getDay() - 1]) {
                const now = getNow()
                const [hours, minutes] = next.startTime.split(":").map(Number);
                const nextStart = new Date(now);
                nextStart.setHours(hours, minutes, 0, 0);

                const msUntilNext = nextStart.getTime() - now.getTime();
                timeoutRef.current = setTimeout(() => refreshRef.current?.(), msUntilNext);
            }
        };

        refreshRef.current = refresh;
        refresh();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [course]);

    const refresh = useCallback(() => refreshRef.current?.() ?? Promise.resolve(), []);

    return { current, next, refresh };
};

const getLectureNamesForSemester = async (course: string) : Promise<string[]> => {

    if (course === "") {
        return [];
    }

    const response = await fetch(
        `${API_URL}/lecture/all?course=${course}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error("Failed to get Lectures Names for Semester");
    }
}

export const lectureService = {
    getAvailableCourses,
    getCourseOrExtract,
    getLecturesForWeek,
    getLectureNamesForSemester,
    getCurrentAndNextLecture,
    useCurrentAndNextLecture,
    getNow
}