import { useEffect } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

const RELOAD_KEY = 'foodweb:reloadedForUpdate'

/** True when a lazily loaded page's file is gone, i.e. the site was redeployed while open. */
function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  )
}

export function RouteError() {
  const error = useRouteError()
  const stale = isStaleBuildError(error)

  useEffect(() => {
    if (!stale) return
    // Reload to pick up the new version, at most once a minute so a page
    // that's genuinely broken can't reload forever.
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
      if (Date.now() - last < 60_000) return
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      return
    }
    window.location.reload()
  }, [stale])

  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-4xl" aria-hidden>
        🥄
      </div>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cocoa-900">
        {notFound ? 'Nothing cooking here' : stale ? 'Foodweb was just updated' : 'Something boiled over'}
      </h1>
      <p className="mt-3 text-cocoa-700">
        {notFound
          ? "We couldn't find that page."
          : stale
            ? 'Reload the page to get the latest version.'
            : 'Sorry about that. Try reloading the page.'}
      </p>
      <div className="mt-6 flex justify-center gap-4 text-sm font-semibold">
        <button type="button" className="text-terracotta-600 hover:underline" onClick={() => window.location.reload()}>
          Reload
        </button>
        <Link to="/" className="text-terracotta-600 hover:underline">
          Go home
        </Link>
      </div>
    </section>
  )
}

