import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from "./Layout.tsx";
import DialogProvider from "./components/shared/dialog/DialogProvider.tsx";

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
