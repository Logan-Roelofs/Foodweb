import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { serverTimestamp } from 'firebase/firestore'

export const PROJECT_ID = 'demo-foodweb'
export const BUCKET = `gs://${PROJECT_ID}.appspot.com`

export const firestoreRules = readFileSync('firestore.rules', 'utf8')
export const storageRules = readFileSync('storage.rules', 'utf8')

/** Reads the admin UID list out of a rules file's isAdmin() function. */
export function adminUidsIn(rules: string): string[] {
  const match = rules.match(/request\.auth\.uid in \[([^\]]*)\]/)
  if (!match) throw new Error('Could not find admin allowlist in rules')
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

export const ADMIN_UID = adminUidsIn(firestoreRules)[0]
export const USER_UID = 'regular-user'

/** Starts a test environment wired to the running emulators with our real rules files. */
export function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  })
}

/** A recipe document that passes validation when written by the admin. */
export function validRecipe(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Grandma Apple Pie',
    description: 'Flaky crust, cinnamon apples.',
    photoPath: null,
    photoUrl: null,
    prepMinutes: 30,
    cookMinutes: 60,
    servings: 8,
    ingredients: ['2 1/2 cups flour', '6 apples, sliced'],
    steps: ['Make the crust.', 'Fill and bake.'],
    tags: [],
    categoryId: null,
    notes: '',
    status: 'draft',
    featured: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: null,
    ...overrides,
  }
}

/** A menu document that passes validation when written by the admin. */
export function validMenu(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Date Night',
    date: '2026-02-14',
    message: 'Can’t wait to cook for you.',
    courses: { appetizer: [], main: ['r1'], dessert: ['r2'], drinks: [] },
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

/** A recipe copy stored under a menu. */
export function validSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Secret Soup',
    description: '',
    photoUrl: null,
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    ingredients: ['1 onion'],
    steps: ['Cook it.'],
    notes: '',
    ...overrides,
  }
}
