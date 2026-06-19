import './ChatPage.css';
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import Footer from "../../components/Footer.tsx";

const ChatPage = () => {
    return <div className="survival-kit-page">
        <div className="chat-page">
            <SectionHeading heading={"BALD WIEDER VERFÜGBAR"} subheading={"Der Chat wird momentan überarbeitet und wird bald verfügbar sein!"} centered={true} />
        </div>
        <Footer />
    </div>
}

export default ChatPage;