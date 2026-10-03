import { useState, type FormEvent } from 'react'
import { createLabel, deleteLabel, renameLabel, useLabels, type LabelKind } from '../lib/taxonomy'
import type { Label } from '../types'
import { Button, Card, ErrorNote, Loading, errorMessage, inputClass } from '../components/ui'

export function LabelsPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <LabelManager
        kind="categories"
        title="Categories"
        help="Each recipe has one category, like Mains or Baking."
        placeholder="e.g. Mains"
      />
      <LabelManager
        kind="tags"
        title="Tags"
        help="Recipes can have many tags, like dinner, dessert, or vegetarian."
        placeholder="e.g. vegetarian"
      />
    </div>
  )
}

function LabelManager({
  kind,
  title,
  help,
  placeholder,
}: {
  kind: LabelKind
  title: string
  help: string
  placeholder: string
}) {
  const { labels, loading } = useLabels(kind)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (labels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists.`)
      return
    }
    await run(async () => {
      await createLabel(kind, trimmed)
      setName('')
    })
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-cocoa-700/80">{help}</p>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          maxLength={40}
          aria-label={`New ${kind === 'tags' ? 'tag' : 'category'} name`}
        />
        <Button type="submit" disabled={!name.trim()}>
          Add
        </Button>
      </form>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : labels.length === 0 ? (
        <p className="mt-6 text-sm text-cocoa-700/70">None yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-cream-200">
          {labels.map((label) => (
            <LabelRow key={label.id} kind={kind} label={label} run={run} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function LabelRow({
  kind,
  label,
  run,
}: {
  kind: LabelKind
  label: Label
  run: (action: () => Promise<void>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(label.name)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await run(() => renameLabel(kind, label.id, name))
    setEditing(false)
  }

  function remove() {
    const used = kind === 'tags' ? 'removed from any recipes using it' : 'cleared from any recipes using it'
    if (confirm(`Delete "${label.name}"? It will be ${used}.`)) {
      void run(() => deleteLabel(kind, label.id))
    }
  }

  if (editing) {
    return (
      <li className="py-2">
        <form onSubmit={save} className="flex gap-2">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            aria-label="Name"
          />
          <Button type="submit">Save</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setName(label.name)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span>{label.name}</span>
      <span className="flex gap-1">
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button variant="ghost" onClick={remove}>
          Delete
        </Button>
      </span>
    </li>
  )
}
