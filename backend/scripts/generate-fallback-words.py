#!/usr/bin/env python3
"""Regenerate fallback-words-de.txt, preserving existing words and topping up to the target count."""
from __future__ import annotations

from html import unescape
from pathlib import Path
import json
import re
import urllib.request

OUT = Path(__file__).resolve().parents[1] / "src/main/resources/presentation-game/fallback-words-de.txt"
URL = "https://alex-riedel.de/randV2.php?anz=50"
TARGET_COUNT = 1000
VALID_WORD = re.compile(r"^[a-zA-ZäöüÄÖÜß]{3,32}$")

OFFLINE_SUPPLEMENT = [
    "Abendsonne", "Abgas", "Abhang", "Abnehmer", "Abschnitt", "Abwasser", "Achse", "Adresse",
    "Affe", "Agent", "Ahorn", "Akademie", "Allee", "Allergie", "Alm", "Alpen", "Amme",
    "Ananas", "Anfang", "Anker", "Anlage", "Anreiz", "Anzug", "Apfel", "Apotheke", "Arbeiter",
    "Archiv", "Arena", "Arm", "Aroma", "Arztpraxis", "Atlas", "Atmung", "Aufbau", "Aufgabe",
    "Auge", "Ausdruck", "Ausgang", "Aussicht", "Auto", "Bach", "Bahn", "Balkon", "Ballon",
    "Banane", "Bank", "Bar", "Bauch", "Baum", "Becher", "Bein", "Bericht", "Beruf", "Bett",
    "Bibel", "Bild", "Birne", "Blatt", "Blech", "Blitz", "Block", "Blume", "Blut", "Boden",
    "Bogen", "Boot", "Briefmarke", "Bruder", "Brunnen", "Buch", "Burg", "Campus", "Clown",
    "Dach", "Dame", "Dampf", "Dank", "Decke", "Demut", "Dialog", "Dienst", "Dorf", "Drache",
    "Druck", "Durst", "Ecke", "Eiche", "Eimer", "Eis", "Eltern", "Ente", "Erde", "Erfolg",
    "Essen", "Eule", "Fabrik", "Fahne", "Falke", "Familie", "Farbe", "Feder", "Fehler", "Feld",
    "Fenster", "Fest", "Feuer", "Film", "Finger", "Fisch", "Flasche", "Fluss", "Form", "Foto",
    "Frage", "Frau", "Freude", "Freund", "Frieden", "Frucht", "Fuchs", "Fund", "Gabel", "Garten",
    "Gast", "Gedanke", "Gefahr", "Geld", "Gesetz", "Gesicht", "Gewitter", "Gold", "Grab", "Gras",
    "Griff", "Gruppe", "Haar", "Hafen", "Hahn", "Hals", "Handschuh", "Harfe", "Haut", "Heft",
    "Heimat", "Held", "Herz", "Hilfe", "Himmel", "Hobby", "Hoffnung", "Hose", "Hotel", "Hund",
    "Hunger", "Hut", "Idee", "Insel", "Jacke", "Jahr", "Journal", "Jugend", "Kaffee", "Kaiser",
    "Kalender", "Kamera", "Kamm", "Kanal", "Kante", "Karte", "Kasten", "Kater", "Katze", "Kauf",
    "Keller", "Kind", "Kino", "Kirche", "Kiste", "Klasse", "Kleid", "Klima", "Knochen", "Koch",
    "Koffer", "Kollege", "Komet", "Konto", "Kopf", "Korn", "Kran", "Kreis", "Krieg", "Krug",
    "Labor", "Laden", "Lamm", "Lampe", "Land", "Laub", "Leben", "Lehrer", "Leiter", "Lektion",
    "Licht", "Liebe", "Lied", "Limonade", "Linie", "Lippe", "Liste", "Liter", "Loch", "Lohn",
    "Lokal", "Luft", "Lunge", "Lust", "Magazin", "Magen", "Mai", "Maler", "Mama", "Mantel",
    "Markt", "Maschine", "Material", "Maus", "Meer", "Menge", "Mensa", "Messer", "Metall", "Miete",
    "Milch", "Minute", "Mittag", "Mode", "Moment", "Mond", "Monitor", "Morgen", "Motor", "Museum",
    "Musik", "Mutter", "Nacht", "Nadel", "Nagel", "Nase", "Natur", "Nebel", "Nest", "Netz",
    "Nudel", "Nuss", "Obst", "Ohr", "Oma", "Onkel", "Opa", "Oper", "Orange", "Ort", "Ozean",
    "Paket", "Palast", "Papa", "Papier", "Park", "Partner", "Party", "Pass", "Pause", "Pferd",
    "Pflanze", "Piano", "Pilz", "Pilot", "Plan", "Planet", "Platz", "Pokal", "Polizei", "Post",
    "Preis", "Problem", "Programm", "Puls", "Punkt", "Quelle", "Radio", "Rahmen", "Rand", "Rasen",
    "Raum", "Rede", "Regen", "Reh", "Reise", "Restaurant", "Rhythmus", "Rind", "Ring", "Rock",
    "Rolle", "Rose", "Ruhe", "Runde", "Saal", "Sache", "Salz", "Sand", "Satz", "Schaf", "Schatten",
    "Schiff", "Schild", "Schirm", "Schloss", "Schnee", "Schule", "Schwester", "See", "Seife", "Seite",
    "Sekunde", "Sessel", "Sieg", "Signal", "Sinn", "Sitz", "Sofa", "Sohn", "Sonne", "Spiegel",
    "Spiel", "Sport", "Sprache", "Spur", "Stadt", "Stamm", "Star", "Station", "Stein", "Stelle",
    "Stern", "Stift", "Stimme", "Stock", "Stoff", "Strand", "Strom", "Stuhl", "Stunde", "Sturm",
    "Summe", "Symbol", "System", "Tag", "Talent", "Tanz", "Tasche", "Taste", "Taxi", "Team",
    "Technik", "Teil", "Telefon", "Termin", "Test", "Text", "Theater", "Thema", "Ticket", "Tier",
    "Tiger", "Tinte", "Tisch", "Tochter", "Tor", "Traum", "Treppe", "Turm", "Ufer", "Uhr",
    "Umwelt", "Unfall", "Uniform", "Universum", "Vater", "Verein", "Video", "Villa", "Vogel",
    "Vorsicht", "Wagen", "Wald", "Wand", "Wasser", "Weg", "Wein", "Welt", "Werk", "Wert",
    "Wetter", "Wiese", "Wind", "Winter", "Wissen", "Woche", "Wolf", "Wolke", "Wort", "Wunsch",
    "Wurzel", "Zahl", "Zahn", "Zeit", "Zeitung", "Zelt", "Zentrum", "Zettel", "Zeug", "Ziege",
    "Ziel", "Zimmer", "Zirkus", "Zitrone", "Zoll", "Zone", "Zoo", "Zucker", "Zufall", "Zug",
    "Zukunft", "Zunge", "Zustand", "Zweifel", "Zwerg",
]


