import {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Copy, ThumbsUp} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Button from "@/components/ui/Button.tsx";
import type {PresentationGameAction, PresentationGameRoomDetail, PresentationGameState} from "@/models/PresentationGameRoom.tsx";
import {
    approvePresentationWord,
    finishPresentationRoom,
    getPresentationGameState,
    getPresentationRoomByCode,
    getPresentationRoomLink,
    skipPresentationWord,
    startPresentationRoom,
} from "@/services/presentationGameService.tsx";
import {getErrorText} from "@/services/api.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import {websocketChannels} from "@/services/websocketChannels.ts";
import {websocketService} from "@/services/websocketService.tsx";
import {WebSocketMessageType} from "@/models/WebSocketEnvelope.tsx";
import {
    PRESENTATION_DIFFICULTY_BADGE,
    PRESENTATION_DIFFICULTY_LABELS,
    PRESENTATION_STATUS_LABELS,
} from "@/models/PresentationGameRoom.tsx";
import PresentationGameFinishedDialog, {
    type PresentationGameFinishedSummary,
} from "@/components/dialog/PresentationGameFinishedDialog.tsx";
import "@/pages/presentation-game/PresentationGameRoomPage.css";

const LOBBY_REFRESH_MS = 3000;
const THUMBS_UP_MS = 1500;
const POINTS_FLOAT_MS = 1200;
const CONNECTION_GRACE_MS = 5000;

type WordSnapshot = {
    wordIndex: number;
    currentApprovals: number;
    currentWord?: string;
    presenterPoints?: number;
};

const isOlderSnapshot = (incoming: WordSnapshot, current: WordSnapshot) => {
    if (incoming.wordIndex !== current.wordIndex) {
        return incoming.wordIndex < current.wordIndex;
    }
    return incoming.currentApprovals < current.currentApprovals;
};

const isSameSnapshot = (incoming: WordSnapshot, current: WordSnapshot) =>
    incoming.wordIndex === current.wordIndex
    && incoming.currentApprovals === current.currentApprovals
    && incoming.currentWord === current.currentWord
    && incoming.presenterPoints === current.presenterPoints;

const applyActionToState = (
    prev: PresentationGameState,
    action: PresentationGameAction,
    myUserId: string | null
): PresentationGameState => {
    if (action.event === "MEMBER_LEFT") {
        const members = action.userId
            ? prev.members.filter(member => member.userId !== action.userId)
            : prev.members;
        const jurySize = Math.max(0, members.length - 1);
        const keepWord = isOlderSnapshot(action, prev) || isSameSnapshot(action, prev);
        const wordIndex = keepWord ? prev.wordIndex : action.wordIndex;
        const totalWords = keepWord ? prev.totalWords : action.totalWords;
        const hasVotedCurrentWord = keepWord ? prev.hasVotedCurrentWord : false;
        const canVote = (!prev.isHost && jurySize > 0) || (prev.isHost && jurySize === 0);
        return {
            ...prev,
            members,
            jurySize,
            isJury: !prev.isHost && jurySize > 0,
            currentWord: keepWord ? prev.currentWord : action.currentWord,
            wordIndex,
            totalWords,
            presenterPoints: keepWord ? prev.presenterPoints : action.presenterPoints,
            currentApprovals: keepWord ? prev.currentApprovals : action.currentApprovals,
            approvalThreshold: action.approvalThreshold,
            approvingUserIds: keepWord ? prev.approvingUserIds : [],
            hasVotedCurrentWord,
            canApprove: canVote && !hasVotedCurrentWord && wordIndex < totalWords,
        };
    }

    if (isOlderSnapshot(action, prev) || isSameSnapshot(action, prev)) {
        return prev;
    }

    if (action.event === "APPROVE" || action.event === "SKIP" || action.event === "STARTED") {
        const canVote = (!prev.isHost && prev.jurySize > 0) || (prev.isHost && prev.jurySize === 0);
        return {
            ...prev,
            currentWord: action.currentWord,
            wordIndex: action.wordIndex,
            totalWords: action.totalWords,
            presenterPoints: action.presenterPoints,
            currentApprovals: action.currentApprovals,
            approvalThreshold: action.approvalThreshold,
            approvingUserIds: [],
            hasVotedCurrentWord: false,
            canApprove: canVote && action.wordIndex < action.totalWords,
        };
    }

    const approvingUserIds =
        action.event === "APPROVE_VOTE" && action.userId
            ? [...new Set([...(prev.approvingUserIds ?? []), action.userId])]
            : prev.approvingUserIds ?? [];
    const hasVotedCurrentWord = prev.hasVotedCurrentWord || (action.userId != null && action.userId === myUserId);

    return {
        ...prev,
        currentWord: action.currentWord,
        wordIndex: action.wordIndex,
        totalWords: action.totalWords,
        presenterPoints: action.presenterPoints,
        currentApprovals: action.currentApprovals,
        approvalThreshold: action.approvalThreshold,
        approvingUserIds,
        hasVotedCurrentWord,
        canApprove: prev.canApprove && !hasVotedCurrentWord,
    };
};

