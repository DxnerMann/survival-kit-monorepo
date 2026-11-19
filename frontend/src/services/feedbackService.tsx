import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {Feedback, FeedbackType} from "@/models/Feedback.tsx";
import type {UserVote, VoteResult} from "@/models/Vote.tsx";

const API_URL = api.baseUrl;

export const submitFeedback = async (title: string, description: string, type: FeedbackType): Promise<void> => {
    const response = await apiFetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: {
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

    const response = await apiFetch(`${API_URL}/feedback?${params.toString()}`);

    await checkResponse(response);

    return response.json();
}

export const rateFeedback = async (id: string, upVote: boolean): Promise<VoteResult> => {
    const response = await apiFetch(`${API_URL}/feedback/rate?id=${id}&upVote=${upVote}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);
    return response.json();
}

export const getMyFeedbackVotes = async (): Promise<UserVote[]> => {
    const response = await apiFetch(`${API_URL}/feedback/votes`);
    await checkResponse(response);
    const body = await response.json() as UserVote[];
    return Array.isArray(body) ? body : [];
}

export const getArchivedFeedback = async (): Promise<Feedback[]> => {
    const response = await apiFetch(`${API_URL}/feedback/archive`);
    await checkResponse(response);
    const body = await response.json() as Feedback[];
    return Array.isArray(body) ? body : [];
}

export const resolveFeedback = async (id: string): Promise<void> => {
    const response = await apiFetch(`${API_URL}/feedback/resolve?id=${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);
}

export const deleteFeedback = async (id: string): Promise<void> => {
    const response = await apiFetch(`${API_URL}/feedback?id=${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);
}

export const answerFeedback = async (id: string, answer: string): Promise<void> => {
    const response = await apiFetch(`${API_URL}/feedback/answer`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: id,
            answer: answer
        })
    })

    await checkResponse(response);
}

export type AnsweredFeedback = {
    id: string
    title: string
}

export const getAnsweredFeedback = async (): Promise<AnsweredFeedback[]> => {
    const response = await apiFetch(`${API_URL}/feedback/answered`);
    if (!response.ok) {
        return [];
    }
    const body = await response.json() as AnsweredFeedback[];
    return Array.isArray(body) ? body : [];
};

export const hasAlreadyVoted = async (id: string): Promise<boolean> => {
    const response = await apiFetch(`${API_URL}/feedback/alreadyVoted?id=${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })

    await checkResponse(response);

    return response.json();
}
