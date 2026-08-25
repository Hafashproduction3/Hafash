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
    const hookId = Math.random().toString(36).substring(7);
    const path = docRef?.path || 'NULL_REF';
    console.log(`[USE_DOC] [${performance.now()}] [ID:${hookId}] useEffect mounted for path: ${path}`);

    if (!docRef) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<T>) => {
        const timestamp = performance.now();
        console.log(`[USE_DOC] [${timestamp}] [ID:${hookId}] Snapshot received for path: ${path}. Exists: ${snapshot.exists()}`);
        
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id } as T);
        } else {
          setData(null);
        }
        setError(null);
        setLoading(false);
        console.log(`[USE_DOC] [${performance.now()}] [ID:${hookId}] State updated (data exists: ${snapshot.exists()})`);
      },
      async (err: FirestoreError) => {
        console.error(`[USE_DOC] [${performance.now()}] [ID:${hookId}] Error for path: ${path}:`, err);
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          });
          setError(permissionError);
        } else {
          setError(err);
        }
        setData(null);
        setLoading(false);
      }
    );

    return () => {
      console.log(`[USE_DOC] [${performance.now()}] [ID:${hookId}] Unsubscribing from path: ${path}`);
      unsubscribe();
    };
  }, [docRef?.path]);

  return { data, loading, error };
}