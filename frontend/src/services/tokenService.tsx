import {authService} from "./authService.tsx";

export type UserRole = "USER" | "ADMIN" | "GUEST";

interface TokenPayload {
    sub: string;
    role: UserRole;
    username: string;
    exp: number;
}

function getTokenPayload(token: string): TokenPayload | null {
    try {
        const base64Payload = token.split(".")[1];
        const decoded = decodeBase64Url(base64Payload);
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

function decodeBase64Url(str: string) {
    return decodeURIComponent(
        atob(str.replace(/-/g, "+").replace(/_/g, "/"))
            .split("")
            .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
    );
}
export function getUserRole(): UserRole | null {
    const token = authService.getToken();

    if (!token) return "GUEST";

    const payload = getTokenPayload(token);

    return payload?.role ?? null;
}

export function getUsernameFromToken(): string | null {
    const token = authService.getToken();

    if (!token) return null;

    const payload = getTokenPayload(token);

    return payload?.username ?? null;
}

export function isAdmin(): boolean {
    return getUserRole() === "ADMIN";
}