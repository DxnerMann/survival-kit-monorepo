export type MentionQuery = {
    start: number;
    query: string;
};

const continuesMention = (char: string | undefined) =>
    char != null && /[\p{L}\p{N}_-]/u.test(char);

export const mentionQueryAt = (value: string, cursor: number): MentionQuery | null => {
    const before = value.slice(0, Math.max(0, cursor));
    const at = before.lastIndexOf("@");
    if (at < 0) {
        return null;
    }
    if (at > 0 && !/\s/.test(before[at - 1])) {
        return null;
    }
    const query = before.slice(at + 1);
    if (/[\s@]/.test(query)) {
        return null;
    }
    return {start: at, query};
};

export const filterMentionUsernames = (usernames: string[], query: string): string[] => {
    const needle = query.toLocaleLowerCase("de");
    return usernames
        .filter(name => name.toLocaleLowerCase("de").startsWith(needle))
        .sort((left, right) => left.localeCompare(right, "de", {sensitivity: "base"}));
};

export const mentionRanges = (text: string, usernames: string[]): {start: number; end: number}[] => {
    const sorted = usernames
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .sort((left, right) => right.length - left.length);
    if (sorted.length === 0 || !text.includes("@")) {
        return [];
    }

    const ranges: {start: number; end: number}[] = [];
    let index = 0;
    while (index < text.length) {
        const atBoundary = index === 0 || /\s/.test(text[index - 1]);
        if (text[index] === "@" && atBoundary) {
            const rest = text.slice(index + 1);
            const hit = sorted.find(name => {
                const candidate = rest.slice(0, name.length);
                return candidate.toLocaleLowerCase("de") === name.toLocaleLowerCase("de")
                    && !continuesMention(rest[name.length]);
            });
            if (hit) {
                const end = index + 1 + hit.length;
                ranges.push({start: index, end});
                index = end;
                continue;
            }
        }
        index += 1;
    }
    return ranges;
};
