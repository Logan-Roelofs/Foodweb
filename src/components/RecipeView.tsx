import { useMemo, useState, type ReactNode } from 'react'
import { parseIngredient, scaleIngredient } from '../lib/ingredients'
import { formatMinutes } from '../lib/format'
import { MACRO_KEYS, type Macros, type RecipeDoc } from '../types'
import { MACRO_LABELS, formatGrams, hasMacros, scaleMacros } from '../lib/nutrition'
import { RecipePhoto } from './RecipeCard'
import { AddToListButton } from './AddToListButton'
import { Button } from './ui'

type RecipeContent = Pick<
  RecipeDoc,
  | 'title'
  | 'description'
  | 'photoUrl'
  | 'prepMinutes'
  | 'cookMinutes'
  | 'servings'
  | 'ingredients'
  | 'steps'
  | 'notes'
  | 'macros'
>

/**
 * A full recipe: photo, times, scalable ingredients, steps and notes.
 * Pure display, so it can render recipes from any source (public pages, menus).
 */
export function RecipeView({
  recipe,
  eyebrow,
  tags,
  banner,
  listSource,
}: {
  recipe: RecipeContent
  /** Small label above the title, e.g. the category. */
  eyebrow?: ReactNode
  tags?: ReactNode
  /** Shown above everything, e.g. a "Draft" notice. */
  banner?: ReactNode
  /** When set, shows "Add to shopping list" (id + where the list links back to). */
  listSource?: { id: string; href: string }
}) {
  const [servings, setServings] = useState(recipe.servings)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const factor = servings / recipe.servings
  const parsed = useMemo(() => recipe.ingredients.map(parseIngredient), [recipe.ingredients])

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const times = [
    ['Prep', recipe.prepMinutes],
    ['Cook', recipe.cookMinutes],
    ['Total', recipe.prepMinutes + recipe.cookMinutes],
  ] as const

  return (
    <article className="mx-auto max-w-3xl">
      {banner}

      <header className="text-center">
        {eyebrow && (
          <div className="text-sm font-semibold tracking-widest text-olive-600 uppercase">{eyebrow}</div>
        )}
        <h1 className="mt-2 text-4xl font-semibold text-cocoa-900 sm:text-5xl print:text-3xl">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-cocoa-700">{recipe.description}</p>
        )}
        {tags && <div className="mt-4 flex flex-wrap justify-center gap-2">{tags}</div>}
      </header>

      {recipe.photoUrl && (
        <div className="mt-8 aspect-[3/2] overflow-hidden rounded-3xl shadow-sm print:mx-auto print:mt-4 print:h-56 print:w-auto print:shadow-none">
          <RecipePhoto recipe={recipe} alt={`Photo of ${recipe.title}`} />
        </div>
      )}

      <dl className="mt-8 grid grid-cols-3 divide-x divide-cream-200 rounded-3xl bg-cream-50 py-4 text-center ring-1 ring-cream-200 print:mt-4 print:py-2">
        {times.map(([label, minutes]) => (
          <div key={label}>
            <dt className="text-xs font-semibold tracking-wider text-cocoa-500 uppercase">{label}</dt>
            <dd className="mt-1 font-serif text-lg">{formatMinutes(minutes) || '—'}</dd>
          </div>
        ))}
      </dl>

      {hasMacros(recipe.macros) && (
        <NutritionPanel macros={recipe.macros} recipeServings={recipe.servings} servings={servings} />
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-[2fr_3fr] print:mt-6 print:grid-cols-[2fr_3fr] print:gap-6">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Ingredients</h2>
            <div
              className="flex items-center gap-1 rounded-full bg-cream-50 p-1 ring-1 ring-cream-200 print:hidden"
              role="group"
              aria-label="Servings"
            >
              <button
                type="button"
                className="h-7 w-7 rounded-full text-lg leading-none hover:bg-cream-200 disabled:opacity-30"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                aria-label="Fewer servings"
              >
                −
              </button>
              <span className="min-w-[5.5rem] text-center text-sm font-semibold" aria-live="polite">
                {servings} {servings === 1 ? 'serving' : 'servings'}
              </span>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-lg leading-none hover:bg-cream-200 disabled:opacity-30"
                onClick={() => setServings((s) => Math.min(100, s + 1))}
                disabled={servings >= 100}
                aria-label="More servings"
              >
                +
              </button>
            </div>
            <span className="hidden text-sm text-cocoa-700 print:inline">Serves {servings}</span>
          </div>
          {servings !== recipe.servings && (
            <button
              type="button"
              onClick={() => setServings(recipe.servings)}
              className="mt-2 text-xs font-semibold text-terracotta-600 hover:underline print:hidden"
            >
              Reset to {recipe.servings}
            </button>
          )}

          <ul className="mt-4 space-y-2">
            {parsed.map((line, i) =>
              line.kind === 'section' ? (
                <li key={i} className="pt-3 font-serif text-lg font-semibold text-terracotta-700">
                  {line.text}
                </li>
              ) : (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-1 h-4 w-4 shrink-0 accent-olive-600 print:hidden"
                    />
                    <span className={checked.has(i) ? 'text-cocoa-700/50 line-through' : ''}>
                      {scaleIngredient(line, factor)}
                    </span>
                  </label>
                </li>
              ),
            )}
          </ul>
          {listSource && recipe.ingredients.length > 0 && (
            <AddToListButton recipe={recipe} servings={servings} source={listSource} />
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Method</h2>
          <ol className="mt-4 space-y-5">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-500 font-serif font-semibold text-cream-50 print:h-6 print:w-6 print:bg-transparent print:text-cocoa-900 print:ring-1 print:ring-cocoa-900">
                  {i + 1}
                </span>
                <p className="pt-1 leading-relaxed print:pt-0">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes && (
        <section className="mt-10 rounded-3xl bg-cream-200/50 p-6 print:mt-6 print:p-0">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="mt-2 whitespace-pre-line text-cocoa-700">{recipe.notes}</p>
        </section>
      )}

      <div className="mt-10 text-center print:hidden">
        <Button variant="secondary" onClick={() => window.print()}>
          Print recipe
        </Button>
      </div>
    </article>
  )
}

/** Per-serving macros, plus whole-recipe totals that follow the servings scaler. */
function NutritionPanel({
  macros,
  recipeServings,
  servings,
}: {
  macros: Macros
  recipeServings: number
  servings: number
}) {
  const perServing = scaleMacros(macros, 1 / recipeServings)
  const whole = scaleMacros(macros, servings / recipeServings)
  const shown = MACRO_KEYS.filter((k) => macros[k] !== null)

  return (
    <section
      aria-labelledby="nutrition-heading"
      className="mt-4 rounded-3xl bg-cream-50 px-4 py-4 ring-1 ring-cream-200 print:mt-3 print:py-2"
    >
      <h2 id="nutrition-heading" className="text-center text-xs font-semibold tracking-wider text-cocoa-500 uppercase">
        Nutrition per serving
      </h2>
      <dl className={`mt-2 grid text-center ${shown.length >= 4 ? 'grid-cols-4' : shown.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {shown.map((k) => (
          <div key={k}>
            <dt className="text-xs text-cocoa-500">{MACRO_LABELS[k]}</dt>
            <dd className="font-serif text-lg">{formatGrams(perServing[k]!)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-center text-xs text-cocoa-500">
        Whole recipe ({servings} {servings === 1 ? 'serving' : 'servings'}):{' '}
        {shown.map((k) => `${formatGrams(whole[k]!)} ${MACRO_LABELS[k].toLowerCase()}`).join(' · ')}
      </p>
    </section>
  )
}
