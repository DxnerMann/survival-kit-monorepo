import "./LegalPage.css"
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import Footer from "../../components/Footer.tsx";

const PrivacyPolicy = () => {
    return <div className="survival-kit-page">
        <div className="legal-page">
            <SectionHeading heading={"Datenschutzerklärung"} centered={false} />
            <div className="legal-section">
                <h2 className="legal-subheading">1. Verantwortlicher</h2>
                <p className="legal-text">
                    Verantwortlicher für die Datenverarbeitung auf dieser Website ist die im
                    <a className="legal-link" href="/imprint">Impressum</a>
                    genannte Person.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">2. Allgemeine Hinweise</h2>
                <p className="legal-text">
                    Der Schutz Ihrer personenbezogenen Daten ist mir ein wichtiges Anliegen.
                    Die Verarbeitung personenbezogener Daten erfolgt ausschließlich im Rahmen
                    der gesetzlichen Vorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO).
                    Diese Datenschutzerklärung informiert über Art, Umfang und Zweck der Verarbeitung
                    personenbezogener Daten auf dieser Website.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">3. Hosting</h2>
                <p className="legal-text">
                    Diese Website wird auf einem angemieteten Server in Deutschland betrieben.
                    Zur Bereitstellung der Website werden technisch notwendige Daten verarbeitet.
                    Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
                    aufgrund des berechtigten Interesses an einem sicheren und zuverlässigen Betrieb
                    der Website.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">4. Registrierung und Benutzerkonto</h2>
                <p className="legal-text">
                    Für die Nutzung bestimmter Funktionen dieser Website kann die Erstellung
                    eines Benutzerkontos erforderlich sein. Dabei werden folgende Daten verarbeitet:<br/>
                    - Vorname<br/>
                    - Nachname<br/>
                    - E-Mail-Adresse<br/>
                    - Passwort (verschlüsselt bzw. gehasht gespeichert)<br/>
                    - Benutzerrolle<br/>
                    - Erstellungs- und Änderungszeitpunkte des Benutzerkontos<br/><br/>
                    Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
                    zur Bereitstellung der angebotenen Dienste und Funktionen.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">5. Anmeldung und Cookies</h2>
                <p className="legal-text">
                    Diese Website verwendet technisch notwendige Cookies und vergleichbare
                    Technologien, die für die Anmeldung und die ordnungsgemäße Funktion
                    der Website erforderlich sind.<br/><br/>
                    Ohne diese Cookies können wesentliche Funktionen der Website nicht
                    bereitgestellt werden. Die Verarbeitung erfolgt auf Grundlage von
                    Art. 6 Abs. 1 lit. f DSGVO sowie § 25 Abs. 2 Nr. 2 TTDSG.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">6. Nutzungsanalyse und Aktivitätsprotokolle</h2>
                <p className="legal-text">
                    Zur Verbesserung der Website, zur Fehleranalyse und zur Erstellung interner
                    Statistiken werden bestimmte Nutzeraktivitäten protokolliert.<br/><br/>
                    Hierbei können insbesondere folgende Daten gespeichert werden:<br/>
                    - Benutzerkennung (User-ID)<br/>
                    - Durchgeführte Aktionen innerhalb der Website<br/>
                    - Zeitstempel der jeweiligen Aktion<br/><br/>
                    Die Daten werden ausschließlich für interne Zwecke verwendet und nicht an Dritte. <br />
                    Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">7. Feedback- und Community-Funktionen</h2>
                <p className="legal-text">
                    Nutzer können Feedback einreichen und Inhalte anderer Nutzer bewerten.
                    Darüber hinaus besteht die Möglichkeit, Spielvorschläge einzureichen.
                    Die Verarbeitung der hierbei übermittelten Daten erfolgt ausschließlich
                    zur Bereitstellung der jeweiligen Funktionen und auf Grundlage von
                    Art. 6 Abs. 1 lit. b DSGVO.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">8. Externe Inhalte und Dienste</h2>
                <p className="legal-text">
                    Diese Website greift teilweise auf Inhalte und Dienste externer Anbieter zurück.
                    Dazu können beispielsweise Inhalte der DHBW Karlsruhe oder anderer externer
                    Dienste gehören.<br/><br/>
                    Beim Abruf solcher Inhalte kann eine Verbindung zu den Servern des jeweiligen
                    Anbieters hergestellt werden. Dabei können technische Informationen, insbesondere
                    die IP-Adresse, an den jeweiligen Anbieter übermittelt werden.<br/><br/>
                    Auf die Datenverarbeitung durch diese Anbieter habe ich keinen Einfluss.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">9. Externe Links</h2>
                <p className="legal-text">
                    Diese Website enthält Links zu externen Websites Dritter.
                    Für die Inhalte und Datenschutzpraktiken der verlinkten Seiten sind
                    ausschließlich deren jeweilige Betreiber verantwortlich.
                    Zum Zeitpunkt der Verlinkung waren keine rechtswidrigen Inhalte erkennbar.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">10. Speicherdauer</h2>
                <p className="legal-text">
                    Personenbezogene Daten werden nur so lange gespeichert, wie dies für die
                    jeweiligen Verarbeitungszwecke erforderlich ist oder gesetzliche
                    Aufbewahrungspflichten bestehen.<br/><br/>
                    Nutzer können ihr Benutzerkonto selbstständig löschen. Nach Löschung
                    des Kontos werden personenbezogene Daten im Rahmen der technischen
                    Möglichkeiten und unter Berücksichtigung gesetzlicher Vorgaben entfernt.
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">11. Rechte betroffener Personen</h2>
                <p className="legal-text">
                    Betroffene Personen haben im Rahmen der gesetzlichen Bestimmungen
                    insbesondere folgende Rechte:<br/>
                    - Recht auf Auskunft gemäß Art. 15 DSGVO<br/>
                    - Recht auf Berichtigung gemäß Art. 16 DSGVO<br/>
                    - Recht auf Löschung gemäß Art. 17 DSGVO<br/>
                    - Recht auf Einschränkung der Verarbeitung gemäß Art. 18 DSGVO<br/>
                    - Recht auf Datenübertragbarkeit gemäß Art. 20 DSGVO<br/>
                    - Recht auf Widerspruch gemäß Art. 21 DSGVO
                </p>
            </div>

            <div className="legal-section">
                <h2 className="legal-subheading">12. Änderungen dieser Datenschutzerklärung</h2>
                <p className="legal-text">
                    Ich behalte mir vor, diese Datenschutzerklärung anzupassen, sofern dies
                    aufgrund technischer Änderungen, neuer Funktionen oder geänderter
                    gesetzlicher Vorgaben erforderlich wird.
                </p>
            </div>
        </div>
        <Footer />
    </div>
}

export default PrivacyPolicy;