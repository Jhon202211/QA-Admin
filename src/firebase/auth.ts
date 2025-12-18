import { auth } from './config';
import { signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';

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
      // Configurar persistencia antes de verificar
      await setPersistence(auth, browserLocalPersistence);
      
      // Esperar a que Firebase inicialice completamente y verificar estado de autenticación
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          if (user) {
            resolve(undefined);
          } else {
            reject();
          }
        });
        
        // Timeout de seguridad
        setTimeout(() => {
          unsubscribe();
          if (auth.currentUser) {
            resolve(undefined);
          } else {
            reject();
          }
        }, 2000);
      });
    } catch (error) {
      console.error('Error en checkAuth:', error);
      return Promise.reject();
    }
  },
  getPermissions: () => Promise.resolve(),
}; 