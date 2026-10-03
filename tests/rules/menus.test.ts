import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
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
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { ADMIN_UID, USER_UID, createTestEnv, validMenu, validSnapshot } from './setup'

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

async function seedMenu(id: string, active: boolean) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `menus/${id}`), {
      ...validMenu({ active }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    await setDoc(doc(db, `menus/${id}/recipes/r1`), validSnapshot())
  })
}

describe('menus: reading by link', () => {
  beforeEach(async () => {
    await seedMenu('live', true)
    await seedMenu('revoked', false)
  })

  it('anyone with the link can open an active menu and its recipes', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'menus/live')))
    await assertSucceeds(getDoc(doc(anon(), 'menus/live/recipes/r1')))
    await assertSucceeds(getDocs(collection(anon(), 'menus/live/recipes')))
  })

  it('a revoked menu and its recipes are hidden from everyone but the admin', async () => {
    await assertFails(getDoc(doc(anon(), 'menus/revoked')))
    await assertFails(getDoc(doc(user(), 'menus/revoked')))
    await assertFails(getDoc(doc(anon(), 'menus/revoked/recipes/r1')))
    await assertFails(getDocs(collection(anon(), 'menus/revoked/recipes')))
    await assertSucceeds(getDoc(doc(admin(), 'menus/revoked')))
    await assertSucceeds(getDoc(doc(admin(), 'menus/revoked/recipes/r1')))
  })

  it('a menu that does not exist reveals nothing', async () => {
    await assertFails(getDocs(collection(anon(), 'menus/nope/recipes')))
  })

  it('only the admin can list menus (links stay undiscoverable)', async () => {
    await assertFails(getDocs(collection(anon(), 'menus')))
    await assertFails(getDocs(collection(user(), 'menus')))
    await assertSucceeds(getDocs(collection(admin(), 'menus')))
  })
})

describe('menus: writing', () => {
  it('admin can create a menu and its recipe copies in one batch', async () => {
    const db = admin()
    const batch = writeBatch(db)
    batch.set(doc(db, 'menus/m1'), validMenu())
    batch.set(doc(db, 'menus/m1/recipes/r1'), validSnapshot())
    await assertSucceeds(batch.commit())
  })

  it('visitors and non-admins cannot create menus or recipe copies', async () => {
    await assertFails(setDoc(doc(anon(), 'menus/m1'), validMenu()))
    await assertFails(setDoc(doc(user(), 'menus/m1'), validMenu()))
    await seedMenu('live', true)
    await assertFails(setDoc(doc(user(), 'menus/live/recipes/r2'), validSnapshot()))
  })

  it.each([
    ['empty title', { title: '' }],
    ['bad date', { date: 'Feb 14' }],
    ['message too long', { message: 'x'.repeat(2001) }],
    ['unknown course', { courses: { appetizer: [], main: [], dessert: [], drinks: [], soup: [] } }],
    ['missing course', { courses: { appetizer: [], main: [], dessert: [] } }],
    ['too many recipes in a course', { courses: { appetizer: [], main: Array(21).fill('r'), dessert: [], drinks: [] } }],
    ['active not a bool', { active: 'yes' }],
    ['extra field', { secret: 1 }],
  ])('rejects a menu with %s', async (_label, overrides) => {
    await assertFails(setDoc(doc(admin(), 'menus/m1'), validMenu(overrides)))
  })

  it('accepts a menu without a date', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'menus/m1'), validMenu({ date: null })))
  })

  it('recipe copies can carry macros', async () => {
    await assertSucceeds(
      setDoc(
        doc(admin(), 'menus/m1/recipes/r1'),
        validSnapshot({ macros: { protein: 30, fat: 12, carbs: 40, fiber: 6 } }),
      ),
    )
  })

  it.each([
    ['empty title', { title: '' }],
    ['zero servings', { servings: 0 }],
    ['bad macros', { macros: { protein: -5, fat: 0, carbs: 0, fiber: 0 } }],
    ['extra field', { status: 'draft' }],
  ])('rejects a recipe copy with %s', async (_label, overrides) => {
    await assertFails(setDoc(doc(admin(), 'menus/m1/recipes/r1'), validSnapshot(overrides)))
  })

  it('admin can revoke a link, but cannot change createdAt', async () => {
    await seedMenu('live', true)
    await assertSucceeds(
      updateDoc(doc(admin(), 'menus/live'), { active: false, updatedAt: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(doc(admin(), 'menus/live'), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('non-admins cannot revoke, edit, or delete', async () => {
    await seedMenu('live', true)
    await assertFails(
      updateDoc(doc(user(), 'menus/live'), { active: false, updatedAt: serverTimestamp() }),
    )
    await assertFails(deleteDoc(doc(anon(), 'menus/live')))
    await assertFails(deleteDoc(doc(user(), 'menus/live/recipes/r1')))
  })

  it('admin can delete a menu and its recipe copies', async () => {
    await seedMenu('live', true)
    await assertSucceeds(deleteDoc(doc(admin(), 'menus/live/recipes/r1')))
    await assertSucceeds(deleteDoc(doc(admin(), 'menus/live')))
  })
})
