import type { FirebaseApp } from 'firebase/app';
import type { Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let appPromise: Promise<FirebaseApp> | null = null;
let cachedApp: FirebaseApp | null = null;

let messagingPromise: Promise<Messaging | null> | null = null;
let cachedMessaging: Messaging | null = null;

/**
 * Initializes and returns the shared Firebase App instance.
 * Dynamically imports firebase/app to prevent loading it into initial page bundles.
 */
export async function getFirebaseApp(): Promise<FirebaseApp> {
  if (cachedApp) return cachedApp;
  if (appPromise) return appPromise;

  const promise = (async () => {
    try {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      if (getApps().length > 0) {
        cachedApp = getApp();
      } else {
        cachedApp = initializeApp(firebaseConfig);
      }
      return cachedApp;
    } catch (err) {
      appPromise = null;
      throw err;
    }
  })();

  appPromise = promise;
  return promise;
}

/**
 * Returns the Firebase Messaging instance if supported in the current environment (browser).
 * Dynamically imports firebase/messaging on demand.
 * Resets in-flight promise on failure so subsequent retries on navigation or user interaction can succeed.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (cachedMessaging) return cachedMessaging;
  if (messagingPromise) return messagingPromise;

  const promise = (async () => {
    try {
      const { isSupported, getMessaging } = await import('firebase/messaging');
      const supported = await isSupported();
      if (!supported) return null;

      const app = await getFirebaseApp();
      cachedMessaging = getMessaging(app);
      return cachedMessaging;
    } catch (err) {
      console.warn('[Firebase] Messaging not supported or failed to initialize:', err);
      return null;
    } finally {
      // Do not permanently cache null promises: allow future calls to retry if uninitialized
      if (!cachedMessaging) {
        messagingPromise = null;
      }
    }
  })();

  messagingPromise = promise;
  return promise;
}

/**
 * Dynamically imports getToken and retrieves the FCM registration token.
 */
export async function getFcmToken(
  messaging: Messaging,
  options: { serviceWorkerRegistration: ServiceWorkerRegistration; vapidKey: string },
): Promise<string> {
  const { getToken } = await import('firebase/messaging');
  return getToken(messaging, options);
}

