import "@/components/feedback/FeedbackItem.css";
import type {FeedbackType} from "@/models/Feedback.tsx";
import {useEffect, useRef, useState} from "react";
import {Bug, CircleCheck, Info, Lightbulb, MessageSquareText, PencilLine, ThumbsDown, ThumbsUp, Trash} from "lucide-react";
import {getUserRole} from "@/services/tokenService.tsx";
import {answerFeedback, deleteFeedback, rateFeedback, resolveFeedback} from "@/services/feedbackService.tsx";
import {applyLocalVote, type VoteMark, type VoteResult} from "@/models/Vote.tsx";
import {snackbarService} from "@/services/snackBarService.tsx";
import FeedbackAnswerDialog from "@/components/dialog/FeedbackAnswerDialog.tsx";
import ConfirmDialog from "@/components/dialog/ConfirmDialog.tsx";
import DOMPurify from "dompurify";
import {api} from "@/services/api.tsx";
import UserRankHover from "@/components/rank/UserRankHover.tsx";

type FeedbackItemProps = {
    id: string
    title: string,
    description: string,
    author: string,
    authorUserId?: string | null,
    type: FeedbackType,
    date: string,
    likes: number,
    dislikes: number,
    answer: string,
    onDelete: (id: string) => void
    onResolve?: (id: string) => void
    archived?: boolean
    currentVote?: VoteMark
    onVoted?: (id: string, result: VoteResult) => void
    startExpanded?: boolean
}

