import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'

import ThemeToggle from '../../components/ThemeToggle'

import './LoginPage.css'

type Mode = 'login' | 'register'

const LoginPage = () => {
    const navigate = useNavigate()

    const [mode, setMode] = useState<Mode>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // login
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    // register
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [regUsername, setRegUsername] = useState('')
    const [regPassword, setRegPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')

    const validatePassword = (pw: string) => {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/.test(pw)
    }

    const handleLogin = async () => {
        try {
            setLoading(true)
            setError(null)

            await authService.login({
                email: username,
                password,
            })

            localStorage.removeItem('guest')
            navigate('/')
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        try {
            setLoading(true)
            setError(null)

            if (firstName.length > 30 || lastName.length > 30 || regUsername.length > 30) {
                setError('Max 30 Zeichen erlaubt')
                return
            }

            if (lastName.includes(' ')) {
                setError('Nachname darf keine Leerzeichen enthalten')
                return
            }

            if (!validatePassword(regPassword)) {
                setError('Passwort erfüllt die Anforderungen nicht')
                return
            }

            if (regPassword !== repeatPassword) {
                setError('Passwörter stimmen nicht überein')
                return
            }

            await authService.register({
                firstName,
                lastName,
                username: regUsername,
                email,
                password: regPassword,
            })

            await authService.login({
                email,
                password: regPassword,
            })

            navigate('/')
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const continueAsGuest = () => {
        localStorage.setItem('guest', 'true')
        navigate('/')
    }

    return (
        <div className="login-page">

            <img
                src="/images/logo.png"
                className="login-logo"
                alt="Logo"
            />

            <div className="theme-toggle-wrapper">
                <ThemeToggle />
            </div>

            <div className="login-card">

                <h1>
                    {mode === 'login' ? 'Login' : 'Register'}
                </h1>

                {error && (
                    <p className="error">{error}</p>
                )}

                {mode === 'login' ? (
                    <>
                        <input
                            placeholder="Username / Email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            Login
                        </button>

                        <p className="switch-text">
                            Noch kein Account?
                            <span onClick={() => setMode('register')}>
                                Registrieren
                            </span>
                            oder
                            <span onClick={continueAsGuest}>
                                als Gast fortfahren
                            </span>
                        </p>
                    </>
                ) : (
                    <>
                        <input
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />

                        <input
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />

                        <input
                            placeholder="Username"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                        />

                        <input
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Repeat Password"
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                        />

                        <button
                            onClick={handleRegister}
                            disabled={loading}
                        >
                            Register
                        </button>

                        <p className="switch-text">
                            Bereits einen Account?
                            <span onClick={() => setMode('login')}>
                                Login
                            </span>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

export default LoginPage;