import LinkCard from "@/components/explore/LinkCard/LinkCard.tsx";
import {getUserRole} from "@/services/tokenService.tsx";

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
        <LinkCard
            href={"/caffeine-calculator"}
            heading={"Der Koffeinrechner"}
            description={
                "Wie lange hält dich der Energy Drink noch wach?\n" +
                "\n" +
                "Gib deine Koffein-Dosis ein und sieh, wie der Blutspiegel über die Zeit abfällt – " +
                "mit Halbwertszeit-Berechnung für den restlichen Vorlesungstag.\n" +
                "\n" +
                "Perfekt, um den nächsten Monster zeitlich richtig zu planen."
            }
            alingRight={true}
            previewImagePath={"/images/white-monster.png"}
        />
        {getUserRole() !== "GUEST" && (
            <LinkCard
                href={"/presentation-game"}
                heading={"Das Präsi-Spiel"}
                description={
                    "Während du im Kurs Presentierst, erscheinen Zufallswörter auf dem Bildschirm. – Baue sie unauffällig in deine Präsentation ein, ohne dass der/die Dozent*in es merkt um Punkte zu gewinnen.\n" + "\n" +
                    "Der Lobby-Host ist Presenter und kann Wörter nur überspringen. Mitspieler genehmigen eingebaute Wörter und sammeln Punkte." + "\n" +
                    "Es gibt mehrere Schwierigkeitsstufen"
                    }
                alingRight={false}
                previewImagePath={"/images/dice.png"}
            />
        )}
    </div>
}

export default Minigames;
