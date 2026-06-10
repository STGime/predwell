import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession } from '@eurobase/sdk'
import { Navigate, useLocation } from 'react-router-dom'
import { eb } from './eurobase'

interface AuthValue {
  session: AuthSession | null
  loading: boolean
}

const AuthContext = createContext<AuthValue>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => eb.auth.getSession())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = eb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
