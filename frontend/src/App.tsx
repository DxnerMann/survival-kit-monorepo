import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from 'react-router-dom'

import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/login/LoginPage'

import ProtectedRoute from './router/ProtectedRoute'

import { ThemeProvider } from './context/ThemeContext'

const App = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/login"
                        element={<LoginPage />}
                    />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                    />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App