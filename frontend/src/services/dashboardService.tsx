import {api, checkResponse} from "./api.tsx";
import type {UserWidget} from "../models/UserWidget.tsx";
import {authService} from "./authService.tsx";
import LecturePlan from "../components/widget/lecture-plan/LecturePlan.tsx";
import LectureTimer from "../components/widget/lecture-timer/LectureTimer.tsx";
import Clock from "../components/widget/clock/Clock.tsx";
import DigressionTimer from "../components/widget/digression-timer/DigressionTimer.tsx";
import DailyCat from "../components/widget/cat/DailyCat.tsx";

const API_URL = api.baseUrl;

const getDashboardLayout = async (): Promise<UserWidget[]> => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/dashboard`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    await checkResponse(response);

    return await response.json();
}

const saveDashbordLayout = async (widgets: UserWidget[]): Promise<void> => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/dashboard`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgets)
    })

    await checkResponse(response);
}

const saveWidgetData = async (id: string, data: string): Promise<void> => {
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

    await checkResponse(response);
}

const getDefaultLayout = (): UserWidget[] => {
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

const getDefaultToolbox = (): UserWidget[] => {
    return [
        {
            id: "default-clock",
            type: "CLOCK",
            height: 2,
            width: 2,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-digression-timer",
            type: "DIGRESSION_TIMER",
            height: 3,
            width: 4,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-daily-cat",
            type: "DAILY_CAT",
            height: 2,
            width: 2,
            x: 0,
            y: 0,
            data: ""
        }
    ]
}

const decideOnWidget = (widget: UserWidget, isPreview: boolean) => {
    switch (widget.type) {
        case "LECTURE_PLAN":
            return <LecturePlan title={"Vorlesungsplan"} data={widget.data} id={widget.id} isPreview={isPreview} />
        case "LECTURE_TIMER":
            return <LectureTimer title={"Vorlesungstimer"} data={widget.data} id={widget.id} isPreview={isPreview} />
        case "CLOCK":
            return <Clock title={"Uhr"} data={widget.data} id={widget.id} isPreview={isPreview} />
        case "DIGRESSION_TIMER":
            return <DigressionTimer title={"Schwurbeltimer"} data={widget.data} id={widget.id} isPreview={isPreview} />
        case "DAILY_CAT":
            return <DailyCat title={"Tägliche Katze"} data={widget.data} id={widget.id} isPreview={isPreview} />
    }
}

export const dashboardService = {
    getDashboardLayout,
    saveDashbordLayout,
    saveWidgetData,
    getDefaultLayout,
    getDefaultToolbox,
    decideOnWidget
}