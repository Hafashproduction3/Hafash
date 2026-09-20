'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services and returns the instances.
 * 
 * ⚡ Performance optimizations:
 * - ✅ Persistent cache (IndexedDB) — 2nd visit instant
 * - ✅ Multi-tab manager — multiple tabs share cache
 * - ✅ NO long-polling in production — WebSocket is faster
 * - ⚠️ Fallback to long-polling only in Firebase Studio dev env
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
} {
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  const auth = getAuth(firebaseApp);

  // ⚡ Detect if we're in a development workstation
  const isDevEnv = 
    typeof window !== 'undefined' && 
    (window.location.hostname.includes('cloudworkstations.dev') ||
     window.location.hostname.includes('firebase-studio'));

  let firestore: Firestore;
  try {
    // ⚡ Production: Fast WebSocket + Persistent Cache
    // Dev: Long-polling (needed for Firebase Studio)
    firestore = initializeFirestore(firebaseApp, {
      // ✅ Cache: Data survives page reload — 2nd visit instant
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      // ⚠️ Only force long-polling in dev workstation
      ...(isDevEnv ? { experimentalForceLongPolling: true } : {}),
    });
    
    console.info(
      `[FIREBASE] Firestore initialized: ${isDevEnv ? 'long-polling (dev)' : 'WebSocket + Cache (fast)'}`
    );
  } catch (e: any) {
    // Already initialized — fallback
    console.warn('[FIREBASE] Firestore fallback:', e.message);
    firestore = getFirestore(firebaseApp);
  }

  const storage = getStorage(firebaseApp);

  return { firebaseApp, firestore, auth, storage };
}