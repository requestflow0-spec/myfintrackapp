'use client';

import { useState, useEffect } from 'react';
import { useDatabases } from './provider';
import { appwriteConfig } from './config';
import type { WithId } from './use-collection';

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDoc<T = any>(
  docRef: any | null | undefined
): UseDocResult<T> {
  const databases = useDatabases();
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [stamp, setStamp] = useState(0);

  const refetch = () => setStamp(s => s + 1);

  useEffect(() => {
    const handleRefresh = () => refetch();
    if (typeof window !== 'undefined') window.addEventListener('fintrack-refresh', handleRefresh);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('fintrack-refresh', handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (!docRef || !docRef.documentId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    databases.getDocument(
      docRef.databaseId || appwriteConfig.databaseId,
      docRef.collectionId,
      docRef.documentId
    ).then((doc) => {
        setData({
          ...doc,
          id: doc.$id
        } as unknown as WithId<T>);
    }).catch(err => {
        setError(err);
        setData(null);
    }).finally(() => {
        setIsLoading(false);
    });

  }, [docRef?.path, databases, stamp]);

  return { data, isLoading, error, refetch };
}
