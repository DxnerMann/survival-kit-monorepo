import type {EventInput} from "@fullcalendar/core";
import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {CustomEvent} from "@/models/CustomEvent.tsx";
import type {DayOfWeek, Lecture} from "@/models/Lecture.tsx";
import {lectureConversionUtil} from "@/services/lectureConversionUtil.tsx";

const API_URL = api.baseUrl;

const DAY_BY_INDEX: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export type CreateCustomEventInput = {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    room?: string;
    description?: string;
    inviteUsernames: string[];
};

const clock = (time: string) => time.trim().slice(0, 5);

const addIsoDays = (iso: string, days: number) => {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    date.setDate(date.getDate() + days);
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    const nextDay = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
};

export const weekDateRange = (weekOffset: number) => {
    const start = lectureConversionUtil.getMonday(weekOffset);
    return {start, end: addIsoDays(start, 6)};
};

export const customEventsInRange = (events: CustomEvent[], start: string, end: string) =>
    events.filter(event => event.date >= start && event.date <= end);

export const customEventToLecture = (event: CustomEvent): Lecture => {
    const [year, month, day] = event.date.split("-").map(Number);
    const weekday = DAY_BY_INDEX[new Date(year, (month ?? 1) - 1, day ?? 1).getDay()];
    const room = event.room?.trim() ?? "";
    const description = event.description?.trim() ?? "";
    return {
        title: event.title,
        type: "CUSTOM",
        startTime: clock(event.startTime),
        endTime: clock(event.endTime),
        rooms: room ? [room] : [],
        lecturer: "",
        courses: [],
        day: weekday,
        description: description || undefined,
    };
};

export const customEventsToCalendar = (events: CustomEvent[], color: string): EventInput[] =>
    events.map(event => {
        const lecture = customEventToLecture(event);
        const textColor = lectureConversionUtil.getTextColor(color);
        return {
            id: event.id,
            title: event.title,
            start: `${event.date}T${lecture.startTime}:00`,
            end: `${event.date}T${lecture.endTime}:00`,
            backgroundColor: color,
            borderColor: "transparent",
            textColor,
            classNames: event.participation === "DECLINED" ? ["fc-event-declined"] : [],
            extendedProps: {lecture, textColor, customEvent: event},
        };
    });

export const listCustomEvents = async (): Promise<CustomEvent[]> => {
    const response = await apiFetch(`${API_URL}/custom-events`);
    if (response.status === 401 || response.status === 403) {
        return [];
    }
    await checkResponse(response);
    const body = await response.json() as CustomEvent[];
    return Array.isArray(body) ? body : [];
};

export const listCourseUsernames = async (): Promise<string[]> => {
    const response = await apiFetch(`${API_URL}/chat/usernames`);
    if (!response.ok) {
        return [];
    }
    const body = await response.json() as unknown;
    return Array.isArray(body) ? body.filter((item): item is string => typeof item === "string") : [];
};

export const createCustomEvent = async (input: CreateCustomEventInput): Promise<CustomEvent> => {
    const response = await apiFetch(`${API_URL}/custom-events`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            ...input,
            startTime: clock(input.startTime),
            endTime: clock(input.endTime),
        }),
    });
    await checkResponse(response);
    return response.json() as Promise<CustomEvent>;
};

export type SharedCalendarColors = {
    lecture: string;
    exam: string;
    other: string;
    custom: string;
};

export type SharedCalendar = {
    events: CustomEvent[];
    colors: SharedCalendarColors;
};

export type CalendarShareLink = {
    code: string;
    raplaUrl: string | null;
};

export const getCalendarShareLink = async (): Promise<CalendarShareLink | null> => {
    const response = await apiFetch(`${API_URL}/calendar/share`);
    if (response.status === 401 || response.status === 403) {
        return null;
    }
    await checkResponse(response);
    return response.json() as Promise<CalendarShareLink>;
};

export const getSharedCalendar = async (code: string): Promise<SharedCalendar> => {
    const response = await apiFetch(`${API_URL}/calendar/shared?code=${encodeURIComponent(code)}`);
    if (!response.ok) {
        throw new Error("Kalender-Code ist ungültig");
    }
    return response.json() as Promise<SharedCalendar>;
};

export const updateCustomEvent = async (id: string, input: CreateCustomEventInput): Promise<CustomEvent> => {
    const response = await apiFetch(`${API_URL}/custom-events/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            ...input,
            startTime: clock(input.startTime),
            endTime: clock(input.endTime),
        }),
    });
    await checkResponse(response);
    return response.json() as Promise<CustomEvent>;
};

export const deleteCustomEvent = async (id: string): Promise<void> => {
    const response = await apiFetch(`${API_URL}/custom-events/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
    await checkResponse(response);
};

export const respondToCustomEvent = async (id: string, accept: boolean): Promise<void> => {
    const response = await apiFetch(`${API_URL}/custom-events/${encodeURIComponent(id)}/response`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({accept}),
    });
    await checkResponse(response);
};
