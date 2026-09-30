const FALLBACK_ACCENT = "#ff0000";

export function readThemeAccent(): string {
    const value = getComputedStyle(document.body).getPropertyValue("--color-accent-default").trim();
    return value || FALLBACK_ACCENT;
}

function shadeAccent(hex: string, amount: number): string {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(char => char + char).join("") : clean;
    const num = Number.parseInt(full, 16);
    if (Number.isNaN(num) || full.length !== 6) {
        return FALLBACK_ACCENT;
    }
    const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255]
        .map(channel => Math.round(channel * amount).toString(16).padStart(2, "0"));
    return `#${channels.join("")}`;
}

export function applyAccentOverride(color: string | null | undefined) {
    const body = document.body;
    if (!color) {
        body.style.removeProperty("--color-accent-override");
        body.style.removeProperty("--color-secondary-accent");
        return;
    }
    body.style.setProperty("--color-accent-override", color);
    body.style.setProperty("--color-secondary-accent", shadeAccent(color, 0.42));
}
