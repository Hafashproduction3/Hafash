"use client";

import { initializeFirebase } from '@/firebase/init';

/**
 * Standard client-side Firebase instances.
 * Uses the project's central initialization logic which handles 
 * connectivity fixes for the studio environment.
 */
const { firebaseApp, firestore, auth } = initializeFirebase();

export { firebaseApp as app, firestore as db, auth };
