import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore'

const env = import.meta.env

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId && config.authDomain)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (firebaseConfigured) {
  app = initializeApp(config)
  auth = getAuth(app)
  db = initializeFirestore(app, { ignoreUndefinedProperties: true })
  if (env.VITE_FIREBASE_EMULATOR === '1') {
    const host = window.location.hostname
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
  }
}

export function getDb(): Firestore {
  if (!db) throw new Error('Firebase chưa được cấu hình.')
  return db
}

export function getAuthOrThrow(): Auth {
  if (!auth) throw new Error('Firebase chưa được cấu hình.')
  return auth
}

export { auth }
