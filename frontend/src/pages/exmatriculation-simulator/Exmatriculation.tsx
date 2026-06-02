import "./Exmatriculation.css";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import { useLocation } from "react-router-dom";
import Button from "../../components/shared/Button.tsx";
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import Seperator from "../../components/shared/Seperator.tsx";

const Exmatriculation = () => {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState<Record<string, string | boolean>>({});
    const navigate = useNavigate();
    const location = useLocation();

    const handleChange = (key: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        console.log('FORMULARDATEN:', formData);
        setSubmitted(true);

        const countFromLocalStorage = localStorage.getItem("stats_exmatriculation-count");
        if (countFromLocalStorage) {
            localStorage.setItem("stats_exmatriculation-count", (parseInt(countFromLocalStorage) + 1).toString());
        } else {
            localStorage.setItem("stats_exmatriculation-count", "1");
        }
    };

    useEffect(() => {
        if (location.hash) {
            const el = document.getElementById(location.hash.substring(1));
            if (el) {
                el.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [location]);

    if (submitted) {
        return (
            <div className="exmat-simulator page-content">
                <SectionHeading heading={"Erfolgreich eingereicht."} subheading={"Ihr Antrag wird bearbeitet. Leider ist das angestellte Fachpersonal der DHBW zurzeit mit Wichtigeren dingen beschäftigt, weswegen ein gewisser Kollege den Antrag bearbeiten wird. Leider Streikt dieser gerade wegen einer Lohnerhöhung.<br><br><a class='important-text'> Sie werden innerhalb der nächsten 5 Jahren Exmatrikuliert.</a>"} centered={true} />
                <Seperator width={"0"} height={"2rem"} />
                <Button text={"Zurück zur Startseite"} onClick={() => navigate("/")} variant={"primary"} />
            </div>
        );
    }
    return (
        <div className="exmat-simulator page-content">
            <SectionHeading heading={"Exmatrikulations-Simulator"} subheading={"Exmatrikuliere dich jetzt, <a class='important-text'>ohne</a> dich zu Exmatrikulieren!"} centered={true} />
            <div className="section-header" id="pagestart">
                <h1 className="app-title"></h1>
                <h2 className="app-subtitle"></h2>
            </div>
            <div className="exmat-simulator-wrapper">
                <form className="exmat-page">
                    <div className="page-section">

                        {/* Kopfbereich mit Titel + Logo */}
                        <div className="form-header">
                            <div className="form-header-text">
                                <h2>Antrag auf Exmatrikulation<br />und Erklärung zur Beendigung von Prüfungsverfahren</h2>
                            </div>
                            <div className="form-header-logo">
                                <img src="/images/dhbw-logo.png" alt="DHBW Karlsruhe Logo" />
                            </div>
                        </div>

                        <div className="info-row">
                            <div>
                                <p>Duale Hochschule Baden-Württemberg Karlsruhe<br />
                                    Studiengang: <input type="text" name="kopf_studiengang" onChange={e => handleChange("kopf_studiengang", e.target.value)} style={{ border: "1px solid #aaa", padding: "0.2rem", fontSize: "0.9rem" }} /></p>
                            </div>
                            <div className="eingang-box">
                                <label>Eingang: <input type="text" name="eingang" onChange={e => handleChange("eingang", e.target.value)} /></label>
                            </div>
                        </div>

                        <div className="address-block">
                            <p>Erzbergerstr. 121<br />
                                76133 Karlsruhe</p>
                        </div>

                        <table className="info-table full">
                            <tbody>
                            <tr>
                                <td className="label">Name / Vorname:</td>
                                <td><input type="text" name="name" onChange={e => handleChange("name", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="label">Geburtsdatum:</td>
                                <td><input type="text" name="geburtsdatum" onChange={e => handleChange("geburtsdatum", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="label">E-Mail:</td>
                                <td><input type="email" name="email" onChange={e => handleChange("email", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="label">Studiengang:</td>
                                <td><input type="text" name="studiengang" onChange={e => handleChange("studiengang", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="label">Kurs:</td>
                                <td><input type="text" name="kurs" onChange={e => handleChange("kurs", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="label">Matrikelnummer:</td>
                                <td><input type="text" name="matrikelnummer" onChange={e => handleChange("matrikelnummer", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="grey">Anschrift, an die der Bescheid verschickt werden soll:</td>
                            </tr>
                            <tr>
                                <td className="label">Straße / Hausnummer:</td>
                                <td><input type="text" name="adresse" onChange={e => handleChange("adresse", e.target.value)} /></td>
                            </tr>
                            <tr>
                                <td className="label">PLZ / Ort:</td>
                                <td><input type="text" name="plz_ort" onChange={e => handleChange("plz_ort", e.target.value)} /></td>
                            </tr>
                            </tbody>
                        </table>

                        <h3>Hiermit beantrage ich meine Exmatrikulation</h3>

                        <table className="checkbox-table full">
                            <tbody>
                            <tr>
                                <td className="checkbox-col">
                                    <input type="checkbox" name="cb_semester" onChange={e => handleChange("cb_semester", e.target.checked)} />
                                </td>
                                <td>zum Ende des laufenden Semesters</td>
                                <td rowSpan={2} className="info-text">
                                    <p>Bitte beachten Sie: Falls Sie den Bachelorabschluss erhalten wollen, kann keine Exmatrikulation mit Wirkung vor dem 30.09. erfolgen, da Sie erst zum 30.09. die volle ECTS-Punktzahl erlangen. Davor sind noch nicht alle ECTS-Punkte vollständig erworben.</p>
                                </td>
                            </tr>
                            <tr>
                                <td className="checkbox-col">
                                    <input type="checkbox" name="cb_sofort" onChange={e => handleChange("cb_sofort", e.target.checked)} />
                                </td>
                                <td>mit sofortiger Wirkung.</td>
                            </tr>
                            </tbody>
                        </table>

                        <h3>Die Exmatrikulation soll aus folgendem Grund mit sofortiger Wirkung ausgesprochen werden:</h3>

                        <table className="checkbox-table full">
                            <tbody>
                            <tr>
                                <td className="checkbox-col"><input type="checkbox" name="cb_abbruch" onChange={e => handleChange("cb_abbruch", e.target.checked)} /></td>
                                <td>Abbruch des Studiums</td>
                            </tr>
                            <tr>
                                <td className="checkbox-col"><input type="checkbox" name="cb_ausbildung" onChange={e => handleChange("cb_ausbildung", e.target.checked)} /></td>
                                <td>Ende des Ausbildungsverhältnisses …</td>
                            </tr>
                            <tr>
                                <td className="checkbox-col"><input type="checkbox" name="cb_wechsel" onChange={e => handleChange("cb_wechsel", e.target.checked)} /></td>
                                <td>Hochschulwechsel</td>
                            </tr>
                            <tr>
                                <td className="checkbox-col"><input type="checkbox" name="cb_arbeit" onChange={e => handleChange("cb_arbeit", e.target.checked)} /></td>
                                <td>Arbeitsaufnahme</td>
                            </tr>
                            <tr>
                                <td className="checkbox-col"><input type="checkbox" name="cb_sonstiger" onChange={e => handleChange("cb_sonstiger", e.target.checked)} /></td>
                                <td>
                                    sonstiger <strong>besonderer Grund:</strong><br />
                                    <input type="text" name="sonstiger_grund" onChange={e => handleChange("sonstiger_grund", e.target.value)} />
                                </td>
                            </tr>
                            </tbody>
                        </table>

                        <div className="hinweis">
                            Mir ist bekannt, dass…
                            <ul>
                                <li>…ich als BAföG-Empfänger gemäß §60 SGB II das Studierendenwerk informieren muss</li>
                                <li>…ich gemäß §2 Abs. 6 der Immatrikulationssatzung über die Exmatrikulation informieren muss</li>
                                <li>…eine Rückerstattung des Verwaltungskostenbeitrags nur innerhalb eines Monats nach Vorlesungsbeginn möglich ist</li>
                            </ul>
                        </div>
                    </div>

                </form>

                <form className="exmat-page">
                    <div className="page-section">

                        <div className="form-header">
                            <div className="form-header-text">
                                <h2>Erklärung zur Beendigung von Prüfungsverfahren</h2>
                            </div>
                            <div className="form-header-logo">
                                <img src="images/dhbw-logo.png" alt="DHBW Karlsruhe Logo" />
                            </div>
                        </div>

                        <p>
                            Durch die Exmatrikulation erlischt Ihre Mitgliedschaft an der DHBW Karlsruhe. Daher dürfen Sie die Einrichtungen
                            der Hochschule (Labore etc.) nicht mehr nutzen und keine Vorlesungen mehr besuchen.
                        </p>
                        <p>
                            Sie haben alle Geräte, Unterlagen, Software, Bücher etc., die von Ihnen (für das Studium) ausgeliehen worden sind,
                            sowie den Studierendenausweis ordnungsgemäß zurückzugeben. Es dürfen keine Beiträge, Gebühren und andere
                            Forderungen der DHBW Karlsruhe und der beteiligten Einrichtungen mehr an Sie bestehen.
                        </p>

                        <h3>1. Entlassung vor dem tatsächlichen Prüfungsbeginn</h3>
                        <p>
                            Vor dem Erstversuch einer Prüfung kann eine Entlassung aus dem Prüfungsrechtsverhältnis beantragt werden …
                        </p>
                        <p>
                            Ich beantrage vor dem tatsächlichen Prüfungsbeginn die Entlassung aus:
                        </p>

                        <label>
                            <input type="checkbox" name="cb_entlassung_alle" onChange={e => handleChange("cb_entlassung_alle", e.target.checked)} />
                            allen Prüfungsrechtsverhältnissen
                        </label>
                        <label>
                            <input type="checkbox" name="cb_entlassung_folgende" onChange={e => handleChange("cb_entlassung_folgende", e.target.checked)} />
                            folgenden Prüfungsrechtsverhältnissen:
                        </label>
                        <textarea name="pruefungsverhaeltnisse1" onChange={e => handleChange("pruefungsverhaeltnisse1", e.target.value)} />

                        <h3>2. Verzicht nach dem tatsächlichen Prüfungsbeginn</h3>
                        <p>
                            Begonnene Prüfungsverfahren sind zu beenden; dies gilt vor einer Wiederholungsprüfung …
                        </p>
                        <p>Ich verzichte auf die Beendigung</p>
                        <label>
                            <input type="checkbox" name="cb_verzicht_alle" onChange={e => handleChange("cb_verzicht_alle", e.target.checked)} />
                            aller Prüfungsverfahren
                        </label>
                        <label>
                            <input type="checkbox" name="cb_verzicht_folgende" onChange={e => handleChange("cb_verzicht_folgende", e.target.checked)} />
                            folgender Prüfungsverfahren:
                        </label>
                        <textarea name="pruefungsverhaeltnisse2" onChange={e => handleChange("pruefungsverhaeltnisse2", e.target.value)} />

                        <h3>3. Erbringung der Prüfungsleistung</h3>
                        <p>
                            Sie haben die Möglichkeit, begonnene Prüfungsverfahren zu Ende zu führen …
                        </p>

                        <label>
                            <input type="checkbox" name="cb_erbringung" onChange={e => handleChange("cb_erbringung", e.target.checked)} />
                            Ich werde folgende Prüfungen zu Ende führen:
                        </label>
                        <textarea name="pruefungen" onChange={e => handleChange("pruefungen", e.target.value)} />

                        <p>
                            Ich versichere die Vollständigkeit und Richtigkeit meiner in diesem Antrag gemachten Angaben.<br />
                            Die Hinweise habe ich zur Kenntnis genommen.
                        </p>

                        <div className="form-grid">
                            <label>Ort, Datum: <input type="text" name="ort_datum" onChange={e => handleChange("ort_datum", e.target.value)} /></label>
                            <label>Unterschrift Antragsteller/in: <input type="text" name="unterschrift" onChange={e => handleChange("unterschrift", e.target.value)} /></label>
                        </div>

                        <p className="footer-hinweis">
                            Es werden nur vollständig ausgefüllte und unterschriebene Anträge bearbeitet.
                        </p>

                    </div>

                </form>
                <Button text={"Abschicken"} onClick={handleSubmit} variant={"primary"} />
            </div>
        </div>
    );
}

export default Exmatriculation;