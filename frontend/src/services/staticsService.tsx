import {api} from "./api.tsx";
import {authService} from "./authService.tsx";
import type {TrackAction, TrackActionType} from "../models/TrackAction.tsx";
import type {Page} from "../models/Page.tsx";

const API_URL = api.baseUrl;

export const trackActivity = async (action : TrackActionType) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/track/action?action=${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        }
    });

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }
}

export const getUserActions = async (
    action: TrackActionType,
    continuation?: string
): Promise<Page<TrackAction>> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ action, ...(continuation !== undefined && { continuation }) });

    const response = await fetch(`${API_URL}/stats/userActions?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    return response.json();
};

export const getCourseActions = async (
    action: TrackActionType,
    continuation?: string
): Promise<Page<TrackAction>> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ action, ...(continuation !== undefined && { continuation }) });

    const response = await fetch(`${API_URL}/stats/courseActions?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    return response.json();
};

export const getGlobalActions = async (
    action: TrackActionType,
    continuation?: string
): Promise<Page<TrackAction>> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ action, ...(continuation !== undefined && { continuation }) });

    const response = await fetch(`${API_URL}/stats/globalActions?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    return response.json();
};

export const getUserActionSum = async (
    action: TrackActionType
): Promise<number> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ action });

    const response = await fetch(`${API_URL}/stats/userActionSum?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    return response.json();
};

export const getCourseActionSum = async (
    action: TrackActionType
): Promise<number> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ action });

    const response = await fetch(`${API_URL}/stats/courseActionSum?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    return response.json();
};

export const getGlobalActionSum = async (
    action: TrackActionType
): Promise<number> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ action });

    const response = await fetch(`${API_URL}/stats/globalActionSum?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    return response.json();
};

type DailyCount = {
    date: string;
    label: string;
    count: number;
};

export const groupActionsByDay = (
    actions: TrackAction[],
    days: number = 30
): DailyCount[] => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    const buckets = new Map<string, DailyCount>();
    for (let i = 0; i <= days; i++) {
        const d = new Date(cutoff);
        d.setDate(cutoff.getDate() + i);
        const isoDate = d.toISOString().split("T")[0];
        const label = new Intl.DateTimeFormat("de-DE", {
            timeZone: "Europe/Berlin",
            day: "2-digit",
            month: "short",
        }).format(d);
        buckets.set(isoDate, { date: isoDate, label, count: 0 });
    }

    actions.forEach((action) => {
        const actionDate = new Date(action.timestamp);
        if (actionDate < cutoff || actionDate > now) return;

        const isoDate = actionDate.toISOString().split("T")[0];
        const bucket = buckets.get(isoDate);
        if (bucket) bucket.count += 1;
    });

    return Array.from(buckets.values());
};

