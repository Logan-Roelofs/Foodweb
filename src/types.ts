import type { Timestamp } from 'firebase/firestore'

export type RecipeStatus = 'draft' | 'published'

/** Shape of a document in the `recipes` collection (see firestore.rules). */
export interface RecipeDoc {
  title: string
  description: string
  photoPath: string | null
  photoUrl: string | null
  prepMinutes: number
  cookMinutes: number
  servings: number
  /** One ingredient per line, e.g. "1 1/2 cups flour, sifted". Lines ending in ":" are section headers. */
  ingredients: string[]
  steps: string[]
  /** Tag document IDs. */
  tags: string[]
  categoryId: string | null
  notes: string
  status: RecipeStatus
  featured: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt: Timestamp | null
}

export interface Recipe extends RecipeDoc {
  id: string
}

/** A tag or category. Both are just a name. */
export interface Label {
  id: string
  name: string
}
