import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listMenus } from '../lib/menuAdmin'
import { formatMenuDate, menuUrl } from '../lib/menus'
import { MENU_COURSES, type Menu } from '../types'
import { Badge, ErrorNote, Loading, buttonClass, errorMessage } from '../components/ui'

export function MenusPage() {
  const [menus, setMenus] = useState<Menu[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    listMenus()
      .then(setMenus)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function copy(id: string) {
    await navigator.clipboard.writeText(menuUrl(id))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (error) return <ErrorNote>{error}</ErrorNote>
  if (!menus) return <Loading />

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-cocoa-500">
          Private menus you share by link. They never appear anywhere on the public site.
        </p>
        <Link to="/admin/menus/new" className={`${buttonClass('primary')} shrink-0`}>
          + New menu
        </Link>
      </div>

      {menus.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-cream-200 py-16 text-center text-cocoa-700">
          <p className="font-serif text-xl">No menus yet.</p>
          <p className="mt-1 text-sm">Plan a date night, a birthday dinner, or a cozy Sunday.</p>
        </div>
      ) : (
        <ul className="divide-y divide-cream-200 overflow-hidden rounded-3xl bg-cream-50 ring-1 ring-cream-200">
          {menus.map((m) => {
            const count = MENU_COURSES.reduce((n, c) => n + m.courses[c].length, 0)
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link to={`/admin/menus/${m.id}`} className="min-w-0 flex-1 hover:text-terracotta-600">
                  <div className="truncate font-semibold">{m.title}</div>
                  <div className="text-xs text-cocoa-500">
                    {m.date ? formatMenuDate(m.date) : 'No date'} · {count}{' '}
                    {count === 1 ? 'dish' : 'dishes'}
                  </div>
                </Link>
                {m.showRecipes === false && <Badge>Menu only</Badge>}
                <Badge tone={m.active ? 'green' : 'neutral'}>{m.active ? 'Link on' : 'Link off'}</Badge>
                {m.active && (
                  <button
                    type="button"
                    onClick={() => copy(m.id)}
                    className="text-sm font-semibold text-terracotta-600 hover:underline"
                  >
                    {copiedId === m.id ? 'Copied!' : 'Copy link'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
