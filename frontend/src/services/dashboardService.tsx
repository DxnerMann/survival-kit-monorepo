import {api} from "./api.tsx";
import type {UserWidget} from "../models/UserWidget.tsx";
import {authService} from "./authService.tsx";
import LecturePlan from "../components/widget/lecture-plan/LecturePlan.tsx";
import LectureTimer from "../components/widget/lecture-timer/LectureTimer.tsx";

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
    console.log(widgets);
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

const saveWidgetData = async (id : string, data: string)  => {
    try {
        const token = authService.getToken();

        const response = await fetch(`${API_URL}/dashboard/widget`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id,
                data
            })
        })

        if (response.ok) {
            return;
        }
    } catch {
        throw new Error("Failed to Save Widget Data for User");
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

const decideOnWidget = (widget : UserWidget, isPreview : boolean)=> {
    switch (widget.type) {
        case "LECTURE_PLAN":
            return <LecturePlan title={"Vorlesungsplan"} data={widget.data} id={widget.id} isPreview={isPreview} />
        case "LECTURE_TIMER":
            return <LectureTimer title={"Vorlesungstimer"} data={widget.data} id={widget.id} isPreview={isPreview} />
    }
}

export const dashboardService = {
    getDashboardLayout,
    saveDashbordLayout,
    saveWidgetData,
    getDefaultLayout,
    decideOnWidget
}