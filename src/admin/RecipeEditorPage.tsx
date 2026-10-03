import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getRecipe } from '../lib/recipes'
import {
  deleteRecipe,
  newRecipeId,
  saveRecipe,
  type PhotoChange,
  type RecipeInput,
} from '../lib/recipeAdmin'
import { useLabels } from '../lib/taxonomy'
import { MACRO_KEYS, type MacroKey, type Macros, type Recipe, type RecipeStatus } from '../types'
import { MACRO_LABELS, formatGrams } from '../lib/nutrition'
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Loading,
  errorMessage,
  inputClass,
} from '../components/ui'

/** Form state: numbers and lists are edited as text. */
interface FormState {
  title: string
  description: string
  prepMinutes: string
  cookMinutes: string
  servings: string
  ingredients: string
  steps: string
  tags: string[]
  categoryId: string
  notes: string
  /** Whole-recipe grams, as typed. */
  macros: Record<MacroKey, string>
  status: RecipeStatus
  featured: boolean
}

const emptyMacros: Record<MacroKey, string> = { protein: '', fat: '', carbs: '', fiber: '' }

const emptyForm: FormState = {
  title: '',
  description: '',
  prepMinutes: '',
  cookMinutes: '',
  servings: '4',
  ingredients: '',
  steps: '',
  tags: [],
  categoryId: '',
  notes: '',
  macros: emptyMacros,
  status: 'draft',
  featured: false,
}

