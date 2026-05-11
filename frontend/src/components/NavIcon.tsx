import { useNavigate, useLocation } from 'react-router-dom'
import './NavIcon.css'

interface NavIconProps {
    icon: React.ReactNode
    label: string
    path: string
}

const NavIcon = ({ icon, label, path }: NavIconProps) => {
    const navigate = useNavigate()
    const location = useLocation()
    const isActive = location.pathname === path

    return (
        <button
            className={`nav-icon ${isActive ? 'nav-icon--active' : ''}`}
            onClick={() => navigate(path)}
        >
            <span className="nav-icon__icon">{icon}</span>
            <span className="nav-icon__label">{label}</span>
        </button>
    )
}

export default NavIcon