import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {CaffeineEntry, CaffeineSource} from "@/models/CaffeineEntry.tsx";

const API_URL = api.baseUrl;

export const CAFFEINE_PRESETS: { source: CaffeineSource; label: string; amountMg: number | null }[] = [
    { source: "MONSTER", label: "Monster Energy (0.5l, 180mg)", amountMg: 180 },
    { source: "REDBULL", label: "Redbull (0.33l, 105mg)", amountMg: 105 },
    { source: "COFFEE", label: "Kaffee (0.2l, 90mg)", amountMg: 90 },
    { source: "TABLET", label: "Tablette (200mg)", amountMg: 200 },
    { source: "OTHER", label: "Andere", amountMg: null },
];

export const HALF_LIFE_HOURS = 5;

export const addCaffeine = async (
    source: CaffeineSource,
    amountMg?: number,
    consumedAt?: string,
): Promise<CaffeineEntry> => {
    const response = await apiFetch(`${API_URL}/caffeine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, amountMg, consumedAt }),
    });
    await checkResponse(response);
    return response.json();
};

export const deleteCaffeine = async (id: string): Promise<void> => {
    const response = await apiFetch(`${API_URL}/caffeine/${id}`, {
        method: "DELETE",
    });
    await checkResponse(response);
};

export const sourceLabel = (source: CaffeineSource): string => {
    return CAFFEINE_PRESETS.find((preset) => preset.source === source)?.label ?? source;
};

export const toDateTimeLocalValue = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getTodayCaffeine = async (): Promise<CaffeineEntry[]> => {
    const response = await apiFetch(`${API_URL}/caffeine/today`);
    await checkResponse(response);
    return response.json();
};

export const getUserCaffeineEntries = async (): Promise<CaffeineEntry[]> => {
    const response = await apiFetch(`${API_URL}/caffeine/user`);
    await checkResponse(response);
    return response.json();
};

export const getCourseCaffeineEntries = async (): Promise<CaffeineEntry[]> => {
    const response = await apiFetch(`${API_URL}/caffeine/course`);
    await checkResponse(response);
    return response.json();
};

export const getGlobalCaffeineEntries = async (): Promise<CaffeineEntry[]> => {
    const response = await apiFetch(`${API_URL}/caffeine/global`);
    await checkResponse(response);
    return response.json();
};

export const getUserCaffeineAverage = async (): Promise<number> => {
    const response = await apiFetch(`${API_URL}/caffeine/average/user`);
    await checkResponse(response);
    return response.json();
};

export const getCourseCaffeineAverage = async (): Promise<number> => {
    const response = await apiFetch(`${API_URL}/caffeine/average/course`);
    await checkResponse(response);
    return response.json();
};

export const getGlobalCaffeineAverage = async (): Promise<number> => {
    const response = await apiFetch(`${API_URL}/caffeine/average/global`);
    await checkResponse(response);
    return response.json();
};

export const remainingCaffeineMg = (amountMg: number, consumedAt: Date, at: Date): number => {
    const hours = (at.getTime() - consumedAt.getTime()) / (1000 * 60 * 60);
    if (hours < 0) return 0;
    return amountMg * Math.pow(0.5, hours / HALF_LIFE_HOURS);
};

export const buildHalfLifeSeries = (entries: CaffeineEntry[]): { time: string; mg: number }[] => {
    const berlinNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    const dayStart = new Date(berlinNow);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(berlinNow);
    dayEnd.setHours(23, 59, 0, 0);

    const parsed = entries.map((e) => ({
        amountMg: e.amountMg,
        consumedAt: new Date(e.consumedAt),
    }));

    const points: { time: string; mg: number }[] = [];
    const stepMinutes = 15;

    for (let t = dayStart.getTime(); t <= dayEnd.getTime(); t += stepMinutes * 60 * 1000) {
        const at = new Date(t);
        let mg = 0;
        for (const entry of parsed) {
            if (entry.consumedAt <= at) {
                mg += remainingCaffeineMg(entry.amountMg, entry.consumedAt, at);
            }
        }
        const label = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
        points.push({ time: label, mg: Math.round(mg * 10) / 10 });
    }

    return points;
};

export const getPeakMg = (series: { mg: number }[]): number => {
    if (series.length === 0) return 0;
    return Math.max(...series.map((p) => p.mg));
};

export const getCurrentBloodCaffeineMg = (
    entries: CaffeineEntry[],
    at: Date = new Date(),
): number => {
    let mg = 0;
    for (const entry of entries) {
        const consumedAt = new Date(entry.consumedAt);
        if (consumedAt <= at) {
            mg += remainingCaffeineMg(entry.amountMg, consumedAt, at);
        }
    }
    return Math.round(mg * 10) / 10;
};

export const getTodayConsumedMg = (entries: CaffeineEntry[]): number =>
    entries.reduce((sum, entry) => sum + entry.amountMg, 0);

export const caffeineComment = (peakMg: number): string => {
    if (peakMg <= 0) return "Noch kein Koffein geloggt. Mutig – oder einfach noch nicht wach genug zum Klicken.";
    if (peakMg < 50) return "Das ist ja kaum mehr als ein Schluck Leitungswasser mit Ambitionen.";
    if (peakMg < 150) return "Solide Basisdosis. Die Vorlesung hat jetzt zumindest eine Chance.";
    if (peakMg < 300) return "Klassischer Überlebensmodus. Dein Fokus und dein Puls sind sich einig.";
    if (peakMg <= 400) return "Dein Herz schickt Grüße. Die Profs auch, vermutlich.";
    return "Peak jenseits von Gut und Böse. Bitte nicht auch noch Dualis öffnen.";
};
