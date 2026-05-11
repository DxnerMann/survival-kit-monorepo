import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from "./Layout.tsx";

const App = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App;