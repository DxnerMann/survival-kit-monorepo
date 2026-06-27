import {api} from "./api.tsx";
import {authService} from "./authService.tsx";
import type {TrackAction} from "../models/TrackAction.tsx";

const API_URL = api.baseUrl;

export const trackActivity = async (action : TrackAction) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/track/action?action=${action}`, {
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