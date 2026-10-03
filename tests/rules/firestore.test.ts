import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  ADMIN_UID,
  USER_UID,
  adminUidsIn,
  createTestEnv,
  firestoreRules,
  storageRules,
  validRecipe,
} from './setup'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
})

const anon = () => env.unauthenticatedContext().firestore()
const user = () => env.authenticatedContext(USER_UID).firestore()
const admin = () => env.authenticatedContext(ADMIN_UID).firestore()

/** Writes a document directly, bypassing rules. */
async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data)
  })
}

const seededRecipe = (status: 'draft' | 'published') => ({
  ...validRecipe({ status }),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
})

describe('admin allowlist', () => {
  it('is identical in firestore.rules and storage.rules', () => {
    expect(adminUidsIn(firestoreRules)).toEqual(adminUidsIn(storageRules))
  })
})

describe('recipes: reading', () => {
  beforeEach(async () => {
    await seed('recipes/pub', seededRecipe('published'))
    await seed('recipes/draft', seededRecipe('draft'))
  })

  it('anyone can read a published recipe', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'recipes/pub')))
    await assertSucceeds(getDoc(doc(user(), 'recipes/pub')))
  })

  it('visitors and non-admins cannot read drafts', async () => {
    await assertFails(getDoc(doc(anon(), 'recipes/draft')))
    await assertFails(getDoc(doc(user(), 'recipes/draft')))
  })

  it('admin can read drafts', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'recipes/draft')))
  })

  it('public list queries must filter to published', async () => {
    const recipes = collection(anon(), 'recipes')
    await assertSucceeds(getDocs(query(recipes, where('status', '==', 'published'))))
    await assertFails(getDocs(recipes))
  })

  it('admin can list every recipe', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'recipes')))
  })
})

describe('recipes: writing', () => {
  it('admin can create a valid recipe', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'recipes/r1'), validRecipe()))
  })

  it('visitors and signed-in non-admins cannot create', async () => {
    await assertFails(setDoc(doc(anon(), 'recipes/r1'), validRecipe()))
    await assertFails(setDoc(doc(user(), 'recipes/r1'), validRecipe()))
  })

  it('rejects missing required fields', async () => {
    const { notes: _notes, ...missingNotes } = validRecipe()
    await assertFails(setDoc(doc(admin(), 'recipes/r1'), missingNotes))
  })

  it('rejects unknown fields', async () => {
    await assertFails(setDoc(doc(admin(), 'recipes/r1'), validRecipe({ sneaky: true })))
  })

  it.each([
    ['empty title', { title: '' }],
    ['title too long', { title: 'x'.repeat(121) }],
    ['non-integer servings', { servings: 2.5 }],
    ['zero servings', { servings: 0 }],
    ['negative prep time', { prepMinutes: -1 }],
    ['bad status', { status: 'secret' }],
    ['featured not a bool', { featured: 'yes' }],
    ['ingredients not a list', { ingredients: 'flour' }],
    ['too many tags', { tags: Array.from({ length: 31 }, (_, i) => `t${i}`) }],
    ['photo for another recipe', { photoPath: 'recipes/other/photo.jpg' }],
    ['client-chosen createdAt', { createdAt: Timestamp.fromDate(new Date(2000, 0, 1)) }],
  ])('rejects %s', async (_label, overrides) => {
    await assertFails(setDoc(doc(admin(), 'recipes/r1'), validRecipe(overrides)))
  })

  it('accepts a photo path inside the recipe folder', async () => {
    await assertSucceeds(
      setDoc(
        doc(admin(), 'recipes/r1'),
        validRecipe({ photoPath: 'recipes/r1/123.jpg', photoUrl: 'https://example.com/x.jpg' }),
      ),
    )
  })

  it('admin can update, but cannot change createdAt', async () => {
    await seed('recipes/r1', seededRecipe('draft'))
    await assertSucceeds(
      updateDoc(doc(admin(), 'recipes/r1'), {
        title: 'New title',
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(doc(admin(), 'recipes/r1'), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('updates must refresh updatedAt', async () => {
    await seed('recipes/r1', seededRecipe('draft'))
    await assertFails(updateDoc(doc(admin(), 'recipes/r1'), { title: 'Stale' }))
  })

  it('non-admins cannot update or delete', async () => {
    await seed('recipes/r1', seededRecipe('published'))
    await assertFails(
      updateDoc(doc(user(), 'recipes/r1'), { title: 'Hacked', updatedAt: serverTimestamp() }),
    )
    await assertFails(deleteDoc(doc(user(), 'recipes/r1')))
    await assertFails(deleteDoc(doc(anon(), 'recipes/r1')))
  })

  it('admin can delete', async () => {
    await seed('recipes/r1', seededRecipe('published'))
    await assertSucceeds(deleteDoc(doc(admin(), 'recipes/r1')))
  })
})

describe.each(['tags', 'categories'])('%s', (col) => {
  it('anyone can read', async () => {
    await seed(`${col}/a`, { name: 'Dinner' })
    await assertSucceeds(getDoc(doc(anon(), `${col}/a`)))
    await assertSucceeds(getDocs(collection(anon(), col)))
  })

  it('only admin can write', async () => {
    await assertFails(setDoc(doc(anon(), `${col}/a`), { name: 'Dinner' }))
    await assertFails(setDoc(doc(user(), `${col}/a`), { name: 'Dinner' }))
    await assertSucceeds(setDoc(doc(admin(), `${col}/a`), { name: 'Dinner' }))
    await assertFails(deleteDoc(doc(user(), `${col}/a`)))
    await assertSucceeds(deleteDoc(doc(admin(), `${col}/a`)))
  })

  it('validates shape', async () => {
    await assertFails(setDoc(doc(admin(), `${col}/a`), { name: '' }))
    await assertFails(setDoc(doc(admin(), `${col}/a`), { name: 'x'.repeat(41) }))
    await assertFails(setDoc(doc(admin(), `${col}/a`), { name: 'Dinner', extra: 1 }))
  })
})

describe('default deny', () => {
  it('blocks unknown collections for everyone', async () => {
    await assertFails(getDoc(doc(anon(), 'anything/x')))
    await assertFails(setDoc(doc(user(), 'anything/x'), { a: 1 }))
    await assertFails(setDoc(doc(admin(), 'anything/x'), { a: 1 }))
  })
})
