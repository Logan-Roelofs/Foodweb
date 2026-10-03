import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const env = import.meta.env

export const useEmulators = env.VITE_USE_EMULATORS === 'true'

// With emulators we use a "demo-" project, which never touches real Firebase.
const projectId = useEmulators ? 'demo-foodweb' : env.VITE_FIREBASE_PROJECT_ID

export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: useEmulators ? `${projectId}.firebaseapp.com` : env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: useEmulators ? `${projectId}.appspot.com` : env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const db = getFirestore(app)

if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

// Auth is loaded separately (see authClient.ts) so recipe pages can render
// before the sign-in code arrives. Firestore attaches it once it loads.

/** UI-only admin check, read from firestore.rules at build time (see vite.config.ts). */
export const adminUids: string[] = __ADMIN_UIDS__
