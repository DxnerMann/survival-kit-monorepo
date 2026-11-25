export interface CustomEvent {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    room: string | null;
    description: string | null;
    owned: boolean;
    participation: "OWNER" | "ACCEPTED" | "DECLINED";
}

export const DEFAULT_CUSTOM_EVENT_COLOR = "#2563eb";

export const CUSTOM_EVENTS_CHANGED = "lsk-custom-events-changed";

export const notifyCustomEventsChanged = () => {
    window.dispatchEvent(new Event(CUSTOM_EVENTS_CHANGED));
};
