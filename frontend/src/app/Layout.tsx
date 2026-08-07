import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from "@/pages/login/LoginPage"
import GuestRouter from "@/router/GuestRouter.tsx"
import DashboardPage from "@/pages/dashboard/DashboardPage.tsx"
import Header from "@/components/layout/Header.tsx"
import Footer from "@/components/layout/Footer.tsx"
import AdminPage from "@/pages/admin/AdminPage.tsx";
import ChatPage from "@/pages/chat/ChatPage.tsx";
import ExplorePage from "@/pages/explore/ExplorePage.tsx";
import IdeasPage from "@/pages/ideas/IdeasPage.tsx";
import ProfilePage from "@/pages/profile/ProfilePage.tsx";
import StatsPage from "@/pages/stats/StatsPage.tsx";
import ProtectedRoute from "@/router/ProtectedRoute.tsx";
import Exmatriculation from "@/pages/exmatriculation-simulator/Exmatriculation.tsx";
import CaffeineCalculatorPage from "@/pages/caffeine-calculator/CaffeineCalculatorPage.tsx";
import PresentationGameLobbyPage from "@/pages/presentation-game/PresentationGameLobbyPage.tsx";
import PresentationGameRoomPage from "@/pages/presentation-game/PresentationGameRoomPage.tsx";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy.tsx";
import Imprint from "@/pages/legal/Imprint.tsx";
import ReleaseNotesPage from "@/pages/release-notes/ReleaseNotesPage.tsx";
import MaintananceInfoPage from "@/pages/maintenance/MaintananceInfoPage.tsx";

const HIDDEN_HEADER_ROUTES = ['/login']
const HIDDEN_FOOTER_ROUTES = ['/login', '/chat', '/presentation-game']
const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

const Layout = () => {
    const { pathname } = useLocation()
    const showHeader = !HIDDEN_HEADER_ROUTES.includes(pathname)
    const showFooter = !HIDDEN_FOOTER_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    if (MAINTENANCE_MODE === true) return <MaintananceInfoPage />

    return (
        <div className="app-shell">
            {showHeader && <Header />}
            <main className="app-main">
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/admin" element={<ProtectedRoute requireAdmin> <AdminPage /> </ProtectedRoute>} />
                    <Route path="/chat" element={<ProtectedRoute> <ChatPage /> </ProtectedRoute>} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/ideas" element={<IdeasPage />} />
                    <Route path="/account" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="/exmatriculation" element={<Exmatriculation />} />
                    <Route path="/caffeine-calculator" element={<CaffeineCalculatorPage />} />
                    <Route path="/presentation-game" element={<ProtectedRoute> <PresentationGameLobbyPage /> </ProtectedRoute>} />
                    <Route path="/presentation-game/:code" element={<ProtectedRoute> <PresentationGameRoomPage /> </ProtectedRoute>} />
                    <Route path="/imprint" element={<Imprint />} />
                    <Route path="/privacypolicy" element={<PrivacyPolicy />} />
                    <Route path="/release-notes" element={<ReleaseNotesPage />} />
                    <Route
                        path="/"
                        element={
                            <GuestRouter>
                                <DashboardPage />
                            </GuestRouter>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            {showFooter && <Footer />}
        </div>
    )
}

export default Layout;
