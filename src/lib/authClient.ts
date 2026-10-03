import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { app, useEmulators } from './firebase'

// Imported on demand by auth.tsx so the Auth SDK stays out of the first load.
export * from 'firebase/auth'

export const auth = getAuth(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}
