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
                    quickLink={link}
                    showClickedThisMonth={true}
                />
            ))}
        </div>
    );
}

export default PopularLinks;