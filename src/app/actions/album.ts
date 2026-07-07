'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Server Action to resolve a gallery by its secure album link token.
 * 
 * This action uses the Firebase Admin SDK to perform a privileged lookup.
 * It includes robust error handling to catch and report authentication or connection failures.
 */
export async function resolveAlbumByToken(token: string) {
  if (!token) {
    return {
      __debug: true,
      stage: "VALIDATION",
      error: "No token provided",
    };
  }

  if (!adminDb) {
    return {
      __debug: true,
      stage: "INIT_ERROR",
      error: "Firebase Admin is not initialized. Please ensure FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL environment variables are set.",
      token
    };
  }

  try {
    // Perform the high-privilege lookup
    const snapshot = await adminDb
      .collection("galleries")
      .where("albumLinkToken", "==", token)
      .where("albumLinkEnabled", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Diagnostic: If not found, check if the collection even has documents
      const diagnosticSize = (await adminDb.collection("galleries").limit(1).get()).size;
      
      return {
        __debug: true,
        stage: "QUERY_EMPTY",
        token,
        collectionNotEmpty: diagnosticSize > 0,
        message: "No matching active album found for this token."
      };
    }

    // Return the sanitized gallery data
    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
    };

  } catch (error: any) {
    // Capture the specific gRPC/Auth failure details
    console.error("ALBUM_RESOLUTION_FAILURE:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });

    return {
      __debug: true,
      stage: "EXECUTION_ERROR",
      error: error.message || "An unexpected error occurred during database resolution.",
      code: error.code,
      token,
    };
  }
}
