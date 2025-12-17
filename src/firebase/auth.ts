import { auth } from './config';
import { signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';

export const authProvider = {
  login: async ({ username, password }: { username: string; password: string }) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, username, password);
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
    try {
      // Esperar a que Firebase inicialice completamente
      await new Promise(resolve => setTimeout(resolve, 100));
      return auth.currentUser ? Promise.resolve() : Promise.reject();
    } catch (error) {
      console.error('Error en checkAuth:', error);
      return Promise.reject();
    }
  },
  getPermissions: () => Promise.resolve(),
}; 