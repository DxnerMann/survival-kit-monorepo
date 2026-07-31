import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { isAdmin } from '../services/tokenService'

type Props = {
    children: ReactNode
    requireAdmin?: boolean
}

const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const guest = localStorage.getItem('guest')

                if (guest) {
                    setAuthorized(false)
                    return
                }

                const valid = await authService.validate()

                if (!valid) {
                    authService.clearSession()
                    setAuthorized(false)
                    return
                }

                setAuthorized(requireAdmin ? isAdmin() : true)
            } catch {
                authService.clearSession()
                setAuthorized(false)
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
    }, [requireAdmin])

    if (loading) {
        return <div className="page-loader">Loading...</div>
    }

    if (!authorized) {
        return <Navigate to={requireAdmin ? "/" : "/login"} replace />
    }

    return children
}

export default ProtectedRoute
