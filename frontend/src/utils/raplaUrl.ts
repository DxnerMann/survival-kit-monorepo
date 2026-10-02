const isRaplaHost = (host: string) =>
    host === "rapla.dhbw.de" || (host.startsWith("rapla.") && host.endsWith(".dhbw.de"));

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
