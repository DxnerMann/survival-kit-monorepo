import {api, checkResponse} from "./api.tsx";

const API_URL = api.baseUrl;

export const getDailyCat = async (): Promise<Blob> => {
    const response = await fetch(`${API_URL}/daily/cat`);

    await checkResponse(response);

    return response.blob();
}