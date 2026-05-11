import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './pages/login/LoginPage'
import GuestRouter from './router/GuestRouter.tsx'
import DashboardPage from "./pages/dashboard/DashboardPage.tsx"
import Header from "./components/Header.tsx"
import AdminPage from "./pages/admin/AdminPage.tsx";
import ChatPage from "./pages/chat/ChatPage.tsx";
import ExplorePage from "./pages/explore/ExplorePage.tsx";
import IdeasPage from "./pages/ideas/IdeasPage.tsx";
import ProfilePage from "./pages/profile/ProfilePage.tsx";
import StatsPage from "./pages/stats/StatsPage.tsx";
import ProtectedRoute from "./router/ProtectedRoute.tsx";

const HIDDEN_HEADER_ROUTES = ['/login']

const Layout = () => {
    const { pathname } = useLocation()
    const showHeader = !HIDDEN_HEADER_ROUTES.includes(pathname)

    return (
        <>
            {showHeader && <Header />}
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/chat" element={<ProtectedRoute> <ChatPage /> </ProtectedRoute>} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/ideas" element={<IdeasPage />} />
                <Route path="/profile" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
                <Route path="/stats" element={<StatsPage />} />
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
        </>
    )
}

export default Layout;