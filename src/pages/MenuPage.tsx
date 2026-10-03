import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { COURSE_LABELS, formatMenuDate, getSharedMenu } from '../lib/menus'
import { useTitle } from '../lib/format'
import { RecipeView } from '../components/RecipeView'
import { RecipePhoto } from '../components/RecipeCard'
import { ErrorNote, Loading, errorMessage } from '../components/ui'
import { MENU_COURSES, type Menu, type MenuRecipe } from '../types'

type Shared = { menu: Menu; recipes: Map<string, MenuRecipe> } | null

// Keep the menu while the guest clicks between it and its recipes.
const cache = new Map<string, Promise<Shared>>()

function useSharedMenu(menuId: string) {
  const [data, setData] = useState<Shared | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    let promise = cache.get(menuId)
    if (!promise) {
      promise = getSharedMenu(menuId)
      cache.set(menuId, promise)
      promise.catch(() => cache.delete(menuId))
    }
    promise.then(
      (d) => active && setData(d),
      (e) => active && setError(e),
    )
    return () => {
      active = false
    }
  }, [menuId])

  return { data, error }
}

function Unavailable() {
  useTitle('Menu unavailable')
  return (
    <section className="mx-auto max-w-md py-16 text-center">
      <div className="text-4xl" aria-hidden>
        🍽️
      </div>
      <h1 className="mt-4 text-3xl font-semibold">This menu isn't available</h1>
      <p className="mt-3 text-cocoa-700">The link may be mistyped, or the host has taken it down.</p>
    </section>
  )
}

function Ornament() {
  return (
    <div className="my-6 flex items-center justify-center gap-3 text-terracotta-500/60" aria-hidden>
      <span className="h-px w-12 bg-current" />
      <span className="text-sm">✦</span>
      <span className="h-px w-12 bg-current" />
    </div>
  )
}

export function MenuPage() {
  const { menuId = '' } = useParams()
  const { data, error } = useSharedMenu(menuId)
  useTitle(data?.menu.title)

  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>
  if (data === undefined) return <Loading />
  if (data === null) return <Unavailable />

  const { menu, recipes } = data
  const courses = MENU_COURSES.map((c) => ({
    course: c,
    items: menu.courses[c].map((id) => recipes.get(id)).filter((r): r is MenuRecipe => !!r),
  })).filter((c) => c.items.length > 0)

  return (
    <article className="mx-auto max-w-2xl">
      <div className="rounded-[2rem] bg-cream-50 p-2 shadow-sm ring-1 ring-cream-200">
        <div className="rounded-[1.6rem] border border-terracotta-500/30 px-6 py-10 text-center sm:px-12 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.3em] text-olive-600 uppercase">Menu</p>
          <h1 className="mt-3 text-4xl font-semibold text-cocoa-900 sm:text-5xl">{menu.title}</h1>
          {menu.date && <p className="mt-3 text-cocoa-700">{formatMenuDate(menu.date)}</p>}

          {menu.message && (
            <>
              <Ornament />
              <p className="mx-auto max-w-lg font-serif text-lg whitespace-pre-line text-cocoa-700 italic">
                {menu.message}
              </p>
            </>
          )}

          {courses.map(({ course, items }) => (
            <section key={course} aria-labelledby={`course-${course}`}>
              <Ornament />
              <h2
                id={`course-${course}`}
                className="text-sm font-semibold tracking-[0.25em] text-terracotta-600 uppercase"
              >
                {COURSE_LABELS[course]}
              </h2>
              <ul className="mt-5 space-y-6">
                {items.map((r) => (
                  <li key={r.id}>
                    <Link to={`/menu/${menu.id}/${r.id}`} className="group block">
                      {r.photoUrl && (
                        <div className="mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full ring-4 ring-cream-100">
                          <RecipePhoto recipe={r} />
                        </div>
                      )}
                      <h3 className="font-serif text-2xl text-cocoa-900 group-hover:text-terracotta-600">
                        {r.title}
                      </h3>
                      {r.description && (
                        <p className="mx-auto mt-1 max-w-md text-cocoa-500">{r.description}</p>
                      )}
                      <span className="mt-2 inline-block text-sm font-semibold text-terracotta-600 group-hover:underline">
                        View recipe →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}

export function MenuRecipePage() {
  const { menuId = '', recipeId = '' } = useParams()
  const { data, error } = useSharedMenu(menuId)
  const recipe = data?.recipes.get(recipeId)
  useTitle(recipe?.title)

  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>
  if (data === undefined) return <Loading />
  if (data === null || !recipe) return <Unavailable />

  return (
    <div>
      <Link
        to={`/menu/${menuId}`}
        className="mb-6 inline-block text-sm font-semibold text-terracotta-600 hover:underline print:hidden"
      >
        ← Back to {data.menu.title}
      </Link>
      <RecipeView key={recipe.id} recipe={recipe} />
    </div>
  )
}
