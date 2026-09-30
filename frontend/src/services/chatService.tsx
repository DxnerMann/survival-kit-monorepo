import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {ChatAttachment, ChatMessage} from "@/models/ChatMessage.tsx";

const API_URL = api.baseUrl;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;
const MAX_ATTACHMENTS = 5;

const getMessages = async (): Promise<ChatMessage[]> => {
    const response = await apiFetch(`${API_URL}/chat/messages`);
    await checkResponse(response);
    return response.json();
};

const uploadAttachment = async (file: File, durationMs?: number): Promise<ChatAttachment> => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    if (durationMs != null) {
        formData.append("durationMs", String(Math.round(durationMs)));
    }

    const response = await apiFetch(`${API_URL}/chat/attachments`, {
        method: "POST",
        body: formData,
    });
    await checkResponse(response);
    return response.json();
};

const fetchAttachmentBlob = async (id: string): Promise<Blob> => {
    const response = await apiFetch(`${API_URL}/chat/attachments/${id}`);
    await checkResponse(response);
    return response.blob();
};

const getVideoDurationMs = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(video.duration * 1000);
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Video konnte nicht gelesen werden."));
        };
        video.src = url;
    });
};

export const chatLimits = {
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
    MAX_FILE_BYTES,
    MAX_VIDEO_SECONDS,
    MAX_ATTACHMENTS,
};

export const chatService = {
    getMessages,
    uploadAttachment,
    fetchAttachmentBlob,
    getVideoDurationMs,
};
