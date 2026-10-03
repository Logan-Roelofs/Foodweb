import { MACRO_KEYS, type MacroKey, type Macros } from '../types'

export const MACRO_LABELS: Record<MacroKey, string> = {
  protein: 'Protein',
  fat: 'Fat',
  carbs: 'Carbs',
  fiber: 'Fiber',
}

/** True when at least one macro was entered. */
export function hasMacros(macros: Macros | null | undefined): macros is Macros {
  return !!macros && MACRO_KEYS.some((k) => macros[k] !== null)
}

/** Grams for display: one decimal under 10 g, whole numbers above. */
export function formatGrams(grams: number): string {
  const rounded = grams < 10 ? Math.round(grams * 10) / 10 : Math.round(grams)
  return `${rounded} g`
}

/** Each entered macro multiplied by `factor` (e.g. 1 / servings for per-serving values). */
export function scaleMacros(macros: Macros, factor: number): Macros {
  return Object.fromEntries(
    MACRO_KEYS.map((k) => [k, macros[k] === null ? null : macros[k]! * factor]),
  ) as Macros
}
