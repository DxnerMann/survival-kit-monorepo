import './ExplorePage.css';
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import {useEffect, useState} from "react";
import type {QuickLink} from "../../models/QuickLink.tsx";
import {getQuickLinksFiltered} from "../../services/quickLinkService.tsx";
import QuickLinkCard from "../../components/QuickLinkCard.tsx";
import Button from "../../components/shared/Button.tsx";

const ExplorePage = () => {
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);

    useEffect(() => {
        getQuickLinksFiltered(true,true,  20)
            .then((res) => setQuickLinks(res.data))
            .catch(console.error);
    }, []);

    const loadMoreLinks = async () => {

        const res = await getQuickLinksFiltered(
            false,
            false,
            50,
            continuation
        );

        setQuickLinks(prev =>
            [...prev, ...res.data]
        );

        setContinuation(res.continuation);
    };


    return <div className="explore-page">
        <SectionHeading heading="Alle Spiele" centered={false} />
        <div className="explore-page-games">
            {quickLinks.map((link) => (
                <QuickLinkCard
                    key={link.id}
                    id={link.id}
                    title={link.title}
                    description={link.description}
                    url={link.url}
                    clickedThisMonth={link.clickedThisMonth}
                    clickedOverall={link.clickedOverall}
                    favouriteCount={link.favouriteCount}
                    approvedByAdmin={link.approvedByAdmin}
                    addedAt={link.addedAt}
                    lastUpdated={link.lastUpdated}
                    lastReset={link.lastReset}
                />
            ))}
        </div>
        { continuation !== null && <Button text="Mehr Laden" onClick={() => loadMoreLinks()} />}
    </div>
}

export default ExplorePage;