import {
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { menuRecipesCol, menusCol } from './menus'
import { MENU_COURSES, type Menu, type MenuDoc, type Recipe, type RecipeSnapshot } from '../types'

/** The fields the admin edits in the menu form. */
export type MenuInput = Pick<MenuDoc, 'title' | 'date' | 'message' | 'courses' | 'active'>

export async function listMenus(): Promise<Menu[]> {
  const snap = await getDocs(query(menusCol, orderBy('updatedAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MenuDoc) }))
}

export async function getMenu(id: string): Promise<Menu | null> {
  const snap = await getDoc(doc(menusCol, id))
  return snap.exists() ? { id: snap.id, ...(snap.data() as MenuDoc) } : null
}

/** A fresh random ID (20 characters), which becomes the hard-to-guess share link. */
export function newMenuId(): string {
  return doc(menusCol).id
}

function toSnapshot(r: Recipe): RecipeSnapshot {
  return {
    title: r.title,
    description: r.description,
    photoUrl: r.photoUrl,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    servings: r.servings,
    ingredients: r.ingredients,
    steps: r.steps,
    notes: r.notes,
    macros: r.macros ?? null,
  }
}

/**
 * Saves the menu and refreshes its recipe copies in one atomic batch:
 * every chosen recipe is copied in its current form, and copies of
 * recipes that were removed from the menu are deleted.
 */
export async function saveMenu(
  id: string,
  existing: Menu | null,
  input: MenuInput,
  allRecipes: Recipe[],
): Promise<void> {
  const byId = new Map(allRecipes.map((r) => [r.id, r]))
  const chosen = new Set(MENU_COURSES.flatMap((c) => input.courses[c]))

  const batch = writeBatch(db)
  const menuRef = doc(menusCol, id)
  const data = { ...input, updatedAt: serverTimestamp() }
  if (existing) batch.update(menuRef, data)
  else batch.set(menuRef, { ...data, createdAt: serverTimestamp() })

  for (const recipeId of chosen) {
    const recipe = byId.get(recipeId)
    if (recipe) batch.set(doc(menuRecipesCol(id), recipeId), toSnapshot(recipe))
  }

  if (existing) {
    const current = await getDocs(menuRecipesCol(id))
    for (const d of current.docs) {
      if (!chosen.has(d.id)) batch.delete(d.ref)
    }
  }

  await batch.commit()
}

export async function setMenuActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(menusCol, id), { active, updatedAt: serverTimestamp() })
}

export async function deleteMenu(id: string): Promise<void> {
  const batch = writeBatch(db)
  const copies = await getDocs(menuRecipesCol(id))
  for (const d of copies.docs) batch.delete(d.ref)
  batch.delete(doc(menusCol, id))
  await batch.commit()
}
