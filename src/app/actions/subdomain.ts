'use server';

import { adminDb } from '@/lib/firebase-admin';
import { validateSubdomain } from '@/lib/subdomain';

/**
 * Check if subdomain is available
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{
  available: boolean;
  error?: string;
}> {
  if (!adminDb) {
    return { available: false, error: 'DB offline' };
  }

  const validation = validateSubdomain(subdomain);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }

  try {
    const snapshot = await adminDb
      .collection('users')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return { available: false, error: 'Yeh subdomain already taken hai' };
    }

    return { available: true };
  } catch (error: any) {
    return { available: false, error: error.message };
  }
}

/**
 * Reserve subdomain on signup (with number suffix if taken)
 */
export async function reserveSubdomain(
  userId: string,
  studioName: string
): Promise<{
  success: boolean;
  subdomain?: string;
  error?: string;
}> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const baseSubdomain = studioName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);

    if (!baseSubdomain || baseSubdomain.length < 3) {
      return { success: false, error: 'Studio name se valid subdomain nahi ban sakta' };
    }

    // Try base subdomain first, then add numbers
    let finalSubdomain = baseSubdomain;
    let counter = 1;

    while (counter < 100) {
      const validation = validateSubdomain(finalSubdomain);
      if (validation.valid) {
        const snapshot = await adminDb
          .collection('users')
          .where('subdomain', '==', finalSubdomain)
          .limit(1)
          .get();

        if (snapshot.empty) {
          break;
        }
      }

      // Try with number
      counter++;
      finalSubdomain = `${baseSubdomain}${counter}`;
    }

    if (counter >= 100) {
      return { success: false, error: 'Subdomain generate nahi ho saka' };
    }

    await adminDb.collection('users').doc(userId).update({
      subdomain: finalSubdomain,
      subdomainReservedAt: new Date().toISOString(),
    });

    return { success: true, subdomain: finalSubdomain };
  } catch (error: any) {
    console.error('[RESERVE_SUBDOMAIN]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update subdomain (from settings)
 */
export async function updateSubdomain(
  userId: string,
  newSubdomain: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  const validation = validateSubdomain(newSubdomain);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Check if taken by another user
    const snapshot = await adminDb
      .collection('users')
      .where('subdomain', '==', newSubdomain)
      .limit(1)
      .get();

    if (!snapshot.empty && snapshot.docs[0].id !== userId) {
      return { success: false, error: 'Yeh subdomain already taken hai' };
    }

    // Get current user to track history
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data() || {};

    await adminDb.collection('users').doc(userId).update({
      subdomain: newSubdomain,
      previousSubdomain: userData.subdomain || null,
      subdomainUpdatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[UPDATE_SUBDOMAIN]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get photographer by subdomain (public lookup)
 */
export async function getPhotographerBySubdomain(subdomain: string): Promise<{
  success: boolean;
  photographer?: any;
  error?: string;
}> {
  if (!adminDb) {
    return { success: false, error: 'DB offline' };
  }

  try {
    const snapshot = await adminDb
      .collection('users')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'Photographer not found' };
    }

    const data = snapshot.docs[0].data();

    return {
      success: true,
      photographer: {
        userId: snapshot.docs[0].id,
        studioName: data.studioName || '',
        photographerName: data.photographerName || '',
        studioLogo: data.studioLogo || '',
        studioBanner: data.studioBanner || '',
        whatsappNumber: data.whatsappNumber || '',
        instagramLink: data.instagramLink || '',
        tagline: data.tagline || '',
        about: data.about || '',
        city: data.city || '',
        planId: data.planId || 'starter',
        subdomain: data.subdomain,
      },
    };
  } catch (error: any) {
    console.error('[GET_BY_SUBDOMAIN]', error);
    return { success: false, error: error.message };
  }
}