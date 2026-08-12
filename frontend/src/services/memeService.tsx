import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {Meme} from "@/models/Meme.tsx";
import type {Page} from "@/models/Page.tsx";

const API_URL = api.baseUrl;

export async function getMemes(pageSize?: number, continuation?: string | null): Promise<Page<Meme>> {
    const params = new URLSearchParams();

    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const query = params.toString();
    const response = await apiFetch(`${API_URL}/memes${query ? `?${query}` : ""}`);

    await checkResponse(response);

    return response.json();
}

export async function getMemesForAdmin(
    course?: string | null,
    pageSize?: number,
    continuation?: string | null
): Promise<Page<Meme>> {
    const params = new URLSearchParams();

    if (course) params.set("course", course);
    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const query = params.toString();
    const response = await apiFetch(`${API_URL}/memes/admin${query ? `?${query}` : ""}`);

    await checkResponse(response);

    return response.json();
}

export async function uploadMeme(data: {
    file: File;
    title?: string;
    description?: string;
}): Promise<void> {
    const formData = new FormData();
    formData.append("file", data.file);

    if (data.title?.trim()) {
        formData.append("title", data.title.trim());
    }

    if (data.description?.trim()) {
        formData.append("description", data.description.trim());
    }

    const response = await apiFetch(`${API_URL}/memes`, {
        method: "POST",
        body: formData,
    });

    await checkResponse(response);
}

export async function deleteMeme(id: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/memes/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });

    await checkResponse(response);
}
