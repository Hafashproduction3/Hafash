'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services and returns the instances.
 * Isolated from index.ts to prevent circular dependencies.
 * 
 * Note: Uses experimentalForceLongPolling to resolve connectivity issues
 * in specialized development environments like Firebase Studio Workstations.
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
} {
  // Ensure we don't initialize multiple times
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // 1. Initialize Auth FIRST. 
  const auth = getAuth(firebaseApp);

  // 2. Initialize Firestore SECOND.
  let firestore: Firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
    console.info("[DEBUG] Firebase Client: Initialized Firestore with long-polling enabled.");
  } catch (e) {
    // If already initialized, fallback to getFirestore
    firestore = getFirestore(firebaseApp);
  }

  const storage = getStorage(firebaseApp);

  return { firebaseApp, firestore, auth, storage };
}
