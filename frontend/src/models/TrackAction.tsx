export type TrackActionType =
    | "EXMATRICULATED"
    | "GAME_PLAYED"
    | "GAME_SUGGESTED"
    | "IDEA_SUBMITTED"
    | "LOGGED_IN"
    | "PRESENTATION_GAME_PLAYED";

export type TrackAction = {
    id: string,
    type: TrackActionType,
    userIdIfUser: string,
    courseIfUser: string,
    timestamp: string
}
