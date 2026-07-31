import type {LoginResponse} from "../models/LoginResponse.tsx";
import {getUsernameFromToken} from "./tokenService.tsx";
import type {ProfileSettings} from "../models/ProfileSettings.tsx";
import {api, apiFetch, checkResponse} from "./api.tsx";

let user: LoginResponse;
const API_URL = api.baseUrl;


export function setUserContext(loginResponse: LoginResponse) {
    user = loginResponse;
}

export function getUsername(): string {
    if (!user) {
        const usernameFromToken = getUsernameFromToken()
        if (usernameFromToken) {
            return usernameFromToken;
        }
        return "";
    }
    return user.username;
}

export async function fetchProfileSettings(): Promise<ProfileSettings> {
    const response = await apiFetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    await checkResponse(response);

    return response.json();
}

export async function setUserCourse(course: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/profile/course?course=${course}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    await checkResponse(response);
}

export async function uploadProfileImage(file: File | Blob, isGif: boolean): Promise<void> {
    const formData = new FormData();
    const filename = isGif ? "avatar.gif" : "avatar.png";
    formData.append("file", file, filename);

    const response = await apiFetch(`${API_URL}/profile/img`, {
        method: "PUT",
        body: formData,
    });

    await checkResponse(response);
}

export async function updateUsernameAndColor(data: {
    color?: string;
    username?: string;
}) {
    const params = new URLSearchParams();

    if (data.color) params.append("color", data.color);
    if (data.username) params.append("username", data.username);

    const response = await apiFetch(`${API_URL}/profile?${params}`, {
        method: "PUT",
    });

    await checkResponse(response);
}
