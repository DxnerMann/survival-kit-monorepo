import {type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'

type Props = {
    children: ReactNode
}

const GuestRouter = ({ children }: Props) => {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            const guest = localStorage.getItem('guest')

            if (guest) {
                setAuthorized(true)
                setLoading(false)
                return
            }

            const valid = await authService.validate()

            if (!valid) {
                authService.removeToken()
            }

            setAuthorized(valid)
            setLoading(false)
        }

        checkAuth()
    }, [])

    if (loading) {
        return <div className="page-loader">Loading...</div>
    }

    if (!authorized) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default GuestRouter;