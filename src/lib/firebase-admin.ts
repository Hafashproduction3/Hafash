import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK Initialization
 * 
 * In production (e.g. Vercel), we use environment variables for security and CI/CD compatibility.
 * In a Google Cloud environment (like Firebase Studio's Workstation), we can often rely on 
 * Application Default Credentials (ADC).
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
      console.info("Firebase Admin: Initialized with Service Account environment variables.");
    } catch (e: any) {
      console.error("Firebase Admin: Initialization with environment variables failed.", e.message);
    }
  } else {
    try {
      // Try initializing with just the project ID to trigger ADC discovery (Application Default Credentials)
      // This is especially important for Google Cloud Workstations / Firebase Studio environments.
      admin.initializeApp({
        projectId: projectId
      });
      console.info("Firebase Admin: Initialized using Application Default Credentials.");
    } catch (e: any) {
      console.warn("Firebase Admin: Initialization failed. Service Account env vars missing and ADC unavailable.", e.message);
    }
  }
}

/**
 * Export the Firestore instance.
 * We perform the check here to ensure we return a valid instance or null if all init attempts failed.
 */
export const adminDb = (admin.apps.length ? admin.firestore() : null) as admin.firestore.Firestore;
