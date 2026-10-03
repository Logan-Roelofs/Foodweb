import { Link } from 'react-router'
import { usePublishedRecipes } from '../lib/recipes'
import { useLabels } from '../lib/taxonomy'
import { useTitle } from '../lib/format'
import { RecipeCard } from '../components/RecipeCard'
import { ErrorNote, Loading, buttonClass, errorMessage } from '../components/ui'

// Spread however many favorites there are (up to 3) across the row.
const featuredCols: Record<number, string> = { 1: '', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }

export function HomePage() {
  useTitle(null)
  const { recipes, error } = usePublishedRecipes()
  const { labels: categories } = useLabels('categories')
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name

  const featured = (recipes ?? []).filter((r) => r.featured).slice(0, 3)
  const featuredIds = new Set(featured.map((r) => r.id))
  const recent = (recipes ?? []).filter((r) => !featuredIds.has(r.id)).slice(0, 6)

  return (
    <div className="space-y-14">
      <section className="py-6 text-center sm:py-10">
        <p className="text-sm font-semibold tracking-widest text-olive-600 uppercase">
          From our kitchen to yours
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-cocoa-900 sm:text-6xl">Pull up a chair.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-cocoa-700">
          Home-cooked recipes we make again and again, written down so you can too.
        </p>
        <Link to="/recipes" className={`${buttonClass('primary')} mt-8 px-6 py-3 text-base`}>
          Browse all recipes
        </Link>
      </section>

      {error ? (
        <ErrorNote>{errorMessage(error)}</ErrorNote>
      ) : !recipes ? (
        <Loading />
      ) : recipes.length === 0 ? (
        <p className="text-center text-cocoa-700">The first recipes are still in the oven. Check back soon!</p>
      ) : (
        <>
          {featured.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl font-semibold sm:text-3xl">Favorites</h2>
              <div className={`grid gap-6 ${featuredCols[featured.length]}`}>
                {featured.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    categoryName={categoryName(r.categoryId)}
                    large
                    wide={featured.length === 1}
                  />
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2 className="text-2xl font-semibold sm:text-3xl">Fresh from the kitchen</h2>
                <Link to="/recipes" className="text-sm font-semibold text-terracotta-600 hover:underline">
                  See all →
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((r) => (
                  <RecipeCard key={r.id} recipe={r} categoryName={categoryName(r.categoryId)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
