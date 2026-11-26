import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {authService, validatePassword} from "@/services/authService"
import {touchGuest} from "@/services/guestService.tsx"

import ThemeToggle from "@/components/layout/ThemeToggle"

import "@/pages/login/LoginPage.css"
import {snackbarService} from "@/services/snackBarService.tsx";

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const LoginPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [mode, setMode] = useState<Mode>(searchParams.get('reset') === '1' ? 'reset' : 'login')
    const [loading, setLoading] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')
    const [resetCode, setResetCode] = useState('')
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleLogin = async () => {
        try {
            setLoading(true)
            await authService.login({
                email: email,
                password,
            })

            localStorage.removeItem('guest')
            navigate('/')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        try {
            setLoading(true)
            if (username.trim().length === 0) {
                snackbarService.showSnackbar({ type: "error", text: "Bitte gib einen Benutzernamen ein", showIcon: true });
                return
            }

            if (lastName.trim().length === 0) {
                snackbarService.showSnackbar({ type: "error", text: "Bitte gib einen Nachnamen ein", showIcon: true });
                return
            }

            if (firstName.length > 30 || lastName.length > 30 || username.length > 30) {
                snackbarService.showSnackbar({ type: "error",   text: "Es sind maximal 30 Zeichen lange Namen erlaubt", showIcon: true });
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

            if (!email.match(EMAIL_REGEX)) {
                snackbarService.showSnackbar({type: "error", text:"Die eingegebene E-Mail-Adresse ist ungültig", showIcon: true });
                return
            }

            await authService.register({
                firstName,
                lastName: lastName.trim(),
                username,
                email,
                password,
            })

            setMode('verify');
        } finally {
            setLoading(false)
        }
    }

    const handleForgot = async () => {
        try {
            setLoading(true)
            if (!email.match(EMAIL_REGEX)) {
                snackbarService.showSnackbar({type: "error", text: "Die eingegebene E-Mail-Adresse ist ungültig", showIcon: true});
                return
            }
            await authService.requestPasswordReset(email.trim())
            snackbarService.showSnackbar({
                type: "success",
                text: "Wenn ein Konto dazu existiert, ist das Einmalpasswort unterwegs.",
                showIcon: true,
            })
            setMode('reset')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = async () => {
        try {
            setLoading(true)
            if (!email.match(EMAIL_REGEX)) {
                snackbarService.showSnackbar({type: "error", text: "Die eingegebene E-Mail-Adresse ist ungültig", showIcon: true});
                return
            }
            if (resetCode.trim().length === 0) {
                snackbarService.showSnackbar({type: "error", text: "Bitte gib das Einmalpasswort ein", showIcon: true});
                return
            }
            if (!validatePassword(password)) {
                snackbarService.showSnackbar({type: "error", text: "Dein Passwort erfüllt die Anforderungen nicht", showIcon: true});
                return
            }
            if (password !== repeatPassword) {
                snackbarService.showSnackbar({type: "error", text: "Passwörter stimmen nicht überein", showIcon: true});
                return
            }
            await authService.resetPassword(email.trim(), resetCode.trim(), password)
            setPassword('')
            setRepeatPassword('')
            setResetCode('')
            setMode('login')
            snackbarService.showSnackbar({
                type: "success",
                text: "Passwort geändert. Du kannst dich jetzt anmelden.",
                showIcon: true,
            })
        } finally {
            setLoading(false)
        }
    }

    const continueAsGuest = async () => {
        localStorage.setItem('guest', 'true');
        authService.removeToken();
        try {
            await touchGuest();
        } catch {
            // Guest mode still works if the presence call fails.
        }
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
                    {mode === 'login' ? 'Login' : mode === 'register' ? 'Registrieren' : mode === 'verify' ? 'E-Mail bestätigen' : mode === 'forgot' ? 'Passwort vergessen' : 'Neues Passwort'}
                </h1>
                {mode === 'login' ? (
                    <>
                        <input
                            placeholder="E-Mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="Passwort"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <p className="switch-text">
                            <span onClick={() => setMode('forgot')}>
                                Passwort vergessen?
                            </span>
                        </p>

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
                            placeholder="E-Mail"
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
                            Mit der Registrierung akzeptierst du die <a className="important-text" target="_blank" href={"/privacypolicy"}>Datenschutzerklärung</a> und stimmst der Verarbeitung deiner Daten gemäß dieser zu.
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
                ) : mode === 'forgot' ? (
                    <>
                        <p className="centered-text">Wir schicken dir ein Einmalpasswort, falls ein Konto zu dieser Adresse existiert.</p>
                        <input
                            placeholder="E-Mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <button onClick={handleForgot} disabled={loading}>
                            Einmalpasswort senden
                        </button>
                        <p className="switch-text">
                            <span onClick={() => setMode('login')}>Zurück zum Login</span>
                        </p>
                    </>
                ) : mode === 'reset' ? (
                    <>
                        <p className="centered-text">Trage das Einmalpasswort aus der E-Mail und dein neues Passwort ein.</p>
                        <input
                            placeholder="E-Mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            placeholder="Einmalpasswort"
                            value={resetCode}
                            autoComplete="one-time-code"
                            spellCheck={false}
                            onChange={(e) => setResetCode(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Neues Passwort"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Passwort wiederholen"
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                        />
                        <p className="centered-text">Mindestens 8 Zeichen, Groß- und Kleinbuchstaben, eine Zahl und ein Sonderzeichen.</p>
                        <button onClick={handleReset} disabled={loading}>
                            Passwort speichern
                        </button>
                        <p className="switch-text">
                            <span onClick={() => setMode('forgot')}>Neues Einmalpasswort anfordern</span>
                            <span onClick={() => setMode('login')}>Login</span>
                        </p>
                    </>
                ) : (
                    <>
                        <p className="centered-text">Bitte verifiziere deine E-Mail-Adresse</p>
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