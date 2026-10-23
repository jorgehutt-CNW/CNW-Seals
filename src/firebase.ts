import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Export configuration
export { firebaseConfig };
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
export const FIRESTORE_PROJECT_ID = firebaseConfig.projectId; // 'cnw-seal'

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore on the default database for project cnw-seal
export const db: Firestore = getFirestore(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in or sign up with Google via popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current authenticated user
 */
export async function logOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Validate active connection to Firestore default database (cnw-seal)
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return { connected: true, message: `Connected to default Firestore database on project "${FIRESTORE_PROJECT_ID}".` };
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      return { connected: false, message: 'Firestore client is currently offline. Please check network connectivity.' };
    }
    // Any response from server (even permission-denied) confirms server reachability
    return { connected: true, message: `Connected to project "${FIRESTORE_PROJECT_ID}" (default database).` };
  }
}

export { onAuthStateChanged };
export type { User };
