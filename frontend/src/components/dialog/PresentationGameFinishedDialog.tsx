import Dialog from "@/components/dialog/Dialog.tsx";
import DialogActions from "@/components/dialog/DialogActions.tsx";
import type {PresentationGameDifficulty, PresentationGameRoomMember} from "@/models/PresentationGameRoom.tsx";
import {
    PRESENTATION_DIFFICULTY_BADGE,
    PRESENTATION_DIFFICULTY_LABELS,
} from "@/models/PresentationGameRoom.tsx";
import "@/components/dialog/PresentationGameFinishedDialog.css";

export type PresentationGameFinishedSummary = {
    roomName: string;
    hostUsername: string;
    difficulty: PresentationGameDifficulty;
    presenterPoints: number;
    wordIndex: number;
    totalWords: number;
    members: PresentationGameRoomMember[];
};

interface PresentationGameFinishedDialogProps {
    isOpen: boolean;
    summary: PresentationGameFinishedSummary | null;
    onClose: () => void;
}

export default function PresentationGameFinishedDialog({
    isOpen,
    summary,
    onClose,
}: PresentationGameFinishedDialogProps) {
    if (!summary) {
        return null;
    }

    const wordsReached = Math.min(summary.wordIndex + 1, summary.totalWords);

    return (
        <Dialog
            isOpen={isOpen}
            title="Spiel beendet"
            subtitle={`${summary.roomName} · Presenter: ${summary.hostUsername}`}
            onClose={onClose}
            closeOnOverlayClick={false}
            footer={
                <DialogActions
                    confirm={{
                        text: "Zurück zur Lobby",
                        onClick: onClose,
                        variant: "primary",
                    }}
                />
            }
        >
            <div className="presentation-game-finished-dialog">
                <div className="presentation-game-finished-dialog__points-wrap">
                    <p className="presentation-game-finished-dialog__points-label">Punkte</p>
                    <p className="presentation-game-finished-dialog__points">{summary.presenterPoints}</p>
                </div>

                <div className="presentation-game-finished-dialog__meta">
                    <span
                        className={`presentation-game-manual__badge presentation-game-manual__badge--${PRESENTATION_DIFFICULTY_BADGE[summary.difficulty]}`}
                    >
                        {PRESENTATION_DIFFICULTY_LABELS[summary.difficulty]}
                    </span>
                    <span className="presentation-game-finished-dialog__stat">
                        Wort {wordsReached} von {summary.totalWords}
                    </span>
                </div>

                <div className="presentation-game-finished-dialog__players">
                    <h3 className="presentation-game-finished-dialog__players-title">Spieler</h3>
                    <ul className="presentation-game-finished-dialog__player-list">
                        {summary.members.map(member => (
                            <li
                                key={member.userId}
                                className={`presentation-game-finished-dialog__player ${member.host ? "is-host" : ""}`}
                            >
                                <span>{member.username}</span>
                                {member.host && (
                                    <span className="presentation-game-finished-dialog__host-badge">Presenter</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Dialog>
    );
}
