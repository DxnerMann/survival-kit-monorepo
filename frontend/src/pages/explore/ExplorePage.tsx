import './ExplorePage.css';
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import {useEffect, useState} from "react";
import type {QuickLink} from "../../models/QuickLink.tsx";
import {getQuickLinksFiltered, suggestLink} from "../../services/quickLinkService.tsx";
import QuickLinkCard from "../../components/QuickLinkCard.tsx";
import Button from "../../components/shared/Button.tsx";
import LinkCard from "../../components/LinkCard/LinkCard.tsx";
import {LayersPlus} from "lucide-react";
import GameSuggestionDialog from "../../components/shared/dialog/GameSuggestionDialog.tsx";

const ExplorePage = () => {
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [showGameSuggestionDialog, setShowGameSuggestionDialog] = useState(false);

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
        <SectionHeading
            heading="Alle Spiele"
            centered={false}
            actions={[
                { icon: LayersPlus, text: "Spiel Vorschlagen", link: () => setShowGameSuggestionDialog(true) }
            ]}
        />
        <GameSuggestionDialog
            isOpen={showGameSuggestionDialog}
            onCancel={() => setShowGameSuggestionDialog(false)}
            onSubmit={(data) => {
                suggestLink(data);
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
        { continuation !== null && <Button text="Mehr Laden" onClick={() => loadMoreLinks()} />}
        <SectionHeading heading="Der Exmatrikulations Simulator" centered={false} />
        <LinkCard
            href={"/exmatriculation#pagestart"}
            heading={"Der Exmatrikulations-Simulator V2"}
            description={
                "Du hast dein Studium satt? Keine Lust mehr auf Prüfungsstress, endlose Vorlesungen und den Kampf mit Moodle?\n" +
                "Dann probier jetzt den Exmatrikulations-Simulator!\n" +
                "\n" +
                "Lass alle Sorgen einfach den digitalen Abfluss runterspülen – Hausarbeiten, Anwesenheitslisten und unbeantwortete Mails an die Profs gleich mit.\n" +
                "Ein Klick, ein erleichterndes „Plopp“ – und schon bist du frei wie nie zuvor.\n" +
                "\n" +
                "Wage den Schritt, den du schon immer machen wolltest.\n" +
                "Fühl dich leichter, entspannter und offiziell unimmatrikuliert.\n" +
                "\n" +
                "Exmatrikulations-Simulator – weil manchmal der wichtigste Abschluss der ist, den man selbst zieht."
            }
            alingRight={false}
            previewImagePath={"/images/Exmatriculation-Simulator-Preview.png"}
        />
    </div>
}

export default ExplorePage;