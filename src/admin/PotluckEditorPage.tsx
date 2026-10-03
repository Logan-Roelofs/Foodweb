import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  deleteCommunityMenu,
  getCommunityMenu,
  newCommunityMenuId,
  saveCommunityMenu,
  setCommunityMenuFlags,
} from '../lib/communityAdmin'
import { potluckUrl } from '../lib/community'
import type { CommunityMenu } from '../types'
import { Badge, Button, Card, ErrorNote, Field, Loading, errorMessage, inputClass } from '../components/ui'
import { ShareLink } from './ShareLink'

const DEFAULT_COURSES = ['Appetizers', 'Sides', 'Mains', 'Desserts', 'Drinks']

/** Remount per potluck so switching between new/edit never mixes state. */
export function PotluckEditorPage() {
  const { potluckId } = useParams()
  return <PotluckEditor key={potluckId ?? 'new'} potluckId={potluckId} />
}

function PotluckEditor({ potluckId }: { potluckId: string | undefined }) {
  const isNew = !potluckId
  const navigate = useNavigate()
  const justCreated = (useLocation().state as { created?: boolean } | null)?.created

  const id = useMemo(() => potluckId ?? newCommunityMenuId(), [potluckId])
  const [existing, setExisting] = useState<CommunityMenu | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [description, setDescription] = useState('')
  const [courses, setCourses] = useState<string[]>(DEFAULT_COURSES)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    getCommunityMenu(id)
      .then((m) => {
        if (!m) return setError('Potluck not found.')
        setExisting(m)
        setTitle(m.title)
        setEventDate(m.eventDate ?? '')
        setDescription(m.description)
        setCourses(m.courses)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const setCourse = (i: number, value: string) =>
    setCourses((list) => list.map((c, j) => (j === i ? value : c)))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleaned = courses.map((c) => c.trim()).filter(Boolean)
    if (!title.trim()) return setError('Give the potluck a title.')
    if (cleaned.length === 0) return setError('Add at least one course.')
    if (new Set(cleaned.map((c) => c.toLowerCase())).size !== cleaned.length) {
      return setError('Each course needs a different name.')
    }
    setError(null)
    setBusy(true)
    try {
      await saveCommunityMenu(id, existing, {
        title: title.trim(),
        eventDate: eventDate || null,
        description: description.trim(),
        courses: cleaned,
        active: existing?.active ?? true,
        locked: existing?.locked ?? false,
      })
      if (isNew) navigate(`/admin/potlucks/${id}`, { replace: true, state: { created: true } })
      else navigate('/admin/potlucks')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function setFlag(flags: { active?: boolean; locked?: boolean }) {
    if (!existing) return
    setBusy(true)
    try {
      await setCommunityMenuFlags(id, flags)
      setExisting({ ...existing, ...flags })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!existing || !confirm(`Delete "${existing.title}" and every dish on it?`)) return
    setBusy(true)
    try {
      await deleteCommunityMenu(id)
      navigate('/admin/potlucks')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (!isNew && !existing) return <ErrorNote>{error ?? 'Potluck not found.'}</ErrorNote>

  const renamed = existing ? existing.courses.filter((c) => !courses.includes(c)) : []

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/admin/potlucks" className="text-sm text-terracotta-600 hover:underline">
          ← All potlucks
        </Link>
        <div className="flex items-center gap-4">
          {existing && (
            <Link to={`/potluck/${id}`} className="text-sm text-cocoa-700 hover:underline">
              View sign-up page
            </Link>
          )}
          <h2 className="text-2xl font-semibold">{isNew ? 'New potluck' : 'Edit potluck'}</h2>
        </div>
      </div>

      {existing && (
        <Card className="space-y-4">
          {justCreated && (
            <p className="font-semibold text-olive-600">Potluck created! Share this link with your guests:</p>
          )}
          {existing.active ? (
            <ShareLink url={potluckUrl(id)} />
          ) : (
            <p className="text-sm text-cocoa-500">
              The link is off. Anyone who opens it sees "This menu isn't available."
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-cream-200 pt-4">
            <Badge tone={existing.active ? 'green' : 'neutral'}>
              {existing.active ? 'Link on' : 'Link off'}
            </Badge>
            <Button
              variant={existing.active ? 'danger' : 'secondary'}
              onClick={() => setFlag({ active: !existing.active })}
              disabled={busy}
            >
              {existing.active ? 'Turn link off' : 'Turn link back on'}
            </Button>
            <span className="mx-1 hidden h-5 w-px bg-cream-200 sm:block" />
            <Badge tone={existing.locked ? 'amber' : 'green'}>
              {existing.locked ? 'Sign-ups closed' : 'Sign-ups open'}
            </Badge>
            <Button variant="secondary" onClick={() => setFlag({ locked: !existing.locked })} disabled={busy}>
              {existing.locked ? 'Reopen sign-ups' : 'Lock menu (finalize)'}
            </Button>
          </div>
          <p className="text-xs text-cocoa-500">
            Locking keeps the menu visible but stops anyone adding, editing, or removing dishes. You can
            still remove dishes from the sign-up page.
          </p>
        </Card>
      )}

      <Card className="space-y-5">
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Thanksgiving Potluck"
            required
          />
        </Field>
        <Field label="Event date (optional)">
          <input
            type="date"
            className={`${inputClass} sm:max-w-xs`}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </Field>
        <Field label="Description" hint="Time, place, anything guests should know.">
          <textarea
            className={inputClass}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold">Courses</h3>
          <p className="mt-1 text-sm text-cocoa-500">Guests pick one of these for each dish.</p>
        </div>
        <ul className="space-y-2">
          {courses.map((course, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                className={inputClass}
                value={course}
                onChange={(e) => setCourse(i, e.target.value)}
                maxLength={40}
                aria-label={`Course ${i + 1}`}
              />
              <button
                type="button"
                className="rounded px-2 py-1 text-cocoa-700 hover:bg-cream-200 disabled:opacity-30"
                onClick={() =>
                  setCourses((list) => {
                    const next = [...list]
                    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                    return next
                  })
                }
                disabled={i === 0}
                aria-label={`Move ${course || 'course'} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-terracotta-700 hover:bg-terracotta-500/10 disabled:opacity-30"
                onClick={() => setCourses((list) => list.filter((_, j) => j !== i))}
                disabled={courses.length === 1}
                aria-label={`Remove ${course || 'course'}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {courses.length < 12 && (
          <Button variant="ghost" onClick={() => setCourses((list) => [...list, ''])}>
            + Add course
          </Button>
        )}
        {renamed.length > 0 && (
          <p className="text-sm text-terracotta-700">
            Dishes already signed up under {renamed.map((c) => `"${c}"`).join(', ')} will be listed under
            "Other" after you save.
          </p>
        )}
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {existing ? (
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            Delete potluck
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link
            to="/admin/potlucks"
            className="rounded-full px-4 py-2 text-sm font-semibold text-cocoa-700 hover:bg-cream-200/60"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save potluck'}
          </Button>
        </div>
      </div>
    </form>
  )
}
