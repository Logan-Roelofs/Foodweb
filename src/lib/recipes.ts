import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db } from './firebase'
import { storage } from './storage'
import { compressPhoto } from './image'
import type { Recipe, RecipeDoc } from '../types'

/** The fields the admin edits in the recipe form. */
export type RecipeInput = Omit<
  RecipeDoc,
  'photoPath' | 'photoUrl' | 'createdAt' | 'updatedAt' | 'publishedAt'
>

const recipesCol = collection(db, 'recipes')

function fromSnap(id: string, data: unknown): Recipe {
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

/** A fresh ID, so a new recipe's photo can be uploaded before the doc exists. */
export function newRecipeId(): string {
  return doc(recipesCol).id
}

export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; file: File }

async function uploadPhoto(recipeId: string, file: File) {
  const compressed = await compressPhoto(file)
  const path = `recipes/${recipeId}/${Date.now()}.jpg`
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, compressed, { contentType: 'image/jpeg' })
  return { path, url: await getDownloadURL(fileRef) }
}

async function deletePhotoQuietly(path: string | null) {
  if (!path) return
  try {
    await deleteObject(ref(storage, path))
  } catch {
    // Already gone or not reachable; an orphaned photo is harmless.
  }
}

/** Creates (existing = null) or updates a recipe, handling the photo upload. */
export async function saveRecipe(
  id: string,
  existing: Recipe | null,
  input: RecipeInput,
  photo: PhotoChange,
): Promise<void> {
  let photoPath = existing?.photoPath ?? null
  let photoUrl = existing?.photoUrl ?? null
  let uploadedPath: string | null = null

  if (photo.kind === 'replace') {
    const uploaded = await uploadPhoto(id, photo.file)
    photoPath = uploadedPath = uploaded.path
    photoUrl = uploaded.url
  } else if (photo.kind === 'remove') {
    photoPath = photoUrl = null
  }

  const becamePublished = input.status === 'published' && existing?.status !== 'published'
  const publishedAt =
    input.status === 'draft' ? null : becamePublished ? serverTimestamp() : existing!.publishedAt

  const data = { ...input, photoPath, photoUrl, publishedAt, updatedAt: serverTimestamp() }

  try {
    if (existing) {
      await updateDoc(doc(recipesCol, id), data)
    } else {
      await setDoc(doc(recipesCol, id), { ...data, createdAt: serverTimestamp() })
    }
  } catch (err) {
    await deletePhotoQuietly(uploadedPath)
    throw err
  }

  if (existing?.photoPath && existing.photoPath !== photoPath) {
    await deletePhotoQuietly(existing.photoPath)
  }
}

export async function deleteRecipe(recipe: Recipe): Promise<void> {
  await deleteDoc(doc(recipesCol, recipe.id))
  await deletePhotoQuietly(recipe.photoPath)
}
