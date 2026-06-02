import './PopularLinks.css';
import {useEffect, useState} from "react";
import type {QuickLink} from "../models/QuickLink.tsx";
import {getQuickLinksFiltered} from "../services/quickLinkService.tsx";
import QuickLinkCard from "./QuickLinkCard.tsx";

const PopularLinks = () => {
    const [popularLinks, setPopularLinks] = useState<QuickLink[]>([]);

    useEffect(() => {
        getQuickLinksFiltered(true,true,  5)
            .then((res) => setPopularLinks(res.data))
            .catch(console.error);
    }, []);

    return (
        <div className="popular-links">
            {popularLinks.map((link) => (
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
    );
}

export default PopularLinks;