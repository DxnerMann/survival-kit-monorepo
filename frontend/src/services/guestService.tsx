import {api, apiFetch} from "@/services/api.tsx";

const API_URL = api.baseUrl;

export const touchGuest = async (): Promise<void> => {
    await apiFetch(`${API_URL}/guests/presence`, {
        method: "POST",
    });
};
