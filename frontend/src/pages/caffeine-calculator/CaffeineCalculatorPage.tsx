import SectionHeading from "../../components/shared/SectionHeading.tsx";
import Footer from "../../components/Footer.tsx";
import './CaffeineCalculatorPage.css';

const CaffeineCalculatorPage = () => {
    return (
        <div className="survival-kit-page">
            <div className="caffeine-calc-page">
            <SectionHeading
                heading={"Der Koffeinrechner"}
                subheading={"Berechne, wie deine Koffein-Dosis über die Zeit abfällt."}
                centered={true}
            />
            </div>
            <Footer />
        </div>
    );
};

export default CaffeineCalculatorPage;
