export type WebSocketEnvelope<T = unknown> = {
    type: string;
    channel: string | null;
    payload: T;
};

export type WebSocketConnectedPayload = {
    userId: string;
    username: string;
    course: string | null;
};

export type WebSocketErrorPayload = {
    code: string;
    message: string;
};

export type WebSocketPresencePayload = {
    userId: string;
    username: string;
    channel: string;
};

export type WebSocketRelayPayload<T = unknown> = {
    userId: string;
    username: string;
    sentAt: string;
    data: T;
};

export const WebSocketMessageType = {
    CONNECTED: "CONNECTED",
    JOIN: "JOIN",
    JOINED: "JOINED",
    LEAVE: "LEAVE",
    LEFT: "LEFT",
    MESSAGE: "MESSAGE",
    ERROR: "ERROR",
} as const;

export type WebSocketStatus = "disconnected" | "connecting" | "connected";

export type WebSocketMessageHandler = (envelope: WebSocketEnvelope) => void;

export type WebSocketStatusHandler = (status: WebSocketStatus) => void;
