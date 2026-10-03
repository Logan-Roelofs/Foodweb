import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listCommunityMenus } from '../lib/communityAdmin'
import { potluckUrl } from '../lib/community'
import { formatMenuDate } from '../lib/menus'
import type { CommunityMenu } from '../types'
import { Badge, ErrorNote, Loading, buttonClass, errorMessage } from '../components/ui'

export function PotlucksPage() {
  const [menus, setMenus] = useState<CommunityMenu[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    listCommunityMenus()
      .then(setMenus)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function copy(id: string) {
    await navigator.clipboard.writeText(potluckUrl(id))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (error) return <ErrorNote>{error}</ErrorNote>
  if (!menus) return <Loading />

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-cocoa-500">
          Shared sign-up menus. Guests sign in with Google to say what they're bringing.
        </p>
        <Link to="/admin/potlucks/new" className={`${buttonClass('primary')} shrink-0`}>
          + New potluck
        </Link>
      </div>

      {menus.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-cream-200 py-16 text-center text-cocoa-700">
          <p className="font-serif text-xl">No potlucks yet.</p>
          <p className="mt-1 text-sm">Thanksgiving, a block party, a team lunch…</p>
        </div>
      ) : (
        <ul className="divide-y divide-cream-200 overflow-hidden rounded-3xl bg-cream-50 ring-1 ring-cream-200">
          {menus.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link to={`/admin/potlucks/${m.id}`} className="min-w-0 flex-1 hover:text-terracotta-600">
                <div className="truncate font-semibold">{m.title}</div>
                <div className="text-xs text-cocoa-500">
                  {m.eventDate ? formatMenuDate(m.eventDate) : 'No date'}
                </div>
              </Link>
              {m.locked && <Badge tone="amber">Locked</Badge>}
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
          ))}
        </ul>
      )}
    </div>
  )
}
