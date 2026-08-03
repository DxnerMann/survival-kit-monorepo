import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {DoorOpen, Plus} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import Button from "@/components/ui/Button.tsx";
import CreatePresentationRoomDialog from "@/components/dialog/CreatePresentationRoomDialog.tsx";
import JoinPresentationRoomDialog from "@/components/dialog/JoinPresentationRoomDialog.tsx";
import type {PresentationGameFinished, PresentationGameRoom} from "@/models/PresentationGameRoom.tsx";
import {
    PRESENTATION_DIFFICULTY_BADGE,
    PRESENTATION_DIFFICULTY_LABELS,
} from "@/models/PresentationGameRoom.tsx";
import {
    createPresentationRoom,
    getFinishedPresentationGames,
    getPublicPresentationRooms,
    joinPresentationRoomByCode,
    joinPresentationRoomById,
} from "@/services/presentationGameService.tsx";
import {formatTimestamp} from "@/services/utils.tsx";
import {getErrorText} from "@/services/api.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import "@/pages/presentation-game/PresentationGameLobbyPage.css";

const DIFFICULTY_ROWS = [
    {
        mode: "Leicht",
        modeClass: "easy",
        skip: "Ja",
        skipPoints: "—",
        approve: "+1",
    },
    {
        mode: "Mittel",
        modeClass: "medium",
        skip: "Ja",
        skipPoints: "−1",
        approve: "+2",
    },
    {
        mode: "Schwer",
        modeClass: "hard",
        skip: "Nein",
        skipPoints: "—",
        approve: "+3",
    },
] as const;

