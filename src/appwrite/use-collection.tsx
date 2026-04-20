'use client';

import { useState, useEffect } from 'react';
import { useDatabases } from './provider';
import { Models } from 'appwrite';
import { appwriteConfig } from './config';

export type WithId<T> = T & { id: string, $id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCollection<T = any>(
    colRef: any | null | undefined,
    queries: string[] = []
): UseCollectionResult<T> {
  const databases = useDatabases();
  const [data, setData] = useState<WithId<T>[] | null>(null);
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
    if (!colRef || !colRef.collectionId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    databases.listDocuments(
      colRef.databaseId || appwriteConfig.databaseId,
      colRef.collectionId,
      queries
    ).then((response) => {
        const results = response.documents.map(doc => ({
            ...doc,
            id: doc.$id
        })) as unknown as WithId<T>[];
        setData(results);
    }).catch(err => {
        setError(err);
    }).finally(() => {
        setIsLoading(false);
    });

  }, [colRef?.path, JSON.stringify(queries), databases, stamp]);

  return { data, isLoading, error, refetch };
}
