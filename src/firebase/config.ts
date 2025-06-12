import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Aquí irán tus credenciales de Firebase
  apiKey: "AIzaSyB8H3gWbDRUYXiavFc0VTBUvpRVAsR0DTs",
  authDomain: "qa-admin-3a67e.firebaseapp.com",
  projectId: "qa-admin-3a67e",
  storageBucket: "qa-admin-3a67e.firebasestorage.app",
  messagingSenderId: "680733125573",
  appId: "1:680733125573:web:9c2064b2b1dec88b9a79ac"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 