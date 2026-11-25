import {api, apiFetch, checkResponse} from "@/services/api.tsx";
import type {UserWidget} from "@/models/UserWidget.tsx";
import LecturePlan from "@/components/widgets/lecture-plan/LecturePlan.tsx";
import LectureTimer from "@/components/widgets/lecture-timer/LectureTimer.tsx";
import Clock from "@/components/widgets/clock/Clock.tsx";
import DigressionTimer from "@/components/widgets/digression-timer/DigressionTimer.tsx";
import DailyCat from "@/components/widgets/cat/DailyCat.tsx";
import DailyMeme from "@/components/widgets/daily-meme/DailyMeme.tsx";
import CurrentCaffeine from "@/components/widgets/current-caffeine/CurrentCaffeine.tsx";
import FavGames from "@/components/widgets/fav-games/FavGames.tsx";
import Fegefeuer from "@/components/widgets/fegefeuer/Fegefeuer.tsx";
import Counter from "@/components/widgets/counter/Counter.tsx";
import Leaderboard from "@/components/widgets/leaderboard/Leaderboard.tsx";
import SectionHeadingWidget from "@/components/widgets/section-heading/SectionHeadingWidget.tsx";
import DrawBoard from "@/components/widgets/draw/DrawBoard.tsx";

const API_URL = api.baseUrl;

const latestWidgetData = new Map<string, string>();
const widgetDataListeners = new Set<(id: string, data: string) => void>();

const rememberWidgetData = (id: string, data: string) => {
    if (!id) {
        return;
    }
    latestWidgetData.set(id, data);
    widgetDataListeners.forEach(listener => listener(id, data));
};

const subscribeWidgetData = (listener: (id: string, data: string) => void) => {
    widgetDataListeners.add(listener);
    return () => {
        widgetDataListeners.delete(listener);
    };
};

const widgetData = (id: string, fallback: string): string => {
    return latestWidgetData.get(id) ?? fallback;
};

const getDashboardLayout = async (): Promise<UserWidget[]> => {
    const response = await apiFetch(`${API_URL}/dashboard`, {
        method: 'GET',
    })

    await checkResponse(response);

    return await response.json();
}

const saveDashbordLayout = async (widgets: UserWidget[]): Promise<void> => {
    const response = await apiFetch(`${API_URL}/dashboard`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgets)
    })

    await checkResponse(response);
}

const saveWidgetData = async (id: string, data: string): Promise<void> => {
    rememberWidgetData(id, data);
    const response = await apiFetch(`${API_URL}/dashboard/widget`, {
        method: 'POST',
        headers: {
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
            id: "default-fegefeuer",
            type: "FEGEFEUER",
            height: 2,
            width: 2,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-counter",
            type: "COUNTER",
            height: 3,
            width: 4,
            x: 0,
            y: 0,
            data: ""
        },
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
        },
        {
            id: "default-daily-meme",
            type: "DAILY_MEME",
            height: 2,
            width: 2,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-current-caffeine",
            type: "CURRENT_CAFFEINE",
            height: 1,
            width: 2,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-fav-games",
            type: "FAV_GAMES",
            height: 2,
            width: 2,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-leaderboard",
            type: "LEADERBOARD",
            height: 4,
            width: 3,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-draw",
            type: "DRAW",
            height: 3,
            width: 3,
            x: 0,
            y: 0,
            data: ""
        },
        {
            id: "default-section-heading",
            type: "SECTION_HEADING",
            height: 1,
            width: 10,
            x: 0,
            y: 0,
            data: ""
        }
    ]
}

const decideOnWidget = (widget: UserWidget, isPreview: boolean, editable = false) => {
    const shared = {
        title: "",
        data: widget.data,
        id: widget.id,
        isPreview,
        width: widget.width,
        height: widget.height,
    };

    switch (widget.type) {
        case "LECTURE_PLAN":
            return <LecturePlan {...shared} title={"Vorlesungsplan"} />
        case "LECTURE_TIMER":
            return <LectureTimer {...shared} title={"Vorlesungstimer"} />
        case "CLOCK":
            return <Clock {...shared} title={"Uhr"} />
        case "DIGRESSION_TIMER":
            return <DigressionTimer {...shared} title={"Schwurbeltimer"} />
        case "DAILY_CAT":
            return <DailyCat {...shared} title={"Tägliche Katze"} />
        case "DAILY_MEME":
            return <DailyMeme {...shared} title={"Tagesmeme"} />
        case "CURRENT_CAFFEINE":
            return <CurrentCaffeine {...shared} title={"Aktuelles Koffein"} />
        case "FAV_GAMES":
            return <FavGames {...shared} title={"Lieblingsspiele"} />
        case "FEGEFEUER":
            return <Fegefeuer {...shared} title={"Fegefeuer"} />
        case "COUNTER":
            return <Counter {...shared} title={"Zähler"} />
        case "LEADERBOARD":
            return <Leaderboard {...shared} title={"Leaderboard"} />
        case "SECTION_HEADING":
            return <SectionHeadingWidget {...shared} title={"Section Heading"} editable={editable} />
        case "DRAW":
            return <DrawBoard {...shared} title={"Dummes Rumgekritzel Aufm Whiteboard (DRAW)"} />
    }
}

export const dashboardService = {
    getDashboardLayout,
    saveDashbordLayout,
    saveWidgetData,
    widgetData,
    subscribeWidgetData,
    getDefaultLayout,
    getDefaultToolbox,
    decideOnWidget
}
