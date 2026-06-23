'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // In development, we want this to be loud and contextual.
      // Throwing it as an uncaught error will trigger the Next.js error overlay
      // which is ideal for debugging Security Rules.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to perform this action.",
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
