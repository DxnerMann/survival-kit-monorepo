import { BrowserRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from "@/context/ThemeContext"
import Layout from "@/app/Layout.tsx";
import DialogProvider from "@/components/dialog/DialogProvider.tsx";
import CalendarPage from "@/pages/calendar/CalendarPage.tsx";

const AppShell = () => {
    const { pathname } = useLocation();

    if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
        return <CalendarPage />;
    }

    return (
        <DialogProvider>
            <Layout />
        </DialogProvider>
    );
};

const App = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <AppShell />
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App;
