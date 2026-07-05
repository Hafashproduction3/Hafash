import * as admin from 'firebase-admin';
import serviceaccount from './serviceaccount.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceaccount as admin.ServiceAccount),
  });
}

export const adminDb = admin.firestore();