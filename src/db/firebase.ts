import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFZjNsnJaX4-K4mur6PnrkXLk9ZwMJmoQ",
  authDomain: "gen-lang-client-0143524620.firebaseapp.com",
  projectId: "gen-lang-client-0143524620",
  storageBucket: "gen-lang-client-0143524620.firebasestorage.app",
  messagingSenderId: "179708014113",
  appId: "1:179708014113:web:0f17bf93bc89406ac33d60",
  firestoreDatabaseId: "ai-studio-aisecurespaceand-ae6c68b6-6da7-43dd-b409-11e8f98eb1ed"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
