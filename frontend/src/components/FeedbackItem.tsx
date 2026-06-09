import './FeedbackItem.css';
import type {FeedbackType} from "../models/Feedback.tsx";
import {useState} from "react";
import {Bug, Info, Lightbulb, MessageSquareText, PencilLine, ThumbsDown, ThumbsUp, Trash} from "lucide-react";
import {getUserRole} from "../services/tokenService.tsx";
import {answerFeedback, deleteFeedback, hasAlreadyVoted, rateFeedback} from "../services/feedbackService.tsx";
import {snackbarService} from "../services/snackBarService.tsx";
import FeedbackAnswerDialog from "./shared/dialog/FeedbackAnswerDialog.tsx";
import DeleteDialog from "./shared/dialog/DeleteDialog.tsx";
import DOMPurify from "dompurify";

type FeedbackItemProps = {
    id: string
    title: string,
    description: string,
    author: string,
    type: FeedbackType,
    date: string,
    likes: number,
    dislikes: number,
    answer: string,
    onDelete: (id: string) => void
}

const FeedbackItem = ( {id, title, description, author, type, date, likes, dislikes, answer, onDelete} : FeedbackItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFeedbackAnswerDialog, setShowFeedbackAnswerDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [feedbackAnswer, setFeedbackAnswer] = useState(answer);

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

    const onRatingClicked = async (like: boolean) => {
        if (await hasAlreadyVoted(id)) {
            return;
        }
        rateFeedback(id, like);
    }

    return <div className="feedback-item-wrapper">
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
                <h4 className="feedback-item-author">Verfasst von <a className="important-text">{author}</a> am {date}</h4>
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
                    className={id === "local-id" ? "feedback-item-rateing-button deactivated" : "feedback-item-rateing-button"}
                    onClick={() => onRatingClicked(true)}
                >
                    <ThumbsUp size={20} />
                    <h5>{likes}</h5>
                </div>
                <div
                    className={id === "local-id" ? "feedback-item-rateing-button deactivated" : "feedback-item-rateing-button"}
                    onClick={() => onRatingClicked(false)}
                >
                    <ThumbsDown size={20} />
                    <h5>{dislikes}</h5>
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
                        <h5>{ feedbackAnswer === "" || feedbackAnswer === null ? "Antworten" : "Antwort Bearbeiten"}</h5>
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
                    onSubmit={(data) => {
                        try {
                            setFeedbackAnswer(data.answer);
                            answerFeedback(id, data.answer);
                            setShowFeedbackAnswerDialog(false);
                            snackbarService.showSnackbar({ type: "success",   text: "Antwort gesendet", showIcon: true });
                        } catch {
                            snackbarService.showSnackbar({ type: "error",   text: "Etwas ist schiefgelaufen.", showIcon: true });
                        }
                    }}
                    previousAnswer={answer}
                />
                <DeleteDialog
                    isOpen={showDeleteDialog}
                    onCancel={() => setShowDeleteDialog(false)}
                    onSubmit={() => {
                        try {
                            onDelete(id);
                            deleteFeedback(id);
                            setShowDeleteDialog(false);
                            snackbarService.showSnackbar({ type: "success",   text: "Beitrag gelöscht", showIcon: true });
                        } catch {
                            snackbarService.showSnackbar({ type: "error",   text: "Etwas ist schiefgelaufen.", showIcon: true });
                        }
                    }}
                    title="Beitrag Löschen"
                    subtitle="Dieser Beitrag wird unwiederuflich gelöscht. Bist du sicher?"
                />
            </div>
        }
    </div>
}

export default FeedbackItem;