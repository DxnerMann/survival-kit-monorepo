import type {LoginResponse} from "../models/LoginResponse.tsx";

let user : LoginResponse;

export function setUserContext(loginResponse : LoginResponse) {
    user = loginResponse;
}

export function getUsername() : string {
    return user.username;
}