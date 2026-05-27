import type {QuickLink} from "../models/QuickLink.tsx";

export const onLinkclick = async (link: QuickLink) => {
    //TODO
}

export const getPreviewImage = async (url: string) => {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data.data.image?.url;
};