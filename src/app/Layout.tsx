import { Link, Outlet } from 'react-router'
import { useAuth } from '../lib/auth'

export function Layout() {
  const { user, isAdmin, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cream-200 bg-cream-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold text-terracotta-600">
            Foodweb
          </Link>
          {user && (
            <nav className="flex items-center gap-4 text-sm font-semibold text-cocoa-700">
              {isAdmin && (
                <Link to="/admin" className="hover:text-terracotta-600">
                  Dashboard
                </Link>
              )}
              <button type="button" onClick={signOut} className="hover:text-terracotta-600">
                Sign out
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="py-8 text-center text-sm text-cocoa-700/70">
        Made with love in a small kitchen.
      </footer>
    </div>
  )
}
