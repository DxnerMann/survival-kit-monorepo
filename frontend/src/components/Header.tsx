import './Header.css';
import ThemeToggle from "./ThemeToggle.tsx";
import {ChartNoAxesColumn, Compass, KeyRound, Lightbulb, MessageSquare, ShieldUser, User} from 'lucide-react';
import Seperator from "./shared/Seperator.tsx";
import {useNavigate} from "react-router-dom";
import NavIcon from "./NavIcon.tsx";
import {getUserRole, isAdmin} from "../services/tokenService.tsx";

const Header = () => {
    const navigate = useNavigate()

    const isGuest = getUserRole() == "GUEST";

    return <div className="header">
        <img
            src="/images/icon2.png"
            className="header-logo"
            alt="Logo"
            onClick={() => navigate('/')}
        />
        <div className="header-links">
            <NavIcon icon={<Compass size={20} />} label="Entdecken" path="/explore" />
            {!isGuest && <NavIcon icon={<MessageSquare size={20} />} label="Chat" path="/chat" />}
            <NavIcon icon={<Lightbulb size={20} />} label="Ideenhub"   path="/ideas" />
            <NavIcon icon={<ChartNoAxesColumn size={20} />} label="Statistiken" path="/stats" />
            { isGuest
                ?  <NavIcon icon={<KeyRound size={20} />} label="Login" path="/login" />
                : <NavIcon icon={<User size={20} />} label="Profil" path="/profile" />
            }
            <Seperator width={"1px"} height={"50%"} />
            <div className="header-theme-toggle-wrapper">
                <ThemeToggle />
            </div>
            { isAdmin() && <NavIcon icon={<ShieldUser size={20} />} label="Admin" path="/admin" /> }
        </div>
    </div>
}

export default Header;