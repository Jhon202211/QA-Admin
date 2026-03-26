import { auth } from './config';
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from 'firebase/auth';

const REMEMBERED_EMAIL_KEY = 'qa_remembered_email';

export const authProvider = {
  login: async ({ username, password, remember }: { username: string; password: string; remember?: boolean }) => {
    try {
      // Persistencia según preferencia: localStorage = sesión permanente, sessionStorage = solo esta pestaña
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, username, password);
      if (remember) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  logout: async () => {
    try {
      await signOut(auth);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  checkError: ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: async () => {
    // Respuesta inmediata si Firebase ya restauró la sesión de forma síncrona
    if (auth.currentUser) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        clearTimeout(timer);
        if (user) resolve();
        else reject();
      });

      // Timeout generoso (10 s) como red de seguridad ante problemas de red
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        reject();
      }, 10000);
    });
  },
  getPermissions: () => Promise.resolve(),
}; 