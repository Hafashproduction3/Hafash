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
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || "hafash-pk";

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
      console.info("[DEBUG] Firebase Admin: Initialized with Service Account environment variables.");
    } catch (e: any) {
      console.error("[DEBUG] Firebase Admin: Initialization with environment variables failed.", e.message);
    }
  } else {
    try {
      // Try initializing with just the project ID to trigger ADC discovery
      // This is the primary method for Firebase Studio workstations
      admin.initializeApp({
        projectId: projectId
      });
      console.info(`[DEBUG] Firebase Admin: Initialized using Application Default Credentials (ADC) for project ${projectId}.`);
    } catch (e: any) {
      console.warn("[DEBUG] Firebase Admin: Initialization failed. Service Account env vars missing and ADC unavailable.", e.message);
    }
  }
}

/**
 * Export the Firestore instance and the admin namespace.
 */
export const adminDb = (admin.apps.length ? admin.firestore() : null) as admin.firestore.Firestore;
export { admin };
