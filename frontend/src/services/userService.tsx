import type {LoginResponse} from "../models/LoginResponse.tsx";
import {getUsernameFromToken} from "./tokenService.tsx";
import type {ProfileSettings} from "../models/ProfileSettings.tsx";
import {authService} from "./authService.tsx";
import {api} from "./api.tsx";

let user : LoginResponse;
const API_URL = api.baseUrl;


export function setUserContext(loginResponse : LoginResponse) {
    user = loginResponse;
}

export function getUsername() : string {
    if (!user) {
        const usernameFromToken = getUsernameFromToken()
        if (usernameFromToken) {
            return usernameFromToken;
        }
        return "";
    }
    return user.username;
}

export async function fetchProfileSettings() : Promise<ProfileSettings> {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        }
    });

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }

    return response.json();
}

export async function setUserCourse(course: string) : Promise<void> {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/course?course=${course}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        }
    });

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }
}
