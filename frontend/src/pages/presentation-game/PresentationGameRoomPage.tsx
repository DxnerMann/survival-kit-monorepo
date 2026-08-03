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
import "@/pages/presentation-game/PresentationGameRoomPage.css";

const LOBBY_REFRESH_MS = 3000;
const THUMBS_UP_MS = 1500;
const POINTS_FLOAT_MS = 1200;

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

    const loadRoom = useCallback(async () => {
        if (!code) {
            return null;
        }

        const detail = await getPresentationRoomByCode(code, true);
        setRoom(detail);

        if (detail.status === "FINISHED") {
            navigate("/presentation-game", {replace: true});
            return null;
        }

        if (detail.status === "IN_PROGRESS") {
            const state = await getPresentationGameState(code);
            setGameState(state);
        } else {
            setGameState(null);
        }

        return detail;
    }, [code, navigate]);

    const refreshGameState = useCallback(async () => {
        if (!code) {
            return;
        }
        try {
            const state = await getPresentationGameState(code);
            setGameState(state);
            setRoom(prev => prev ? {...prev, status: state.status, members: state.members} : prev);
        } catch {
            // room may have ended
        }
    }, [code]);

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
        if (action.event === "FINISHED") {
            navigate("/presentation-game");
            return;
        }

        setGameState(prev => {
            if (!prev) {
                return prev;
            }
            const approvingUserIds =
                action.event === "APPROVE"
                    ? []
                    : action.event === "APPROVE_VOTE" && action.userId
                        ? [...new Set([...prev.approvingUserIds, action.userId])]
                        : prev.approvingUserIds;

            return {
                ...prev,
                currentWord: action.currentWord,
                wordIndex: action.wordIndex,
                totalWords: action.totalWords,
                presenterPoints: action.presenterPoints,
                currentApprovals: action.currentApprovals,
                approvalThreshold: action.approvalThreshold,
                approvingUserIds,
                status: action.event === "STARTED" ? "IN_PROGRESS" : prev.status,
            };
        });

        if (action.event === "APPROVE_VOTE" || action.event === "APPROVE") {
            showThumbsUp(action.userId ?? undefined);
        }

        if (action.event === "SKIP" || action.event === "APPROVE") {
            showPointsFloat(action.pointsDelta);
        }

        if (action.event === "STARTED" || action.event === "APPROVE" || action.event === "SKIP") {
            void refreshGameState();
        }
    }, [navigate, refreshGameState]);

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
        if (!room || room.status !== "LOBBY") {
            return;
        }

        const interval = setInterval(() => {
            void loadRoom().catch(() => undefined);
        }, LOBBY_REFRESH_MS);

        return () => clearInterval(interval);
    }, [room?.status, loadRoom]);

    useEffect(() => {
        if (!room?.id || room.status !== "IN_PROGRESS") {
            return;
        }

        const channel = websocketChannels.presentationGameRoom(room.id);
        websocketService.joinChannel(channel);

        const unsubscribe = websocketService.subscribe(envelope => {
            if (envelope.type !== WebSocketMessageType.MESSAGE || envelope.channel !== channel) {
                return;
            }
            applyGameAction(envelope.payload as PresentationGameAction);
        });

        return () => {
            unsubscribe();
            websocketService.leaveChannel(channel);
        };
    }, [room?.id, room?.status, applyGameAction]);

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
            setGameState(prev => prev ? {...prev, hasVotedCurrentWord: true, canApprove: false} : prev);
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
            await startPresentationRoom(code);
            snackbarService.showSnackbar({type: "success", text: "Spiel gestartet.", showIcon: true});
            await loadRoom();
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
            await finishPresentationRoom(code);
            navigate("/presentation-game");
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
                                    className={`presentation-game-room-page__player ${member.host ? "is-host" : ""} ${thumbsUpUserIds.has(member.userId) || gameState?.approvingUserIds.includes(member.userId) ? "has-thumbs-up" : ""}`}
                                >
                                    <span>{member.username}</span>
                                    <span className="presentation-game-room-page__player-badges">
                                        {member.host && (
                                            <span className="presentation-game-room-page__host-badge">Presenter</span>
                                        )}
                                        {(thumbsUpUserIds.has(member.userId) || gameState?.approvingUserIds.includes(member.userId)) && (
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
