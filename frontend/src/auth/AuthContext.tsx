import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onUnauthorized } from '../api/client'
import { authApi, type SignUpData } from '../api/endpoints'
import type { User } from '../api/types'

interface AuthContextValue {
  user: User | null
  /** true until we know whether there is a session */
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signUp: (data: SignUpData) => Promise<User>
  signOut: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Also gives us the CSRF cookie before the first POST.
    authApi
      .me()
      .then(({ user }) => setUserState(user))
      .catch(() => setUserState(null))
      .finally(() => setLoading(false))

    onUnauthorized(() => setUserState(null))
    return () => onUnauthorized(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.signIn(email, password)
    setUserState(user)
    return user
  }, [])

  const signUp = useCallback(async (data: SignUpData) => {
    const { user } = await authApi.signUp(data)
    setUserState(user)
    return user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut()
    } finally {
      setUserState(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, setUser: setUserState }),
    [user, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- hook lives next to its provider
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
