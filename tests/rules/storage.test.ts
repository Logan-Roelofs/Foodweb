import { afterAll, beforeAll, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'
import { ADMIN_UID, BUCKET, USER_UID, createTestEnv } from './setup'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})
afterAll(async () => {
  await env.cleanup()
})

const anon = () => env.unauthenticatedContext().storage(BUCKET)
const user = () => env.authenticatedContext(USER_UID).storage(BUCKET)
const admin = () => env.authenticatedContext(ADMIN_UID).storage(BUCKET)

const smallImage = new Uint8Array(1024)
const jpeg = { contentType: 'image/jpeg' }

describe('recipe photos', () => {
  it('admin can upload a small image', async () => {
    await assertSucceeds(uploadBytes(ref(admin(), 'recipes/r1/a.jpg'), smallImage, jpeg))
    await assertSucceeds(
      uploadBytes(ref(admin(), 'recipes/r1/b.webp'), smallImage, { contentType: 'image/webp' }),
    )
  })

  it('anyone can view recipe photos', async () => {
    await uploadBytes(ref(admin(), 'recipes/r1/view.jpg'), smallImage, jpeg)
    await assertSucceeds(getBytes(ref(anon(), 'recipes/r1/view.jpg')))
  })

  it('visitors and non-admins cannot upload', async () => {
    await assertFails(uploadBytes(ref(anon(), 'recipes/r1/x.jpg'), smallImage, jpeg))
    await assertFails(uploadBytes(ref(user(), 'recipes/r1/x.jpg'), smallImage, jpeg))
  })

  it('rejects non-images', async () => {
    await assertFails(
      uploadBytes(ref(admin(), 'recipes/r1/x.html'), smallImage, { contentType: 'text/html' }),
    )
    await assertFails(
      uploadBytes(ref(admin(), 'recipes/r1/x.svg'), smallImage, { contentType: 'image/svg+xml' }),
    )
  })

  it('rejects files of 2 MB or more', async () => {
    const big = new Uint8Array(2 * 1024 * 1024)
    await assertFails(uploadBytes(ref(admin(), 'recipes/r1/big.jpg'), big, jpeg))
  })

  it('only admin can delete', async () => {
    await uploadBytes(ref(admin(), 'recipes/r1/del.jpg'), smallImage, jpeg)
    await assertFails(deleteObject(ref(user(), 'recipes/r1/del.jpg')))
    await assertSucceeds(deleteObject(ref(admin(), 'recipes/r1/del.jpg')))
  })
})

describe('default deny', () => {
  it('blocks other paths for everyone', async () => {
    await assertFails(getBytes(ref(anon(), 'anything/file.jpg')))
    await assertFails(uploadBytes(ref(admin(), 'anything/file.jpg'), smallImage, jpeg))
  })
})
