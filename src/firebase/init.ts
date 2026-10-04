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

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
} {
  const firebaseApp =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp();

  const auth = getAuth(firebaseApp);

  let firestore: Firestore;

  try {
    firestore = initializeFirestore(firebaseApp, {
      // Memory cache — avoids persistent browser storage issues
      // and lets Firestore use its normal automatic network transport.
      localCache: memoryLocalCache(),
    });

    console.info(
      '[FIREBASE] Firestore initialized: memory cache + automatic network transport'
    );
  } catch (e: any) {
    console.warn('[FIREBASE] Firestore fallback:', e.message);
    firestore = getFirestore(firebaseApp);
  }

  const storage = getStorage(firebaseApp);

  return {
    firebaseApp,
    firestore,
    auth,
    storage,
  };
}