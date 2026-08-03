import type {
    WebSocketEnvelope,
    WebSocketMessageHandler,
    WebSocketStatus,
    WebSocketStatusHandler,
} from "@/models/WebSocketEnvelope.tsx";
import {WebSocketMessageType} from "@/models/WebSocketEnvelope.tsx";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

function getWebSocketUrl(): string {
    if (API_URL) {
        const base = API_URL.replace(/\/$/, "").replace(/^http/i, "ws");
        return `${base}/v1/ws`;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/v1/ws`;
}

type PendingMessage = WebSocketEnvelope;

class WebSocketClient {
    private socket: WebSocket | null = null;
    private status: WebSocketStatus = "disconnected";
    private messageHandlers = new Set<WebSocketMessageHandler>();
    private statusHandlers = new Set<WebSocketStatusHandler>();
    private pendingMessages: PendingMessage[] = [];
    private joinedChannels = new Set<string>();

    connect(): void {
        if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
            return;
        }

        this.setStatus("connecting");
        this.socket = new WebSocket(getWebSocketUrl());

        this.socket.onopen = () => {
            this.setStatus("connected");
            this.flushPendingMessages();
            this.rejoinChannels();
        };

        this.socket.onmessage = (event) => {
            try {
                const envelope = JSON.parse(event.data) as WebSocketEnvelope;
                this.messageHandlers.forEach(handler => handler(envelope));
            } catch {
                // ignore malformed payloads
            }
        };

        this.socket.onerror = () => {
            this.setStatus("disconnected");
        };

        this.socket.onclose = () => {
            this.socket = null;
            this.setStatus("disconnected");
        };
    }

    disconnect(): void {
        this.joinedChannels.clear();
        this.pendingMessages = [];
        this.socket?.close();
        this.socket = null;
        this.setStatus("disconnected");
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    getStatus(): WebSocketStatus {
        return this.status;
    }

    subscribe(handler: WebSocketMessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onStatusChange(handler: WebSocketStatusHandler): () => void {
        this.statusHandlers.add(handler);
        return () => this.statusHandlers.delete(handler);
    }

    send(envelope: WebSocketEnvelope): void {
        if (!this.isConnected() || !this.socket) {
            this.pendingMessages.push(envelope);
            return;
        }

        this.socket.send(JSON.stringify(envelope));
    }

    joinChannel(channel: string): void {
        this.joinedChannels.add(channel);
        this.send({
            type: WebSocketMessageType.JOIN,
            channel,
            payload: null,
        });
    }

    leaveChannel(channel: string): void {
        this.joinedChannels.delete(channel);
        this.send({
            type: WebSocketMessageType.LEAVE,
            channel,
            payload: null,
        });
    }

    sendMessage<T>(channel: string, payload: T): void {
        this.send({
            type: WebSocketMessageType.MESSAGE,
            channel,
            payload,
        });
    }

    private flushPendingMessages(): void {
        if (!this.isConnected()) {
            return;
        }

        const queued = [...this.pendingMessages];
        this.pendingMessages = [];
        queued.forEach(message => this.send(message));
    }

    private rejoinChannels(): void {
        this.joinedChannels.forEach(channel => {
            this.send({
                type: WebSocketMessageType.JOIN,
                channel,
                payload: null,
            });
        });
    }

    private setStatus(status: WebSocketStatus): void {
        this.status = status;
        this.statusHandlers.forEach(handler => handler(status));
    }
}

const client = new WebSocketClient();

export const websocketService = {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    isConnected: () => client.isConnected(),
    getStatus: () => client.getStatus(),
    subscribe: (handler: WebSocketMessageHandler) => client.subscribe(handler),
    onStatusChange: (handler: WebSocketStatusHandler) => client.onStatusChange(handler),
    send: (envelope: WebSocketEnvelope) => client.send(envelope),
    joinChannel: (channel: string) => client.joinChannel(channel),
    leaveChannel: (channel: string) => client.leaveChannel(channel),
    sendMessage: <T,>(channel: string, payload: T) => client.sendMessage(channel, payload),
    getWebSocketUrl,
};
