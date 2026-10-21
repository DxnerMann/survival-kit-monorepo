export type ChatLink = {
    start: number;
    end: number;
    href: string;
};

const LINK_RE = /(?<![\p{L}\p{N}_@./-])(?:(?:https?:\/\/|www\.)[^\s<>"']+|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,24}(?:[/?#][^\s<>"']*)?)/giu;

const trimUrl = (raw: string) => {
    let end = raw.length;
    while (end > 0 && /[.,;:!?)\]}'"]/.test(raw[end - 1])) {
        const mark = raw[end - 1];
        if (mark === ")" ) {
            const head = raw.slice(0, end);
            const opened = head.match(/\(/g)?.length ?? 0;
            const closed = head.match(/\)/g)?.length ?? 0;
            if (opened >= closed) {
                break;
            }
        }
        end -= 1;
    }
    return raw.slice(0, end);
};

const hrefFor = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export const linkRanges = (text: string): ChatLink[] => {
    if (!text) {
        return [];
    }
    const ranges: ChatLink[] = [];
    for (const match of text.matchAll(LINK_RE)) {
        const raw = match[0];
        const start = match.index ?? 0;
        const url = trimUrl(raw);
        if (!url || !url.includes(".")) {
            continue;
        }
        ranges.push({start, end: start + url.length, href: hrefFor(url)});
    }
    return ranges;
};
