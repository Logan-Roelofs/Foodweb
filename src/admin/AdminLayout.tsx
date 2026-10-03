import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { Button, Card, ErrorNote, Loading, errorMessage } from '../components/ui'

/** Gate for everything under /admin: sign in, then admins only. */
export function AdminLayout() {
  const { user, loading, isAdmin } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <Loading />
  if (!user) return <SignInCard />
  if (!isAdmin) return <NotAuthorized />

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
      active ? 'bg-terracotta-500 text-cream-50' : 'text-cocoa-700 hover:bg-cream-200/60'
    }`
  const onRecipes = pathname === '/admin' || pathname.startsWith('/admin/recipes')

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Kitchen dashboard</h1>
        <nav className="flex gap-1 rounded-full bg-cream-50 p-1 ring-1 ring-cream-200">
          <NavLink to="/admin" className={() => tabClass(onRecipes)}>
            Recipes
          </NavLink>
          <NavLink to="/admin/labels" className={({ isActive }) => tabClass(isActive)}>
            Tags & categories
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

function SignInCard() {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    setError(null)
    setBusy(true)
    try {
      await signIn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold">Kitchen dashboard</h1>
      <p className="mt-2 text-cocoa-700">Sign in to manage recipes and menus.</p>
      <Button className="mt-6" onClick={handleSignIn} disabled={busy}>
        Sign in with Google
      </Button>
      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  )
}

function NotAuthorized() {
  const { user, signOut } = useAuth()
  const [copied, setCopied] = useState(false)

  async function copyUid() {
    await navigator.clipboard.writeText(user!.uid)
    setCopied(true)
  }

  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold">Not authorized</h1>
      <p className="mt-2 text-cocoa-700">
        You're signed in as {user!.email}, but this account isn't a Foodweb admin.
      </p>
      <div className="mt-6 rounded-xl bg-cream-100 p-3 text-left text-xs text-cocoa-700">
        <div className="font-semibold">Your user ID</div>
        <code className="mt-1 block break-all">{user!.uid}</code>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="secondary" onClick={copyUid}>
          {copied ? 'Copied!' : 'Copy user ID'}
        </Button>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </Card>
  )
}
