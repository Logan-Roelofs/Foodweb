import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { createTestEnv } from './setup'

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

describe('Firestore default deny', () => {
  it('blocks anonymous reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'anything/x')))
    await assertFails(setDoc(doc(db, 'anything/x'), { a: 1 }))
  })

  it('blocks signed-in reads and writes to unknown collections', async () => {
    const db = env.authenticatedContext('someone').firestore()
    await assertFails(getDoc(doc(db, 'anything/x')))
    await assertFails(setDoc(doc(db, 'anything/x'), { a: 1 }))
  })
})
