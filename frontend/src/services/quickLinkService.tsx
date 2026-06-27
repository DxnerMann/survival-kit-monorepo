import type {QuickLink} from "../models/QuickLink.tsx";
import {api} from "./api.tsx";
import {authService} from "./authService.tsx";

const API_URL = api.baseUrl;

export const onLinkClick = async (link: QuickLink) => {
    await fetch(`${API_URL}/link/click?linkId=${link.id}`, { method: "POST" });
};

export const getPreviewImage = async (url: string): Promise<string> => {

    // local Files (f.e. Loslassen.pdf)
    if (!url.includes("http")) return "/images/dhbw-logo.png";

    // 1. Try microlink for OG/meta image (proxy through weserv to avoid CORP block)
    try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const image = data?.data?.image?.url;
        if (image) return `https://images.weserv.nl/?url=${encodeURIComponent(image)}`;
    } catch { /* fall through */ }

    // 2. Try microlink screenshot (served from microlink's own CDN, no CORP issue)
    try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`);
        const data = await res.json();
        const screenshot = data?.data?.screenshot?.url;
        if (screenshot) return screenshot;
    } catch { /* fall through */ }

    // 3. Favicon as last resort (always works)
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

    const response = await fetch(`${API_URL}/link/filter?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch quick links: ${response.statusText}`);
    }

    return response.json();
};

export const suggestLink = async (data: {
    title: string;
    description: string;
    url: string;
}) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/link`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error("Fehler beim Senden des Vorschlags");
    }

    return response.json();
};

export const approveLink = async (data: {
    linkId: string;
    approved: boolean;
    improvedDescription: string;
    improvedTitle: string;
}) => {
    const response = await fetch(`${API_URL}/link/approve`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error("Error trying to Approve / Disapprove");
    }

    return;
};