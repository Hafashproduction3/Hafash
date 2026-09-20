/**
 * Hafash — IndexedDB storage for pending upload files.
 * Files survive page reload, browser close, and light outages.
 */

const DB_NAME = 'hafash-uploads';
const STORE_NAME = 'pending-files';
const DB_VERSION = 1;

export interface StoredFileItem {
  id: string;                    // `${galleryId}_${fileId}`
  galleryId: string;
  fileId: string;
  name: string;
  size: number;
  type: string;
  fileBlob: Blob;                // The actual File
  status: string;
  progress: number;
  currentStep: string;
  originalReady: boolean;
  previewSize?: number;
  thumbSize?: number;
  addedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('galleryId', 'galleryId', { unique: false });
      }
    };
  });
}

/**
 * Save a single file to IndexedDB
 */
export async function savePendingFile(galleryId: string, item: {
  fileId: string;
  file: File;
  name: string;
  size: number;
  status: string;
  progress: number;
  currentStep: string;
  originalReady: boolean;
}): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredFileItem = {
        id: `${galleryId}_${item.fileId}`,
        galleryId,
        fileId: item.fileId,
        name: item.name,
        size: item.size,
        type: item.file.type,
        fileBlob: item.file,
        status: item.status,
        progress: item.progress,
        currentStep: item.currentStep,
        originalReady: item.originalReady,
        addedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] savePendingFile failed:', e);
  }
}

/**
 * Load all pending files for a gallery
 */
export async function loadPendingFiles(galleryId: string): Promise<StoredFileItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('galleryId');
      const req = index.getAll(galleryId);
      req.onsuccess = () => {
        const items = req.result || [];
        // Sort by addedAt (oldest first)
        items.sort((a, b) => a.addedAt - b.addedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] loadPendingFiles failed:', e);
    return [];
  }
}

/**
 * Update a single file's status
 */
export async function updatePendingFile(galleryId: string, fileId: string, updates: Partial<StoredFileItem>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const key = `${galleryId}_${fileId}`;
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, ...updates };
          const putReq = store.put(updated);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) {
    console.warn('[IDB] updatePendingFile failed:', e);
  }
}

/**
 * Remove a single file
 */
export async function removePendingFile(galleryId: string, fileId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(`${galleryId}_${fileId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] removePendingFile failed:', e);
  }
}

/**
 * Clear all pending files for a gallery
 */
export async function clearPendingFiles(galleryId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('galleryId');
      const req = index.openCursor(galleryId);
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] clearPendingFiles failed:', e);
  }
}

/**
 * Convert Blob back to File
 */
export function blobToFile(blob: Blob, name: string, type: string): File {
  return new File([blob], name, { type });
}