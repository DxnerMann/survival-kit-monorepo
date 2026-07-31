import {api, apiFetch, checkResponse} from "./api.tsx";

const API_URL = api.baseUrl;

export const getDailyCat = async (): Promise<Blob> => {
    const response = await apiFetch(`${API_URL}/daily/cat`);

    await checkResponse(response);

    return response.blob();
}
