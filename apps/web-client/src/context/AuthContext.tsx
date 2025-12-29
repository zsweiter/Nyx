import { createContext, useContext, useEffect, useState } from 'react'
import { Json } from '../shared/encoding'

type User = {
    id: string
    username: string
    phoneNumber: string
}

export type UserContextType = {
    user: User | null
    handleLogin: (user: User) => void
    handleLogout: () => void
    isAuthenticated?: boolean
}
const AuthContext = createContext<UserContextType | null>(null)

export default AuthContext

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const handleLogout = () => {
        setUser(null)
        setIsAuthenticated(false)
        window.localStorage.removeItem('__user__')
    }

    const handleLogin = (user: User) => {
        setUser(user)
        setIsAuthenticated(true)
        window.localStorage.setItem('__user__', Json.stringify(user) as string)
    }

    useEffect(() => {
        const storedUser = window.localStorage.getItem('__user__')
        if (storedUser) {
            setIsAuthenticated(true)
            setUser(Json.parse(storedUser))
        }
    }, [])

    return (
        <AuthContext.Provider value={{ user, handleLogin, handleLogout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
