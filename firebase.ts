import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * 👉 Apna Firebase config yahan paste karo
 * (Firebase Console → Project settings → Your apps → Web app → firebaseConfig).
 * Ye keys secret nahi hoti — suraksha Firestore Rules se aati hai (firestore.rules file dekho).
 */
const firebaseConfig = {
  apiKey: 'PASTE_API_KEY',
  authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID',
}

export const isFirebaseConfigured =
  !firebaseConfig.apiKey.startsWith('PASTE') && !firebaseConfig.projectId.startsWith('PASTE')

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

export { app, auth, db }
