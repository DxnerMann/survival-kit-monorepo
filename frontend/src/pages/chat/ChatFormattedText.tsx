import type {ReactNode} from "react";

type Mark = "bold" | "italic" | "underline" | "strike";

const MARKS: {mark: Mark; open: string; close: string}[] = [
    {mark: "bold", open: "**", close: "**"},
    {mark: "underline", open: "__", close: "__"},
    {mark: "strike", open: "~~", close: "~~"},
    {mark: "italic", open: "*", close: "*"},
];

const wrapMark = (mark: Mark, children: ReactNode, key: string): ReactNode => {
    switch (mark) {
        case "bold":
            return <strong key={key}>{children}</strong>;
        case "italic":
            return <em key={key}>{children}</em>;
        case "underline":
            return <u key={key}>{children}</u>;
        case "strike":
            return <s key={key}>{children}</s>;
    }
};

const findMatch = (text: string) => {
    let bestStart = -1;
    let best: (typeof MARKS)[number] | null = null;
    let bestEnd = -1;

    for (const spec of MARKS) {
        let from = 0;
        while (from < text.length) {
            const start = text.indexOf(spec.open, from);
            if (start < 0) {
                break;
            }
            if (spec.mark === "italic" && text.startsWith("**", start)) {
                from = start + 1;
                continue;
            }
            const end = text.indexOf(spec.close, start + spec.open.length);
            if (end < start + spec.open.length) {
                from = start + 1;
                continue;
            }
            const longer = best != null && start === bestStart && spec.open.length > best.open.length;
            if (bestStart < 0 || start < bestStart || longer) {
                bestStart = start;
                best = spec;
                bestEnd = end;
            }
            break;
        }
    }

    if (!best || bestStart < 0) {
        return null;
    }
    return {spec: best, start: bestStart, end: bestEnd};
};

const parse = (text: string, depth: number, keyPrefix: string): ReactNode[] => {
    if (!text) {
        return [];
    }
    if (depth > 24) {
        return [text];
    }

    const match = findMatch(text);
    if (!match) {
        return [text];
    }

    const inner = text.slice(match.start + match.spec.open.length, match.end);
    const before = text.slice(0, match.start);
    const after = text.slice(match.end + match.spec.close.length);
    const nodes: ReactNode[] = [];
    if (before) {
        nodes.push(before);
    }
    nodes.push(wrapMark(match.spec.mark, parse(inner, depth + 1, `${keyPrefix}i`), `${keyPrefix}m`));
    nodes.push(...parse(after, depth, `${keyPrefix}a`));
    return nodes;
};

export const formatMarkers = {
    bold: "**",
    italic: "*",
    underline: "__",
    strike: "~~",
} as const;

export const wrapSelection = (value: string, start: number, end: number, marker: string) => {
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
        const inner = selected.slice(marker.length, selected.length - marker.length);
        return {value: before + inner + after, start, end: start + inner.length};
    }
    if (before.endsWith(marker) && after.startsWith(marker)) {
        return {
            value: before.slice(0, before.length - marker.length) + selected + after.slice(marker.length),
            start: start - marker.length,
            end: end - marker.length,
        };
    }

    return {
        value: before + marker + selected + marker + after,
        start: start + marker.length,
        end: end + marker.length,
    };
};

const ChatFormattedText = ({text}: {text: string}) => (
    <p className="chat-bubble__text">{parse(text, 0, "t")}</p>
);

export default ChatFormattedText;
