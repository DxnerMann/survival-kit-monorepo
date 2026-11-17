import "@/components/explore/PopularLinks.css";
import {useEffect, useState} from "react";
import {isQuickLinkNew, type QuickLink} from "@/models/QuickLink.tsx";
import {getQuickLinksFiltered} from "@/services/quickLinkService.tsx";
import QuickLinkCard from "@/components/explore/QuickLinkCard.tsx";
import {useQuickLinkFavourites} from "@/hooks/useQuickLinkFavourites.tsx";

const PopularLinks = () => {
    const [popularLinks, setPopularLinks] = useState<QuickLink[]>([]);
    const {canFavourite, isFavourite, toggleFavourite} = useQuickLinkFavourites();

    useEffect(() => {
        Promise.all([
            getQuickLinksFiltered(true, true, 50, null, null, "NEWEST"),
            getQuickLinksFiltered(true, true, 50, null, null, "POPULAR"),
        ])
            .then(([newest, popular]) => {
                const byId = new Map<string, QuickLink>();
                for (const link of [...newest.data, ...popular.data]) {
                    byId.set(link.id, link);
                }
                const ordered = [...byId.values()].sort((left, right) => {
                    const leftNew = isQuickLinkNew(left.addedAt) ? 1 : 0;
                    const rightNew = isQuickLinkNew(right.addedAt) ? 1 : 0;
                    if (leftNew !== rightNew) {
                        return rightNew - leftNew;
                    }
                    return right.clickedThisMonth - left.clickedThisMonth
                        || Date.parse(right.addedAt) - Date.parse(left.addedAt);
                });
                setPopularLinks(ordered.slice(0, 5));
            })
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