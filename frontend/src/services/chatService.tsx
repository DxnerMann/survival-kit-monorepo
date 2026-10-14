import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {ChatAttachment, ChatMessage, ChatReactionUpdate} from "@/models/ChatMessage.tsx";

const API_URL = api.baseUrl;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;
const MAX_ATTACHMENTS = 5;

export const CHAT_PAGE_SIZE = 50;

export type ChatMessageQuery = {
    before?: string;
    beforeId?: string;
    after?: string;
    afterId?: string;
    limit?: number;
};

const getUsernames = async (): Promise<string[]> => {
    const response = await apiFetch(`${API_URL}/chat/usernames`);
    await checkResponse(response);
    return response.json();
};

const getMessages = async (query: ChatMessageQuery = {}): Promise<ChatMessage[]> => {
    const params = new URLSearchParams();
    params.set("limit", String(query.limit ?? CHAT_PAGE_SIZE));
    if (query.before) {
        params.set("before", query.before);
    }
    if (query.beforeId) {
        params.set("beforeId", query.beforeId);
    }
    if (query.after) {
        params.set("after", query.after);
    }
    if (query.afterId) {
        params.set("afterId", query.afterId);
    }
    const response = await apiFetch(`${API_URL}/chat/messages?${params}`);
    await checkResponse(response);
    return response.json();
};

type CachedChat = {
    course: string;
    messages: ChatMessage[];
    hasOlder: boolean;
};

let cachedChat: CachedChat | null = null;

export const chatCache = {
    read(course: string): CachedChat | null {
        return cachedChat?.course === course ? cachedChat : null;
    },
    write(course: string, messages: ChatMessage[], hasOlder: boolean) {
        cachedChat = {
            course,
            hasOlder,
            messages: messages.filter(message => !message.id.startsWith("pending-")),
        };
    },
    clear() {
        cachedChat = null;
    },
};

const postMessage = async (payload: {
    text: string | null;
    attachmentIds: string[];
    clientId: string;
    replyToId?: string | null;
}): Promise<ChatMessage> => {
    const response = await apiFetch(`${API_URL}/chat/messages`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
    });
    await checkResponse(response);
    return response.json();
};

const addReaction = async (messageId: string, emoji: string): Promise<ChatReactionUpdate> => {
    const response = await apiFetch(`${API_URL}/chat/messages/${encodeURIComponent(messageId)}/reactions`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({emoji}),
    });
    await checkResponse(response);
    return response.json();
};

const removeReaction = async (messageId: string, emoji: string): Promise<ChatReactionUpdate> => {
    const params = new URLSearchParams({emoji});
    const response = await apiFetch(`${API_URL}/chat/messages/${encodeURIComponent(messageId)}/reactions?${params}`, {
        method: "DELETE",
    });
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
    getUsernames,
    getMessages,
    postMessage,
    addReaction,
    removeReaction,
    uploadAttachment,
    fetchAttachmentBlob,
    getVideoDurationMs,
};
