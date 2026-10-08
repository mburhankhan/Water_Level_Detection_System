// Firebase modular SDK initialization and Demo mode detector
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// If any of the essential Firebase env vars are missing, we run in Demo Mode with mock data
export const isDemoMode = !apiKey || !databaseURL || !projectId;

let primaryApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let rtdbInstance: Database | null = null;

if (!isDemoMode) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain,
      databaseURL,
      projectId,
      appId,
    };

    primaryApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(primaryApp);
    rtdbInstance = getDatabase(primaryApp);
  } catch (err) {
    console.warn('[Firebase Init Warning]', err);
  }
}

export const auth = authInstance;
export const rtdb = rtdbInstance;

// Helper to get a secondary Auth instance for Admin user provisioning
// so the admin does not get logged out when calling createUserWithEmailAndPassword
export function getSecondaryAuth(): Auth | null {
  if (isDemoMode) return null;
  try {
    const secondaryAppName = 'SecondaryUserProvisioningApp';
    const existing = getApps().find((app) => app.name === secondaryAppName);
    const secondaryApp =
      existing ||
      initializeApp(
        {
          apiKey,
          authDomain,
          databaseURL,
          projectId,
          appId,
        },
        secondaryAppName
      );
    return getAuth(secondaryApp);
  } catch (err) {
    console.error('[Secondary Auth Init Error]', err);
    return null;
  }
}
