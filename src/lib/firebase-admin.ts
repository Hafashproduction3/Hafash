import * as admin from 'firebase-admin';

/**
 * ═══════════════════════════════════════════════════════════════
 * Firebase Admin SDK — Lazy Initialization
 * ═══════════════════════════════════════════════════════════════
 * 
 * Yeh production (Vercel) aur local (Firebase Studio) dono mein kaam karega.
 * 
 * Priority:
 * 1. Service Account env vars (production ke liye)
 * 2. Application Default Credentials (Firebase Studio / GCP ke liye)
 */

let cachedApp: admin.app.App | null = null;
let cachedDb: admin.firestore.Firestore | null = null;

function getAdminApp(): admin.app.App {
  // ✅ Already initialized hai toh wohi return karo
  if (cachedApp) return cachedApp;
  
  if (admin.apps.length > 0 && admin.apps[0]) {
    cachedApp = admin.apps[0];
    return cachedApp;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = 
    process.env.FIREBASE_PROJECT_ID || 
    process.env.GCP_PROJECT || 
    process.env.GCLOUD_PROJECT || 
    "hafash-pk";

  // ✅ Try 1: Service Account credentials (production ke liye)
  if (privateKey && clientEmail) {
    try {
      cachedApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.info("[FIREBASE_ADMIN] ✅ Initialized with Service Account env vars");
      return cachedApp;
    } catch (e: any) {
      console.error("[FIREBASE_ADMIN] ❌ Service Account init failed:", e.message);
    }
  }

  // ✅ Try 2: Application Default Credentials (Firebase Studio ke liye)
  try {
    cachedApp = admin.initializeApp({ projectId });
    console.info("[FIREBASE_ADMIN] ✅ Initialized with ADC for project:", projectId);
    return cachedApp;
  } catch (e: any) {
    console.error("[FIREBASE_ADMIN] ❌ ADC init failed:", e.message);
    throw new Error(
      "Firebase Admin initialization failed. " +
      "Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY environment variables."
    );
  }
}

function getDb(): admin.firestore.Firestore {
  if (cachedDb) return cachedDb;
  const app = getAdminApp();
  cachedDb = admin.firestore(app);
  return cachedDb;
}

/**
 * ✅ adminDb — Proxy object
 * 
 * Yeh Firestore ke saare methods ko forward karta hai lazily.
 * Isse null reference errors nahi aayenge.
 */
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop: string | symbol) {
    const db = getDb();
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});

/**
 * ✅ admin namespace export
 */
export { admin };