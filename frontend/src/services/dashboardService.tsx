import {api} from "./api.tsx";
import type {UserWidget} from "../models/UserWidget.tsx";
import {authService} from "./authService.tsx";

const API_URL = api.baseUrl;

const getDashboardLayout =  async () : Promise<UserWidget[]> => {
    try {
        const token = authService.getToken();

        const response = await fetch(`${API_URL}/dashboard`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
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

const saveDashbordLayout = async (widgets : UserWidget[])  => {
    try {
        const token = authService.getToken();

        const response = await fetch(`${API_URL}/dashboard`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(widgets)
        })

        if (response.ok) {
            return;
        }
    } catch {
        throw new Error("Failed to Save Dashboard Layout for User");
    }
}

const getDefaultLayout = () : UserWidget[] => {
    return [
        {
            id: "default-lecture-plan",
            type: "LECTURE_PLAN",
            height: 4,
            width: 5,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-lecture-timer",
            type: "LECTURE_TIMER",
            height: 4,
            width: 5,
            x: 6,
            y: 0,
            data: ""
        }
    ]
}

export const dashboardService = {
    getDashboardLayout,
    saveDashbordLayout,
    getDefaultLayout
}