import {api, checkResponse} from "./api.tsx";
import type {SecurityLog} from "../models/SecurityLog.tsx";
import {authService} from "./authService.tsx";

const API_URL = api.baseUrl;

export const getLatestLogs = async (
    pageSize?: number,
    continuation?: string | null
): Promise<{ data: SecurityLog[]; continuation: string | null }> => {
    const params = new URLSearchParams();
    const token = authService.getToken();

    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await fetch(`${API_URL}/security/logs?${params.toString()}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    await checkResponse(response);

    return response.json();
};