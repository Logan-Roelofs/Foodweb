import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getRecipe, loadPublishedRecipes } from '../lib/recipes'
import { useLabels } from '../lib/taxonomy'
import { useAuth } from '../lib/auth'
import { useTitle } from '../lib/format'
import { RecipeView } from '../components/RecipeView'
import { ErrorNote, Loading, errorMessage } from '../components/ui'
import type { Recipe } from '../types'

export function RecipePage() {
  const { recipeId } = useParams()
  const { isAdmin, loading: authLoading } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)
  const { labels: tags } = useLabels('tags')
  const { labels: categories } = useLabels('categories')

  useTitle(recipe?.title)

  // Published recipes show right away. Anything else (an admin previewing a
  // draft) is looked up directly once we know who's signed in.
  const [needsLookup, setNeedsLookup] = useState(false)

  useEffect(() => {
    if (!recipeId) return
    let active = true
    setRecipe(undefined)
    setNeedsLookup(false)
    loadPublishedRecipes()
      .then((all) => all.find((r) => r.id === recipeId))
      .catch(() => undefined)
      .then((found) => {
        if (!active) return
        if (found) setRecipe(found)
        else setNeedsLookup(true)
      })
    return () => {
      active = false
    }
  }, [recipeId])

  useEffect(() => {
    if (!needsLookup || authLoading || !recipeId) return
    let active = true
    getRecipe(recipeId).then(
      (r) => active && setRecipe(r),
      (e) => active && setError(e),
    )
    return () => {
      active = false
    }
  }, [needsLookup, authLoading, isAdmin, recipeId])

  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>
  if (recipe === undefined) return <Loading />
  if (recipe === null) {
    return (
      <section className="py-10 text-center">
        <h1 className="text-3xl font-semibold">Recipe not found</h1>
        <p className="mt-3 text-cocoa-700">It may have been moved or isn't published yet.</p>
        <Link to="/recipes" className="mt-6 inline-block font-semibold text-terracotta-600 hover:underline">
          Browse all recipes
        </Link>
      </section>
    )
  }

  const category = categories.find((c) => c.id === recipe.categoryId)
  const recipeTags = tags.filter((t) => recipe.tags.includes(t.id))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to="/recipes" className="text-sm font-semibold text-terracotta-600 hover:underline">
          ← All recipes
        </Link>
        {isAdmin && (
          <Link
            to={`/admin/recipes/${recipe.id}`}
            className="text-sm font-semibold text-cocoa-700 hover:text-terracotta-600"
          >
            Edit recipe
          </Link>
        )}
      </div>
      <RecipeView
        key={recipe.id}
        recipe={recipe}
        banner={
          recipe.status === 'draft' && (
            <p className="mb-6 rounded-xl bg-terracotta-500/10 px-4 py-3 text-center text-sm text-terracotta-700 print:hidden">
              This recipe is a <strong>draft</strong>. Only you can see it.
            </p>
          )
        }
        eyebrow={
          category && (
            <Link to={`/recipes?category=${category.id}`} className="hover:underline">
              {category.name}
            </Link>
          )
        }
        tags={recipeTags.map((t) => (
          <Link
            key={t.id}
            to={`/recipes?tags=${t.id}`}
            className="rounded-full bg-cream-50 px-3 py-1 text-sm font-semibold text-cocoa-700 ring-1 ring-cream-200 hover:bg-cream-200/60 print:ring-0"
          >
            #{t.name}
          </Link>
        ))}
      />
    </div>
  )
}
