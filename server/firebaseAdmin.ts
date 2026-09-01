import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with the mock Project ID used across the app
if (!getApps().length) {
  initializeApp({
    projectId: "gen-lang-client-0143524620", 
  });
}

export const adminDb = getFirestore();
