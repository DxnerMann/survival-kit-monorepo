import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {authService, validatePassword} from '../../services/authService'

import ThemeToggle from '../../components/ThemeToggle'

import './LoginPage.css'
import {snackbarService} from "../../services/snackBarService.tsx";

type Mode = 'login' | 'register' | 'verify';

const LoginPage = () => {
    const navigate = useNavigate()

    const [mode, setMode] = useState<Mode>('login')
    const [loading, setLoading] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')

    const handleLogin = async () => {
        try {
            setLoading(true)
            await authService.login({
                email: email,
                password,
            })

            localStorage.removeItem('guest')
            navigate('/')
        } catch (e) {
            if (e instanceof Error) {
                snackbarService.showSnackbar({ type: "error",   text: e.message, showIcon: true });
            } else {
                snackbarService.showSnackbar({ type: "error",   text: "Etwas ist schiefgelaufen. Versuche es später erneut", showIcon: true });
                console.error(e);
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        try {
            setLoading(true)
            if (firstName.length > 30 || lastName.length > 30 || username.length > 30) {
                snackbarService.showSnackbar({type: "error", text:"XXX", showIcon: true });
                snackbarService.showSnackbar({ type: "error",   text: "Es sind Max 30 Zeichen lange Namen erlaubt", showIcon: true });
                return
            }

            if (lastName.includes(' ')) {
                snackbarService.showSnackbar({type: "error", text:"Nachname darf keine Leerzeichen enthalten", showIcon: true });
                return
            }

            if (!validatePassword(password)) {
                snackbarService.showSnackbar({type: "error", text:"Dein Passwort erfüllt die Anforderungen nicht", showIcon: true });
                return
            }

            if (password !== repeatPassword) {
                snackbarService.showSnackbar({type: "error", text:"Passwörter stimmen nicht überein", showIcon: true });
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
                snackbarService.showSnackbar({type: "error", text:e.message, showIcon: true });
            } else {
                snackbarService.showSnackbar({type: "error", text:"Unbekannter Fehler", showIcon: true });
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

                        <p className="switch-text">
                            Mit der Registrierung akzeptieren Sie die <a className="important-text" target="_blank" href={"/privacypolicy"}>Datenschutzerklärung</a> und stimmen der Verarbeitung Ihrer Daten gemäß dieser zu.
                        </p>

                        <button
                            onClick={handleRegister}
                            disabled={loading}
                        >
                            Registrieren
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