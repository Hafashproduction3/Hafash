import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK Initialization
 * 
 * In production (e.g. Vercel), we use environment variables for security and CI/CD compatibility.
 * For local development, we attempt to fallback to serviceaccount.json.
 */
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || "hafash-pk";

  if (privateKey && clientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Handle escaped newlines in the private key string
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e: any) {
      console.error("Firebase Admin: Initialization with environment variables failed.", e.message);
    }
  } else {
    try {
      // Dynamic require to prevent build-time errors if the file is missing in production
      const serviceAccount = require('./serviceaccount.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.warn("Firebase Admin: No environment variables or serviceaccount.json found. Server-side database operations will fail.");
    }
  }
}

/**
 * Export the Firestore instance.
 * We use a conditional check to prevent module-level crashes if initialization failed.
 * Consumers (like Server Actions) should handle the case where this might be null.
 */
export const adminDb = (admin.apps.length ? admin.firestore() : null) as admin.firestore.Firestore;
