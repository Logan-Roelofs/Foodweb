import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { buildShoppingItems, listAsText, type ShoppingItem } from '../lib/shoppingList'
import {
  addExtra,
  clearList,
  removeExtra,
  removeRecipeFromList,
  toggleChecked,
  useShoppingList,
} from '../lib/shoppingStore'
import { useTitle } from '../lib/format'
import { Button, Card, buttonClass, inputClass } from '../components/ui'

export function ShoppingListPage() {
  useTitle('Shopping list')
  const list = useShoppingList()
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)

  const items = useMemo(() => buildShoppingItems(list.recipes, list.extras), [list.recipes, list.extras])
  const checked = useMemo(() => new Set(list.checked), [list.checked])
  const toBuy = items.filter((i) => !checked.has(i.key))
  const inCart = items.filter((i) => checked.has(i.key))

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const text = extra.trim()
    if (!text) return
    addExtra(text.slice(0, 200))
    setExtra('')
  }

  async function share() {
    const text = listAsText(toBuy, checked)
    // Phones: open the share sheet (Notes, Messages, Reminders…). Elsewhere: copy.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Shopping list', text })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked; nothing else to do.
    }
  }

  const empty = list.recipes.length === 0 && list.extras.length === 0

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-semibold">Shopping list</h1>
          <p className="mt-1 text-sm text-cocoa-500">Saved on this device.</p>
        </div>
        {!empty && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={share} disabled={toBuy.length === 0}>
              {copied ? 'Copied!' : 'Share or copy'}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        )}
      </div>

      {empty ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-cream-200 py-16 text-center text-cocoa-700">
          <div className="text-4xl" aria-hidden>
            🛒
          </div>
          <p className="mt-3 font-serif text-xl">Your list is empty.</p>
          <p className="mt-1 text-sm">
            Open a recipe and tap <strong>Add to shopping list</strong>.
          </p>
          <Link to="/recipes" className={`${buttonClass('primary')} mt-6`}>
            Browse recipes
          </Link>
        </div>
      ) : (
        <>
          {list.recipes.length > 0 && (
            <section className="mt-6 print:hidden" aria-label="Recipes on this list">
              <ul className="flex flex-wrap gap-2">
                {list.recipes.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-1 rounded-full bg-cream-50 py-1 pr-1 pl-3 text-sm ring-1 ring-cream-200"
                  >
                    <Link to={r.href} className="font-semibold hover:text-terracotta-600">
                      {r.title}
                    </Link>
                    <span className="text-cocoa-500">
                      · {r.servings} {r.servings === 1 ? 'serving' : 'servings'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRecipeFromList(r.id)}
                      className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-cocoa-500 hover:bg-cream-200 hover:text-terracotta-700"
                      aria-label={`Remove ${r.title} from the list`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Card className="mt-6 print:p-0 print:shadow-none print:ring-0">
            {toBuy.length === 0 ? (
              <p className="py-4 text-center text-olive-700">Everything's in the cart. 🎉</p>
            ) : (
              <ItemList items={toBuy} checked={checked} />
            )}

            <form onSubmit={handleAdd} className="mt-4 flex gap-2 border-t border-cream-200 pt-4 print:hidden">
              <input
                className={inputClass}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Add something else (e.g. paper towels)"
                maxLength={200}
                aria-label="Add an item"
              />
              <Button type="submit" disabled={!extra.trim()}>
                Add
              </Button>
            </form>
          </Card>

          {inCart.length > 0 && (
            <section className="mt-6 print:hidden">
              <h2 className="mb-2 text-lg font-semibold text-cocoa-500">In the cart ({inCart.length})</h2>
              <Card className="opacity-80">
                <ItemList items={inCart} checked={checked} />
              </Card>
            </section>
          )}

          <div className="mt-8 text-center print:hidden">
            <button
              type="button"
              className="text-sm font-semibold text-terracotta-700 hover:underline"
              onClick={() => confirm('Clear the whole shopping list?') && clearList()}
            >
              Clear list
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ItemList({ items, checked }: { items: ShoppingItem[]; checked: Set<string> }) {
  return (
    <ul className="divide-y divide-cream-200">
      {items.map((item) => {
        const done = checked.has(item.key)
        const extraId = item.key.startsWith('extra:') ? item.key.slice(6) : null
        return (
          <li key={item.key} className="flex items-start gap-3 py-2.5">
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggleChecked(item.key)}
                className="mt-1 h-5 w-5 shrink-0 accent-olive-600 print:hidden"
              />
              <span className="hidden print:inline" aria-hidden>
                ☐
              </span>
              <span className="min-w-0">
                <span className={done ? 'text-cocoa-500 line-through' : 'text-cocoa-900'}>{item.text}</span>
                {item.from.length > 0 && (
                  <span className="block text-xs text-cocoa-500 print:hidden">for {item.from.join(', ')}</span>
                )}
              </span>
            </label>
            {extraId && (
              <button
                type="button"
                onClick={() => removeExtra(extraId)}
                className="rounded px-2 text-cocoa-500 hover:bg-cream-200 hover:text-terracotta-700 print:hidden"
                aria-label={`Remove ${item.text}`}
              >
                ✕
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
