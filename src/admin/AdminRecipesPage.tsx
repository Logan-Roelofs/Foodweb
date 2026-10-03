import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { listAllRecipes } from '../lib/recipes'
import { useLabels } from '../lib/taxonomy'
import type { Recipe } from '../types'
import { Badge, ErrorNote, Loading, buttonClass, errorMessage, inputClass } from '../components/ui'

export function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { labels: categories } = useLabels('categories')

  useEffect(() => {
    listAllRecipes()
      .then(setRecipes)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (recipes ?? []).filter((r) => r.title.toLowerCase().includes(q))
  }, [recipes, search])

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name

  if (error) return <ErrorNote>{error}</ErrorNote>
  if (!recipes) return <Loading />

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} sm:max-w-xs`}
        />
        <Link to="/admin/recipes/new" className={buttonClass('primary')}>
          + New recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-cream-200 py-16 text-center text-cocoa-700">
          <p className="font-serif text-xl">Your recipe box is empty.</p>
          <p className="mt-1 text-sm">Add your first recipe to get cooking.</p>
        </div>
      ) : (
        <ul className="divide-y divide-cream-200 overflow-hidden rounded-3xl bg-cream-50 ring-1 ring-cream-200">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                to={`/admin/recipes/${r.id}`}
                className="flex items-center gap-4 px-4 py-3 transition hover:bg-cream-200/40"
              >
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-cream-200" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.title}</div>
                  <div className="text-xs text-cocoa-700/70">
                    {categoryName(r.categoryId) ?? 'No category'} · updated{' '}
                    {r.updatedAt?.toDate().toLocaleDateString()}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  {r.featured && <Badge tone="amber">Featured</Badge>}
                  <Badge tone={r.status === 'published' ? 'green' : 'neutral'}>
                    {r.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-cocoa-700">No recipes match.</li>
          )}
        </ul>
      )}
    </div>
  )
}
