import {
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { communityCol, entriesCol } from './community'
import type { CommunityMenu, CommunityMenuDoc, Entry } from '../types'

/** The fields the admin edits in the potluck form. */
export type CommunityMenuInput = Pick<
  CommunityMenuDoc,
  'title' | 'eventDate' | 'description' | 'courses' | 'active' | 'locked'
>

export async function listCommunityMenus(): Promise<CommunityMenu[]> {
  const snap = await getDocs(query(communityCol, orderBy('updatedAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CommunityMenuDoc) }))
}

export async function getCommunityMenu(id: string): Promise<CommunityMenu | null> {
  const snap = await getDoc(doc(communityCol, id))
  return snap.exists() ? { id: snap.id, ...(snap.data() as CommunityMenuDoc) } : null
}

/** A fresh random ID, which becomes the hard-to-guess share link. */
export function newCommunityMenuId(): string {
  return doc(communityCol).id
}

export async function saveCommunityMenu(
  id: string,
  existing: CommunityMenu | null,
  input: CommunityMenuInput,
): Promise<void> {
  const ref = doc(communityCol, id)
  const data = { ...input, updatedAt: serverTimestamp() }
  if (existing) await updateDoc(ref, data)
  else await setDoc(ref, { ...data, createdAt: serverTimestamp() })
}

export async function setCommunityMenuFlags(
  id: string,
  flags: Partial<Pick<CommunityMenuDoc, 'active' | 'locked'>>,
): Promise<void> {
  await updateDoc(doc(communityCol, id), { ...flags, updatedAt: serverTimestamp() })
}

/** Deletes the potluck and every dish on it. */
export async function deleteCommunityMenu(id: string): Promise<void> {
  const batch = writeBatch(db)
  const entries = await getDocs(entriesCol(id))
  for (const d of entries.docs) batch.delete(d.ref)
  batch.delete(doc(communityCol, id))
  await batch.commit()
}

/** Copies a contributed dish into the main recipe box as a draft. Returns the new recipe ID. */
export async function addEntryToRecipes(entry: Entry): Promise<string> {
  // Loaded on demand so the potluck page doesn't ship the upload code.
  const { newRecipeId, saveRecipe } = await import('./recipeAdmin')
  const id = newRecipeId()
  const credit = `Contributed by ${entry.displayName}.`
  await saveRecipe(
    id,
    null,
    {
      title: entry.dishName.slice(0, 120),
      description: entry.description,
      prepMinutes: 0,
      cookMinutes: 0,
      servings: 4,
      ingredients: [],
      steps: [],
      tags: [],
      categoryId: null,
      notes: [credit, entry.recipeText, entry.link].filter(Boolean).join('\n\n').slice(0, 5000),
      status: 'draft',
      featured: false,
    },
    { kind: 'keep' },
  )
  return id
}
