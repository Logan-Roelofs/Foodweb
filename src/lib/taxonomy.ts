import { useEffect, useState } from 'react'
import {
  addDoc,
  arrayRemove,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Label } from '../types'

export type LabelKind = 'tags' | 'categories'

/** Live, alphabetical list of tags or categories. */
export function useLabels(kind: LabelKind): { labels: Label[]; loading: boolean } {
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(
    () =>
      onSnapshot(query(collection(db, kind), orderBy('name')), (snap) => {
        setLabels(snap.docs.map((d) => ({ id: d.id, name: d.data().name as string })))
        setLoading(false)
      }),
    [kind],
  )

  return { labels, loading }
}

export async function createLabel(kind: LabelKind, name: string): Promise<void> {
  await addDoc(collection(db, kind), { name: name.trim() })
}

export async function renameLabel(kind: LabelKind, id: string, name: string): Promise<void> {
  await updateDoc(doc(db, kind, id), { name: name.trim() })
}

/** Deletes a tag/category and removes it from every recipe that used it. */
export async function deleteLabel(kind: LabelKind, id: string): Promise<void> {
  const recipes = collection(db, 'recipes')
  const using =
    kind === 'tags'
      ? query(recipes, where('tags', 'array-contains', id))
      : query(recipes, where('categoryId', '==', id))
  const snap = await getDocs(using)

  // A batch holds up to 500 writes; plenty for a personal recipe box.
  const batch = writeBatch(db)
  for (const r of snap.docs) {
    batch.update(r.ref, {
      ...(kind === 'tags' ? { tags: arrayRemove(id) } : { categoryId: null }),
      updatedAt: serverTimestamp(),
    })
  }
  batch.delete(doc(db, kind, id))
  await batch.commit()
}
