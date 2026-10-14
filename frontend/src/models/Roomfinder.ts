export type FreeRoom = {
    room: string;
    distance: number;
};

export type FreeRoomsPage = {
    data: FreeRoom[];
    continuation?: string | null;
    fromUnix: number;
    toUnix: number;
};

export type BusySlot = {
    start: number;
    end: number;
    summary?: string;
    courses?: string[];
};

export type RoomAvailability = {
    room: string;
    isFree: boolean;
    fromUnix: number;
    toUnix: number;
    busyDuring: BusySlot[];
};

export type RoomDaySchedule = {
    room: string;
    date: string;
    busyDuring: BusySlot[];
};
