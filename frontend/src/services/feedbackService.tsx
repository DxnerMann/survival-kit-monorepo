import {api} from "./api.tsx";
import type {Feedback, FeedbackType} from "../models/Feedback.tsx";
import {authService} from "./authService.tsx";

const API_URL = api.baseUrl;

export const submitFeedback = async (title: string, description: string, type: FeedbackType) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: title,
            description: description,
            type: type
        })
    })

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }
}

export const getFeedback = async (
    pageSize?: number,
    continuation?: string | null
): Promise<{ data: Feedback[]; continuation: string | null }> => {
    const params = new URLSearchParams();

    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await fetch(`${API_URL}/feedback?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch quick links: ${response.statusText}`);
    }

    return response.json();
}

export const rateFeedback = async (id: string, upVote: boolean) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback/rate?id=${id}&upVote=${upVote}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }
}

export const deleteFeedback = async (id: string) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback?id=${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }
}

export const answerFeedback = async (id: string, answer: string) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback/answer`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: id,
            answer: answer
        })
    })

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }
}

export const hasAlreadyVoted = async (id: string) : Promise<boolean> => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback/alreadyVoted?id=${id}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })

    if (!response.ok) {
        throw new Error("Es ist ein unerwarteter Fehler aufgetreten");
    }

    return response.json();
}