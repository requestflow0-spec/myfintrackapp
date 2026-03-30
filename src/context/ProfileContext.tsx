
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, Dispatch, SetStateAction } from 'react';
import type { WithId } from '@/firebase';
import type { UserProfile } from '@/lib/types';

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