const PresentationGameLobbyPage = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<PresentationGameRoom[]>([]);
    const [finishedGames, setFinishedGames] = useState<PresentationGameFinished[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingFinished, setLoadingFinished] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showJoinDialog, setShowJoinDialog] = useState(false);
    const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

    const loadRooms = useCallback(async () => {
        setLoadingRooms(true);
        try {
            const data = await getPublicPresentationRooms();
            setRooms(data);
        } catch (err: unknown) {
            snackbarService.showSnackbar({
                type: "error",
                text: getErrorText(err),
                showIcon: true,
            });
        } finally {
            setLoadingRooms(false);
        }
    }, []);

    const loadFinishedGames = useCallback(async () => {
        setLoadingFinished(true);
        try {
            const data = await getFinishedPresentationGames();
            setFinishedGames(data);
        } catch (err: unknown) {
            snackbarService.showSnackbar({
                type: "error",
                text: getErrorText(err),
                showIcon: true,
            });
        } finally {
            setLoadingFinished(false);
        }
    }, []);

    useEffect(() => {
        void loadRooms();
        void loadFinishedGames();
    }, [loadRooms, loadFinishedGames]);

    const handleCreateRoom = async (data: {
        name: string;
        isPublic: boolean;
        difficulty: PresentationGameRoom["difficulty"];
    }) => {
        try {
            const created = await createPresentationRoom(data);
            setShowCreateDialog(false);
            navigate(`/presentation-game/${created.joinCode}`);
        } catch (err: unknown) {
            snackbarService.showSnackbar({
                type: "error",
                text: getErrorText(err),
                showIcon: true,
            });
        }
    };

    const handleJoinByCode = async (code: string) => {
        try {
            const joined = await joinPresentationRoomByCode(code);
            setShowJoinDialog(false);
            navigate(`/presentation-game/${joined.joinCode}`);
        } catch (err: unknown) {
            snackbarService.showSnackbar({
                type: "error",
                text: getErrorText(err),
                showIcon: true,
            });
        }
    };

    const handleJoinRoom = async (roomId: string) => {
        setJoiningRoomId(roomId);
        try {
            const joined = await joinPresentationRoomById(roomId);
            navigate(`/presentation-game/${joined.joinCode}`);
        } catch (err: unknown) {
            snackbarService.showSnackbar({
                type: "error",
                text: getErrorText(err),
                showIcon: true,
            });
        } finally {
            setJoiningRoomId(null);
        }
    };

    return (
        <div className="survival-kit-page">
            <div className="presentation-game-lobby">
                <SectionHeading
                    heading="Das Präsi-Spiel"
                    subheading="Lobby – wähle einen Raum für deinen Kurs"
                    centered={false}
                />

                <article className="presentation-game-manual">
                    <h2 className="presentation-game-manual__title">Spielanleitung</h2>

                    <section className="presentation-game-manual__section">
                        <h3 className="presentation-game-manual__heading">Ziel des Spiels</h3>
                        <p>
                            Baue so viele <span className="presentation-game-manual__highlight">Zufallswörter</span> wie
                            möglich in deine laufende Präsentation ein –{" "}
                            <span className="presentation-game-manual__accent">ohne dass der Dozent es merkt</span>.
                            Mitspieler bestätigen gelungene Wörter und sammeln Punkte.
                        </p>
                    </section>

                    <section className="presentation-game-manual__section">
                        <h3 className="presentation-game-manual__heading">Ablauf</h3>
                        <ol className="presentation-game-manual__steps">
                            <li>Tritt einem Raum in deinem Kurs bei oder erstelle einen neuen.</li>
                            <li>Der <span className="presentation-game-manual__role-presenter">Presenter (Host)</span> startet die Runde.</li>
                            <li>Auf dem Bildschirm erscheint nacheinander ein zufälliges Wort.</li>
                            <li>Der Presenter baut das Wort in den Vortrag ein oder überspringt es (je nach Modus).</li>
                            <li>Alle anderen Spieler stimmen ab: Wort genehmigen oder ablehnen.</li>
                            <li>Bei Genehmigung gibt es Punkte.</li>
                        </ol>
                    </section>

                    <section className="presentation-game-manual__section">
                        <h3 className="presentation-game-manual__heading">Rollen</h3>
                        <div className="presentation-game-manual__roles">
                            <div className="presentation-game-manual__role-card presentation-game-manual__role-card--presenter">
                                <h4>Presenter · Host</h4>
                                <p>
                                    Hält die Präsentation. Kann Wörter nur <strong>überspringen</strong> – nicht selbst
                                    genehmigen. In Schwer gibt es kein Überspringen.
                                </p>
                            </div>
                            <div className="presentation-game-manual__role-card presentation-game-manual__role-card--voter">
                                <h4>Mitspieler · Jury</h4>
                                <p>
                                    Beobachten den Vortrag und <strong>genehmigen</strong> ein Wort, wenn es glaubwürdig
                                    eingebaut wurde. Pro Genehmigung gibt es Punkte.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="presentation-game-manual__section">
                        <h3 className="presentation-game-manual__heading">Schwierigkeit & Punkte</h3>
                        <div className="presentation-game-manual__table-wrap">
                            <table className="presentation-game-manual__table">
                                <thead>
                                    <tr>
                                        <th>Modus</th>
                                        <th>Skip erlaubt</th>
                                        <th>Punkte Skip</th>
                                        <th>Punkte Genehmigung</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {DIFFICULTY_ROWS.map(row => (
                                        <tr key={row.mode} className={`presentation-game-manual__row--${row.modeClass}`}>
                                            <td>
                                                <span className={`presentation-game-manual__badge presentation-game-manual__badge--${row.modeClass}`}>
                                                    {row.mode}
                                                </span>
                                            </td>
                                            <td>{row.skip}</td>
                                            <td>
                                                {row.skipPoints !== "—" ? (
                                                    <span className="presentation-game-manual__points presentation-game-manual__points--negative">
                                                        {row.skipPoints}
                                                    </span>
                                                ) : (
                                                    row.skipPoints
                                                )}
                                            </td>
                                            <td>
                                                <span className="presentation-game-manual__points presentation-game-manual__points--positive">
                                                    {row.approve}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </article>

                <SectionHeading
                    heading="Räume"
                    centered={false}
                    actions={[
                        {icon: Plus, text: "Raum erstellen", link: () => setShowCreateDialog(true)},
                        {icon: DoorOpen, text: "Raum beitreten", link: () => setShowJoinDialog(true)},
                    ]}
                />

                <section className="presentation-game-rooms">
                    {loadingRooms && (
                        <p className="presentation-game-rooms__empty">Räume werden geladen…</p>
                    )}
                    {!loadingRooms && rooms.length === 0 && (
                        <p className="presentation-game-rooms__empty">
                            Keine öffentlichen Räume in deinem Kurs. Erstelle einen oder tritt per Code bei.
                        </p>
                    )}
                    {!loadingRooms && rooms.map(room => (
                        <article key={room.id} className="presentation-game-room-card">
                            <div className="presentation-game-room-card__header">
                                <h3 className="presentation-game-room-card__name">{room.name}</h3>
                                <span
                                    className={`presentation-game-manual__badge presentation-game-manual__badge--${PRESENTATION_DIFFICULTY_BADGE[room.difficulty]}`}
                                >
                                    {PRESENTATION_DIFFICULTY_LABELS[room.difficulty]}
                                </span>
                            </div>
                            <dl className="presentation-game-room-card__meta">
                                <div>
                                    <dt>Host</dt>
                                    <dd>{room.hostUsername}</dd>
                                </div>
                                <div>
                                    <dt>Jury</dt>
                                    <dd>{room.jurySize}</dd>
                                </div>
                            </dl>
                            <Button
                                text="Beitreten"
                                variant="primary"
                                onClick={() => void handleJoinRoom(room.id)}
                                disabled={joiningRoomId === room.id}
                                fullWidth={true}
                            />
                        </article>
                    ))}
                </section>

                <SectionHeading heading="Beendete Spiele" centered={false} />

                <section className="presentation-game-finished-list">
                    {loadingFinished && (
                        <p className="presentation-game-rooms__empty">Beendete Spiele werden geladen…</p>
                    )}
                    {!loadingFinished && finishedGames.length === 0 && (
                        <p className="presentation-game-rooms__empty">
                            Noch keine beendeten Spiele heute.
                        </p>
                    )}
                    {!loadingFinished && finishedGames.map(game => (
                        <article key={game.id} className="presentation-game-finished-item">
                            <span className="presentation-game-finished-item__name">{game.name}</span>
                            <span className="presentation-game-finished-item__host">{game.hostUsername}</span>
                            <span className="presentation-game-finished-item__date">
                                {formatTimestamp(game.finishedAt)}
                            </span>
                            <span className="presentation-game-finished-item__points">{game.presenterPoints} Pkt.</span>
                        </article>
                    ))}
                </section>

                <CreatePresentationRoomDialog
                    isOpen={showCreateDialog}
                    onCancel={() => setShowCreateDialog(false)}
                    onSubmit={handleCreateRoom}
                />
                <JoinPresentationRoomDialog
                    isOpen={showJoinDialog}
                    onCancel={() => setShowJoinDialog(false)}
                    onSubmit={handleJoinByCode}
                />
            </div>
        </div>
    );
};

export default PresentationGameLobbyPage;
