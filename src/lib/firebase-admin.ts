import * as admin from 'firebase-admin';

/**
 * ═══════════════════════════════════════════════════════════════
 * Firebase Admin SDK — Simple Lazy Init (No Proxy)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Proxy use nahi karna — Server Actions mein `this` binding toot jati hai.
 * Direct instance export karo.
 */

function initializeAdmin(): admin.app.App {
  // ✅ Already initialized?
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const projectId = 
    process.env.FIREBASE_PROJECT_ID || 
    process.env.GCP_PROJECT || 
    process.env.GCLOUD_PROJECT || 
    "hafash-pk";

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // ✅ Debug log
  console.log('[FIREBASE_ADMIN] Initializing:', {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    privateKeyLength: privateKey?.length || 0,
  });

  // ✅ Try 1: Service Account
  if (privateKey && clientEmail) {
    try {
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('[FIREBASE_ADMIN] ✅ Initialized with Service Account');
      return app;
    } catch (e: any) {
      console.error('[FIREBASE_ADMIN] ❌ Service Account failed:', e.message);
    }
  }

  // ✅ Try 2: ADC fallback
  try {
    const app = admin.initializeApp({ projectId });
    console.log('[FIREBASE_ADMIN] ✅ Initialized with ADC:', projectId);
    return app;
  } catch (e: any) {
    console.error('[FIREBASE_ADMIN] ❌ ADC failed:', e.message);
    throw new Error(
      'Firebase Admin init failed. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
    );
  }
}

// ✅ Initialize ek baar
const app = initializeAdmin();

// ✅ Direct instance export — NO PROXY
export const adminDb = admin.firestore(app);

// ✅ Admin namespace bhi export
export { admin };