import type {
    PresentationGameAction,
    PresentationGameDifficulty,
    PresentationGameFinished,
    PresentationGameRoom,
    PresentationGameRoomCreated,
    PresentationGameRoomDetail,
    PresentationGameRoomJoined,
    PresentationGameState,
} from "@/models/PresentationGameRoom.tsx";
import {api, apiFetch, checkResponse} from "@/services/api.tsx";

const API_URL = api.baseUrl;

export const createPresentationRoom = async (data: {
    name: string;
    isPublic: boolean;
    difficulty: PresentationGameDifficulty;
}): Promise<PresentationGameRoomCreated> => {
    const response = await apiFetch(`${API_URL}/presentation-game/rooms`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    });

    await checkResponse(response);
    return response.json();
};

export const getPublicPresentationRooms = async (): Promise<PresentationGameRoom[]> => {
    const response = await apiFetch(`${API_URL}/presentation-game/rooms/public`);
    await checkResponse(response);
    return response.json();
};

export const getFinishedPresentationGames = async (): Promise<PresentationGameFinished[]> => {
    const response = await apiFetch(`${API_URL}/presentation-game/rooms/finished`);
    await checkResponse(response);
    return response.json();
};

export const getPresentationRoomByCode = async (
    code: string,
    autoJoin = true
): Promise<PresentationGameRoomDetail> => {
    const params = new URLSearchParams();
    params.set("autoJoin", String(autoJoin));

    const response = await apiFetch(
        `${API_URL}/presentation-game/rooms/code/${encodeURIComponent(code)}?${params.toString()}`
    );
    await checkResponse(response);
    return response.json();
};

export const joinPresentationRoomById = async (roomId: string): Promise<PresentationGameRoomJoined> => {
    const response = await apiFetch(`${API_URL}/presentation-game/rooms/${roomId}/join`, {
        method: "POST",
    });
    await checkResponse(response);
    return response.json();
};

export const joinPresentationRoomByCode = async (code: string): Promise<PresentationGameRoomJoined> => {
    const response = await apiFetch(`${API_URL}/presentation-game/rooms/join`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({code: code.trim().toUpperCase()}),
    });
    await checkResponse(response);
    return response.json();
};

export const startPresentationRoom = async (code: string): Promise<PresentationGameState> => {
    const response = await apiFetch(
        `${API_URL}/presentation-game/rooms/code/${encodeURIComponent(code)}/start`,
        {method: "POST"}
    );
    await checkResponse(response);
    return response.json();
};

export const finishPresentationRoom = async (code: string): Promise<void> => {
    const response = await apiFetch(
        `${API_URL}/presentation-game/rooms/code/${encodeURIComponent(code)}/finish`,
        {method: "POST"}
    );
    await checkResponse(response);
};

export const approvePresentationWord = async (code: string): Promise<PresentationGameAction> => {
    const response = await apiFetch(
        `${API_URL}/presentation-game/rooms/code/${encodeURIComponent(code)}/approve`,
        {method: "POST"}
    );
    await checkResponse(response);
    return response.json();
};

export const skipPresentationWord = async (code: string): Promise<PresentationGameAction> => {
    const response = await apiFetch(
        `${API_URL}/presentation-game/rooms/code/${encodeURIComponent(code)}/skip`,
        {method: "POST"}
    );
    await checkResponse(response);
    return response.json();
};

export const getPresentationGameState = async (code: string): Promise<PresentationGameState> => {
    const response = await apiFetch(
        `${API_URL}/presentation-game/rooms/code/${encodeURIComponent(code)}/state`
    );
    await checkResponse(response);
    return response.json();
};

export const getPresentationRoomLink = (code: string): string =>
    `${window.location.origin}/presentation-game/${code}`;
