import type {RankThreshold} from "@/models/RankThreshold.tsx";
import type {UserRank} from "@/models/UserRank.tsx";
import {api, apiFetch} from "@/services/api.tsx";

const API_URL = api.baseUrl;

export const getMyRank = async (): Promise<UserRank | null> => {
    const response = await apiFetch(`${API_URL}/profile/rank`);
    if (!response.ok) {
        return null;
    }
    return response.json() as Promise<UserRank>;
};

export const getRankLadder = async (): Promise<RankThreshold[]> => {
    const response = await apiFetch(`${API_URL}/profile/rank-ladder`);
    if (!response.ok) {
        return [];
    }
    const body = await response.json() as RankThreshold[];
    return Array.isArray(body) ? body : [];
};

export const getLeaderboard = async (): Promise<UserRank[]> => {
    const response = await apiFetch(`${API_URL}/profile/leaderboard`);
    if (!response.ok) {
        return [];
    }
    const body = await response.json() as UserRank[];
    return Array.isArray(body) ? body : [];
};

export const getRanks = async (userIds: string[]): Promise<UserRank[]> => {
    const ids = [...new Set(userIds.map(id => id.trim()).filter(Boolean))].slice(0, 80);
    if (ids.length === 0) {
        return [];
    }
    const params = new URLSearchParams();
    ids.forEach(id => params.append("userIds", id));
    const response = await apiFetch(`${API_URL}/profile/ranks?${params.toString()}`);
    if (!response.ok) {
        return [];
    }
    const body = await response.json() as UserRank[];
    return Array.isArray(body) ? body : [];
};
