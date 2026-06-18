import {api} from "./api.tsx";

const API_URL = api.baseUrl;


export const getDailyCat = async () => {
    const response = await fetch(`${API_URL}/daily/cat?`);

    if (!response.ok) {
        throw new Error(`Failed to fetch daily Cat image: ${response.statusText}`);
    }

    return response.blob();
}