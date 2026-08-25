'use client';

import { useState, useEffect } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to listen to a Firestore collection or query.
 */
export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const hookId = Math.random().toString(36).substring(7);
    console.log(`[USE_COLLECTION] [${performance.now()}] [ID:${hookId}] useEffect mounted/updated. Query null? ${!query}`);

    if (!query) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const timestamp = performance.now();
        console.log(`[USE_COLLECTION] [${timestamp}] [ID:${hookId}] Snapshot received. Count: ${snapshot.size}`);
        
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        
        setData(docs);
        setLoading(false);
        console.log(`[USE_COLLECTION] [${performance.now()}] [ID:${hookId}] State updated with ${docs.length} docs`);
      },
      async (err) => {
        console.error(`[USE_COLLECTION] [${performance.now()}] [ID:${hookId}] Error:`, err);
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: 'collection_query',
            operation: 'list',
          });
          setError(permissionError);
        } else {
          setError(err);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log(`[USE_COLLECTION] [${performance.now()}] [ID:${hookId}] Unsubscribing`);
      unsubscribe();
    };
  }, [query]);

  return { data, loading, error };
}