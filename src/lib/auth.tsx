import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { adminUids } from './firebase'

interface AuthState {
  user: User | null
  /** True until Firebase has told us whether someone is signed in. */
  loading: boolean
  /** UI-only. Security rules are what actually protect admin data. */
  isAdmin: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// The Auth SDK is fetched after the first render; pages that don't need a
// user (most of them) never wait for it.
const loadAuth = () => import('./authClient')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    loadAuth().then(({ auth, onAuthStateChanged }) => {
      if (cancelled) return
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      })
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const value: AuthState = {
    user,
    loading,
    isAdmin: !!user && adminUids.includes(user.uid),
    signIn: async () => {
      const { auth, GoogleAuthProvider, signInWithPopup } = await loadAuth()
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    signOut: async () => {
      const { auth, signOut } = await loadAuth()
      await signOut(auth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
