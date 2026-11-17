import "@/pages/ideas/IdeasPage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import FeedbackItem from "@/components/feedback/FeedbackItem.tsx";
import {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {MessageSquareText} from "lucide-react";
import FeedbackDialog from "@/components/dialog/FeedbackDialog.tsx";
import {getFeedback, submitFeedback} from "@/services/feedbackService.tsx";
import Button from "@/components/ui/Button.tsx";
import type {Feedback, FeedbackType} from "@/models/Feedback.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import {getUsername} from "@/services/userService.tsx";
const IdeasPage = () => {
    const [searchParams] = useSearchParams();
    const expandedId = searchParams.get("feedback");
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

    const onFeedbackSubmit = async (data : {title: string, description: string, type: FeedbackType}) => {
        try {
            await submitFeedback(data.title, data.description, data.type);
            const newFeedback : Feedback = {
                id: "local-id",
                title: data.title,
                description: data.description,
                type: data.type,
                likes: 0,
                dislikes: 0,
                answer: "",
                addedAt: formatDate(Date.now().toString()),
                authorUsername: getUserRole() === "GUEST" || getUsername() === "" ? "Gastbenutzer" : getUsername(),
                authorUserId: "local-user-id",
                lastUpdated: formatDate(Date.now().toString())
            }

            setFeedbacks(prev => [...prev, newFeedback]);
            setShowFeedbackDialog(false);
        } finally {
            setShowFeedbackDialog(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        const loadInit = async () => {
            setLoading(true);

            try {
                let page: Feedback[] = [];
                let nextContinuation: string | null = null;
                const targetId = new URLSearchParams(window.location.search).get("feedback");

                do {
                    const res = await getFeedback(20, nextContinuation);
                    page = [...page, ...res.data];
                    nextContinuation = res.continuation;
                    if (cancelled) {
                        return;
                    }
                } while (targetId && nextContinuation && !page.some(item => item.id === targetId));

                if (cancelled) {
                    return;
                }

                setFeedbacks(page);
                setContinuation(nextContinuation);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadInit();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!expandedId || !feedbacks.some(item => item.id === expandedId)) {
            return;
        }
        document.getElementById(`feedback-${expandedId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [expandedId, feedbacks]);

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


    return <div className="survival-kit-page">
        <div className="ideas-page">
            <SectionHeading
                heading={"Ideen und Feedback"}
                centered={false}
                subheading={"Ideen und Feedback, das von anderen Benutzern eingereicht wurde"}
                actions={[
                    { icon: MessageSquareText, text: "Beitrag schreiben", link: () => setShowFeedbackDialog(true) }
                ]}
            />
            <FeedbackDialog
                isOpen={showFeedbackDialog}
                onCancel={() => setShowFeedbackDialog(false)}
                onSubmit={onFeedbackSubmit}
            />
            {
                feedbacks.map(feedback => <FeedbackItem title={feedback.title} description={feedback.description} author={feedback.authorUsername} authorUserId={feedback.authorUserId} type={feedback.type} date={formatDate(feedback.addedAt)} likes={feedback.likes} dislikes={feedback.dislikes} answer={feedback.answer} id={feedback.id} key={feedback.id} startExpanded={feedback.id === expandedId} onDelete={(id) => onFeedbackDelete(id)} />)
            }
            { continuation !== null && <Button text="Mehr laden" onClick={() => loadMore()} variant="primary" disabled={continuation === null} /> }
            { feedbacks.length === 0 && <h4 className="no-items-info">Es gibt aktuell keine Beiträge</h4> }
        </div>
    </div>
}

export default IdeasPage;