const FeedbackItem = ( {id, title, description, author, authorUserId, type, date, likes, dislikes, answer, onDelete, onResolve, archived = false, currentVote, onVoted, startExpanded = false} : FeedbackItemProps) => {
    const [isExpanded, setIsExpanded] = useState(startExpanded);
    const [showFeedbackAnswerDialog, setShowFeedbackAnswerDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [vote, setVote] = useState<VoteMark>(currentVote);
    const pendingVote = useRef(false);
    const [feedbackAnswer, setFeedbackAnswer] = useState(answer);
    const [localLikes, setLocalLikes] = useState(likes);
    const [localDislikes, setLocalDislikes] = useState(dislikes);


    const onFeedbackAnswerSubmit = async (data: {answer: string}) => {
        try {
            setFeedbackAnswer(data.answer);
            answerFeedback(id, data.answer);
            setShowFeedbackAnswerDialog(false);
            snackbarService.showSnackbar({ type: "success",   text: "Antwort gesendet", showIcon: true });
        } finally {
            setShowFeedbackAnswerDialog(false);
        }
    }

    const onFeedbackResolve = async () => {
        try {
            await resolveFeedback(id);
            onResolve?.(id);
            setShowResolveDialog(false);
            snackbarService.showSnackbar({ type: "success", text: "Als erledigt markiert", showIcon: true });
        } finally {
            setShowResolveDialog(false);
        }
    }

    const onFeedbackDelete = async () => {
        try {
            onDelete(id);
            await deleteFeedback(id);
            setShowDeleteDialog(false);
            snackbarService.showSnackbar({ type: "success",   text: "Beitrag gelöscht", showIcon: true });
        } finally {
            setShowDeleteDialog(false);
        }
    }

    const getTypeLabel = (type : FeedbackType) => {

        let color : string = "#777777";
        let label: string = "ALLGEMEIN";

        if (type === "FEEDBACK") {
            color = "#3b8fc6"
            label = "FEEDBACK";
        }
        if (type === "BUG") {
            color = "#e64545"
            label = "BUG";
        }
        if (type === "IDEA") {
            color = "#a1da6b"
            label = "IDEE";
        }

        return <div
            className="feedback-item-type"
            style={{
                backgroundColor: color
            }}
        >
            {
                type === "BUG" ? <Bug size={20} /> :
                type === "FEEDBACK" ? <MessageSquareText size={20} /> :
                type === "IDEA" ? <Lightbulb size={20} /> :
                <Info size={20} />
            }
            <h3 className="feedback-item-type-label">{label}</h3>
        </div>
    }

    useEffect(() => {
        if (startExpanded) {
            setIsExpanded(true);
        }
    }, [startExpanded]);

    useEffect(() => {
        setVote(currentVote);
    }, [currentVote]);

    const onRatingClicked = async (like: boolean) => {
        if (id === "local-id" || pendingVote.current) {
            return;
        }
        pendingVote.current = true;
        const previousVote = vote;
        const previousLikes = localLikes;
        const previousDislikes = localDislikes;
        const next = applyLocalVote(vote, like, localLikes, localDislikes);
        setVote(next.vote);
        setLocalLikes(next.likes);
        setLocalDislikes(next.dislikes);
        try {
            const result = await rateFeedback(id, like);
            setVote(result.upVote);
            setLocalLikes(result.likes);
            setLocalDislikes(result.dislikes);
            onVoted?.(id, result);
        } catch {
            setVote(previousVote);
            setLocalLikes(previousLikes);
            setLocalDislikes(previousDislikes);
            snackbarService.showSnackbar({type: "error", text: "Abstimmung fehlgeschlagen.", showIcon: true});
        } finally {
            pendingVote.current = false;
        }
    }

    return <div className="feedback-item-wrapper" id={`feedback-${id}`}>
        <div className="feedback-item">
            <div
                className="feedback-item-header"
                onClick={() => setIsExpanded(!isExpanded)} >
                <div className="feedback-item-type-wrapper">
                    {
                        getTypeLabel(type)
                    }
                    <h3 className="feedback-item-title">{title}</h3>
                </div>
                <h4 className="feedback-item-author">
                    Verfasst von{" "}
                    <UserRankHover userId={authorUserId} username={author?.trim() || "Gastbenutzer"}>
                        {authorUserId && (
                            <img className="user-rank-inline-avatar" src={`${api.baseUrl}/profile/img/${authorUserId}`} alt="" />
                        )}
                        <a className="important-text">{author?.trim() ? author : "Gastbenutzer"}</a>
                    </UserRankHover>
                    {" "}am {date}
                </h4>
            </div>
            {
                isExpanded && <div className="feedback-item-expanded">
                    <div className="feedback-item-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description)}}></div>
                    {
                        feedbackAnswer !== null && feedbackAnswer !== "" && <hr className="feedback-item-answer-seperator" />
                    }
                    {
                        feedbackAnswer !== null && feedbackAnswer !== "" && <div className="feedback-item-amswer-wrapper">
                            <h4 className="feedback-item-answer-title">Antwort:</h4>
                            <div className="feedback-item-answer" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(feedbackAnswer)}} />
                        </div>
                    }
                </div>
            }
        </div>
        {
            isExpanded && getUserRole() !== "GUEST" && <div className="feedback-item-buttons">
                <div
                    className={`feedback-item-rateing-button${id === "local-id" ? " deactivated" : ""}${vote === true ? " is-selected" : ""}`}
                    onClick={() => onRatingClicked(true)}
                    aria-pressed={vote === true}
                >
                    <ThumbsUp size={20} />
                    <h5>{localLikes}</h5>
                </div>
                <div
                    className={`feedback-item-rateing-button${id === "local-id" ? " deactivated" : ""}${vote === false ? " is-selected" : ""}`}
                    onClick={() => onRatingClicked(false)}
                    aria-pressed={vote === false}
                >
                    <ThumbsDown size={20} />
                    <h5>{localDislikes}</h5>
                </div>
                {
                    getUserRole() === "ADMIN" &&
                    <div
                        className={id === "local-id" ? "feedback-item-rateing-button deactivated" : "feedback-item-rateing-button"}
                        onClick={() => {
                            if (id === "local-id") return;
                            setShowFeedbackAnswerDialog(true);
                        }}
                    >
                        <PencilLine size={20}  />
                        <h5>{ feedbackAnswer === "" || feedbackAnswer === null ? "Antworten" : "Antwort bearbeiten"}</h5>
                    </div>
                }
                {
                    getUserRole() === "ADMIN" && !archived &&
                    <div
                        className={id === "local-id" ? "feedback-item-rateing-button deactivated" : "feedback-item-rateing-button"}
                        onClick={() => {
                            if (id === "local-id") return;
                            setShowResolveDialog(true);
                        }}
                    >
                        <CircleCheck size={20} />
                        <h5>Als erledigt markieren</h5>
                    </div>
                }
                {
                    getUserRole() === "ADMIN" &&
                    <div
                        className={id === "local-id" ? "feedback-item-rateing-button deactivated" : "feedback-item-rateing-button"}
                        onClick={() => {
                            if (id === "local-id") return;
                            setShowDeleteDialog(true);
                        }}
                    >
                        <Trash size={20}  />
                        <h5>Löschen</h5>
                    </div>
                }
                <FeedbackAnswerDialog
                    isOpen={showFeedbackAnswerDialog}
                    onCancel={() => setShowFeedbackAnswerDialog(false)}
                    onSubmit={onFeedbackAnswerSubmit}
                    previousAnswer={answer}
                />
                <ConfirmDialog
                    isOpen={showResolveDialog}
                    onCancel={() => setShowResolveDialog(false)}
                    onConfirm={onFeedbackResolve}
                    title="Als erledigt markieren"
                    subtitle="Der Beitrag wandert ins Archiv. Der Autor bekommt eine Benachrichtigung."
                />
                <ConfirmDialog
                    isOpen={showDeleteDialog}
                    onCancel={() => setShowDeleteDialog(false)}
                    onConfirm={onFeedbackDelete}
                    title="Beitrag löschen"
                    subtitle="Dieser Beitrag wird unwiederuflich gelöscht. Bist du sicher?"
                />
            </div>
        }
    </div>
}

export default FeedbackItem;