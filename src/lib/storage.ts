import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { app, useEmulators } from './firebase'

// Kept separate from firebase.ts so only the admin area loads the Storage SDK.
export const storage = getStorage(app)

if (useEmulators) {
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
