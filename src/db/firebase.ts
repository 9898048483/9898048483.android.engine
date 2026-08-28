import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFZjNsnJaX4-K4mur6PnrkXLk9ZwMJmoQ",
  authDomain: "gen-lang-client-0143524620.firebaseapp.com",
  projectId: "gen-lang-client-0143524620",
  storageBucket: "gen-lang-client-0143524620.firebasestorage.app",
  messagingSenderId: "179708014113",
  appId: "1:179708014113:web:0f17bf93bc89406ac33d60"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
