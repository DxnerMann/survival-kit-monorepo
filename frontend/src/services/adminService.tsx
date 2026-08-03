import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {SecurityLog} from "@/models/SecurityLog.tsx";
import type {Page} from "@/models/Page.tsx";
import type {ProfileSettings} from "@/models/ProfileSettings.tsx";

const API_URL = api.baseUrl;

export const getLatestLogs = async (
    pageSize?: number,
    continuation?: string | null
): Promise<{ data: SecurityLog[]; continuation: string | null }> => {
    const params = new URLSearchParams();

    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await apiFetch(`${API_URL}/admin/logs?${params.toString()}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    });

    await checkResponse(response);

    return response.json();
}

export async function fetchUsers(pageSize: number, continuation?: string | null): Promise<Page<ProfileSettings>> {
    const params = new URLSearchParams();

    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await apiFetch(`${API_URL}/admin/users?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    await checkResponse(response);

    return response.json();
}

export async function setUserRole(userId: string, newRole: string) {
    const response = await apiFetch(`${API_URL}/admin/users/promote?userId=${userId}&role=${newRole}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    await checkResponse(response);
}
