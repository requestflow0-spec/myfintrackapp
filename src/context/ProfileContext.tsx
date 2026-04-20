
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, Dispatch, SetStateAction, useEffect } from 'react';
import type { WithId } from '@/appwrite';
import { useDatabases, useUser } from '@/appwrite';
import { appwriteConfig } from '@/appwrite/config';
import { Query, ID } from 'appwrite';
import type { UserProfile } from '@/lib/types';
import { processRecurringTransactions } from '@/lib/recurring-scheduler';

interface ProfileContextType {
  currentProfile: WithId<UserProfile> | null;
  setCurrentProfile: Dispatch<SetStateAction<WithId<UserProfile> | null>>;
  profiles: WithId<UserProfile>[] | null;
  setProfiles: Dispatch<SetStateAction<WithId<UserProfile>[] | null>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfile] = useState<WithId<UserProfile> | null>(null);
  const [profiles, setProfiles] = useState<WithId<UserProfile>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const databases = useDatabases();
  const { user, isUserLoading: isAuthLoading } = useUser();

  useEffect(() => {
    async function initializeUserAndProfile() {
      if (isAuthLoading || !user || !databases) {
        if (!isAuthLoading && !user) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const profilesSnap = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.collections.userProfiles,
          [Query.equal('userId', user.uid)]
        );

        let activeProfiles = profilesSnap.documents.map(d => ({ ...d, id: d.$id })) as unknown as WithId<UserProfile>[];

        if (activeProfiles.length === 0) {
          console.log("[ProfileContext] Creating default profile...");
          const newDoc = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.userProfiles,
            ID.unique(),
            {
              userId: user.uid,
              name: "Personal",
              currency: "USD",
              expenseCategories: ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Others'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
          activeProfiles = [{ ...newDoc, id: newDoc.$id }] as unknown as WithId<UserProfile>[];
        }

        setProfiles(activeProfiles);
        
        // Auto-select the first or previously active profile to jumpstart the UI
        const savedProfileId = typeof window !== 'undefined' ? localStorage.getItem('fintrack_active_profile') : null;
        const selected = activeProfiles.find(p => p.id === savedProfileId) || activeProfiles[0];
        setCurrentProfile(selected);
        
      } catch (error) {
        console.error("[ProfileContext] Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeUserAndProfile();
  }, [user, isAuthLoading, databases]);

  useEffect(() => {
    if (currentProfile?.userId && currentProfile?.id && databases) {
      processRecurringTransactions(databases, currentProfile.userId, currentProfile.id).catch(err => {
        console.error("Failed to process recurring transactions:", err);
      });
    }
  }, [currentProfile, databases]);

  const value = useMemo(() => ({
    currentProfile,
    setCurrentProfile,
    profiles,
    setProfiles,
    isLoading,
    setIsLoading,
  }), [currentProfile, profiles, isLoading]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
