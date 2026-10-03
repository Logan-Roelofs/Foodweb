import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Recipe, RecipeDoc } from '../types'

// Read-only recipe access, used by public pages. Writes live in
// recipeAdmin.ts so visitors never download the upload code.

export const recipesCol = collection(db, 'recipes')

export function fromSnap(id: string, data: unknown): Recipe {
  return { id, ...(data as RecipeDoc) }
}

/** Every recipe including drafts. Admin only (rules reject this for anyone else). */
export async function listAllRecipes(): Promise<Recipe[]> {
  const snap = await getDocs(query(recipesCol, orderBy('updatedAt', 'desc')))
  return snap.docs.map((d) => fromSnap(d.id, d.data()))
}

/** Returns null if the recipe doesn't exist or the viewer isn't allowed to see it. */
export async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const snap = await getDoc(doc(recipesCol, id))
    return snap.exists() ? fromSnap(snap.id, snap.data()) : null
  } catch (err) {
    if ((err as { code?: string }).code === 'permission-denied') return null
    throw err
  }
}

const publishedTime = (r: Recipe) => r.publishedAt?.toMillis() ?? r.createdAt?.toMillis() ?? 0

// Published recipes are fetched once per visit and shared by every public
// page. A personal collection is small enough to filter in the browser.
let publishedCache: Promise<Recipe[]> | null = null

export function loadPublishedRecipes(): Promise<Recipe[]> {
  publishedCache ??= getDocs(query(recipesCol, where('status', '==', 'published')))
    .then((snap) =>
      snap.docs.map((d) => fromSnap(d.id, d.data())).sort((a, b) => publishedTime(b) - publishedTime(a)),
    )
    .catch((err) => {
      publishedCache = null
      throw err
    })
  return publishedCache
}

/** Call after the admin changes a recipe so public pages refetch. */
export function invalidatePublishedRecipes() {
  publishedCache = null
}

/** Published recipes, newest first. */
export function usePublishedRecipes() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    loadPublishedRecipes().then(
      (r) => active && setRecipes(r),
      (e) => active && setError(e),
    )
    return () => {
      active = false
    }
  }, [])

  return { recipes, error }
}
