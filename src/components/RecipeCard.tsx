import { useState } from 'react'
import { Link } from 'react-router'
import { formatMinutes } from '../lib/format'
import type { Recipe } from '../types'

export function RecipePhoto({
  recipe,
  className = '',
  alt = '',
}: {
  recipe: Pick<Recipe, 'title' | 'photoUrl'>
  className?: string
  /** Leave empty when the title is shown right next to the photo. */
  alt?: string
}) {
  // Falls back to the placeholder if the photo is gone (e.g. replaced after a
  // menu copied this recipe).
  const [broken, setBroken] = useState(false)
  if (recipe.photoUrl && !broken) {
    return (
      <img
        src={recipe.photoUrl}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  // Warm placeholder with the recipe's initial when there's no photo.
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-cream-200 to-terracotta-500/30 ${className}`}
      aria-hidden
    >
      <span className="font-serif text-5xl text-terracotta-600/60">{recipe.title.charAt(0)}</span>
    </div>
  )
}

export function RecipeCard({
  recipe,
  categoryName,
  large = false,
  wide = false,
}: {
  recipe: Recipe
  categoryName?: string
  large?: boolean
  /** Photo beside the text on wider screens; for a lone featured recipe. */
  wide?: boolean
}) {
  const total = formatMinutes(recipe.prepMinutes + recipe.cookMinutes)
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className={`group overflow-hidden rounded-3xl ${wide ? 'grid md:grid-cols-2' : 'block'} bg-cream-50 shadow-sm ring-1 ring-cream-200 transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className={`overflow-hidden ${large ? 'aspect-[4/3]' : 'aspect-[3/2]'} ${wide ? 'md:aspect-auto md:min-h-72' : ''}`}>
        <RecipePhoto recipe={recipe} className="transition duration-500 group-hover:scale-105" />
      </div>
      <div className={wide ? 'flex flex-col justify-center p-6 md:p-10' : 'p-4'}>
        {categoryName && (
          <div className="text-xs font-semibold tracking-wider text-olive-600 uppercase">
            {categoryName}
          </div>
        )}
        <h3 className={`mt-1 font-semibold text-cocoa-900 ${large ? 'text-2xl' : 'text-lg'}`}>
          {recipe.title}
        </h3>
        {large && recipe.description && (
          <p className="mt-2 line-clamp-2 text-cocoa-700">{recipe.description}</p>
        )}
        {total && <div className="mt-2 text-sm text-cocoa-500">{total}</div>}
      </div>
    </Link>
  )
}
