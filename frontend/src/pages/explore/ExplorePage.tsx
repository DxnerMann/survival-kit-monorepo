import "@/pages/explore/ExplorePage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {useEffect, useState} from "react";
import type {QuickLink} from "@/models/QuickLink.tsx";
import {getQuickLinksFiltered, suggestLink} from "@/services/quickLinkService.tsx";
import QuickLinkCard from "@/components/explore/QuickLinkCard.tsx";
import Button from "@/components/ui/Button.tsx";
import {LayersPlus} from "lucide-react";
import GameSuggestionDialog from "@/components/dialog/GameSuggestionDialog.tsx";
import Minigames from "@/components/explore/Minigames.tsx";
import Separator from "@/components/ui/Separator.tsx";

const ExplorePage = () => {
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [showGameSuggestionDialog, setShowGameSuggestionDialog] = useState(false);
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

        const res = await getQuickLinksFiltered(
            true,
            true,
            PAGE_SIZE,
            continuation
        );

        setQuickLinks(prev =>
            [...prev, ...res.data]
        );
        setContinuation(res.continuation);

        // size < 20 => no more games left
        if (res.data.length < PAGE_SIZE) {
            setContinuation(null);
        }
    };


    return <div className="survival-kit-page">
        <div className="explore-page">
            <SectionHeading
                heading="Alle Browser Spiele"
                centered={false}
                actions={[
                    { icon: LayersPlus, text: "Spiel Vorschlagen", link: () => setShowGameSuggestionDialog(true) }
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
                    />
                ))}
            </div>
            <div className="explore-page-games-load-more-button-wrapper">
                { continuation !== null && continuation !== "" && <Button variant={"primary"} text="Mehr Spiele laden" onClick={() => loadMoreLinks()} />}
            </div>
            < Separator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <SectionHeading heading="Weitere <a class='important-text'>Survival-Kit-Minigames</a>" centered={false} />
            <Minigames />
        </div>
    </div>
}

export default ExplorePage;