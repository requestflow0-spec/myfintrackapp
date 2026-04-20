'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { Client, Account, Databases } from 'appwrite';
import { initializeAppwrite } from './config';

interface AppwriteProviderProps {
  children: ReactNode;
}

export interface AppwriteUser {
  $id: string;
  uid: string; // Mapped for backwards compatibility
  name: string;
  email: string;
  displayName: string; // Mapped for backwards compatibility
  photoURL?: string;
  isAnonymous?: boolean;
}

export interface AppwriteContextState {
  client: Client | null;
  databases: Databases | null;
  account: Account | null;
  user: AppwriteUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const AppwriteContext = createContext<AppwriteContextState | undefined>(undefined);

export const AppwriteProvider: React.FC<AppwriteProviderProps> = ({ children }) => {
  const [userState, setUserState] = useState<{
    user: AppwriteUser | null;
    isUserLoading: boolean;
    userError: Error | null;
  }>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const { client, account, databases } = useMemo(() => initializeAppwrite(), []);

  useEffect(() => {
    // Check session on mount
    account.get()
      .then((appwriteUser) => {
        setUserState({
          user: {
            ...appwriteUser,
            uid: appwriteUser.$id,
            displayName: appwriteUser.name,
          },
          isUserLoading: false,
          userError: null,
        });
      })
      .catch((err) => {
        // Appwrite throws 401 if not logged in
        setUserState({
          user: null,
          isUserLoading: false,
          userError: null, // Don't throw for 401s as it just means unauthenticated
        });
      });
  }, [account]);

  const contextValue = useMemo(() => ({
    client,
    account,
    databases,
    user: userState.user,
    isUserLoading: userState.isUserLoading,
    userError: userState.userError,
  }), [client, account, databases, userState]);

  return (
    <AppwriteContext.Provider value={contextValue}>
      {children}
    </AppwriteContext.Provider>
  );
};

export const useAppwrite = () => {
  const context = useContext(AppwriteContext);
  if (context === undefined) {
    throw new Error('useAppwrite must be used within an AppwriteProvider');
  }
  return context;
};

export const useUser = () => {
  const { user, isUserLoading, userError } = useAppwrite();
  return { user, isUserLoading, userError };
};

export const useAccount = () => {
  const { account } = useAppwrite();
  if (!account) throw new Error("Account not initialized");
  return account;
};

export const useAuth = useAccount;

export const useDatabases = () => {
  const { databases } = useAppwrite();
  if (!databases) throw new Error("Databases not initialized");
  return databases;
};

export function useMemoAppwrite<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  return memoized;
}

// Map the old exports for drop-in replacements
export const useFirestore = useDatabases;
export const useMemoFirebase = useMemoAppwrite;
