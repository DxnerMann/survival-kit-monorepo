import {useEffect, useState} from "react";
import {getPreviewImage, onLinkclick} from "../services/quickLinkService.tsx";
import type {QuickLink} from "../models/QuickLink.tsx";

const QuickLinkCard = (quickLink : QuickLink) => {
    const [img, setImg] = useState<string | null>(null);
    const [localClickUpdate, setLocalClickUpdate] = useState(0);

    useEffect(() => {
        getPreviewImage(quickLink.url).then(setImg);
    }, []);

    const onClick = () => {
        onLinkclick(quickLink);
        setLocalClickUpdate(localClickUpdate + 1);
        window.open(quickLink.url, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="quick-link-card" onClick={onClick}>
            <div className="quick-link-preview-img">
                {
                    img ? <img src={img} alt="preview" /> : <p>Loading…</p>
                }
            </div>
            <div className="quick-link-info">
                <div className="quick-link-info-1">
                    <h2 className="quick-link-title">{quickLink.name}</h2>
                    <h3 className="quick-link-description">{quickLink.description}</h3>
                </div>
                <h3 className="quick-link-clicked-this-month">{quickLink.clickedThisMonth + localClickUpdate} mal gespielt diesen Monat.</h3>
            </div>
        </div>
    );
}

export default QuickLinkCard;