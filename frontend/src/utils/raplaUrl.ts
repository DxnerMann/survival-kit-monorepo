const isRaplaHost = (host: string) =>
    host === "rapla.dhbw.de" || (host.startsWith("rapla.") && host.endsWith(".dhbw.de"));

export const splitCalendarAccess = (raw: string): { raplaUrl: string; code: string | null } => {
    const trimmed = raw.trim();
    try {
        const url = new URL(trimmed);
        const code = url.searchParams.get("code")?.trim() || null;
        url.searchParams.delete("code");
        return { raplaUrl: url.toString(), code };
    } catch {
        return { raplaUrl: trimmed, code: null };
    }
};

export const withCalendarAccessCode = (raw: string, code: string): string => {
    const plan = normalizeRaplaUrl(splitCalendarAccess(raw).raplaUrl);
    const accessCode = code.trim();
    if (!accessCode) {
        return plan;
    }
    try {
        const url = new URL(plan);
        url.searchParams.set("code", accessCode);
        return url.toString();
    } catch {
        return plan;
    }
};

export const normalizeRaplaUrl = (raw: string): string => {
    const trimmed = raw.trim();
    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return trimmed;
    }

    if (!isRaplaHost(url.hostname.toLowerCase())) {
        return trimmed;
    }

    let path = url.pathname.replace(/\/internal_calendar/gi, "/calendar").replace(/\/$/, "");
    if (!/\/calendar$/i.test(path) && (path === "" || path === "/" || /\/rapla$/i.test(path))) {
        path = "/rapla/calendar";
    }
    url.pathname = path;
    url.hash = "";

    const user = url.searchParams.get("user");
    const file = url.searchParams.get("file");
    const salt = url.searchParams.get("salt");
    const key = url.searchParams.get("key");
    url.search = "";

    if (salt && key) {
        url.searchParams.set("salt", salt);
        url.searchParams.set("key", key);
    } else {
        if (user) {
            url.searchParams.set("user", user);
        }
        if (file) {
            url.searchParams.set("file", file);
        }
    }

    return url.toString();
};
