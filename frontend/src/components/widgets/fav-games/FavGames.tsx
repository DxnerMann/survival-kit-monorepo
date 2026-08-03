import "@/components/widgets/fav-games/FavGames.css";
import {useEffect, useMemo, useState} from "react";
import type {WidgetProps} from "@/models/WidgetProps.tsx";
import type {QuickLink} from "@/models/QuickLink.tsx";
import {getFavourites, getPreviewImage, onLinkClick} from "@/services/quickLinkService.tsx";
import {getErrorText} from "@/services/api.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import WidgetStatus from "@/components/ui/WidgetStatus.tsx";

const FavGamesTile = ({link}: { link: QuickLink }) => {
    const [img, setImg] = useState<string | null>(null);

    useEffect(() => {
        getPreviewImage(link.url).then(setImg);
    }, [link.url]);

    const onClick = () => {
        try {
            const parsed = new URL(link.url);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                return;
            }
        } catch {
            return;
        }

        onLinkClick(link);
        window.open(link.url, "_blank", "noopener,noreferrer");
    };

    return (
        <button type="button" className="fav-games-tile" onClick={onClick} title={link.title}>
            {img
                ? <img className="fav-games-tile-bg" src={img} alt="" aria-hidden="true" />
                : <span className="fav-games-tile-loading">…</span>}
            <span className="fav-games-tile-title">{link.title}</span>
        </button>
    );
};

const FavGames = ({title, isPreview, width = 2, height = 2}: WidgetProps) => {
    const cols = Math.max(2, width);
    const rows = Math.max(2, height);
    const slotCount = cols * rows;

    const [favourites, setFavourites] = useState<QuickLink[]>([]);
    const [loading, setLoading] = useState(!isPreview);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isPreview) {
            return;
        }
        if (getUserRole() === "GUEST") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            setError("Melde dich an, um Favoriten zu sehen.");
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const page = await getFavourites(slotCount);
                if (!cancelled) {
                    setFavourites(page.data);
                    setError(null);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    setError(getErrorText(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [isPreview, slotCount]);

    const previewTiles = useMemo(() => Array.from({length: 4}, (_, i) => i), []);

    if (isPreview) {
        return <>
            <div
                className="fav-games-preview"
                style={{
                    gridTemplateColumns: `repeat(2, 1fr)`,
                    gridTemplateRows: `repeat(2, 1fr)`,
                }}
            >
                {previewTiles.map(i => (
                    <div key={i} className="fav-games-preview-tile" />
                ))}
            </div>
            <h3 className="widget-title-preview">{title}</h3>
        </>;
    }

    return (
        <div className="fav-games-widget">
            <div
                className="fav-games-grid"
                style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
            >
                {loading && <WidgetStatus status="loading" />}
                {!loading && error && <WidgetStatus status="error" message={error} />}
                {!loading && !error && favourites.length === 0 && (
                    <WidgetStatus status="error" message="Noch keine Favoriten. Markiere Spiele mit dem Stern." />
                )}
                {!loading && !error && favourites.map(link => (
                    <FavGamesTile key={link.id} link={link} />
                ))}
            </div>
        </div>
    );
};

export default FavGames;
