import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { Menu, MenuDoc, MenuRecipe, RecipeSnapshot } from '../types'

// Read access for the shared (unlisted) menu pages. Admin writes live in menuAdmin.ts.

export const menusCol = collection(db, 'menus')
export const menuRecipesCol = (menuId: string) => collection(db, 'menus', menuId, 'recipes')

const isDenied = (err: unknown) => (err as { code?: string }).code === 'permission-denied'

/** Full share link for a menu. */
export function menuUrl(menuId: string): string {
  return `${window.location.origin}/menu/${menuId}`
}

/** "2026-02-14" → "Saturday, February 14, 2026" */
export function formatMenuDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * The menu plus its recipe copies. Null when the link is wrong or revoked;
 * the rules make those indistinguishable to visitors on purpose.
 */
export async function getSharedMenu(
  menuId: string,
): Promise<{ menu: Menu; recipes: Map<string, MenuRecipe> } | null> {
  try {
    const snap = await getDoc(doc(menusCol, menuId))
    if (!snap.exists()) return null
    const menu: Menu = { id: snap.id, ...(snap.data() as MenuDoc) }
    const recipeSnaps = await getDocs(menuRecipesCol(menuId))
    const recipes = new Map(
      recipeSnaps.docs.map((d) => [d.id, { id: d.id, ...(d.data() as RecipeSnapshot) }]),
    )
    return { menu, recipes }
  } catch (err) {
    if (isDenied(err)) return null
    throw err
  }
}

export const COURSE_LABELS = {
  appetizer: 'Appetizers',
  main: 'Main Course',
  dessert: 'Dessert',
  drinks: 'Drinks',
} as const
