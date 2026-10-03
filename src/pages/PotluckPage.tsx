import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  MAX_DISHES_PER_PERSON,
  addEntry,
  deleteEntry,
  updateEntry,
  usePotluck,
  type EntryInput,
} from '../lib/community'
import { formatMenuDate } from '../lib/menus'
import { useAuth } from '../lib/auth'
import { useTitle } from '../lib/format'
import { Button, Card, ErrorNote, Field, Loading, errorMessage, inputClass } from '../components/ui'
import type { CommunityMenu, Entry } from '../types'

const OTHER = 'Other'

export function PotluckPage() {
  const { potluckId = '' } = useParams()
  const { menu, entries, error } = usePotluck(potluckId)
  const { user, isAdmin, signIn, signOut } = useAuth()
  const [editing, setEditing] = useState<string | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  useTitle(menu === null ? 'Menu unavailable' : menu?.title)

  // Group dishes by course, keeping the admin's course order. Dishes whose
  // course was renamed or removed go under "Other".
  const grouped = useMemo(() => {
    if (!menu) return []
    const groups = new Map<string, Entry[]>(menu.courses.map((c) => [c, []]))
    for (const e of entries) {
      const key = groups.has(e.course) ? e.course : OTHER
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(e)
    }
    return [...groups]
  }, [menu, entries])

  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>
  if (menu === undefined) return <Loading />
  if (menu === null) {
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

  const open = menu.active && !menu.locked
  const people = new Set(entries.map((e) => e.uid)).size

  async function handleSignIn() {
    setSignInError(null)
    try {
      await signIn()
    } catch (err) {
      setSignInError(errorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-olive-600 uppercase">Potluck</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{menu.title}</h1>
        {menu.eventDate && <p className="mt-3 text-lg text-cocoa-700">{formatMenuDate(menu.eventDate)}</p>}
        {menu.description && (
          <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-cocoa-700">{menu.description}</p>
        )}
        <p className="mt-4 text-sm text-cocoa-500">
          {entries.length === 0
            ? 'No dishes yet. Be the first!'
            : `${entries.length} ${entries.length === 1 ? 'dish' : 'dishes'} from ${people} ${
                people === 1 ? 'person' : 'people'
              }`}
        </p>
      </header>

      {menu.locked && (
        <p className="rounded-2xl bg-terracotta-500/10 px-4 py-3 text-center text-terracotta-700">
          🔒 The menu is final. Sign-ups are closed.
        </p>
      )}

      {open &&
        (user ? (
          <AddDish menu={menu} entries={entries} />
        ) : (
          <Card className="text-center">
            <h2 className="text-xl font-semibold">What are you bringing?</h2>
            <p className="mt-1 text-sm text-cocoa-700">
              Sign in with Google to add your dish. Only the name you choose is shown.
            </p>
            <Button className="mt-4" onClick={handleSignIn}>
              Sign in with Google
            </Button>
            {signInError && (
              <div className="mt-3">
                <ErrorNote>{signInError}</ErrorNote>
              </div>
            )}
          </Card>
        ))}

      <div className="space-y-6">
        {grouped.map(([course, items]) => (
          <section key={course}>
            <h2 className="flex items-baseline justify-between border-b border-cream-200 pb-2 text-2xl font-semibold">
              {course}
              <span className="font-sans text-sm font-normal text-cocoa-500">
                {items.length === 0 ? 'Nothing yet' : `${items.length} ${items.length === 1 ? 'dish' : 'dishes'}`}
              </span>
            </h2>
            <ul className="mt-3 space-y-3">
              {items.map((entry) =>
                editing === entry.id ? (
                  <li key={entry.id}>
                    <EditDish menu={menu} entry={entry} onDone={() => setEditing(null)} />
                  </li>
                ) : (
                  <EntryItem
                    key={entry.id}
                    menuId={menu.id}
                    entry={entry}
                    canEdit={open && entry.uid === user?.uid}
                    isAdmin={isAdmin}
                    onEdit={() => setEditing(entry.id)}
                  />
                ),
              )}
            </ul>
          </section>
        ))}
      </div>

      {user && (
        <p className="text-center text-xs text-cocoa-500">
          Signed in as {user.email} ·{' '}
          <button type="button" className="underline" onClick={signOut}>
            Sign out
          </button>
        </p>
      )}
    </div>
  )
}

function EntryItem({
  menuId,
  entry,
  canEdit,
  isAdmin,
  onEdit,
}: {
  menuId: string
  entry: Entry
  canEdit: boolean
  isAdmin: boolean
  onEdit: () => void
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!confirm(`Remove "${entry.dishName}"?`)) return
    setBusy(true)
    try {
      await deleteEntry(menuId, entry.id)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function copyToRecipes() {
    setBusy(true)
    try {
      const { addEntryToRecipes } = await import('../lib/communityAdmin')
      const recipeId = await addEntryToRecipes(entry)
      navigate(`/admin/recipes/${recipeId}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <li className="rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-serif text-xl text-cocoa-900">{entry.dishName}</div>
          <div className="text-sm text-olive-600">{entry.displayName} is bringing this</div>
        </div>
        <div className="flex flex-wrap gap-1">
          {canEdit && (
            <Button variant="ghost" onClick={onEdit} disabled={busy}>
              Edit
            </Button>
          )}
          {(canEdit || isAdmin) && (
            <Button variant="ghost" onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" onClick={copyToRecipes} disabled={busy}>
              Add to my recipes
            </Button>
          )}
        </div>
      </div>
      {entry.description && <p className="mt-2 text-cocoa-700">{entry.description}</p>}
      {(entry.link || entry.recipeText) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {entry.link && (
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold text-terracotta-600 hover:underline"
            >
              Recipe link ↗
            </a>
          )}
          {entry.recipeText && (
            <details className="w-full">
              <summary className="cursor-pointer font-semibold text-terracotta-600">Recipe</summary>
              <p className="mt-2 whitespace-pre-line text-cocoa-700">{entry.recipeText}</p>
            </details>
          )}
        </div>
      )}
      {error && (
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </li>
  )
}

function AddDish({ menu, entries }: { menu: CommunityMenu; entries: Entry[] }) {
  const { user } = useAuth()
  const [key, setKey] = useState(0)
  const [added, setAdded] = useState<string | null>(null)
  const mine = entries.filter((e) => e.uid === user!.uid).length

  if (mine >= MAX_DISHES_PER_PERSON) {
    return (
      <Card className="text-center text-cocoa-700">
        You've reached the limit of {MAX_DISHES_PER_PERSON} dishes per person. Remove one to add another.
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold">Add your dish</h2>
      {added && <p className="mt-1 text-sm font-semibold text-olive-600">Thanks! "{added}" is on the menu.</p>}
      <DishForm
        key={key}
        menu={menu}
        others={entries}
        submitLabel="Add to the menu"
        onSubmit={async (input) => {
          await addEntry(menu.id, user!.uid, input, entries)
          rememberName(input.displayName)
          setAdded(input.dishName)
          setKey((k) => k + 1)
        }}
      />
    </Card>
  )
}

function EditDish({ menu, entry, onDone }: { menu: CommunityMenu; entry: Entry; onDone: () => void }) {
  return (
    <Card>
      <DishForm
        menu={menu}
        initial={entry}
        submitLabel="Save changes"
        onCancel={onDone}
        onSubmit={async (input) => {
          await updateEntry(menu.id, entry.id, input)
          onDone()
        }}
      />
    </Card>
  )
}

const NAME_KEY = 'foodweb:potluckName'

function rememberName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Storage unavailable (private mode); not important.
  }
}

function recalledName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY)
  } catch {
    return null
  }
}

function normalizeLink(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function DishForm({
  menu,
  initial,
  others = [],
  submitLabel,
  onSubmit,
  onCancel,
}: {
  menu: CommunityMenu
  initial?: Entry
  others?: Entry[]
  submitLabel: string
  onSubmit: (input: EntryInput) => Promise<void>
  onCancel?: () => void
}) {
  const { user } = useAuth()
  const [course, setCourse] = useState(
    initial && menu.courses.includes(initial.course) ? initial.course : menu.courses[0],
  )
  const [dishName, setDishName] = useState(initial?.dishName ?? '')
  const [displayName, setDisplayName] = useState(
    initial?.displayName ?? recalledName() ?? user?.displayName?.split(' ')[0] ?? '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [link, setLink] = useState(initial?.link ?? '')
  const [recipeText, setRecipeText] = useState(initial?.recipeText ?? '')
  const [showRecipe, setShowRecipe] = useState(!!(initial?.link || initial?.recipeText))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gentle nudge when something similar is already claimed.
  const similar = useMemo(() => {
    const q = dishName.trim().toLowerCase()
    if (q.length < 3) return null
    return others.find((e) => {
      const n = e.dishName.toLowerCase()
      return n.includes(q) || q.includes(n)
    })
  }, [dishName, others])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = normalizeLink(link)
    if (normalized && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(normalized)) {
      return setError("That link doesn't look like a web address.")
    }
    setError(null)
    setBusy(true)
    try {
      await onSubmit({
        course,
        dishName: dishName.trim(),
        displayName: displayName.trim(),
        description: description.trim(),
        link: normalized,
        recipeText: recipeText.trim() || null,
      })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <span className="mb-2 block text-sm font-semibold text-cocoa-700">Course</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Course">
          {menu.courses.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={course === c}
              onClick={() => setCourse(c)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                course === c
                  ? 'bg-olive-600 text-cream-50'
                  : 'bg-white text-cocoa-700 ring-1 ring-cream-200 hover:bg-cream-200/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dish">
          <input
            className={inputClass}
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Pumpkin pie"
            required
          />
        </Field>
        <Field label="Your name" hint='Shown as "Aunt Sarah is bringing this"'>
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="e.g. Aunt Sarah"
            required
          />
        </Field>
      </div>
      {similar && similar.id !== initial?.id && (
        <p className="-mt-2 text-sm text-terracotta-700">
          Heads up: {similar.displayName} is already bringing "{similar.dishName}".
        </p>
      )}

      <Field label="Short description (optional)">
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="e.g. Vegan, nut-free, serves 10"
        />
      </Field>

      {showRecipe ? (
        <div className="space-y-4">
          <Field label="Recipe link (optional)">
            <input
              className={inputClass}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={500}
              inputMode="url"
              placeholder="https://…"
            />
          </Field>
          <Field label="Or write the recipe (optional)">
            <textarea
              className={inputClass}
              rows={5}
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              maxLength={5000}
            />
          </Field>
        </div>
      ) : (
        <button
          type="button"
          className="text-sm font-semibold text-terracotta-600 hover:underline"
          onClick={() => setShowRecipe(true)}
        >
          + Share the recipe
        </button>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy || !dishName.trim() || !displayName.trim()}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
