'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'; 
import { 
  initializeFirestore, 
  getFirestore, 
  Firestore,
  memoryLocalCache,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

/**
 * ⚠️ FIX: Firestore mutations localStorage save karta hai.
 * Agar localStorage full ho jaye → QuotaExceededError.
 * 
 * Solution: localStorage ko override karke in-memory store use karein.
 * Firestore ko lagega localStorage available hai — lekin actual mein
 * memory use hogi (NO quota limit).
 */
if (typeof window !== 'undefined') {
  try {
    // Test: kya localStorage kaam kar raha hai?
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
  } catch {
    // ❌ localStorage full hai — memory store use karein
    const memoryStore: Record<string, string> = {};
    const memoryStorage = {
      getItem: (key: string) => memoryStore[key] ?? null,
      setItem: (key: string, value: string) => { memoryStore[key] = value; },
      removeItem: (key: string) => { delete memoryStore[key]; },
      clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
      key: (i: number) => Object.keys(memoryStore)[i] ?? null,
      get length() { return Object.keys(memoryStore).length; },
    };

    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage,
      writable: false,
      configurable: true,
    });

    console.warn('[FIREBASE] localStorage full → memory store use ho raha hai');
  }
}

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
} {
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  const auth = getAuth(firebaseApp);

  const isDevEnv = 
    typeof window !== 'undefined' && 
    (window.location.hostname.includes('cloudworkstations.dev') ||
     window.location.hostname.includes('firebase-studio'));

  let firestore: Firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
      ...(isDevEnv ? { experimentalForceLongPolling: true } : {}),
    });
    
    console.info(
      `[FIREBASE] Firestore initialized: ${isDevEnv ? 'long-polling (dev)' : 'WebSocket + Memory Cache'}`
    );
  } catch (e: any) {
    console.warn('[FIREBASE] Firestore fallback:', e.message);
    firestore = getFirestore(firebaseApp);
  }

  const storage = getStorage(firebaseApp);

  return { firebaseApp, firestore, auth, storage };
}