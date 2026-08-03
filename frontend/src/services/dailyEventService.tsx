import {api, apiFetch, checkResponse} from "@/services/api.tsx";

const API_URL = api.baseUrl;

let dailyCatPromise: Promise<Blob> | null = null;

export const getDailyCat = (): Promise<Blob> => {
    if (!dailyCatPromise) {
        dailyCatPromise = (async () => {
            const response = await apiFetch(`${API_URL}/daily/cat`);
            await checkResponse(response);
            return response.blob();
        })();
    }
    return dailyCatPromise;
}
