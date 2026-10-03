import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { CommunityMenu, CommunityMenuDoc, Entry, EntryDoc } from '../types'

// Potluck pages: live menu + entries, and contributors' own entry writes.
// Admin-only writes live in communityAdmin.ts.

export const communityCol = collection(db, 'communityMenus')
export const entriesCol = (menuId: string) => collection(db, 'communityMenus', menuId, 'entries')

export function potluckUrl(menuId: string): string {
  return `${window.location.origin}/potluck/${menuId}`
}

const isDenied = (err: unknown) => (err as { code?: string }).code === 'permission-denied'

/**
 * Live view of a potluck and its dishes. `menu` is null when the link is
 * wrong or turned off (indistinguishable on purpose).
 */
export function usePotluck(menuId: string) {
  const [menu, setMenu] = useState<CommunityMenu | null | undefined>(undefined)
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setMenu(undefined)
    setEntries([])
    const onError = (err: unknown) => (isDenied(err) ? setMenu(null) : setError(err))

    const stopMenu = onSnapshot(
      doc(communityCol, menuId),
      (snap) => setMenu(snap.exists() ? { id: snap.id, ...(snap.data() as CommunityMenuDoc) } : null),
      onError,
    )
    const stopEntries = onSnapshot(
      query(entriesCol(menuId), orderBy('createdAt')),
      (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as EntryDoc) }))),
      // Entries fail with the menu (e.g. link turned off); the menu listener reports it.
      (err) => (isDenied(err) ? setEntries([]) : setError(err)),
    )
    return () => {
      stopMenu()
      stopEntries()
    }
  }, [menuId])

  return { menu, entries, error }
}

/** The fields a contributor fills in. */
export type EntryInput = Pick<
  EntryDoc,
  'displayName' | 'course' | 'dishName' | 'description' | 'link' | 'recipeText'
>

export async function addEntry(menuId: string, uid: string, input: EntryInput): Promise<void> {
  await addDoc(entriesCol(menuId), {
    ...input,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateEntry(menuId: string, entryId: string, input: EntryInput): Promise<void> {
  await updateDoc(doc(entriesCol(menuId), entryId), { ...input, updatedAt: serverTimestamp() })
}

export async function deleteEntry(menuId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(entriesCol(menuId), entryId))
}
