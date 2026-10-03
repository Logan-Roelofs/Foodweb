import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  ADMIN_UID,
  USER_UID,
  createTestEnv,
  validCommunityMenu,
  validEntry,
} from './setup'

const OTHER_UID = 'other-user'

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
const other = () => env.authenticatedContext(OTHER_UID).firestore()
const admin = () => env.authenticatedContext(ADMIN_UID).firestore()

const now = () => ({ createdAt: Timestamp.now(), updatedAt: Timestamp.now() })

/** Seeds a potluck "p" with one entry "e1" owned by USER_UID. */
async function seed(menu: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'communityMenus/p'), { ...validCommunityMenu(menu), ...now() })
    await setDoc(doc(db, 'communityMenus/p/entries/e1'), { ...validEntry(USER_UID), ...now() })
  })
}

const entries = (db: ReturnType<typeof anon>) => collection(db, 'communityMenus/p/entries')
/** Entry IDs are '<uid>_<slot>'. */
const slot = (db: ReturnType<typeof anon>, uid: string, n = 0) =>
  doc(db, `communityMenus/p/entries/${uid}_${n}`)

describe('potluck: viewing', () => {
  it('anyone with the link can see the menu and what has been claimed', async () => {
    await seed()
    await assertSucceeds(getDoc(doc(anon(), 'communityMenus/p')))
    await assertSucceeds(getDocs(entries(anon())))
  })

  it('a turned-off link hides the menu and its entries', async () => {
    await seed({ active: false })
    await assertFails(getDoc(doc(anon(), 'communityMenus/p')))
    await assertFails(getDocs(entries(anon())))
    await assertFails(getDocs(entries(user())))
    await assertSucceeds(getDocs(entries(admin())))
  })

  it('only the admin can list potlucks', async () => {
    await seed()
    await assertFails(getDocs(collection(anon(), 'communityMenus')))
    await assertFails(getDocs(collection(user(), 'communityMenus')))
    await assertSucceeds(getDocs(collection(admin(), 'communityMenus')))
  })
})

describe('potluck: adding dishes', () => {
  beforeEach(() => seed())

  it('a signed-in guest can add a dish under their own name', async () => {
    await assertSucceeds(setDoc(slot(other(), OTHER_UID), validEntry(OTHER_UID)))
  })

  it('accepts an optional link and recipe text', async () => {
    await assertSucceeds(
      setDoc(
        slot(other(), OTHER_UID),
        validEntry(OTHER_UID, { link: 'https://example.com/pie', recipeText: 'Mix and bake.' }),
      ),
    )
  })

  it('visitors must sign in to add a dish', async () => {
    await assertFails(setDoc(slot(anon(), 'nobody'), validEntry('nobody')))
  })

  it('cannot add a dish on behalf of someone else', async () => {
    await assertFails(setDoc(slot(other(), USER_UID), validEntry(USER_UID)))
    await assertFails(setDoc(slot(other(), OTHER_UID), validEntry(USER_UID)))
  })

  it.each([
    ['a course that is not on the menu', { course: 'Soup' }],
    ['an empty dish name', { dishName: '' }],
    ['a dish name over 100 characters', { dishName: 'x'.repeat(101) }],
    ['an empty display name', { displayName: '' }],
    ['a description over 500 characters', { description: 'x'.repeat(501) }],
    ['a non-web link', { link: 'javascript:alert(1)' }],
    ['an empty recipe text', { recipeText: '' }],
    ['extra fields', { approved: true }],
    ['a client-chosen createdAt', { createdAt: Timestamp.fromDate(new Date(2000, 0, 1)) }],
  ])('rejects %s', async (_label, overrides) => {
    await assertFails(setDoc(slot(other(), OTHER_UID), validEntry(OTHER_UID, overrides)))
  })

  it('caps each person at 10 dishes (slots 0-9)', async () => {
    await assertSucceeds(setDoc(slot(other(), OTHER_UID, 9), validEntry(OTHER_UID)))
    await assertFails(setDoc(slot(other(), OTHER_UID, 10), validEntry(OTHER_UID)))
    await assertFails(addDoc(entries(other()), validEntry(OTHER_UID)))
  })

  it('cannot overwrite an existing dish by reusing its slot', async () => {
    await assertSucceeds(setDoc(slot(other(), OTHER_UID), validEntry(OTHER_UID)))
    await assertFails(setDoc(slot(other(), OTHER_UID), validEntry(OTHER_UID, { dishName: 'Again' })))
  })

  it('nobody can add dishes once the menu is locked', async () => {
    await seed({ locked: true })
    await assertFails(setDoc(slot(other(), OTHER_UID), validEntry(OTHER_UID)))
  })

  it('nobody can add dishes to a turned-off menu', async () => {
    await seed({ active: false })
    await assertFails(setDoc(slot(other(), OTHER_UID), validEntry(OTHER_UID)))
  })
})

