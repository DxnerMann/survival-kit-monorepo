import type {LoginResponse} from "@/models/LoginResponse.tsx";
import {getUsernameFromToken} from "@/services/tokenService.tsx";
import type {ProfileSettings} from "@/models/ProfileSettings.tsx";
import {api, apiFetch, checkResponse} from "@/services/api.tsx";

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
    const type = isGif
        ? "image/gif"
        : file.type === "image/jpeg" || file.type === "image/jpg"
            ? "image/jpeg"
            : "image/png";
    const filename = isGif ? "avatar.gif" : type === "image/jpeg" ? "avatar.jpg" : "avatar.png";
    const upload = file.type === type ? file : new File([file], filename, {type});
    const formData = new FormData();
    formData.append("file", upload, filename);

    const response = await apiFetch(`${API_URL}/profile/img`, {
        method: "POST",
        body: formData,
    });

    await checkResponse(response);
}

export async function updateUsernameAndColor(data: {
    color?: string;
    username?: string;
    accentColor?: string | null;
}) {
    const params = new URLSearchParams();

    if (data.color) params.append("color", data.color);
    if (data.username) params.append("username", data.username);
    if ("accentColor" in data) params.append("accentColor", data.accentColor ?? "");

    const response = await apiFetch(`${API_URL}/profile?${params}`, {
        method: "PUT",
    });

    await checkResponse(response);
}
