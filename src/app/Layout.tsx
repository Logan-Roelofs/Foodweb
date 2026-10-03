import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../lib/auth'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `hover:text-terracotta-600 ${isActive ? 'text-terracotta-600' : ''}`

export function Layout() {
  const { user, isAdmin, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cream-200 bg-cream-50/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold text-terracotta-600">
            Foodweb
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-cocoa-700 sm:gap-6">
            <NavLink to="/recipes" className={navClass}>
              Recipes
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Dashboard
              </NavLink>
            )}
            {user && (
              <button type="button" onClick={signOut} className="hover:text-terracotta-600">
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 print:max-w-none print:p-0">
        <Outlet />
      </main>
      <footer className="py-8 text-center text-sm text-cocoa-700/70 print:hidden">
        Made with love in a small kitchen.
      </footer>
    </div>
  )
}
