import {api, apiFetch, checkResponse} from "@/services/api.tsx";

const API_URL = api.baseUrl;

export type DrawTool = "pen" | "eraser";

export type DrawPoint = [number, number];

export type DrawStroke = {
    id: string;
    tool: DrawTool;
    color: string;
    width: number;
    points: DrawPoint[];
};

export type DrawStatus = "idle" | "open" | "waiting" | "unknown" | "self";

export type DrawBoard = {
    status: DrawStatus;
    partnerUsername: string;
    channel: string | null;
    strokes: DrawStroke[];
    selfWantsReset: boolean;
    partnerWantsReset: boolean;
};

const emptyBoard = (status: DrawStatus = "idle"): DrawBoard => ({
    status,
    partnerUsername: "",
    channel: null,
    strokes: [],
    selfWantsReset: false,
    partnerWantsReset: false,
});

const readBoard = async (response: Response): Promise<DrawBoard | null> => {
    if (!response.ok) {
        return null;
    }
    const board = await response.json() as Partial<DrawBoard>;
    return {
        status: board.status === "open" || board.status === "waiting" || board.status === "unknown" || board.status === "self"
            ? board.status
            : "idle",
        partnerUsername: typeof board.partnerUsername === "string" ? board.partnerUsername : "",
        channel: typeof board.channel === "string" ? board.channel : null,
        strokes: Array.isArray(board.strokes) ? board.strokes.filter(isStroke) : [],
        selfWantsReset: board.selfWantsReset === true,
        partnerWantsReset: board.partnerWantsReset === true,
    };
};

const isStroke = (value: unknown): value is DrawStroke => {
    if (!value || typeof value !== "object") {
        return false;
    }
    const stroke = value as Partial<DrawStroke>;
    return typeof stroke.id === "string"
        && (stroke.tool === "pen" || stroke.tool === "eraser")
        && typeof stroke.color === "string"
        && typeof stroke.width === "number"
        && Array.isArray(stroke.points);
};

const searchUsers = async (query: string): Promise<string[]> => {
    const response = await apiFetch(`${API_URL}/draw/users?q=${encodeURIComponent(query)}`);
    await checkResponse(response);
    const names = await response.json() as unknown;
    return Array.isArray(names) ? names.filter((name): name is string => typeof name === "string") : [];
};

const loadBoard = async (partner: string): Promise<DrawBoard | null> => {
    const response = await apiFetch(`${API_URL}/draw/board?partner=${encodeURIComponent(partner)}`);
    return readBoard(response);
};

const openBoard = async (partner: string): Promise<DrawBoard> => {
    const response = await apiFetch(`${API_URL}/draw/open`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({partnerUsername: partner}),
    });
    await checkResponse(response);
    return await readBoard(response) ?? emptyBoard();
};

const unpair = async (partner: string): Promise<void> => {
    await apiFetch(`${API_URL}/draw/unpair`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({partnerUsername: partner}),
    });
};

const voteReset = async (partner: string, want: boolean): Promise<DrawBoard | null> => {
    const response = await apiFetch(`${API_URL}/draw/reset`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({partnerUsername: partner, want}),
    });
    await checkResponse(response);
    return readBoard(response);
};

const commitStroke = async (partner: string, stroke: DrawStroke): Promise<void> => {
    await apiFetch(`${API_URL}/draw/strokes`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({partnerUsername: partner, stroke}),
    });
};

export const drawService = {
    searchUsers,
    loadBoard,
    openBoard,
    unpair,
    voteReset,
    commitStroke,
    emptyBoard,
};
