import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { adminUids, auth } from './firebase'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      }),
    [],
  )

  const value: AuthState = {
    user,
    loading,
    isAdmin: !!user && adminUids.includes(user.uid),
    signIn: async () => {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    signOut: () => firebaseSignOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