describe('potluck: editing and removing dishes', () => {
  beforeEach(() => seed())

  const edit = { dishName: 'Apple pie', updatedAt: serverTimestamp() }

  it('contributors can edit and delete their own dish', async () => {
    await assertSucceeds(updateDoc(doc(user(), 'communityMenus/p/entries/e1'), edit))
    await assertSucceeds(deleteDoc(doc(user(), 'communityMenus/p/entries/e1')))
  })

  it("contributors cannot touch someone else's dish", async () => {
    await assertFails(updateDoc(doc(other(), 'communityMenus/p/entries/e1'), edit))
    await assertFails(deleteDoc(doc(other(), 'communityMenus/p/entries/e1')))
    await assertFails(deleteDoc(doc(anon(), 'communityMenus/p/entries/e1')))
  })

  it('contributors cannot hand their dish to another user or change createdAt', async () => {
    const ref = doc(user(), 'communityMenus/p/entries/e1')
    await assertFails(updateDoc(ref, { uid: OTHER_UID, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  })

  it('edits must still be valid', async () => {
    await assertFails(
      updateDoc(doc(user(), 'communityMenus/p/entries/e1'), {
        course: 'Soup',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('once locked, contributors can no longer edit or delete', async () => {
    await seed({ locked: true })
    await assertFails(updateDoc(doc(user(), 'communityMenus/p/entries/e1'), edit))
    await assertFails(deleteDoc(doc(user(), 'communityMenus/p/entries/e1')))
  })

  it('the admin can remove any dish, even when locked', async () => {
    await seed({ locked: true })
    await assertSucceeds(deleteDoc(doc(admin(), 'communityMenus/p/entries/e1')))
  })

  it("the admin cannot rewrite someone else's dish", async () => {
    await assertFails(updateDoc(doc(admin(), 'communityMenus/p/entries/e1'), edit))
  })
})

describe('potluck: managing the menu', () => {
  it('admin can create, lock, and delete a potluck', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'communityMenus/p'), validCommunityMenu()))
    await assertSucceeds(
      updateDoc(doc(admin(), 'communityMenus/p'), { locked: true, updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(deleteDoc(doc(admin(), 'communityMenus/p')))
  })

  it('non-admins cannot create, lock, or delete', async () => {
    await assertFails(setDoc(doc(user(), 'communityMenus/p'), validCommunityMenu()))
    await seed()
    await assertFails(
      updateDoc(doc(user(), 'communityMenus/p'), { locked: true, updatedAt: serverTimestamp() }),
    )
    await assertFails(deleteDoc(doc(user(), 'communityMenus/p')))
  })

  it.each([
    ['no courses', { courses: [] }],
    ['too many courses', { courses: Array.from({ length: 13 }, (_, i) => `C${i}`) }],
    ['locked not a bool', { locked: 'no' }],
    ['bad event date', { eventDate: 'Thanksgiving' }],
    ['extra field', { secret: 1 }],
  ])('rejects a potluck with %s', async (_label, overrides) => {
    await assertFails(setDoc(doc(admin(), 'communityMenus/p'), validCommunityMenu(overrides)))
  })
})
