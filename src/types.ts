import type { Timestamp } from 'firebase/firestore'

export type RecipeStatus = 'draft' | 'published'

export const MACRO_KEYS = ['protein', 'fat', 'carbs', 'fiber'] as const
export type MacroKey = (typeof MACRO_KEYS)[number]

/** Grams for the whole recipe. A null value means not entered. */
export type Macros = Record<MacroKey, number | null>

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
  /** Whole-recipe macros. Missing on recipes saved before macros existed. */
  macros?: Macros | null
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

// ---------- Curated menus ----------

export const MENU_COURSES = ['appetizer', 'main', 'dessert', 'drinks'] as const
export type MenuCourse = (typeof MENU_COURSES)[number]

/** Shape of a document in the `menus` collection. */
export interface MenuDoc {
  title: string
  /** "YYYY-MM-DD", or null for no date. */
  date: string | null
  message: string
  /** Recipe IDs per course, in display order. */
  courses: Record<MenuCourse, string[]>
  /** False once the link is revoked. */
  active: boolean
  /**
   * False for a "menu only" card: no recipe links, no site navigation, and
   * the recipe copies hold no ingredients or steps. Missing on older menus (= true).
   */
  showRecipes?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Menu extends MenuDoc {
  id: string
}

/**
 * A copy of a recipe stored with the menu (menus/{menuId}/recipes/{recipeId}),
 * so menus can include drafts without making them public.
 */
export type RecipeSnapshot = Pick<
  RecipeDoc,
  | 'title'
  | 'description'
  | 'photoUrl'
  | 'prepMinutes'
  | 'cookMinutes'
  | 'servings'
  | 'ingredients'
  | 'steps'
  | 'notes'
  | 'macros'
>

export interface MenuRecipe extends RecipeSnapshot {
  id: string
}

// ---------- Community menus (potlucks) ----------

export interface CommunityMenuDoc {
  title: string
  /** "YYYY-MM-DD", or null for no date. */
  eventDate: string | null
  description: string
  /** Course names chosen by the admin, e.g. ["Sides", "Mains"]. */
  courses: string[]
  /** False once the link is turned off. */
  active: boolean
  /** True once sign-ups are closed. */
  locked: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CommunityMenu extends CommunityMenuDoc {
  id: string
}

/** One dish someone is bringing (communityMenus/{id}/entries/{entryId}). */
export interface EntryDoc {
  uid: string
  displayName: string
  course: string
  dishName: string
  description: string
  link: string | null
  recipeText: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Entry extends EntryDoc {
  id: string
}
