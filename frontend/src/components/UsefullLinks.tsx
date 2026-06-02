import './UsefullLinks.css';
import type {QuickLink} from "../models/QuickLink.tsx";
import QuickLinkCard from "./QuickLinkCard.tsx";

const UsefullLinks = () => {
    const links : QuickLink [] = [
        {
            id: "moodle",
            title: "DHBW Moodle",
            description: "Offizielles DHBW Moodle - Die Wichtigste Plattform der DHBW",
            url: "https://moodle.dhbw.de/",
            addedAt: "",
            approvedByAdmin: true,
            clickedOverall: 0,
            clickedThisMonth: 0,
            favouriteCount: 0,
            lastReset: "",
            lastUpdated: ""
        },
        {
            id: "mensa",
            title: "DHBW Mensa",
            description: "Offizieller Mensa Plan der Mensa in der Erzbergerstraße",
            url: "https://www.sw-ka.de/de/hochschulgastronomie/speiseplan/mensa_erzberger/",
            addedAt: "",
            approvedByAdmin: true,
            clickedOverall: 0,
            clickedThisMonth: 0,
            favouriteCount: 0,
            lastReset: "",
            lastUpdated: ""
        },
        {
            id: "dualis",
            title: "Dualis",
            description: "Offizielles DHBW Tool zum einsehen von Prüfungsergebnissen",
            url: "https://dualis.dhbw.de/",
            addedAt: "",
            approvedByAdmin: true,
            clickedOverall: 0,
            clickedThisMonth: 0,
            favouriteCount: 0,
            lastReset: "",
            lastUpdated: ""
        },
        {
            id: "let_go",
            title: "Loslassen",
            description: "Tue es!",
            url: "/files/Loslassen.pdf",
            addedAt: "",
            approvedByAdmin: true,
            clickedOverall: 0,
            clickedThisMonth: 0,
            favouriteCount: 0,
            lastReset: "",
            lastUpdated: ""
        },
        {
            id: "claude",
            title: "Claude",
            description: "Claude ist ein KI-Assistent von Anthropic, der beim Schreiben, Programmieren, Recherchieren und Beantworten von Fragen unterstützt.",
            url: "https://claude.ai",
            addedAt: "",
            approvedByAdmin: true,
            clickedOverall: 0,
            clickedThisMonth: 0,
            favouriteCount: 0,
            lastReset: "",
            lastUpdated: ""
        }
    ]

    return (
        <div className="usefull-links">
            {links.map((link) => (
                <QuickLinkCard
                    quickLink={link}
                    showClickedThisMonth={false}
                />
            ))}
        </div>
    );
}

export default UsefullLinks;