type FloatingPoints = {
    id: number;
    value: string;
    positive: boolean;
};

const PresentationGameRoomPage = () => {
    const {code} = useParams<{code: string}>();
    const navigate = useNavigate();
    const [room, setRoom] = useState<PresentationGameRoomDetail | null>(null);
    const [gameState, setGameState] = useState<PresentationGameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [thumbsUpUserIds, setThumbsUpUserIds] = useState<Set<string>>(new Set());
    const [floatingPoints, setFloatingPoints] = useState<FloatingPoints | null>(null);
    const floatingIdRef = useRef(0);
    const loadRoomSeqRef = useRef(0);
    const roomRef = useRef(room);
    const gameStateRef = useRef(gameState);
    const finishedDialogShownRef = useRef(false);
    const myUserIdRef = useRef<string | null>(websocketService.getConnectedUserId());
    const leftLobbyRef = useRef(false);
    const pendingActionRef = useRef<PresentationGameAction | null>(null);
    const [finishedSummary, setFinishedSummary] = useState<PresentationGameFinishedSummary | null>(null);
    const [showFinishedDialog, setShowFinishedDialog] = useState(false);

    useEffect(() => {
        roomRef.current = room;
    }, [room]);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const openFinishedDialog = useCallback((action: PresentationGameAction) => {
        if (finishedDialogShownRef.current) {
            return;
        }

        const currentRoom = roomRef.current;
        if (!currentRoom) {
            return;
        }

        finishedDialogShownRef.current = true;
        const members = gameStateRef.current?.members ?? currentRoom.members;

        setFinishedSummary({
            roomName: currentRoom.name,
            hostUsername: currentRoom.hostUsername,
            difficulty: currentRoom.difficulty,
            presenterPoints: action.presenterPoints,
            wordIndex: action.wordIndex,
            totalWords: action.totalWords,
            members,
        });
        setShowFinishedDialog(true);
        gameStateRef.current = null;
        setGameState(null);
        setRoom({...currentRoom, status: "FINISHED"});
    }, []);

    const closeFinishedDialog = useCallback(() => {
        finishedDialogShownRef.current = false;
        setShowFinishedDialog(false);
        setFinishedSummary(null);
        navigate("/presentation-game", {replace: true});
    }, [navigate]);

    const commitServerState = useCallback((state: PresentationGameState) => {
        setGameState(prev => {
            const pending = pendingActionRef.current;
            let next = prev && isOlderSnapshot(state, prev) ? prev : state;
            if (pending) {
                next = applyActionToState(next, pending, myUserIdRef.current);
            }
            gameStateRef.current = next;
            return next;
        });
    }, []);

    const loadRoom = useCallback(async () => {
        if (!code) {
            return null;
        }

        const seq = ++loadRoomSeqRef.current;
        const detail = await getPresentationRoomByCode(code, true);
        if (seq !== loadRoomSeqRef.current) {
            return null;
        }

        if (detail.status === "LOBBY" && gameStateRef.current) {
            return detail;
        }

        setRoom(detail);

        if (detail.status === "FINISHED") {
            if (!finishedDialogShownRef.current) {
                navigate("/presentation-game", {replace: true});
            }
            return null;
        }

        if (detail.status === "IN_PROGRESS") {
            const state = await getPresentationGameState(code);
            if (seq !== loadRoomSeqRef.current) {
                return null;
            }
            commitServerState(state);
        } else {
            gameStateRef.current = null;
            setGameState(null);
        }

        return detail;
    }, [code, navigate, commitServerState]);

    const refreshGameState = useCallback(async () => {
        if (!code) {
            return;
        }
        try {
            const state = await getPresentationGameState(code);
            commitServerState(state);
            setRoom(prev => prev ? {...prev, status: state.status, members: state.members} : prev);
        } catch {
            // room may have ended
        }
    }, [code, commitServerState]);

    const showPointsFloat = (delta: number) => {
        if (delta === 0) {
            return;
        }
        const id = ++floatingIdRef.current;
        setFloatingPoints({
            id,
            value: delta > 0 ? `+${delta}` : `${delta}`,
            positive: delta > 0,
        });
        window.setTimeout(() => {
            setFloatingPoints(current => current?.id === id ? null : current);
        }, POINTS_FLOAT_MS);
    };

    const showThumbsUp = (userId: string | null | undefined) => {
        if (!userId) {
            return;
        }
        setThumbsUpUserIds(prev => new Set(prev).add(userId));
        window.setTimeout(() => {
            setThumbsUpUserIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }, THUMBS_UP_MS);
    };

    const applyGameAction = useCallback((action: PresentationGameAction) => {
        if (action.event === "ROOM_CLOSED") {
            if (!leftLobbyRef.current) {
                leftLobbyRef.current = true;
                snackbarService.showSnackbar({
                    type: "warning",
                    text: "Der Presenter hat die Verbindung verloren. Die Lobby wurde geschlossen.",
                    showIcon: true,
                });
                navigate("/presentation-game", {replace: true});
            }
            return;
        }

        if (action.event === "FINISHED") {
            openFinishedDialog(action);
            return;
        }

        const pending = pendingActionRef.current;
        if (!pending || !isOlderSnapshot(action, pending)) {
            pendingActionRef.current = action;
        }

        if (action.event === "MEMBER_LEFT" && action.userId) {
            setRoom(prev => prev ? {
                ...prev,
                members: prev.members.filter(member => member.userId !== action.userId),
            } : prev);
        }

        if (action.event === "STARTED") {
            setRoom(prev => prev ? {...prev, status: "IN_PROGRESS"} : prev);
            void refreshGameState();
            return;
        }

        const current = gameStateRef.current;
        if (!current) {
            void refreshGameState();
            return;
        }

        const next = applyActionToState(current, action, myUserIdRef.current);
        if (next === current) {
            return;
        }

        gameStateRef.current = next;
        setGameState(next);

        if (action.event === "APPROVE_VOTE" || action.event === "APPROVE") {
            showThumbsUp(action.userId ?? undefined);
        }

        if (action.event === "SKIP" || action.event === "APPROVE") {
            showPointsFloat(action.pointsDelta);
        }
    }, [navigate, openFinishedDialog, refreshGameState]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                await loadRoom();
            } catch (err: unknown) {
                snackbarService.showSnackbar({
                    type: "error",
                    text: getErrorText(err),
                    showIcon: true,
                });
            } finally {
                setLoading(false);
            }
        };
        void init();
    }, [loadRoom]);

    useEffect(() => {
        if (!room || room.status !== "LOBBY" || actionLoading) {
            return;
        }

        const interval = setInterval(() => {
            void loadRoom().catch(() => undefined);
        }, LOBBY_REFRESH_MS);

        return () => clearInterval(interval);
    }, [room?.status, loadRoom, actionLoading]);

    useEffect(() => {
        if (!room?.id) {
            return;
        }

        const channel = websocketChannels.presentationGameRoom(room.id);
        myUserIdRef.current = websocketService.getConnectedUserId();

        let kickTimer: number | null = null;
        const clearKick = () => {
            if (kickTimer != null) {
                window.clearTimeout(kickTimer);
                kickTimer = null;
            }
        };
        const armKick = () => {
            if (kickTimer != null || leftLobbyRef.current) {
                return;
            }
            kickTimer = window.setTimeout(() => {
                if (leftLobbyRef.current) {
                    return;
                }
                leftLobbyRef.current = true;
                snackbarService.showSnackbar({
                    type: "warning",
                    text: "Die Verbindung ist abgebrochen. Du wurdest aus der Lobby entfernt.",
                    showIcon: true,
                });
                navigate("/presentation-game", {replace: true});
            }, CONNECTION_GRACE_MS);
        };

        const unsubscribe = websocketService.subscribe(envelope => {
            if (envelope.type === WebSocketMessageType.CONNECTED) {
                const userId = (envelope.payload as {userId?: string} | null)?.userId;
                if (userId) {
                    myUserIdRef.current = userId;
                }
                return;
            }

            if (envelope.type === WebSocketMessageType.ERROR) {
                const code = (envelope.payload as {code?: string} | null)?.code;
                if (code === "NOT_ROOM_MEMBER" && !leftLobbyRef.current) {
                    clearKick();
                    leftLobbyRef.current = true;
                    snackbarService.showSnackbar({
                        type: "warning",
                        text: "Die Verbindung ist abgebrochen. Du wurdest aus der Lobby entfernt.",
                        showIcon: true,
                    });
                    navigate("/presentation-game", {replace: true});
                }
                return;
            }

            if (envelope.type === WebSocketMessageType.JOINED && envelope.channel === channel) {
                clearKick();
                if (roomRef.current?.status === "IN_PROGRESS") {
                    void refreshGameState();
                }
                return;
            }

            if (envelope.type !== WebSocketMessageType.MESSAGE || envelope.channel !== channel) {
                return;
            }
            applyGameAction(envelope.payload as PresentationGameAction);
        });

        const unsubscribeStatus = websocketService.onStatusChange(status => {
            if (status === "disconnected") {
                armKick();
            }
        });

        websocketService.connect();
        websocketService.joinChannel(channel);
        armKick();

        return () => {
            clearKick();
            unsubscribe();
            unsubscribeStatus();
            websocketService.leaveChannel(channel);
        };
    }, [room?.id, applyGameAction, navigate, refreshGameState]);

    const handleSkip = useCallback(async () => {
        if (!code || !gameState?.canSkip) {
            return;
        }

        setActionLoading(true);
        try {
            const action = await skipPresentationWord(code);
            applyGameAction(action);
        } catch (err: unknown) {
            snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
        } finally {
            setActionLoading(false);
        }
    }, [code, gameState?.canSkip, applyGameAction]);

    const handleApprove = useCallback(async () => {
        if (!code || !gameState?.canApprove) {
            return;
        }

        setActionLoading(true);
        try {
            const action = await approvePresentationWord(code);
            applyGameAction(action);
        } catch (err: unknown) {
            snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
        } finally {
            setActionLoading(false);
        }
    }, [code, gameState?.canApprove, applyGameAction]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== "Space" || event.repeat || actionLoading) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target?.closest("input, textarea, select, button")) {
                return;
            }

            event.preventDefault();
            if (gameState?.canSkip) {
                void handleSkip();
            } else if (gameState?.canApprove) {
                void handleApprove();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [actionLoading, gameState?.canSkip, gameState?.canApprove, handleSkip, handleApprove]);

    const handleCopyLink = async () => {
        if (!code) {
            return;
        }

        try {
            await navigator.clipboard.writeText(getPresentationRoomLink(code));
            snackbarService.showSnackbar({type: "success", text: "Link kopiert.", showIcon: true});
        } catch {
            snackbarService.showSnackbar({type: "error", text: "Link konnte nicht kopiert werden.", showIcon: true});
        }
    };

    const handleStart = async () => {
        if (!code) {
            return;
        }

        setActionLoading(true);
        try {
            const state = await startPresentationRoom(code);
            loadRoomSeqRef.current += 1;
            setRoom(prev => prev ? {...prev, status: state.status, members: state.members} : prev);
            commitServerState(state);
            snackbarService.showSnackbar({type: "success", text: "Spiel gestartet.", showIcon: true});
        } catch (err: unknown) {
            snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
        } finally {
            setActionLoading(false);
        }
    };

    const handleFinish = async () => {
        if (!code) {
            return;
        }

        setActionLoading(true);
        try {
            const snapshot = gameStateRef.current;
            await finishPresentationRoom(code);
            if (snapshot) {
                openFinishedDialog({
                    event: "FINISHED",
                    pointsDelta: 0,
                    userId: null,
                    username: null,
                    presenterPoints: snapshot.presenterPoints,
                    currentWord: snapshot.currentWord,
                    wordIndex: snapshot.wordIndex,
                    totalWords: snapshot.totalWords,
                    currentApprovals: 0,
                    approvalThreshold: snapshot.approvalThreshold,
                });
            }
        } catch (err: unknown) {
            snackbarService.showSnackbar({type: "error", text: getErrorText(err), showIcon: true});
        } finally {
            setActionLoading(false);
        }
    };

    const members = gameState?.members ?? room?.members ?? [];
    const isPlaying = room?.status === "IN_PROGRESS" && gameState;

    if (loading) {
        return (
            <div className="survival-kit-page presentation-game-room-page-shell">
                <div className="presentation-game-room-page">
                    <p className="presentation-game-room-page__status">Raum wird geladen…</p>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="survival-kit-page presentation-game-room-page-shell">
                <div className="presentation-game-room-page">
                    <p className="presentation-game-room-page__status">Raum nicht gefunden.</p>
                    <Button text="Zurück zur Lobby" variant="secondary" onClick={() => navigate("/presentation-game")} />
                </div>
            </div>
        );
    }

    return (
        <div className="survival-kit-page presentation-game-room-page-shell">
            <PresentationGameFinishedDialog
                isOpen={showFinishedDialog}
                summary={finishedSummary}
                onClose={closeFinishedDialog}
            />
            <div className={`presentation-game-room-page ${isPlaying ? "is-playing" : ""}`}>
                <div className="presentation-game-room-page__stage">
                    {room.status === "LOBBY" && (
                        <div className="presentation-game-room-page__lobby-card">
                            {room.isHost ? (
                                <>
                                    <p className="presentation-game-room-page__lobby-lead">
                                        Du bist Presenter. Starte das Spiel, sobald alle da sind.
                                    </p>
                                    <Button
                                        text="Spiel starten"
                                        variant="primary"
                                        onClick={() => void handleStart()}
                                        disabled={actionLoading}
                                        fullWidth={true}
                                    />
                                </>
                            ) : (
                                <p className="presentation-game-room-page__hint">
                                    Warte auf {room.hostUsername}, um das Spiel zu starten.
                                </p>
                            )}
                        </div>
                    )}

                    {isPlaying && (
                        <div className="presentation-game-word-card">
                            <div className="presentation-game-word-card__top">
                                <span className="presentation-game-word-card__counter">
                                    Wort {gameState.wordIndex + 1}
                                </span>
                                {gameState.jurySize > 0 && (
                                    <span className="presentation-game-word-card__votes">
                                        {gameState.currentApprovals} / {gameState.approvalThreshold} Jury-Stimmen
                                    </span>
                                )}
                            </div>

                            <div className="presentation-game-word-card__word-wrap">
                                <p className="presentation-game-word-card__word" key={gameState.wordIndex}>
                                    {gameState.currentWord || "—"}
                                </p>
                                {floatingPoints && (
                                    <span
                                        className={`presentation-game-word-card__points-float ${floatingPoints.positive ? "is-positive" : "is-negative"}`}
                                    >
                                        {floatingPoints.value}
                                    </span>
                                )}
                            </div>

                            <div className="presentation-game-word-card__actions">
                                {gameState.canSkip && (
                                    <button
                                        type="button"
                                        className="presentation-game-word-card__action presentation-game-word-card__action--skip"
                                        onClick={() => void handleSkip()}
                                        disabled={actionLoading}
                                    >
                                        Überspringen (Leertaste)
                                    </button>
                                )}
                                {gameState.canApprove && (
                                    <button
                                        type="button"
                                        className="presentation-game-word-card__action presentation-game-word-card__action--approve"
                                        onClick={() => void handleApprove()}
                                        disabled={actionLoading}
                                    >
                                        {gameState.isHost && gameState.jurySize === 0
                                            ? "Selbst bestätigen (Leertaste)"
                                            : "Bestätigen (Leertaste)"}
                                    </button>
                                )}
                                {room.isHost && (
                                    <button
                                        type="button"
                                        className="presentation-game-word-card__finish"
                                        onClick={() => void handleFinish()}
                                        disabled={actionLoading}
                                    >
                                        Spiel beenden
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <aside className="presentation-game-room-page__sidebar">
                    <section className="presentation-game-room-page__room-panel">
                        <SectionHeading
                            heading={room.name}
                            subheading={`Code: ${room.joinCode} · ${PRESENTATION_STATUS_LABELS[room.status]}`}
                            centered={false}
                        />

                        <div className="presentation-game-room-page__meta">
                            <span
                                className={`presentation-game-manual__badge presentation-game-manual__badge--${PRESENTATION_DIFFICULTY_BADGE[room.difficulty]}`}
                            >
                                {PRESENTATION_DIFFICULTY_LABELS[room.difficulty]}
                            </span>
                            <span className="presentation-game-room-page__visibility">
                                {room.isPublic ? "Öffentlich" : "Privat"}
                            </span>
                            {isPlaying && (
                                <span className="presentation-game-room-page__score">
                                    {gameState.presenterPoints} Pkt.
                                </span>
                            )}
                            <button type="button" className="presentation-game-room-page__copy" onClick={() => void handleCopyLink()}>
                                <Copy size={16} />
                                Link kopieren
                            </button>
                        </div>
                    </section>

                    <section className="presentation-game-room-page__players-panel">
                        <h2 className="presentation-game-room-page__section-title">Spieler</h2>
                        <ul className="presentation-game-room-page__player-list">
                            {members.map(member => (
                                <li
                                    key={member.userId}
                                    className={`presentation-game-room-page__player ${member.host ? "is-host" : ""} ${thumbsUpUserIds.has(member.userId) || (gameState?.approvingUserIds?.includes(member.userId) ?? false) ? "has-thumbs-up" : ""}`}
                                >
                                    <span>{member.username}</span>
                                    <span className="presentation-game-room-page__player-badges">
                                        {member.host && (
                                            <span className="presentation-game-room-page__host-badge">Presenter</span>
                                        )}
                                        {(thumbsUpUserIds.has(member.userId) || (gameState?.approvingUserIds?.includes(member.userId) ?? false)) && (
                                            <span className="presentation-game-room-page__thumbs-up" aria-hidden="true">
                                                <ThumbsUp size={16} />
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default PresentationGameRoomPage;
