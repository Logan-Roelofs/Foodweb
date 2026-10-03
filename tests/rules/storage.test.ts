import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { getBytes, ref, uploadBytes } from 'firebase/storage'
import { BUCKET, createTestEnv } from './setup'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})
afterAll(async () => {
  await env.cleanup()
})

describe('Storage default deny', () => {
  it('blocks anonymous reads and writes', async () => {
    const storage = env.unauthenticatedContext().storage(BUCKET)
    await assertFails(getBytes(ref(storage, 'anything/file.jpg')))
    await assertFails(uploadBytes(ref(storage, 'anything/file.jpg'), new Uint8Array([1, 2, 3])))
  })

  it('blocks signed-in writes to unknown paths', async () => {
    const storage = env.authenticatedContext('someone').storage(BUCKET)
    await assertFails(uploadBytes(ref(storage, 'anything/file.jpg'), new Uint8Array([1, 2, 3])))
  })
})
