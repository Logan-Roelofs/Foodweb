import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { listAllRecipes } from '../lib/recipes'
import { newRecipeId, saveRecipe } from '../lib/recipeAdmin'
import { createLabel, useLabels, type LabelKind } from '../lib/taxonomy'
import { isAlreadyImported, parseImportFile, type ImportCandidate } from '../lib/recipeImport'
import type { Label, Recipe } from '../types'
import { Badge, Button, Card, ErrorNote, Loading, errorMessage } from '../components/ui'

interface Row {
  candidate: ImportCandidate
  duplicate: boolean
  selected: boolean
  /** Set once saved. */
  importedId?: string
}

const byName = (labels: Label[], name: string) => labels.find((l) => l.name.toLowerCase() === name.toLowerCase())

export function ImportPage() {
  const [existing, setExisting] = useState<Recipe[] | null>(null)
  const { labels: tags } = useLabels('tags')
  const { labels: categories } = useLabels('categories')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createTags, setCreateTags] = useState(false)
  const [createCategories, setCreateCategories] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    listAllRecipes()
      .then(setExisting)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function handleFile(file: File) {
    setError(null)
    setFileErrors([])
    setRows(null)
    try {
      const { candidates, errors } = parseImportFile(await file.text())
      setFileErrors(errors)
      setRows(
        candidates.map((candidate) => {
          const duplicate = isAlreadyImported(candidate, existing ?? [])
          return { candidate, duplicate, selected: !duplicate }
        }),
      )
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const selected = rows?.filter((r) => r.selected && !r.importedId) ?? []
  const missing = useMemo(() => {
    const tagNames = new Set<string>()
    const categoryNames = new Set<string>()
    for (const r of selected) {
      for (const t of r.candidate.tagNames) if (!byName(tags, t)) tagNames.add(t)
      const c = r.candidate.categoryName
      if (c && !byName(categories, c)) categoryNames.add(c)
    }
    return { tags: [...tagNames].sort(), categories: [...categoryNames].sort() }
  }, [selected, tags, categories])

  const toggle = (i: number) =>
    setRows((list) => list!.map((r, j) => (j === i ? { ...r, selected: !r.selected } : r)))
  const setAll = (on: boolean) =>
    setRows((list) => list!.map((r) => (r.importedId ? r : { ...r, selected: on })))

  async function runImport() {
    if (!rows) return
    setError(null)
    const todo = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.selected && !r.importedId)
    setProgress({ done: 0, total: todo.length })
    try {
      // Create any missing tags/categories first (only if asked), then remember their IDs.
      const known: Record<LabelKind, Map<string, string>> = {
        tags: new Map(tags.map((t) => [t.name.toLowerCase(), t.id])),
        categories: new Map(categories.map((c) => [c.name.toLowerCase(), c.id])),
      }
      const ensure = async (kind: LabelKind, names: string[], allowed: boolean) => {
        if (!allowed) return
        for (const name of names) {
          if (!known[kind].has(name.toLowerCase())) known[kind].set(name.toLowerCase(), await createLabel(kind, name))
        }
      }
      await ensure('tags', missing.tags, createTags)
      await ensure('categories', missing.categories, createCategories)

      let done = 0
      for (const { r, i } of todo) {
        const c = r.candidate
        const id = newRecipeId()
        await saveRecipe(
          id,
          null,
          {
            ...c.input,
            tags: c.tagNames.map((t) => known.tags.get(t)).filter((x): x is string => !!x),
            categoryId: (c.categoryName && known.categories.get(c.categoryName.toLowerCase())) || null,
          },
          { kind: 'keep' },
        )
        done += 1
        setProgress({ done, total: todo.length })
        setRows((list) => list!.map((row, j) => (j === i ? { ...row, importedId: id, selected: false } : row)))
      }
    } catch (err) {
      setError(`Stopped early: ${errorMessage(err)} Imported recipes are kept; run it again to continue.`)
    } finally {
      setProgress(null)
    }
  }

  if (!existing) return error ? <ErrorNote>{error}</ErrorNote> : <Loading />

  const importedCount = rows?.filter((r) => r.importedId).length ?? 0

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Bulk import</h2>
        <p className="mt-1 text-sm text-cocoa-500">
          Choose a Foodweb import file (<code>.json</code>). Every recipe comes in as a <strong>draft</strong>, so
          nothing is public until you review and publish it. Recipes you already have (same source link or
          title) are unticked automatically.
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-terracotta-600 hover:underline">
          Choose file…
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
        </label>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}
      {fileErrors.length > 0 && (
        <ErrorNote>
          {fileErrors.length} {fileErrors.length === 1 ? 'entry was' : 'entries were'} skipped: {fileErrors.join(' ')}
        </ErrorNote>
      )}

      {rows && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cocoa-700">
              <strong>{selected.length}</strong> of {rows.length} selected
              {importedCount > 0 && <> · {importedCount} imported</>}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setAll(true)}>
                Select all
              </Button>
              <Button variant="ghost" onClick={() => setAll(false)}>
                Select none
              </Button>
            </div>
          </div>

          {(missing.tags.length > 0 || missing.categories.length > 0) && (
            <div className="space-y-2 rounded-2xl bg-cream-100 p-4 text-sm">
              {missing.tags.length > 0 && (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={createTags}
                    onChange={(e) => setCreateTags(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-terracotta-500"
                  />
                  <span>
                    Create {missing.tags.length} new {missing.tags.length === 1 ? 'tag' : 'tags'}:{' '}
                    <span className="text-cocoa-500">{missing.tags.join(', ')}</span>
                    <span className="block text-xs text-cocoa-500">Unticked: recipes come in without these tags.</span>
                  </span>
                </label>
              )}
              {missing.categories.length > 0 && (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={createCategories}
                    onChange={(e) => setCreateCategories(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-terracotta-500"
                  />
                  <span>
                    Create {missing.categories.length} new{' '}
                    {missing.categories.length === 1 ? 'category' : 'categories'}:{' '}
                    <span className="text-cocoa-500">{missing.categories.join(', ')}</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <ul className="divide-y divide-cream-200 rounded-2xl bg-white ring-1 ring-cream-200">
            {rows.map((row, i) => {
              const c = row.candidate
              return (
                <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={!!row.importedId || !!progress}
                    onChange={() => toggle(i)}
                    className="mt-1 h-4 w-4 shrink-0 accent-terracotta-500"
                    aria-label={`Import ${c.input.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.input.title}</div>
                    <div className="text-xs text-cocoa-500">
                      {c.input.servings} {c.input.servings === 1 ? 'serving' : 'servings'} ·{' '}
                      {c.input.ingredients.length} ingredients ·{' '}
                      {c.input.steps.length} steps
                      {c.input.macros && ' · macros'}
                      {c.tagNames.length > 0 && <> · #{c.tagNames.join(' #')}</>}
                    </div>
                  </div>
                  {row.importedId ? (
                    <Link to={`/admin/recipes/${row.importedId}`} className="shrink-0">
                      <Badge tone="green">Imported ✓</Badge>
                    </Link>
                  ) : (
                    row.duplicate && <Badge>Already have it</Badge>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="flex items-center justify-end gap-3">
            {progress && (
              <span className="text-sm text-cocoa-500" role="status">
                Importing {progress.done} of {progress.total}…
              </span>
            )}
            <Button onClick={runImport} disabled={selected.length === 0 || !!progress}>
              Import {selected.length} as drafts
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
