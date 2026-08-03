import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from "@/context/ThemeContext"
import Layout from "@/app/Layout.tsx";
import DialogProvider from "@/components/dialog/DialogProvider.tsx";

const App = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <DialogProvider>
                    <Layout />
                </DialogProvider>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App;
