import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {SecurityLog} from "@/models/SecurityLog.tsx";
import type {Page} from "@/models/Page.tsx";
import type {ProfileSettings} from "@/models/ProfileSettings.tsx";
import type {AdminHealth, StorageUsage} from "@/models/AdminMonitoring.tsx";
import type {Guest} from "@/models/Guest.tsx";

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

export async function fetchGuests(): Promise<Guest[]> {
    const response = await apiFetch(`${API_URL}/admin/guests`, {
        method: "GET",
    });
    await checkResponse(response);
    return response.json();
}

export async function fetchAdminHealth(): Promise<AdminHealth> {
    const response = await apiFetch(`${API_URL}/admin/health`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    await checkResponse(response);
    return response.json();
}

export async function fetchStorageUsage(): Promise<StorageUsage> {
    const response = await apiFetch(`${API_URL}/admin/monitoring/storage`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    await checkResponse(response);
    return response.json();
}
