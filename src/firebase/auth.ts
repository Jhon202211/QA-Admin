import { auth } from './config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const authProvider = {
  login: async ({ username, password }: { username: string; password: string }) => {
    try {
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
  checkAuth: () => {
    return auth.currentUser ? Promise.resolve() : Promise.reject();
  },
  getPermissions: () => Promise.resolve(),
}; 