function toForm(r: Recipe): FormState {
  return {
    title: r.title,
    description: r.description,
    prepMinutes: String(r.prepMinutes),
    cookMinutes: String(r.cookMinutes),
    servings: String(r.servings),
    ingredients: r.ingredients.join('\n'),
    steps: r.steps.join('\n'),
    tags: r.tags,
    categoryId: r.categoryId ?? '',
    notes: r.notes,
    macros: Object.fromEntries(
      MACRO_KEYS.map((k) => [k, r.macros?.[k] == null ? '' : String(r.macros[k])]),
    ) as Record<MacroKey, string>,
    status: r.status,
    featured: r.featured,
  }
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/** Validates the form against the same limits as firestore.rules. */
function toInput(f: FormState): { input?: RecipeInput; error?: string } {
  const int = (s: string, min: number, max: number) => {
    const n = s.trim() === '' ? 0 : Number(s)
    return Number.isInteger(n) && n >= min && n <= max ? n : null
  }
  const title = f.title.trim()
  if (!title) return { error: 'Give the recipe a title.' }
  if (title.length > 120) return { error: 'Title must be 120 characters or fewer.' }
  if (f.description.length > 2000) return { error: 'Description must be 2000 characters or fewer.' }
  if (f.notes.length > 5000) return { error: 'Notes must be 5000 characters or fewer.' }

  const prepMinutes = int(f.prepMinutes, 0, 10000)
  const cookMinutes = int(f.cookMinutes, 0, 10000)
  const servings = int(f.servings, 1, 100)
  if (prepMinutes === null || cookMinutes === null) {
    return { error: 'Prep and cook times must be whole numbers of minutes.' }
  }
  if (servings === null) return { error: 'Servings must be a whole number from 1 to 100.' }

  const ingredients = lines(f.ingredients)
  const steps = lines(f.steps)
  if (ingredients.length > 150) return { error: 'Too many ingredient lines (max 150).' }
  if (steps.length > 100) return { error: 'Too many steps (max 100).' }

  // Blank macro fields are stored as null; no macros at all as null.
  const macros = {} as Macros
  for (const k of MACRO_KEYS) {
    const raw = f.macros[k].trim()
    const n = raw === '' ? null : Number(raw)
    if (n !== null && !(Number.isFinite(n) && n >= 0 && n <= 100000)) {
      return { error: `${MACRO_LABELS[k]} must be a number of grams (like 42 or 12.5).` }
    }
    macros[k] = n
  }

  return {
    input: {
      title,
      description: f.description.trim(),
      prepMinutes,
      cookMinutes,
      servings,
      ingredients,
      steps,
      tags: f.tags,
      categoryId: f.categoryId || null,
      notes: f.notes.trim(),
      macros: MACRO_KEYS.some((k) => macros[k] !== null) ? macros : null,
      status: f.status,
      featured: f.featured,
    },
  }
}

/** Remount per recipe so switching between new/edit or two recipes never mixes state. */
export function RecipeEditorPage() {
  const { recipeId } = useParams()
  return <RecipeEditor key={recipeId ?? 'new'} recipeId={recipeId} />
}

function RecipeEditor({ recipeId }: { recipeId: string | undefined }) {
  const isNew = !recipeId
  const navigate = useNavigate()
  const { labels: tags } = useLabels('tags')
  const { labels: categories } = useLabels('categories')

  const id = useMemo(() => recipeId ?? newRecipeId(), [recipeId])
  const [existing, setExisting] = useState<Recipe | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    getRecipe(id)
      .then((r) => {
        if (!r) {
          setError('Recipe not found.')
        } else {
          setExisting(r)
          setForm(toForm(r))
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const photoPreview = useMemo(() => {
    if (photo.kind === 'replace') return URL.createObjectURL(photo.file)
    if (photo.kind === 'remove') return null
    return existing?.photoUrl ?? null
  }, [photo, existing])

  useEffect(
    () => () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    },
    [photoPreview],
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggleTag = (tagId: string) =>
    set('tags', form.tags.includes(tagId) ? form.tags.filter((t) => t !== tagId) : [...form.tags, tagId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const { input, error: invalid } = toInput(form)
    if (!input) {
      setError(invalid!)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await saveRecipe(id, existing, input, photo)
      navigate('/admin')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!existing || !confirm(`Delete "${existing.title}"? This can't be undone.`)) return
    setBusy(true)
    try {
      await deleteRecipe(existing)
      navigate('/admin')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (!isNew && !existing) return <ErrorNote>{error ?? 'Recipe not found.'}</ErrorNote>

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/admin" className="text-sm text-terracotta-600 hover:underline">
          ← All recipes
        </Link>
        <div className="flex items-center gap-4">
          {existing && (
            <Link to={`/recipes/${existing.id}`} className="text-sm text-cocoa-700 hover:underline">
              View on site
            </Link>
          )}
          <h2 className="text-2xl font-semibold">{isNew ? 'New recipe' : 'Edit recipe'}</h2>
        </div>
      </div>

      <Card className="space-y-5">
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={120}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={2000}
          />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-semibold text-cocoa-700">Photo</span>
          <div className="flex flex-wrap items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-32 w-48 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-32 w-48 items-center justify-center rounded-2xl bg-cream-200 text-sm text-cocoa-500">
                No photo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer text-sm font-semibold text-terracotta-600 hover:underline">
                {photoPreview ? 'Replace photo' : 'Choose photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setPhoto({ kind: 'replace', file })
                    e.target.value = ''
                  }}
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  className="text-left text-sm text-cocoa-700 hover:underline"
                  onClick={() => setPhoto({ kind: 'remove' })}
                >
                  Remove photo
                </button>
              )}
              <span className="text-xs text-cocoa-500">Resized and compressed before upload.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Prep (min)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={form.prepMinutes}
              onChange={(e) => set('prepMinutes', e.target.value)}
            />
          </Field>
          <Field label="Cook (min)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={form.cookMinutes}
              onChange={(e) => set('cookMinutes', e.target.value)}
            />
          </Field>
          <Field label="Servings">
            <input
              className={inputClass}
              inputMode="numeric"
              value={form.servings}
              onChange={(e) => set('servings', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-5">
        <Field
          label="Ingredients"
          hint={
            <>
              One per line, like <code>1 1/2 cups flour, sifted</code>. End a line with a colon (
              <code>For the sauce:</code>) to start a section.
            </>
          }
        >
          <textarea
            className={`${inputClass} font-mono text-sm`}
            rows={10}
            value={form.ingredients}
            onChange={(e) => set('ingredients', e.target.value)}
          />
        </Field>
        <Field label="Steps" hint="One step per line. They'll be numbered automatically.">
          <textarea
            className={inputClass}
            rows={10}
            value={form.steps}
            onChange={(e) => set('steps', e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className={inputClass}
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={5000}
          />
        </Field>

        <fieldset>
          <legend className="text-sm font-semibold text-cocoa-700">Nutrition (optional)</legend>
          <p className="mt-0.5 text-xs text-cocoa-500">
            Grams for the <strong>whole recipe</strong>. Per-serving amounts are worked out from the
            servings above. Leave a box empty to hide it.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MACRO_KEYS.map((k) => (
              <label key={k} className="block">
                <span className="mb-1 block text-xs font-semibold text-cocoa-700">{MACRO_LABELS[k]} (g)</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.macros[k]}
                  onChange={(e) => set('macros', { ...form.macros, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <PerServingPreview macros={form.macros} servings={form.servings} />
        </fieldset>
      </Card>

      <Card className="space-y-5">
        <Field
          label="Category"
          hint={
            <Link to="/admin/labels" className="underline">
              Manage categories
            </Link>
          }
        >
          <select
            className={inputClass}
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-2 block text-sm font-semibold text-cocoa-700">Tags</span>
          {tags.length === 0 ? (
            <p className="text-sm text-cocoa-500">
              No tags yet.{' '}
              <Link to="/admin/labels" className="underline">
                Create some
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const on = form.tags.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(t.id)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                      on
                        ? 'bg-olive-600 text-cream-50'
                        : 'bg-white text-cocoa-700 ring-1 ring-cream-200 hover:bg-cream-200/60'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-cocoa-700">Visibility</legend>
            <div className="flex rounded-full bg-white p-1 ring-1 ring-cream-200">
              {(['draft', 'published'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.status === s}
                  onClick={() => set('status', s)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    form.status === s ? 'bg-terracotta-500 text-cream-50' : 'text-cocoa-700'
                  }`}
                >
                  {s === 'draft' ? 'Draft' : 'Published'}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-cocoa-700">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="h-4 w-4 accent-terracotta-500"
            />
            Feature on the home page
          </label>
        </div>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {existing ? (
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            Delete recipe
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link to="/admin" className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa-700 hover:bg-cream-200/60">
            Cancel
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save recipe'}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** "Per serving: 20 g protein · 10 g fat …" under the macro inputs. */
function PerServingPreview({ macros, servings }: { macros: Record<MacroKey, string>; servings: string }) {
  const count = Number(servings)
  if (!Number.isInteger(count) || count < 1) return null
  const parts = MACRO_KEYS.flatMap((k) => {
    const grams = Number(macros[k])
    if (macros[k].trim() === '' || !Number.isFinite(grams) || grams < 0) return []
    return [`${formatGrams(grams / count)} ${MACRO_LABELS[k].toLowerCase()}`]
  })
  if (parts.length === 0) return null
  return (
    <p className="mt-2 text-sm text-olive-700">
      Per serving ({count}): {parts.join(' · ')}
    </p>
  )
}
