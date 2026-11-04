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
    private channelRefs = new Map<string, number>();
    private stickyChannels = new Set<string>();
    private explicitDisconnect = false;
    private reconnectAttempt = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private connectedUserId: string | null = null;

    connect(): void {
        this.explicitDisconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
            return;
        }

        this.setStatus("connecting");
        const socket = new WebSocket(getWebSocketUrl());
        this.socket = socket;

        socket.onopen = () => {
            if (this.socket !== socket) {
                return;
            }
            this.reconnectAttempt = 0;
            this.setStatus("connected");
            this.flushPendingMessages();
            this.rejoinChannels();
        };

        socket.onmessage = (event) => {
            try {
                const envelope = JSON.parse(event.data) as WebSocketEnvelope;
                if (envelope.type === WebSocketMessageType.CONNECTED) {
                    const userId = (envelope.payload as {userId?: string} | null)?.userId;
                    if (userId) {
                        this.connectedUserId = userId;
                    }
                    this.rejoinChannels();
                }
                this.messageHandlers.forEach(handler => handler(envelope));
            } catch {
                // ignore malformed payloads
            }
        };

        socket.onclose = () => {
            if (this.socket !== socket) {
                return;
            }
            this.socket = null;
            this.setStatus("disconnected");
            if (!this.explicitDisconnect) {
                this.scheduleReconnect();
            }
        };
    }

    disconnect(): void {
        this.explicitDisconnect = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.joinedChannels.clear();
        this.channelRefs.clear();
        this.stickyChannels.clear();
        this.pendingMessages = [];
        this.socket?.close();
        this.socket = null;
        this.setStatus("disconnected");
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    getConnectedUserId(): string | null {
        return this.connectedUserId;
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
        const next = (this.channelRefs.get(channel) ?? 0) + 1;
        this.channelRefs.set(channel, next);
        this.joinedChannels.add(channel);
        if (next === 1) {
            this.send({
                type: WebSocketMessageType.JOIN,
                channel,
                payload: null,
            });
        }
    }

    ensureJoined(channel: string): void {
        this.stickyChannels.add(channel);
        if (this.joinedChannels.has(channel)) {
            return;
        }
        this.joinChannel(channel);
    }

    releaseJoined(channel: string): void {
        if (!this.stickyChannels.delete(channel)) {
            return;
        }
        this.leaveChannel(channel);
    }

    resendJoin(channel: string): void {
        if (!this.joinedChannels.has(channel)) {
            this.joinChannel(channel);
            return;
        }
        this.send({
            type: WebSocketMessageType.JOIN,
            channel,
            payload: null,
        });
    }

    leaveChannel(channel: string): void {
        const current = this.channelRefs.get(channel) ?? 0;
        if (current > 1) {
            this.channelRefs.set(channel, current - 1);
            return;
        }
        if (current <= 0) {
            return;
        }
        this.channelRefs.delete(channel);
        this.joinedChannels.delete(channel);
        this.stickyChannels.delete(channel);
        this.send({
            type: WebSocketMessageType.LEAVE,
            channel,
            payload: null,
        });
    }

    reconnect(): void {
        this.explicitDisconnect = false;
        const socket = this.socket;
        this.socket = null;
        socket?.close();
        this.connect();
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

    private scheduleReconnect(): void {
        if (this.explicitDisconnect || this.reconnectTimer) {
            return;
        }
        const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 8000);
        this.reconnectAttempt += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
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
    getConnectedUserId: () => client.getConnectedUserId(),
    getStatus: () => client.getStatus(),
    subscribe: (handler: WebSocketMessageHandler) => client.subscribe(handler),
    onStatusChange: (handler: WebSocketStatusHandler) => client.onStatusChange(handler),
    send: (envelope: WebSocketEnvelope) => client.send(envelope),
    joinChannel: (channel: string) => client.joinChannel(channel),
    resendJoin: (channel: string) => client.resendJoin(channel),
    ensureJoined: (channel: string) => client.ensureJoined(channel),
    releaseJoined: (channel: string) => client.releaseJoined(channel),
    leaveChannel: (channel: string) => client.leaveChannel(channel),
    reconnect: () => client.reconnect(),
    sendMessage: <T,>(channel: string, payload: T) => client.sendMessage(channel, payload),
    getWebSocketUrl,
};
