import {useEffect, useState} from "react";
import FeatureGrid, {type FeatureItem} from "@/components/explore/feature-grid/FeatureGrid.tsx";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import {fetchProfileSettings} from "@/services/userService.tsx";

type MinigamesProps = {
    heading: string;
    subheading?: string;
};

type FeatureContext = {
    showUserCards: boolean;
    hasCourse: boolean;
    courseName: string;
};

type FeatureDefinition = {
    id: string;
    href: string;
    title: string | ((context: FeatureContext) => string);
    description: string;
    imageSrc: string;
    credit?: string;
    include: (context: FeatureContext) => boolean;
};

const FEATURES: FeatureDefinition[] = [
    {
        id: "exmatriculation",
        href: "/exmatriculation",
        title: "Exmatrikulations-Simulator",
        description: "Ein Klick, ein Plopp, und die Vorlesung ist vorbei. Der schnellste Abschluss, den du selbst ziehen kannst.",
        imageSrc: "/images/Exmatriculation-Simulator-Preview.png",
        include: () => true,
    },
    {
        id: "caffeine",
        href: "/caffeine-calculator",
        title: "Koffeinrechner",
        description: "Sieh, wie lange der Energy Drink noch im Blut bleibt, und plane den nächsten Monster rechtzeitig.",
        imageSrc: "/images/white-monster.png",
        include: () => true,
    },
    {
        id: "presentation-game",
        href: "/presentation-game",
        title: "Präsi-Spiel",
        description: "Bau Zufallswörter unauffällig in deine Präsentation ein. Der Host präsentiert, die Jury vergibt Punkte.",
        imageSrc: "/images/dice.png",
        include: ({showUserCards}) => showUserCards,
    },
    {
        id: "memewall",
        href: "/memewall",
        title: ({courseName}) => `${courseName} Memewand`,
        description: "Die besten Memes aus deinem Kurs. Hochladen, stöbern und den Studienalltag festhalten.",
        imageSrc: "/images/memewall.png",
        include: ({showUserCards, hasCourse}) => showUserCards && hasCourse,
    },
    {
        id: "roomfinder",
        href: "/roomfinder",
        title: "Roomfinder",
        description: "Finde freie Räume zur gewählten Uhrzeit, optional direkt neben deinem Hörsaal.",
        imageSrc: "/images/roomfinder.png",
        credit: "Powered by Rudi Regentonne",
        include: () => true,
    },
];

const resolveFeatures = (context: FeatureContext): FeatureItem[] => {
    return FEATURES.filter((feature) => feature.include(context)).map((feature) => ({
        id: feature.id,
        href: feature.href,
        title: typeof feature.title === "function" ? feature.title(context) : feature.title,
        description: feature.description,
        imageSrc: feature.imageSrc,
        credit: feature.credit,
    }));
};

const Minigames = ({heading, subheading}: MinigamesProps) => {
    const userRole = getUserRole();
    const showUserCards = userRole === "USER" || userRole === "MEMELORD" || userRole === "ADMIN";
    const [course, setCourse] = useState("");
    const courseName = course.trim();

    useEffect(() => {
        if (!showUserCards) {
            return;
        }

        const fetchCourse = async () => {
            try {
                const profileSettings = await fetchProfileSettings();
                setCourse(profileSettings.course ?? "");
            } catch {
                setCourse("");
            }
        };

        fetchCourse();
    }, [showUserCards]);

    return (
        <section className="feature-band">
            <SectionHeading heading={heading} subheading={subheading} centered={false} />
            <FeatureGrid
                items={resolveFeatures({
                    showUserCards,
                    hasCourse: courseName.length > 0,
                    courseName,
                })}
            />
        </section>
    );
};

export default Minigames;
