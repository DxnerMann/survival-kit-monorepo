import {api} from "./api.tsx";
import {authService} from "./authService.tsx";
import type {Lecture} from "../models/Lecture.tsx";

const API_URL = api.baseUrl;

const getAvailableCourses =  async () : Promise<string[]> => {
    try {

        const response = await fetch(`${API_URL}/profile/courses`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (response.ok) {
            return await response.json();
        }
        else {
            return [];
        }
    } catch {
        return [];
    }
}

const getCourseOrExtract =  async (raplaUrl? : string) : Promise<string> => {

    let response;

    if (raplaUrl) {
        response = await fetch(
            `${API_URL}/profile/course?raplaUrl=${encodeURIComponent(raplaUrl)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

    } else {
        const token = authService.getToken();

        response = await fetch(`${API_URL}/profile/course`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,

                'Content-Type': 'application/json',
            }
        });
    }

    if (response.ok) {
        return await response.text();
    } else {
        throw new Error("Failed to get Course");
    }
}

const getLecturesForWeek = async (weekOffset: number, course: string) : Promise<Lecture[]> => {
    const response = await fetch(
        `${API_URL}/lecture/week?weekOffset=${weekOffset}&course=${course}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error("Failed to get Lectures for Week");
    }
}

export const lectureService = {
    getAvailableCourses,
    getCourseOrExtract,
    getLecturesForWeek
}