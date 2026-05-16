import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'

import ThemeToggle from '../../components/ThemeToggle'

import './LoginPage.css'

type Mode = 'login' | 'register' | 'verify';

const LoginPage = () => {
    const navigate = useNavigate()

    const [mode, setMode] = useState<Mode>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)


    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')

    const validatePassword = (pw: string) => {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/.test(pw)
    }

    const handleLogin = async () => {
        try {
            setLoading(true)
            setError(null)

            await authService.login({
                email: email,
                password,
            })

            localStorage.removeItem('guest')
            navigate('/')
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("Unbekannter Fehler");
                console.error(e);
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        try {
            setLoading(true)
            setError(null)

            if (firstName.length > 30 || lastName.length > 30 || username.length > 30) {
                setError('Max 30 Zeichen erlaubt')
                return
            }

            if (lastName.includes(' ')) {
                setError('Nachname darf keine Leerzeichen enthalten')
                return
            }

            if (!validatePassword(password)) {
                setError('Passwort erfüllt die Anforderungen nicht')
                return
            }

            if (password !== repeatPassword) {
                setError('Passwörter stimmen nicht überein')
                return
            }

            await authService.register({
                firstName,
                lastName,
                username,
                email,
                password,
            })

            setMode('verify');
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
                console.error(e);
            } else {
                setError("Unbekannter Fehler");
                console.error(e);
            }
        } finally {
            setLoading(false)
        }
    }

    const continueAsGuest = () => {
        localStorage.setItem('guest', 'true');
        authService.removeToken();
        navigate('/')
    }

    return (
        <div className="login-page">

            <img
                src="/images/icon2.png"
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
                    <p className="error centerd-text">{error}</p>
                )}

                {mode === 'login' ? (
                    <>
                        <input
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Passwort"
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
                ) : mode === 'register' ? (
                    <>
                        <input
                            placeholder="Vorname"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />

                        <input
                            placeholder="Nachname"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />

                        <input
                            placeholder="Benutzername"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <input
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Passwort"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Passwort wiederholen"
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
                ) : (
                    <>
                        <p className="centered-text">Bitte Verifizieren sie ihre Email Adresse</p>
                        <p className="centered-text">Es wurde eine Bestätigungsmail an die angegebene Adresse gesendet.</p>

                        <button
                            onClick={() => setMode('login')}
                            disabled={loading}
                        >
                            Zum Login
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default LoginPage;