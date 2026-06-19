import './Footer.css';
import pkg from '../../package.json';


const Footer = () => {
     return (
        <footer>
            <div className="footer-info">
                <div className="footer-info-img">
                    <img src="/images/icon.png"  alt={"Logo"}/>
                </div>
                <div className="footer-info-text">
                    <div className="text1">
                        <p>Vor gar nicht allzu langer Zeit, in einer Stadt namens <a className="important-text">Kerlsruhe</a> – die überraschenderweise gar nicht so weit weg ist –, stand eine Uni, die aussah wie ein großes „E“ – vermutlich für „Exmatrikulation“. Von Montag bis Freitag strömten dort Menschenmassen in das Gebäude, die eigentlich nur eins wollten: so tun, als würden sie Dinge lernen. Leider wurde dort nicht Intelligenz vermittelt, sondern vor allem die hohe Kunst, vor den Personen zu flüchten, die sich Dozenten schimpfen und meinen, alles besonders gut erklären zu können. Bis heute! Aber das hat nun ein Ende, denn mit dieser Webseite beherrschst du nun die hohe Kunst der Langeweilevertreibung... Viel Spaß!</p>
                    </div>
                    <div className="text2">
                        <p>Lecture Survival Kit v{pkg.version}</p>
                        <p>Gemacht mit ❤️.</p>
                        <p> von <strong>Jannis Saur</strong>.</p>
                    </div>
                </div>
            </div>
            <div className="footer-links">
                <a href="https://moodle.dhbw.de/" target="_blank" rel="noopener noreferrer">DHBW Moodle</a>
                <a href="/files/Loslassen.pdf" download>Loslassen</a>
                <a href="/imprint" rel="noopener noreferrer">Impressum</a>
                <a href="/privacypolicy" rel="noopener noreferrer">Datenschutzerklärung</a>
            </div>
        </footer>
    );
};

export default Footer;
