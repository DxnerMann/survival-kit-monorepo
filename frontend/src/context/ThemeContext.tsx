import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

type Props = {
    children: ReactNode
}

const getInitialTheme = (): Theme => {
    const storedTheme = localStorage.getItem('theme')

    if (storedTheme === 'light') {
        return 'light'
    }

    return 'dark'
}

export const ThemeProvider = ({ children }: Props) => {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme)

    useEffect(() => {
        document.body.classList.remove(
            'light-theme',
            'dark-theme'
        )

        document.body.classList.add(`${theme}-theme`)

        localStorage.setItem('theme', theme)
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
    }

    const toggleTheme = () => {
        setThemeState((prevTheme) =>
            prevTheme === 'dark' ? 'light' : 'dark'
        )
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                toggleTheme,
                setTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error(
            'useTheme must be used inside ThemeProvider'
        )
    }

    return context
}