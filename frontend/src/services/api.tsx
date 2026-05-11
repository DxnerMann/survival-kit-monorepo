const API_URL = import.meta.env.VITE_API_BASE_URL;

const API_VERSION = "v1"

export const api = {
    baseUrl: API_URL +  "/" + API_VERSION,
}