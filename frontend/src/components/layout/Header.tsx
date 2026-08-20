import "@/components/layout/Header.css";
import {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import ThemeToggle from "@/components/layout/ThemeToggle.tsx";
import {ChartNoAxesColumn, Compass, KeyRound, Lightbulb, MessageSquare, ShieldUser, User} from "lucide-react";
import Separator from "@/components/ui/Separator.tsx";
import NavIcon from "@/components/layout/NavIcon.tsx";
import {getUserRole, isAdmin} from "@/services/tokenService.tsx";
import {fetchProfileSettings} from "@/services/userService.tsx";

const Header = () => {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [course, setCourse] = useState<string | null>(null);

    const isGuest = getUserRole() == "GUEST";
    const hasCourse = Boolean(course);
    const isChat = pathname === "/chat";

    useEffect(() => {
        if (isGuest) {
            setCourse(null);
            return;
        }

        let cancelled = false;
        fetchProfileSettings()
            .then(profile => {
                if (!cancelled) {
                    setCourse(profile.course?.trim() || null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCourse(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isGuest, pathname]);

    return <div className={`header${isChat ? " header--chat" : ""}`}>
        <div className="header-brand">
            <img
                src="/images/icon2.png"
                className="header-logo"
                alt="Logo"
                onClick={() => navigate('/')}
            />
            {isChat ? (
                <div className="header-chat-title">
                    <h1>Daily Chat</h1>
                    <p>{course ? `${course} · wird um 00:00 Uhr zurückgesetzt` : "Kurs im Profil setzen"}</p>
                </div>
            ) : (
                <button
                    type="button"
                    className="header-whats-new"
                    onClick={() => navigate('/release-notes')}
                >
                    What's new?
                </button>
            )}
        </div>
        <div className="header-links">
            <NavIcon icon={<Compass size={20} />} label="Entdecken" path="/explore" />
            {!isGuest && hasCourse && <NavIcon icon={<MessageSquare size={20} />} label="Chat" path="/chat" />}
            <NavIcon icon={<Lightbulb size={20} />} label="Ideenhub"   path="/ideas" />
            <NavIcon icon={<ChartNoAxesColumn size={20} />} label="Statistiken" path="/stats" />
            { isGuest
                ?  <NavIcon icon={<KeyRound size={20} />} label="Login" path="/login" />
                : <NavIcon icon={<User size={20} />} label="Profil" path="/account" />
            }
            <Separator width={"1px"} height={"50%"} variant={"primary"} />
            <div className="header-theme-toggle-wrapper">
                <ThemeToggle />
            </div>
            { isAdmin() && <NavIcon icon={<ShieldUser size={20} />} label="Admin" path="/admin" /> }
        </div>
    </div>
}

export default Header;
