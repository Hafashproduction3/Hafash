import { admin, adminDb } from '@/lib/firebase-admin';

const SHARD_COUNT = 10;

/**
 * Sharded counter increment — Firestore per-doc 1 write/sec contention avoid karta hai.
 * 5 parallel uploads = 5 different shards = zero contention.
 */
export async function incrementStorageCounter(
  userId: string,
  bytesDelta: number,
  fileDelta: number
): Promise<void> {
  if (!adminDb) return;

  const shard = Math.floor(Math.random() * SHARD_COUNT);
  const shardRef = adminDb
    .collection('users')
    .doc(userId)
    .collection('storageShards')
    .doc(`shard_${shard}`);

  await shardRef.set(
    {
      bytes: admin.firestore.FieldValue.increment(bytesDelta),
      files: admin.firestore.FieldValue.increment(fileDelta),
    },
    { merge: true }
  );
}

/**
 * Sharded counter read — 10 reads O(1), koi photo scan nahi.
 */
export async function getShardedStorage(
  userId: string
): Promise<{ bytes: number; files: number }> {
  if (!adminDb) return { bytes: 0, files: 0 };

  const snap = await adminDb
    .collection('users')
    .doc(userId)
    .collection('storageShards')
    .get();

  let bytes = 0;
  let files = 0;

  snap.docs.forEach((d) => {
    bytes += Number(d.data().bytes) || 0;
    files += Number(d.data().files) || 0;
  });

  return { bytes, files };
}

/**
 * One-time migration — purana data scan karke shard_0 mein seed.
 * Sirf pehli baar chalega, phir flag `storageMigratedAt` set ho jata hai.
 */
export async function migrateUserStorageShards(
  userId: string
): Promise<{ bytes: number; files: number }> {
  if (!adminDb) return { bytes: 0, files: 0 };

  const galleriesSnap = await adminDb
    .collection('galleries')
    .where('userId', '==', userId)
    .get();

  let bytes = 0;
  let files = 0;

  await Promise.all(
    galleriesSnap.docs.map(async (g) => {
      try {
        const photosSnap = await adminDb!
          .collection('galleries')
          .doc(g.id)
          .collection('photos')
          .get();

        photosSnap.docs.forEach((p) => {
          const photo = p.data();
          const size =
            Number(photo.originalSize) ||
            Number(photo.fileSize) ||
            5 * 1024 * 1024;
          bytes += size;
          files++;
        });
      } catch {
        // Skip failed gallery
      }
    })
  );

  // Seed shard_0 with total
  await adminDb
    .collection('users')
    .doc(userId)
    .collection('storageShards')
    .doc('shard_0')
    .set({ bytes, files }, { merge: true });

  await adminDb
    .collection('users')
    .doc(userId)
    .update({
      storageUsedBytes: bytes,
      storageFileCount: files,
      galleryCount: galleriesSnap.size,
      storageMigratedAt: new Date().toISOString(),
    })
    .catch(() => {});

  return { bytes, files };
}