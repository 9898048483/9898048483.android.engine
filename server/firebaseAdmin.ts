import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with the mock Project ID used across the app
if (!getApps().length) {
  initializeApp({
    projectId: "gen-lang-client-0143524620", 
  });
}

const app = getApp();
export const adminDb = getFirestore(app, "ai-studio-aisecurespaceand-ae6c68b6-6da7-43dd-b409-11e8f98eb1ed");
