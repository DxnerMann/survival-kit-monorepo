import type {QuickLink} from "../models/QuickLink.tsx";
import {api} from "./api.tsx";

const API_URL = api.baseUrl;

export const onLinkClick = async (link: QuickLink) => {
    await fetch(`${API_URL}/link/click?linkId=${link.id}`, { method: "POST" });
};

export const getPreviewImage = async (url: string) => {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data.data.image?.url;
};

export const getQuickLinksFiltered = async (
    sortByPopularity: boolean,
    approved?: boolean,
    pageSize?: number,
    continuation?: string
): Promise<{ data: QuickLink[]; continuation: string | null }> => {
    const params = new URLSearchParams();

    params.set("sortByPopularity", String(sortByPopularity));

    if (approved !== undefined) params.set("approved", String(approved));
    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await fetch(`${API_URL}/link/filter?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch quick links: ${response.statusText}`);
    }

    return response.json();
};