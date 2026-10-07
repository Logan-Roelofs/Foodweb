import { MACRO_KEYS, type Macros } from '../types'
import type { RecipeInput } from './recipeAdmin'

// Bulk import: a JSON file of recipes (e.g. converted from saved Instagram
// captions) becomes a set of drafts. Pure parsing/validation lives here so it
// can be unit-tested; the page does the writing.
//
// File format:
// {
//   "format": "foodweb-recipes", "version": 1,
//   "recipes": [{
//     "title": "…", "servings": 4, "ingredients": ["1 cup rice", …], "steps": ["…"],
//     "description"?, "prepMinutes"?, "cookMinutes"?, "notes"?,
//     "macros"?: { "protein"?, "fat"?, "carbs"?, "fiber"? }   // grams, whole recipe
//     "tags"?: ["high protein"], "category"?: "Mains", "sourceUrl"?: "https://…"
//   }]
// }

export interface ImportCandidate {
  /** Ready to save, minus tags/category (resolved by name at import time). */
  input: Omit<RecipeInput, 'tags' | 'categoryId'>
  tagNames: string[]
  categoryName: string | null
  sourceUrl: string | null
}

export interface ParsedImport {
  candidates: ImportCandidate[]
  /** Problems with individual entries, which are skipped. */
  errors: string[]
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim().slice(0, maxLen))
        .filter(Boolean)
        .slice(0, maxItems)
    : []
const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback

function parseMacros(v: unknown): Macros | null {
  if (!isObj(v)) return null
  const macros = {} as Macros
  for (const k of MACRO_KEYS) {
    const n = v[k]
    macros[k] = typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 10) / 10 : null
  }
  return MACRO_KEYS.some((k) => macros[k] !== null) ? macros : null
}

function parseRecipe(raw: unknown, index: number): ImportCandidate | string {
  const label = `Recipe ${index + 1}`
  if (!isObj(raw)) return `${label}: not a recipe object.`
  const title = str(raw.title, 120)
  if (!title) return `${label}: missing a title.`
  const ingredients = strList(raw.ingredients, 150, 300)
  if (ingredients.length === 0) return `${label} ("${title}"): no ingredients.`

  const sourceUrl = typeof raw.sourceUrl === 'string' && /^https:\/\/[^\s]+$/.test(raw.sourceUrl) ? raw.sourceUrl : null
  return {
    input: {
      title,
      description: str(raw.description, 2000),
      prepMinutes: int(raw.prepMinutes, 0, 10000, 0),
      cookMinutes: int(raw.cookMinutes, 0, 10000, 0),
      servings: int(raw.servings, 1, 100, 1),
      ingredients,
      steps: strList(raw.steps, 100, 2000),
      notes: str(raw.notes, 5000),
      macros: parseMacros(raw.macros),
      status: 'draft',
      featured: false,
    },
    tagNames: [...new Set(strList(raw.tags, 30, 40).map((t) => t.toLowerCase()))],
    categoryName: str(raw.category, 40) || null,
    sourceUrl,
  }
}

/** Reads an import file's text. Throws only if the whole file is unusable. */
export function parseImportFile(text: string): ParsedImport {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!isObj(data) || data.format !== 'foodweb-recipes' || !Array.isArray(data.recipes)) {
    throw new Error("That doesn't look like a Foodweb recipe import file.")
  }
  const candidates: ImportCandidate[] = []
  const errors: string[] = []
  data.recipes.forEach((raw, i) => {
    const result = parseRecipe(raw, i)
    if (typeof result === 'string') errors.push(result)
    else candidates.push(result)
  })
  return { candidates, errors }
}

/** True when a recipe already exists with this source link or (failing that) the same title. */
export function isAlreadyImported(
  candidate: ImportCandidate,
  existing: { title: string; notes: string }[],
): boolean {
  if (candidate.sourceUrl) {
    if (existing.some((r) => r.notes.includes(candidate.sourceUrl!))) return true
  }
  const title = candidate.input.title.toLowerCase()
  return existing.some((r) => r.title.toLowerCase() === title)
}
