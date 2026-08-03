import type {QuickLink} from "@/models/QuickLink.tsx";
import {api, apiFetch, checkResponse} from "@/services/api.tsx";

const API_URL = api.baseUrl;

export const onLinkClick = async (link: QuickLink) => {
    await apiFetch(`${API_URL}/link/click?linkId=${link.id}`, { method: "POST" });
};

export const getPreviewImage = async (url: string): Promise<string> => {
    if (!url.includes("http")) return "/images/dhbw-logo.png";

    try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const image = data?.data?.image?.url;
        if (image) return `https://images.weserv.nl/?url=${encodeURIComponent(image)}`;
    } catch { /* fall through */ }

    try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`);
        const data = await res.json();
        const screenshot = data?.data?.screenshot?.url;
        if (screenshot) return screenshot;
    } catch { /* fall through */ }

    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

export const getQuickLinksFiltered = async (
    sortByPopularity: boolean,
    approved?: boolean,
    pageSize?: number,
    continuation?: string | null
): Promise<{ data: QuickLink[]; continuation: string | null }> => {
    const params = new URLSearchParams();

    params.set("sortByPopularity", String(sortByPopularity));

    if (approved !== undefined) params.set("approved", String(approved));
    if (pageSize !== undefined) params.set("pageSize", String(pageSize));
    if (continuation) params.set("continuation", continuation);

    const response = await apiFetch(`${API_URL}/link/filter?${params.toString()}`);

    await checkResponse(response);

    return response.json();
};

export const suggestLink = async (data: {
    title: string;
    description: string;
    url: string;
}) => {
    const response = await apiFetch(`${API_URL}/link`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    await checkResponse(response);

    return response.json();
};

export const approveLink = async (data: {
    linkId: string;
    approved: boolean;
    improvedDescription: string;
    improvedTitle: string;
}) => {
    const response = await apiFetch(`${API_URL}/link/approve`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    await checkResponse(response);

    return;
};
