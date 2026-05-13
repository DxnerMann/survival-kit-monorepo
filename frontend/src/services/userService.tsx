import type {LoginResponse} from "../models/LoginResponse.tsx";
import {getUsernameFromToken} from "./tokenService.tsx";

let user : LoginResponse;

export function setUserContext(loginResponse : LoginResponse) {
    user = loginResponse;
}

export function getUsername() : string {
    if (!user) {
        const usernameFromToken = getUsernameFromToken()
        if (usernameFromToken) {
            return usernameFromToken;
        }
        return "";
    }
    return user.username;
}
