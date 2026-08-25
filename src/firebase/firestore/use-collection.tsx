'use client';

import { useState, useEffect } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData,
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Hook to listen to a Firestore collection or query.
 * Optimized for performance by removing diagnostic overhead.
 */
export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        
        setData(docs);
        setLoading(false);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          setError(new FirestorePermissionError({
            path: 'collection_query',
            operation: 'list',
          }));
        } else {
          setError(err);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
