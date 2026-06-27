'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData,
  FirestoreError
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to listen to a single Firestore document.
 * Handles loading, data, and permission errors contextualized for the developer.
 */
export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state immediately when the reference changes to prevent stale data display
    setData(null);
    setError(null);
    setLoading(!!docRef);

    if (!docRef) {
      return;
    }

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id } as T);
        } else {
          setData(null);
        }
        setError(null);
        setLoading(false);
      },
      async (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          setError(err);
        }
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef?.path]); // Use path for stable dependency tracking

  return { data, loading, error };
}
