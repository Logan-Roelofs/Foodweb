import { useSyncExternalStore } from 'react'
import type { ListExtra, ListRecipe } from './shoppingList'

// The shopping list lives in this browser's localStorage: no sign-in, and
// nothing about a visitor's groceries is stored on the server. If storage is
// unavailable (some private modes), the list still works for the visit.

export interface ShoppingListState {
  recipes: ListRecipe[]
  extras: ListExtra[]
  /** Keys of ticked-off items. */
  checked: string[]
}

const KEY = 'foodweb:shoppingList:v1'
const empty: ShoppingListState = { recipes: [], extras: [], checked: [] }

function read(): ShoppingListState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<ShoppingListState>
    return {
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
      extras: Array.isArray(parsed.extras) ? parsed.extras : [],
      checked: Array.isArray(parsed.checked) ? parsed.checked : [],
    }
  } catch {
    return empty
  }
}

let state: ShoppingListState = read()
const listeners = new Set<() => void>()

function set(next: ShoppingListState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked or full; keep the in-memory list for this visit.
  }
  listeners.forEach((l) => l())
}

// Keep other open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    state = read()
    listeners.forEach((l) => l())
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useShoppingList(): ShoppingListState {
  return useSyncExternalStore(subscribe, () => state)
}

/** Adds a recipe, or updates its servings if it's already on the list. */
export function addRecipeToList(recipe: ListRecipe) {
  const others = state.recipes.filter((r) => r.id !== recipe.id)
  set({ ...state, recipes: [...others, recipe] })
}

export function removeRecipeFromList(id: string) {
  set({ ...state, recipes: state.recipes.filter((r) => r.id !== id) })
}

export function addExtra(text: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  set({ ...state, extras: [...state.extras, { id, text }] })
}

export function toggleChecked(key: string) {
  const checked = state.checked.includes(key)
    ? state.checked.filter((k) => k !== key)
    : [...state.checked, key]
  set({ ...state, checked })
}

export function removeExtra(id: string) {
  const key = `extra:${id}`
  set({
    ...state,
    extras: state.extras.filter((e) => e.id !== id),
    checked: state.checked.filter((k) => k !== key),
  })
}

export function clearList() {
  set(empty)
}

export function isOnList(id: string): ListRecipe | undefined {
  return state.recipes.find((r) => r.id === id)
}
