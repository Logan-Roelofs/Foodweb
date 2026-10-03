import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { usePublishedRecipes } from '../lib/recipes'
import { useLabels } from '../lib/taxonomy'
import { useTitle } from '../lib/format'
import { RecipeCard } from '../components/RecipeCard'
import { ErrorNote, Loading, errorMessage, inputClass } from '../components/ui'

const chip = (on: boolean) =>
  `rounded-full px-3 py-1 text-sm font-semibold transition ${
    on
      ? 'bg-olive-600 text-cream-50'
      : 'bg-cream-50 text-cocoa-700 ring-1 ring-cream-200 hover:bg-cream-200/60'
  }`

export function RecipesPage() {
  useTitle('Recipes')
  const { recipes, error } = usePublishedRecipes()
  const { labels: tags } = useLabels('tags')
  const { labels: categories } = useLabels('categories')

  // Filters live in the URL (?q=&category=&tags=a,b) so a filtered view can be shared.
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const selectedTags = useMemo(() => (params.get('tags') ?? '').split(',').filter(Boolean), [params])

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const toggleTag = (id: string) =>
    update({
      tags: (selectedTags.includes(id)
        ? selectedTags.filter((t) => t !== id)
        : [...selectedTags, id]
      ).join(','),
    })

  // Only offer tags and categories that at least one published recipe uses.
  const usedTags = tags.filter((t) => recipes?.some((r) => r.tags.includes(t.id)))
  const usedCategories = categories.filter((c) => recipes?.some((r) => r.categoryId === c.id))
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (recipes ?? []).filter(
      (r) =>
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle)) &&
        (!category || r.categoryId === category) &&
        selectedTags.every((t) => r.tags.includes(t)),
    )
  }, [recipes, q, category, selectedTags])

  const hasFilters = !!(q || category || selectedTags.length)

  return (
    <div>
      <h1 className="text-4xl font-semibold">Recipes</h1>

      <div className="mt-6 space-y-4">
        <input
          type="search"
          value={q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search by name…"
          aria-label="Search recipes"
          className={`${inputClass} py-3 text-base sm:max-w-md`}
        />

        {usedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
            <button type="button" className={chip(!category)} onClick={() => update({ category: '' })}>
              All
            </button>
            {usedCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                className={chip(category === c.id)}
                onClick={() => update({ category: category === c.id ? '' : c.id })}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {usedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tags">
            <span className="text-sm text-cocoa-500">Tags:</span>
            {usedTags.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={selectedTags.includes(t.id)}
                className={chip(selectedTags.includes(t.id))}
                onClick={() => toggleTag(t.id)}
              >
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        {error ? (
          <ErrorNote>{errorMessage(error)}</ErrorNote>
        ) : !recipes ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-cream-200 py-16 text-center text-cocoa-700">
            <p className="font-serif text-xl">
              {recipes.length === 0 ? 'No recipes yet.' : 'Nothing matches that.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-terracotta-600 hover:underline"
                onClick={() => setParams({}, { replace: true })}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-cocoa-500">
              {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <RecipeCard key={r.id} recipe={r} categoryName={categoryName(r.categoryId)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
