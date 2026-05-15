import type {LoginResponse} from "../models/LoginResponse.tsx";
import {getUsernameFromToken} from "./tokenService.tsx";
import {useEffect, useState} from "react";

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

let timerCourse: string | null = null;
const listeners = new Set<(course: string | null) => void>();

export const setTimerCourse = (course: string | null) => {
    timerCourse = course;
    listeners.forEach(l => l(course));
};

export const useTimerCourse = (): string | null => {
    const [course, setCourse] = useState<string | null>(timerCourse);

    useEffect(() => {
        listeners.add(setCourse);
        return () => { listeners.delete(setCourse); };
    }, []);

    return course;
};
