import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router'
import { useAuth } from '../lib/auth'
import { buildShoppingItems } from '../lib/shoppingList'
import { useShoppingList } from '../lib/shoppingStore'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `hover:text-terracotta-600 ${isActive ? 'text-terracotta-600' : ''}`

interface LayoutContext {
  /** Shared menu pages call this once they know whether the menu may link out. */
  setMenuAllowsNav: (allowed: boolean) => void
}

export function useLayout() {
  return useOutletContext<LayoutContext>()
}

export function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const { pathname } = useLocation()
  const [menuAllowsNav, setMenuAllowsNav] = useState(false)

  // Shared date-night menus start without site navigation and only get it
  // once the menu says recipes are shared, so a "menu only" card never
  // flashes links while it loads.
  const standalone = pathname.startsWith('/menu/') && !menuAllowsNav

  // Items still to buy, for the badge on the List link.
  const list = useShoppingList()
  const toBuy = useMemo(() => {
    const checked = new Set(list.checked)
    return buildShoppingItems(list.recipes, list.extras).filter((i) => !checked.has(i.key)).length
  }, [list])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only rounded-full bg-terracotta-600 text-sm font-semibold text-cream-50 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-cream-200 bg-cream-50/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          {standalone ? (
            <span className="font-serif text-2xl font-semibold text-terracotta-600">Foodweb</span>
          ) : (
            <Link to="/" className="font-serif text-2xl font-semibold text-terracotta-600">
              Foodweb
            </Link>
          )}
          {!standalone && (
            <nav className="flex items-center gap-4 text-sm font-semibold text-cocoa-700 sm:gap-6">
              <NavLink to="/recipes" className={navClass}>
                Recipes
              </NavLink>
              <NavLink
                to="/shopping-list"
                className={navClass}
                aria-label={toBuy ? `Shopping list, ${toBuy} items to buy` : 'Shopping list'}
              >
                List
                {toBuy > 0 && (
                  <span className="ml-1 rounded-full bg-terracotta-600 px-1.5 py-0.5 text-xs text-cream-50">
                    {toBuy}
                  </span>
                )}
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
          )}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 print:max-w-none print:p-0">
        <Outlet context={{ setMenuAllowsNav } satisfies LayoutContext} />
      </main>
      <footer className="py-8 text-center text-sm text-cocoa-500 print:hidden">
        Made with Lots Of Love
      </footer>
    </div>
  )
}
