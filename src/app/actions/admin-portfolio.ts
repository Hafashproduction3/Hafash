'use server';

import { adminDb } from '@/lib/firebase-admin';
import { storage } from '@/lib/storage/storage';
import { requestUploadUrl } from './storage';

export async function updatePortfolioData(data: any) {
  if (!adminDb) return { success: false, error: 'DB offline' };

  try {
    await adminDb.collection('portfolio_data').doc('master').set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_PORTFOLIO]', error);
    return { success: false, error: error.message };
  }
}

// 👇 NAYA FUNCTION: Image upload karne ke liye
export async function uploadPortfolioImage({
  userId,
  fileName,
  contentType,
  fileSize,
}: {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  try {
    // Hum storage action ko reuse kar rahe hain
    const res = await requestUploadUrl({
      userId,
      galleryId: "portfolio", // Portfolio bypass
      fileName,
      contentType,
      fileSize,
    });

    return res;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}