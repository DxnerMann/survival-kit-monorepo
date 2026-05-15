import './DashboardPage.css'
import WidgetGrid from "../../components/widget/WidgetGrid.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import {getUsername} from "../../services/userService.tsx";

const DashboardPage = () => {

    const username = getUsername();

    const welcomePhrases = [
        "Der frühe Wurm scheißt auf den Vogel",
        "Der frühe Student fängt den Burnout.",
        "Vorlesungsbeginn 8 Uhr. Menschenrechte enden 7:59.",
        "Wer schläft, sündigt nicht. Wer zur Vorlesung geht schon.",
        "Bildung ist wichtig. Schlaf aber auch.",
        "Die Folien lesen kann ich auch zuhause. Im Bett. Bewusstlos.",
        "Anwesenheitspflicht ist auch nur Freiheitsberaubung mit ECTS.",
        "Der Prof redet, mein Gehirn macht Windows-Updates.",
        "Diese Vorlesung hätte auch eine E-Mail sein können.",
        "Nichts ist motivierender als 94 Slides in Comic Sans.",
        "Ich studiere nicht, ich sammle Müdigkeit mit Zertifikat.",
        "Wer früher aufsteht, hat länger schlechte Laune.",
        "Die einzige Spannung hier ist mein Akku bei 3 Prozent.",
        "Vorlesungen sind Podcasts ohne Pause-Taste.",
        "Mein Geist ist anwesend. Freiwillig aber nicht.",
        "Wissen ist Macht. Ich fühle mich trotzdem schwach.",
        "Die Uhr bewegt sich langsamer als der Studienfortschritt.",
        "Konzentration verloren bei Folie 2.",
        "Diese Vorlesung testet weniger Wissen als Überlebenswillen.",
        "Manche studieren aus Interesse. Ich offenbar aus Versehen.",
        "Noch 2 Stunden Vorlesung. Oder wie andere sagen: Naturkatastrophe.",
        "Der Beamer rauscht lauter als meine Zukunftspläne.",
        "Ich wollte lernen und bekam PowerPoint-Kriegsverbrechen.",
        "Das WLAN kämpft genauso ums Überleben wie ich.",
        "Wer denkt 8 Uhr sei eine humane Uhrzeit, hasst Menschen.",
        "Der Hörsaal hat die Atmosphäre einer Steuererklärung.",
        "Die Zeit vergeht nicht. Sie leidet.",
        "Der frühe Student hat die Kontrolle über sein Leben verloren.",
        "8 Uhr Vorlesung ist eine passive Aggression der Uni.",
        "Mein Körper sitzt hier. Der Rest von mir hat gekündigt.",
        "Diese Vorlesung zieht länger als ein Windows-Update auf HDD.",
        "Studieren heißt auch nur kollektiv müde sein.",
        "Der Hörsaal riecht nach Energy Drinks und Hoffnungslosigkeit.",
        "Folie 73 und wir haben noch nicht mal das Thema verstanden.",
        "Ich bin nicht zu spät. Ich bin emotional nicht angekommen.",
        "Wissen ist vergänglich. Müdigkeit bleibt.",
        "Die Vorlesung beginnt und mein Gehirn geht in Flugmodus.",
        "Man lernt fürs Leben. Heute lerne ich Leid.",
        "Anwesenheit ersetzt hier offensichtlich Qualität.",
        "Die einzige Interaktion hier ist mein Gähnen.",
        "Wer freiwillig montags um 8 motiviert ist, gehört untersucht.",
        "Mein Akku hält länger durch als meine Aufmerksamkeit.",
        "Vorlesung oder Einschlafhilfe? Die Grenzen verschwimmen.",
        "Diese Stunde hätte ein PDF sein können.",
        "Ich höre Wörter, aber keine Bedeutung.",
        "Die Folien kämpfen aktiv gegen meine Netzhaut.",
        "Der Prof erklärt motiviert. Tragisch eigentlich.",
        "Noch 90 Minuten. Gefühlt eine geologische Epoche.",
        "Mein Wille zu leben sinkt proportional zur Anzahl der Diagramme.",
        "Akademische Laufbahn klingt besser als es riecht.",
        "Ich studiere hauptsächlich den Stundenplan und seine Grausamkeit.",
        "Die Uni bildet Charakter. Meiner wird zynisch.",
        "Mein Gehirn cached hier nur Leere.",
        "Der Beamer macht mehr Geräusche als Inhalt.",
        "Diese Vorlesung ist wie ein unskipbarer Cutscene.",
        "Die Motivation hat den Raum vor 20 Minuten verlassen.",
        "Wenn Langeweile Strom erzeugen würde, wäre der Hörsaal ein Kraftwerk.",
        "Das Tempo der Vorlesung und mein Lebenswille gleichen sich an.",
        "Uni ist wie Dark Souls, nur ohne Belohnung.",
        "Ich dachte Bildung macht frei. Fühle mich eher gefangen.",
        "Die Zeit vergeht nicht. Sie leidet.",
        "Diese Vorlesung ist der Endgegner des Wachbleibens.",
        "Ich bin hier aus gesellschaftlichem Druck.",
        "Die Pause ist das eigentliche Studienziel.",
        "Manche suchen Erleuchtung. Ich suche die Steckdose.",
    ];

    // eslint-disable-next-line react-hooks/purity
    const welcomePhrase = welcomePhrases[Math.floor(Math.random() * welcomePhrases.length)];

    return (
        <div className="dashboard-page">
            { getUserRole() !== "GUEST" && <h1 className="heading" >Willkommen zurück {getUsername() === "" ? "" : ","} <a className="important-text">{username}</a>!</h1> }
            { getUserRole() === "GUEST" && <h1 className="heading" >Willkommen auf dem <a className="important-text">Lecture Survival Kit</a>!</h1>}
            <h4 className="welcome-subheading" >{welcomePhrase}</h4>
            <WidgetGrid />
            <h1>Test Hier gehts weiter</h1>
            <h1>Test Hier gehts weiter</h1>
            <h1>Test Hier gehts weiter</h1>
        </div>
    )
}

export default DashboardPage