import './IdeasPage.css';
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import FeedbackItem from "../../components/FeedbackItem.tsx";
import {useEffect, useState} from "react";
import {MessageSquareText} from "lucide-react";
import FeedbackDialog from "../../components/shared/dialog/FeedbackDialog.tsx";
import {getFeedback, submitFeedback} from "../../services/feedbackService.tsx";
import {snackbarService} from "../../services/snackBarService.tsx";
import Button from "../../components/shared/Button.tsx";
import type {Feedback, FeedbackType} from "../../models/Feedback.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import {getUsername} from "../../services/userService.tsx";

const IdeasPage = () => {
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadMore = async () => {
        if (loading) return;

        setLoading(true);

        const res = await getFeedback(
            20,
            continuation
        );

        setFeedbacks(prev =>
            [...prev, ...res.data]
        );

        setContinuation(res.continuation);
        setLoading(false);
    };

    useEffect(() => {

        const loadInit = async () => {
            if (loading) return;

            setLoading(true);

            const res = await getFeedback(
                20
            );

            setFeedbacks(res.data);

            setContinuation(res.continuation);
            setLoading(false);
        };

        loadInit();
    }, [feedbacks, loading]);

    const formatDate = (instant: string): string => {
        return new Date(instant).toLocaleDateString("de-DE", {
            day:   "2-digit",
            month: "2-digit",
            year:  "numeric",
        });
    };

    const onFeedbackDelete = (id: string) => {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
    };

    const onFeedbackSubmit = (title: string, description: string, type: FeedbackType) => {
        const newFeedback : Feedback = {
            id: "local-id",
            title: title,
            description: description,
            type: type,
            likes: 0,
            dislikes: 0,
            answer: "",
            addedAt: formatDate(Date.now().toString()),
            authorUsername: getUsername(),
            authorUserId: "local-user-id",
            lastUpdated: formatDate(Date.now().toString())
        }

        setFeedbacks(prev => [...prev, newFeedback]);
    }

    return <div className="ideas-page">
        <SectionHeading
            heading={"Ideen und Feedback"}
            centered={false}
            subheading={"Ideen und Feedback, dass von anderen Benutzern eingereicht wurde"}
            actions={getUserRole() !== "GUEST" ? [
                { icon: MessageSquareText, text: "Beitrag schreiben", link: () => setShowFeedbackDialog(true) }
            ] : []}
        />
        <FeedbackDialog
            isOpen={showFeedbackDialog}
            onCancel={() => setShowFeedbackDialog(false)}
            onSubmit={(data) => {
                try {
                    onFeedbackSubmit(data.title, data.description, data.type);
                    submitFeedback(data.title, data.description, data.type);
                    setShowFeedbackDialog(false);
                    snackbarService.showSnackbar({ type: "success",   text: "Beitrag abgesendet", showIcon: true });
                } catch {
                    snackbarService.showSnackbar({ type: "error",   text: "Etwas ist schiefgelaufen.", showIcon: true });
                }
            }}
        />
        {
            feedbacks.map(feedback => <FeedbackItem title={feedback.title} description={feedback.description} author={feedback.authorUsername} type={feedback.type} date={formatDate(feedback.addedAt)} likes={feedback.likes} dislikes={feedback.dislikes} answer={feedback.answer} id={feedback.id} key={feedback.id} onDelete={(id) => onFeedbackDelete(id)} />)
        }
        { continuation !== null && <Button text="Mehr Laden" onClick={() => loadMore()} variant="primary" disabled={continuation === null} /> }
        { feedbacks.length === 0 && <h4 className="no-items-info">Es gibt aktuell keine Beiträge</h4> }
    </div>
}

export default IdeasPage;