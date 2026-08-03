import {useEffect, useState, type MouseEvent} from "react";
import {Star} from "lucide-react";
import {getPreviewImage, onLinkClick} from "@/services/quickLinkService.tsx";
import type {QuickLink} from "@/models/QuickLink.tsx";
import "@/components/explore/QuickLinkCard.css";

interface QuickLinkCardProps {
    quickLink: QuickLink,
    showClickedThisMonth: boolean,
    isFavourite?: boolean,
    onToggleFavourite?: (id: string) => void,
    showFavouriteButton?: boolean,
}

const QuickLinkCard = ({
    quickLink,
    showClickedThisMonth,
    isFavourite = false,
    onToggleFavourite,
    showFavouriteButton = false,
} : QuickLinkCardProps) => {
    const [img, setImg] = useState<string | null>(null);
    const [localClickUpdate, setLocalClickUpdate] = useState(0);
    // eslint-disable-next-line react-hooks/purity
    const isNew = quickLink.addedAt && (Date.now() - new Date(quickLink.addedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

    useEffect(() => {
        getPreviewImage(quickLink.url).then(setImg);
    }, []);

    const onClick = () => {
        try {
            const parsed = new URL(quickLink.url);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return;
            }
        } catch {
            return;
        }

        onLinkClick(quickLink);
        setLocalClickUpdate(localClickUpdate + 1);
        window.open(quickLink.url, "_blank", "noopener,noreferrer");
    };

    const onFavouriteClick = (event: MouseEvent) => {
        event.stopPropagation();
        onToggleFavourite?.(quickLink.id);
    };

    return (
        <div className="quick-link-card" onClick={onClick}>
            {isNew && <span className="quick-link-badge-new">NEW</span>}
            <div className="quick-link-preview-img">
                {
                    img ? <img src={img} alt="preview" /> : <p>Loading…</p>
                }
            </div>
            <div className="quick-link-info">
                {showFavouriteButton && (
                    <button
                        type="button"
                        className={`quick-link-fav-button ${isFavourite ? "is-favourite" : ""}`}
                        onClick={onFavouriteClick}
                        aria-label={isFavourite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                    >
                        <Star size={24} fill={isFavourite ? "currentColor" : "none"} />
                    </button>
                )}
                <div className="quick-link-info-1">
                    <h2 className="quick-link-title">{quickLink.title}</h2>
                    <h3
                        className="quick-link-description"
                        title={quickLink.description}
                    >
                        {quickLink.description}
                    </h3>
                </div>
                { showClickedThisMonth && <h3 className="quick-link-clicked-this-month">{quickLink.clickedThisMonth + localClickUpdate} mal gespielt diesen Monat.</h3>}
            </div>
        </div>
    );
}

export default QuickLinkCard;