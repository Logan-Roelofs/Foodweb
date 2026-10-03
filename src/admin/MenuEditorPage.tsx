import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { listAllRecipes } from '../lib/recipes'
import { deleteMenu, getMenu, newMenuId, saveMenu, setMenuActive, type MenuInput } from '../lib/menuAdmin'
import { COURSE_LABELS, menuUrl } from '../lib/menus'
import { MENU_COURSES, type Menu, type MenuCourse, type Recipe } from '../types'
import { Badge, Button, Card, ErrorNote, Field, Loading, errorMessage, inputClass } from '../components/ui'
import { ShareLink } from './ShareLink'

const emptyCourses = (): Record<MenuCourse, string[]> => ({
  appetizer: [],
  main: [],
  dessert: [],
  drinks: [],
})

/** Remount per menu so switching between new/edit or two menus never mixes state. */
export function MenuEditorPage() {
  const { menuId } = useParams()
  return <MenuEditor key={menuId ?? 'new'} menuId={menuId} />
}

function MenuEditor({ menuId }: { menuId: string | undefined }) {
  const isNew = !menuId
  const navigate = useNavigate()
  const justCreated = (useLocation().state as { created?: boolean } | null)?.created

  const id = useMemo(() => menuId ?? newMenuId(), [menuId])
  const [existing, setExisting] = useState<Menu | null>(null)
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [courses, setCourses] = useState(emptyCourses)
  const [active, setActive] = useState(true)
  const [dropped, setDropped] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listAllRecipes(), isNew ? null : getMenu(id)])
      .then(([all, menu]) => {
        if (cancelled) return
        setRecipes(all)
        if (isNew) return
        if (!menu) {
          setLoadError('Menu not found.')
          return
        }
        // Recipes deleted since the menu was saved drop out of the editor;
        // saving then removes their copies too.
        const ids = new Set(all.map((r) => r.id))
        const kept = emptyCourses()
        let missing = 0
        for (const c of MENU_COURSES) {
          kept[c] = menu.courses[c].filter((rid) => ids.has(rid))
          missing += menu.courses[c].length - kept[c].length
        }
        setExisting(menu)
        setTitle(menu.title)
        setDate(menu.date ?? '')
        setMessage(menu.message)
        setCourses(kept)
        setActive(menu.active)
        setDropped(missing)
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  const byId = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])

  const updateCourse = (course: MenuCourse, fn: (ids: string[]) => string[]) =>
    setCourses((c) => ({ ...c, [course]: fn(c[course]) }))

  const move = (course: MenuCourse, index: number, delta: number) =>
    updateCourse(course, (ids) => {
      const next = [...ids]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Give the menu a title.')
    if (MENU_COURSES.every((c) => courses[c].length === 0)) {
      return setError('Add at least one recipe.')
    }
    const input: MenuInput = {
      title: title.trim(),
      date: date || null,
      message: message.trim(),
      courses,
      active,
    }
    setError(null)
    setBusy(true)
    try {
      await saveMenu(id, existing, input, recipes ?? [])
      if (isNew) {
        navigate(`/admin/menus/${id}`, { replace: true, state: { created: true } })
      } else {
        navigate('/admin/menus')
      }
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function toggleLink() {
    if (!existing) return
    setBusy(true)
    try {
      await setMenuActive(id, !active)
      setActive(!active)
      setExisting({ ...existing, active: !active })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!existing || !confirm(`Delete "${existing.title}"? Its link will stop working.`)) return
    setBusy(true)
    try {
      await deleteMenu(id)
      navigate('/admin/menus')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loadError) return <ErrorNote>{loadError}</ErrorNote>
  if (!recipes) return <Loading />

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/admin/menus" className="text-sm text-terracotta-600 hover:underline">
          ← All menus
        </Link>
        <h2 className="text-2xl font-semibold">{isNew ? 'New menu' : 'Edit menu'}</h2>
      </div>

      {existing && (
        <Card className="space-y-3">
          {justCreated && (
            <p className="font-semibold text-olive-600">Menu saved! Send this link to your guest:</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-cocoa-700">Share link</span>
            <span className="flex items-center gap-3">
              <Badge tone={active ? 'green' : 'neutral'}>{active ? 'Link on' : 'Link off'}</Badge>
              <Button variant={active ? 'danger' : 'secondary'} onClick={toggleLink} disabled={busy}>
                {active ? 'Turn link off' : 'Turn link back on'}
              </Button>
            </span>
          </div>
          {active ? (
            <ShareLink url={menuUrl(id)} />
          ) : (
            <p className="text-sm text-cocoa-700/80">
              The link is off. Anyone who opens it sees "This menu isn't available."
            </p>
          )}
        </Card>
      )}

      <Card className="space-y-5">
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Valentine's Date Night"
            required
          />
        </Field>
        <Field label="Date (optional)">
          <input
            type="date"
            className={`${inputClass} sm:max-w-xs`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Personal message" hint="Shown at the top of the menu.">
          <textarea
            className={`${inputClass} font-serif`}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
          />
        </Field>
      </Card>

      <Card className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold">Courses</h3>
          <p className="mt-1 text-sm text-cocoa-700/80">
            Drafts are fine: each recipe is copied into the menu when you save, so it stays private
            everywhere else. Save again after editing a recipe to refresh the copy.
          </p>
          {dropped > 0 && (
            <p className="mt-2 text-sm text-terracotta-700">
              {dropped} deleted {dropped === 1 ? 'recipe was' : 'recipes were'} removed from this menu.
              Save to update the link.
            </p>
          )}
        </div>

        {MENU_COURSES.map((course) => {
          const ids = courses[course]
          const available = recipes.filter((r) => !ids.includes(r.id))
          return (
            <div key={course}>
              <div className="mb-2 font-serif text-lg font-semibold text-terracotta-700">
                {COURSE_LABELS[course]}
              </div>
              {ids.length > 0 && (
                <ul className="mb-2 divide-y divide-cream-200 rounded-2xl bg-white ring-1 ring-cream-200">
                  {ids.map((rid, i) => {
                    const r = byId.get(rid)!
                    return (
                      <li key={rid} className="flex items-center gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate">{r.title}</span>
                        {r.status === 'draft' && <Badge>Draft</Badge>}
                        <button
                          type="button"
                          className="rounded px-1.5 text-cocoa-700 hover:bg-cream-200 disabled:opacity-30"
                          onClick={() => move(course, i, -1)}
                          disabled={i === 0}
                          aria-label={`Move ${r.title} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 text-cocoa-700 hover:bg-cream-200 disabled:opacity-30"
                          onClick={() => move(course, i, 1)}
                          disabled={i === ids.length - 1}
                          aria-label={`Move ${r.title} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded px-1.5 text-terracotta-700 hover:bg-terracotta-500/10"
                          onClick={() => updateCourse(course, (list) => list.filter((x) => x !== rid))}
                          aria-label={`Remove ${r.title}`}
                        >
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {ids.length < 20 && (
                <select
                  className={`${inputClass} text-sm text-cocoa-700`}
                  value=""
                  onChange={(e) => e.target.value && updateCourse(course, (list) => [...list, e.target.value])}
                  aria-label={`Add a recipe to ${COURSE_LABELS[course]}`}
                >
                  <option value="">+ Add a recipe…</option>
                  {available.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                      {r.status === 'draft' ? ' (draft)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </Card>

      {isNew && (
        <label className="flex items-center gap-2 text-sm font-semibold text-cocoa-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-terracotta-500"
          />
          Turn the share link on when saved
        </label>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {existing ? (
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            Delete menu
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link
            to="/admin/menus"
            className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa-700 hover:bg-cream-200/60"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save menu'}
          </Button>
        </div>
      </div>
    </form>
  )
}
