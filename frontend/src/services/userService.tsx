import type {LoginResponse} from "../models/LoginResponse.tsx";
import {getUsernameFromToken} from "./tokenService.tsx";
import type {ProfileSettings} from "../models/ProfileSettings.tsx";

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

export async function fetchProfileSettings() : Promise<ProfileSettings> {
    //TODO
}

export async function setUserCourse() : Promise<void> {
    // TODO setUserCourse
}
