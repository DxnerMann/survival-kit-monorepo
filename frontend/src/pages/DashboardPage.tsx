import '../styles/dashboard.css'
import {getUserRole} from "../services/tokenService.tsx";

const DashboardPage = () => {
    return (
        <div className="dashboard-page">
            You Role is: {getUserRole()}
        </div>
    )
}

export default DashboardPage