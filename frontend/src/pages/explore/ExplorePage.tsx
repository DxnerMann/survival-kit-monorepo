import "@/pages/explore/ExplorePage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {useEffect, useRef, useState} from "react";
import type {QuickLink} from "@/models/QuickLink.tsx";
import {getQuickLinksFiltered, suggestLink} from "@/services/quickLinkService.tsx";
import QuickLinkCard from "@/components/explore/QuickLinkCard.tsx";
import Button from "@/components/ui/Button.tsx";
import {LayersPlus} from "lucide-react";
import GameSuggestionDialog from "@/components/dialog/GameSuggestionDialog.tsx";
import Minigames from "@/components/explore/Minigames.tsx";
import Separator from "@/components/ui/Separator.tsx";
import {useQuickLinkFavourites} from "@/hooks/useQuickLinkFavourites.tsx";

const ExplorePage = () => {
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [showGameSuggestionDialog, setShowGameSuggestionDialog] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);
    const {canFavourite, isFavourite, toggleFavourite} = useQuickLinkFavourites();
    const PAGE_SIZE = 20;

    useEffect(() => {
        getQuickLinksFiltered(true,true,  PAGE_SIZE)
            .then((res) => {
                setQuickLinks(res.data);
                // size < 20 => no more games left
                if (res.data.length < PAGE_SIZE) {
                    setContinuation(null);
                } else {
                    setContinuation(res.continuation);
                }
            })
            .catch(console.error);
    }, []);

    const loadMoreLinks = async () => {
        if (loadingMoreRef.current || continuation == null || continuation === "") return;

        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const res = await getQuickLinksFiltered(
                true,
                true,
                PAGE_SIZE,
                continuation
            );

            setQuickLinks(prev => {
                const seen = new Set(prev.map(link => link.id));
                return [...prev, ...res.data.filter(link => !seen.has(link.id))];
            });

            // size < 20 => no more games left
            setContinuation(res.data.length < PAGE_SIZE ? null : res.continuation);
        } catch (error) {
            console.error(error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    };


    return <div className="survival-kit-page">
        <div className="explore-page">
            <SectionHeading
                heading="Alle Browserspiele"
                centered={false}
                actions={[
                    { icon: LayersPlus, text: "Spiel vorschlagen", link: () => setShowGameSuggestionDialog(true) }
                ]}
            />
            <GameSuggestionDialog
                isOpen={showGameSuggestionDialog}
                onCancel={() => setShowGameSuggestionDialog(false)}
                onSubmit={async (data) => {
                    await suggestLink(data);
                    setShowGameSuggestionDialog(false);
                }}
            />
            <div className="explore-page-games">
                {quickLinks.map((link) => (
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
            <div className="explore-page-games-load-more-button-wrapper">
                { continuation !== null && continuation !== "" && <Button variant={"primary"} text="Mehr Spiele laden" onClick={() => void loadMoreLinks()} disabled={loadingMore} />}
            </div>
            < Separator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <SectionHeading heading="Weitere <a class='important-text'>Survival-Kit-Minigames</a>" centered={false} />
            <Minigames />
        </div>
    </div>
}

export default ExplorePage;