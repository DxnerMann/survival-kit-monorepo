import {api, apiFetch} from "@/services/api.tsx";

const API_URL = api.baseUrl;

export type UserActivity = {
    id: string;
    kind: string;
    title: string | null;
    actorUsername: string | null;
    subjectId?: string | null;
};

export const getMyActivities = async (): Promise<UserActivity[]> => {
    const response = await apiFetch(`${API_URL}/activities`);
    if (!response.ok) {
        return [];
    }
    const body = await response.json() as UserActivity[];
    return Array.isArray(body) ? body : [];
};
