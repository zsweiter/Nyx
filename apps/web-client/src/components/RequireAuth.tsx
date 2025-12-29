import { JSX } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface Props {
    children: JSX.Element
}

export const RequireAuth = ({ children }: Props) => {
    const token = localStorage.getItem('auth-token')
    const location = useLocation()

    if (!token) {
        return <Navigate to='/auth/login' state={{ from: location }} replace />
    }

    return children
}
