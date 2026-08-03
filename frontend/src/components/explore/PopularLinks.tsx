import "@/components/explore/PopularLinks.css";
import {useEffect, useState} from "react";
import type {QuickLink} from "@/models/QuickLink.tsx";
import {getQuickLinksFiltered} from "@/services/quickLinkService.tsx";
import QuickLinkCard from "@/components/explore/QuickLinkCard.tsx";
import {useQuickLinkFavourites} from "@/hooks/useQuickLinkFavourites.tsx";

const PopularLinks = () => {
    const [popularLinks, setPopularLinks] = useState<QuickLink[]>([]);
    const {canFavourite, isFavourite, toggleFavourite} = useQuickLinkFavourites();

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
                    quickLink={link}
                    showClickedThisMonth={true}
                    showFavouriteButton={canFavourite}
                    isFavourite={isFavourite(link.id)}
                    onToggleFavourite={toggleFavourite}
                />
            ))}
        </div>
    );
}

export default PopularLinks;