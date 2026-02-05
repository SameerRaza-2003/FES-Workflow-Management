'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export type UserRole = 'admin' | 'designer' | 'approver'

interface User {
    id: string
    email: string
    fullName: string
    role: UserRole
}

interface AuthContextValue {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (token: string, user: User) => void
    logout: () => void
    isAdmin: boolean
    isDesigner: boolean
    isApprover: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
}

// Helper to normalize role to lowercase
function normalizeRole(role: string | undefined): UserRole {
    if (!role) return 'designer'
    const lowerRole = role.toLowerCase()
    if (lowerRole === 'admin' || lowerRole === 'approver') return lowerRole as UserRole
    return 'designer' // Default to designer for unknown roles
}

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('access_token')
        const savedUser = localStorage.getItem('user')

        if (token && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser)
                // Normalize role on load
                setUser({
                    ...parsedUser,
                    role: normalizeRole(parsedUser.role)
                })
            } catch {
                localStorage.removeItem('access_token')
                localStorage.removeItem('user')
            }
        }
        setIsLoading(false)
    }, [])

    const login = useCallback((token: string, userData: User) => {
        // IMPORTANT: Clear any existing auth state first
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')

        // Normalize role to lowercase
        const normalizedUser = {
            ...userData,
            role: normalizeRole(userData.role)
        }

        // Set new state
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify(normalizedUser))
        setUser(normalizedUser)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        setUser(null)

        // Force clean navigation
        window.location.href = '/login'
    }, [])

    // Derive role booleans from normalized user role
    const userRole = user?.role || ''
    const isAdmin = userRole === 'admin' || userRole === 'approver'
    const isDesigner = userRole === 'designer'
    const isApprover = userRole === 'admin' || userRole === 'approver'

    const value: AuthContextValue = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        isAdmin,
        isDesigner,
        isApprover,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