def load_existing(path: Path) -> list[str]:
    if not path.exists():
        return []

    words: list[str] = []
    seen: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        word = line.strip()
        if not word or word.startswith("#"):
            continue
        key = word.lower()
        if key not in seen:
            seen.add(key)
            words.append(word)
    return words


def normalize(raw: str) -> str | None:
    word = unescape(raw.strip())
    if not word or " " in word or "-" in word:
        return None
    if not VALID_WORD.match(word):
        return None
    return word


def fetch_from_api(seen: set[str], words: list[str], needed: int) -> None:
    if needed <= 0:
        return

    for _ in range(60):
        if len(words) >= TARGET_COUNT:
            return

        try:
            with urllib.request.urlopen(URL, timeout=15) as response:
                batch = json.loads(response.read().decode("utf-8"))
        except OSError as error:
            print(f"API fetch failed: {error}")
            break

        for raw in batch:
            word = normalize(raw)
            if word is None:
                continue
            key = word.lower()
            if key in seen:
                continue
            seen.add(key)
            words.append(word)
            if len(words) >= TARGET_COUNT:
                return


def append_offline_supplement(seen: set[str], words: list[str]) -> None:
    for raw in OFFLINE_SUPPLEMENT:
        word = normalize(raw)
        if word is None:
            continue
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        words.append(word)
        if len(words) >= TARGET_COUNT:
            return


def main() -> None:
    words = load_existing(OUT)
    seen = {word.lower() for word in words}
    print(f"Loaded {len(words)} existing words")

    fetch_from_api(seen, words, TARGET_COUNT - len(words))

    if len(words) < TARGET_COUNT:
        append_offline_supplement(seen, words)

    if len(words) < TARGET_COUNT:
        print(f"Warning: only collected {len(words)} words (target {TARGET_COUNT})")

    lines = ["# German fallback words for the presentation game", *words[:TARGET_COUNT], ""]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {min(len(words), TARGET_COUNT)} words to {OUT}")


if __name__ == "__main__":
    main()
