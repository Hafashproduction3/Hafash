'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Track the current path to detect changes during render
  const lastPath = useRef<string | null>(null);
  const currentPath = docRef?.path ?? null;

  // Immediately reset state if the path changes to avoid "stale state" render frames
  if (currentPath !== lastPath.current) {
    lastPath.current = currentPath;
    setData(null);
    setError(null);
    setLoading(!!docRef);
  }

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setError(null);
      setLoading(false);
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
  }, [currentPath]);

  return { data, loading, error };
}
