'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData,
  FirestoreError
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to listen to a single Firestore document.
 * Optimized for performance by removing diagnostic overhead.
 */
export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

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
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
          setError(new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          }));
        } else {
          setError(err);
        }
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef?.path]);

  return { data, loading, error };
}
