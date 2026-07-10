import {api, checkResponse} from "./api.tsx";
import type {Feedback, FeedbackType} from "../models/Feedback.tsx";
import {authService} from "./authService.tsx";

const API_URL = api.baseUrl;

export const submitFeedback = async (title: string, description: string, type: FeedbackType): Promise<void> => {
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

    await checkResponse(response);
}

export const getFeedback = async (
    pageSize?: number,
    continuation?: string | null
): Promise<{ data: Feedback[]; continuation: string | null }> => {
    const params = new URLSearchParams();

    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await fetch(`${API_URL}/feedback?${params.toString()}`);

    await checkResponse(response);

    return response.json();
}

export const rateFeedback = async (id: string, upVote: boolean): Promise<void> => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback/rate?id=${id}&upVote=${upVote}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);
}

export const deleteFeedback = async (id: string): Promise<void> => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback?id=${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);
}

export const answerFeedback = async (id: string, answer: string): Promise<void> => {
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

    await checkResponse(response);
}

export const hasAlreadyVoted = async (id: string): Promise<boolean> => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/feedback/alreadyVoted?id=${id}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);

    return response.json();
}