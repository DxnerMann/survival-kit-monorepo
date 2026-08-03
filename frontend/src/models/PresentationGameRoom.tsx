export type PresentationGameDifficulty = "EASY" | "MEDIUM" | "HARD";
export type PresentationGameStatus = "LOBBY" | "IN_PROGRESS" | "FINISHED";

export type PresentationGameRoom = {
    id: string;
    name: string;
    hostUsername: string;
    difficulty: PresentationGameDifficulty;
    jurySize: number;
};

export type PresentationGameRoomCreated = {
    id: string;
    name: string;
    joinCode: string;
    isPublic: boolean;
};

export type PresentationGameRoomJoined = {
    id: string;
    name: string;
    joinCode: string;
};

export type PresentationGameRoomMember = {
    userId: string;
    username: string;
    host: boolean;
};

export type PresentationGameState = {
    currentWord: string;
    wordIndex: number;
    totalWords: number;
    presenterPoints: number;
    jurySize: number;
    approvalThreshold: number;
    currentApprovals: number;
    approvingUserIds: string[];
    difficulty: PresentationGameDifficulty;
    status: PresentationGameStatus;
    isHost: boolean;
    isJury: boolean;
    canSkip: boolean;
    canApprove: boolean;
    hasVotedCurrentWord: boolean;
    members: PresentationGameRoomMember[];
};

export type PresentationGameAction = {
    event: "SKIP" | "APPROVE" | "APPROVE_VOTE" | "STARTED" | "FINISHED";
    pointsDelta: number;
    userId: string | null;
    username: string | null;
    presenterPoints: number;
    currentWord: string;
    wordIndex: number;
    totalWords: number;
    currentApprovals: number;
    approvalThreshold: number;
};

export type PresentationGameRoomDetail = {
    id: string;
    name: string;
    joinCode: string;
    hostUserId: string;
    hostUsername: string;
    difficulty: PresentationGameDifficulty;
    status: PresentationGameStatus;
    isPublic: boolean;
    isHost: boolean;
    canJoin: boolean;
    members: PresentationGameRoomMember[];
};

export type PresentationGameFinished = {
    id: string;
    name: string;
    hostUsername: string;
    presenterPoints: number;
    finishedAt: string;
};

export const PRESENTATION_DIFFICULTY_LABELS: Record<PresentationGameDifficulty, string> = {
    EASY: "Leicht",
    MEDIUM: "Mittel",
    HARD: "Schwer",
};

export const PRESENTATION_DIFFICULTY_BADGE: Record<PresentationGameDifficulty, string> = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
};

export const PRESENTATION_STATUS_LABELS: Record<PresentationGameStatus, string> = {
    LOBBY: "Lobby",
    IN_PROGRESS: "Läuft",
    FINISHED: "Beendet",
};
