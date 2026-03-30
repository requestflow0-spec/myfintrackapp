'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, or the user is anonymous, redirect to login.
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // While loading, or if user is not yet available/validated, show a loading screen.
  if (isUserLoading || !user || user.isAnonymous) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
              <p>Loading Your Financial Dashboard...</p>
              <div className="w-64">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
