export type UserRole = "USER" | "ADMIN" | "GUEST";

const ROLE_KEY = "userRole";
const USERNAME_KEY = "username";
const SESSION_KEY = "hasSession";

export function setSessionMeta(role: UserRole, username: string) {
    sessionStorage.setItem(ROLE_KEY, role);
    sessionStorage.setItem(USERNAME_KEY, username);
    sessionStorage.setItem(SESSION_KEY, "true");
}

export function clearSessionMeta() {
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    sessionStorage.removeItem(SESSION_KEY);
}

export function hasSessionMeta(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === "true";
}

export function getUserRole(): UserRole | null {
    if (!hasSessionMeta()) return "GUEST";
    const role = sessionStorage.getItem(ROLE_KEY);
    if (role === "USER" || role === "ADMIN" || role === "GUEST") {
        return role;
    }
    return null;
}

export function getUsernameFromToken(): string | null {
    return sessionStorage.getItem(USERNAME_KEY);
}

export function isAdmin(): boolean {
    return getUserRole() === "ADMIN";
}
