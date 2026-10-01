import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from 'lucide-react'

import "@/components/layout/ThemeToggle.css"

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme()

    const isDark = theme === 'dark'

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Farbschema wechseln"
        >
            {isDark ? (
                <Sun size={20} />
            ) : (
                <Moon size={20} />
            )}
        </button>
    )
}

export default ThemeToggle