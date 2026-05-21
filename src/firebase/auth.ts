import { auth } from './config';
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onIdTokenChanged,
} from 'firebase/auth';

const REMEMBERED_EMAIL_KEY = 'qa_remembered_email';

/** Refresco proactivo del ID token (expira ~1h); evita fallos tras mucho tiempo en segundo plano. */
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000; // Reducido a 20 min para mayor seguridad
const ACTIVITY_REFRESH_THROTTLE_MS = 5 * 60 * 1000;

/** Verifica si hay borradores (drafts) activos de ejecuciones de pruebas manuales */
export function hasActiveExecutionDrafts(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('execution_draft_')) {
        return true;
      }
    }
  } catch (e) {
    console.error('Error checking drafts:', e);
  }
  return false;
}

/**
 * Mantiene el token válido cuando la pestaña vuelve al frente o tras largos periodos inactivos.
 * Firebase renueva solo, pero el throttling del navegador en pestañas ocultas puede retrasarlo.
 */
export function setupAuthSessionMaintenance(): () => void {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* Si IndexedDB no está disponible, Firebase usará el fallback posible del navegador. */
  });

  let lastActivityRefresh = 0;

  const refresh = (force = false) => {
    const user = auth.currentUser;
    if (user) {
      user.getIdToken(force).catch(() => {
        /* red / revocación: siguiente lectura de Firestore o checkAuth lo gestionarán */
      });
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') refresh(true);
  };

  const onActivity = () => {
    const now = Date.now();
    if (now - lastActivityRefresh < ACTIVITY_REFRESH_THROTTLE_MS) return;
    lastActivityRefresh = now;
    refresh(false);
  };

  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasActiveExecutionDrafts()) {
      e.preventDefault();
      e.returnValue = 'Tienes borradores de ejecución pendientes. Los cambios no guardados se mantendrán localmente.';
      return e.returnValue;
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onActivity);
  window.addEventListener('online', onActivity);
  window.addEventListener('mousemove', onActivity, { passive: true });
  window.addEventListener('keydown', onActivity);
  window.addEventListener('beforeunload', onBeforeUnload);
  const unsubscribeToken = onIdTokenChanged(auth, (user) => {
    if (user) {
      user.getIdToken(false).catch(() => {});
    }
  });
  const intervalId = window.setInterval(() => refresh(false), TOKEN_REFRESH_INTERVAL_MS);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onActivity);
    window.removeEventListener('online', onActivity);
    window.removeEventListener('mousemove', onActivity);
    window.removeEventListener('keydown', onActivity);
    window.removeEventListener('beforeunload', onBeforeUnload);
    unsubscribeToken();
    window.clearInterval(intervalId);
  };
}

export const authProvider = {
  login: async ({ username, password, remember }: { username: string; password: string; remember?: boolean }) => {
    try {
      // La sesión debe sobrevivir inactividad y nuevas pestañas; el checkbox solo recuerda el correo.
      await setPersistence(auth, browserLocalPersistence);
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
  logout: async (): Promise<string | false | void> => {
    try {
      await signOut(auth);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  checkError: (error: unknown) => {
    const status = (error as { status?: number })?.status;
    const code = (error as { code?: string })?.code;
    
    // Manejar errores de HTTP (react-admin estándar) y de Firebase Firestore
    if (
      status === 401 || 
      status === 403 || 
      code === 'permission-denied' || 
      code === 'unauthenticated' ||
      code === 'auth/user-token-expired'
    ) {
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: async () => {
    try {
      // authStateReady() es la forma más robusta de esperar a que Firebase inicialice el estado de auth
      // desde IndexedDB (persistencia local).
      await auth.authStateReady();
      
      if (auth.currentUser) {
        // Refrescar token en segundo plano si es posible
        auth.currentUser.getIdToken(false).catch(() => {});
        return Promise.resolve();
      }
      return Promise.reject();
    } catch {
      // Fallback en caso de error en la inicialización
      if (auth.currentUser) return Promise.resolve();
      return Promise.reject();
    }
  },
  getPermissions: () => Promise.resolve(),
}; 