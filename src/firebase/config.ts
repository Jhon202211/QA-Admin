import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Defensive trim in case env values contain accidental spaces.
  apiKey:            (import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain:        (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId:         (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket:     (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
  appId:             (import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim(),
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app); 