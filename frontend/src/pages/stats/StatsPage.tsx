import './StatsPage.css';
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import Footer from "../../components/Footer.tsx";

const StatsPage = () => {
    return <div className="survival-kit-page">
        <div className="stats-page">
            { getUserRole() !== "GUEST" && <SectionHeading heading={"Persönliche Statistiken"} subheading={"Statistiken deines persönlichen Profils"} centered={false} /> }
            { getUserRole() !== "GUEST" && <SectionHeading heading={"Kurs-Statistiken"} subheading={"Statistiken, deines Kurses"} centered={false} /> }
            <SectionHeading heading={"Globale Statistiken"} subheading={"Statistiken aller Benutzer des Survival Kits"} centered={false} />
        </div>
        <Footer />
    </div>
}

export default StatsPage;