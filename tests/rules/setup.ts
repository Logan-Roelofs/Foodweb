import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'

export const PROJECT_ID = 'demo-foodweb'
export const BUCKET = `gs://${PROJECT_ID}.appspot.com`

/** Starts a test environment wired to the running emulators with our real rules files. */
export function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
}
