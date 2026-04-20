'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  console.log("[Firebase] Initializing SDKs...");
  
  if (!getApps().length) {
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
    let firebaseApp;

    // Check for explicit config first
    if (firebaseConfig.apiKey) {
      console.log("[Firebase] Initializing with explicit config for project:", firebaseConfig.projectId);
      try {
        firebaseApp = initializeApp(firebaseConfig);
      } catch (e: any) {
        console.error("[Firebase] Initialization with config failed:", e);
        throw e;
      }
    } else {
      // Fallback to App Hosting implicit config ONLY if no explicit config is provided
      console.log("[Firebase] No explicit config found. Attempting automatic initialization...");
      try {
        firebaseApp = initializeApp();
        console.log("[Firebase] Automatic initialization successful.");
      } catch (e: any) {
        if (!isBuildTime) {
          console.error("[Firebase] Automatic initialization failed and no fallback config found.", e);
        }
        throw e;
      }
    }

    return getSdks(firebaseApp);
  }

  console.log("[Firebase] Using existing application instance.");
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
