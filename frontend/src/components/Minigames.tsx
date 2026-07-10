import "./Minigames.css";
import LinkCard from "./LinkCard/LinkCard.tsx";

const Minigames = () => {
    return <div className="minigames-container">
        <LinkCard
            href={"/exmatriculation"}
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

export default Minigames;