import "./LegalPage.css"
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import Footer from "../../components/Footer.tsx";

const Imprint = () => {
    return <div className="survival-kit-page">
        <div className="legal-page">
            <SectionHeading heading={"Impressum"} centered={false}/>
            <div className="legal-container">

                <div className="legal-section">
                    <p className="legal-label">Angaben gemäß § 5 DDG</p>
                    <p className="legal-text">
                        Jannis Saur<br/>
                        Burgunderstraße 17<br/>
                        77767 Appenweier<br/>
                        Deutschland
                    </p>
                </div>

                <div className="legal-section">
                    <h2 className="legal-subheading">Kontakt</h2>
                    <p className="legal-text">
                        E-Mail: <a className="legal-link" href="mailto:ihre@email.de">Saur-Jannis@gmx.de</a><br/>
                    </p>
                </div>

                <div className="legal-section">
                    <h2 className="legal-subheading">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
                    <p className="legal-text">
                        Jannis Saur<br/>
                        Burgunderstraße 17<br/>
                        77767 Appenweier
                    </p>
                </div>

                <div className="legal-section">
                    <h2 className="legal-subheading">Haftung für Inhalte</h2>
                    <p className="legal-text">
                        Als Diensteanbieter bin ich gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den
                        allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich als Diensteanbieter jedoch nicht
                        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
                        zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                    </p>
                    <p className="legal-text">
                        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen
                        Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
                        Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
                        Rechtsverletzungen werde ich diese Inhalte umgehend entfernen.
                    </p>
                </div>

                <div className="legal-section">
                    <h2 className="legal-subheading">Haftung für Links</h2>
                    <p className="legal-text">
                        Mein Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe.
                        Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
                        verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
                        Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
                    </p>
                </div>

                <div className="legal-section">
                    <p className="legal-meta">Letzte Aktualisierung: Juni 2026</p>
                </div>

            </div>
        </div>
        <Footer />
    </div>
}

export default Imprint;