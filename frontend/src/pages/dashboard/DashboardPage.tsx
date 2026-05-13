import './DashboardPage.css'
import WidgetGrid from "../../components/widget/WidgetGrid.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import {getUsername} from "../../services/userService.tsx";

const DashboardPage = () => {

    const username = getUsername();

    return (
        <div className="dashboard-page">
            { getUserRole() != "GUEST" && <h1>Willkommen zurück {getUsername() === "" ? "" : ","} <a className="important-text">{username}</a> !</h1> }
            <WidgetGrid />
            <h1>Test Hier gehts weiter</h1>
            <h1>Test Hier gehts weiter</h1>
            <h1>Test Hier gehts weiter</h1>
        </div>
    )
}

export default DashboardPage