import { auth } from './config';
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  onIdTokenChanged,
} from 'firebase/auth';

const REMEMBERED_EMAIL_KEY = 'qa_remembered_email';

/** Tiempo máximo de espera a que Firebase restaure la sesión desde IndexedDB (p. ej. tras dormir el equipo). */
const CHECK_AUTH_MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutos

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
  checkError: ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: async () => {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(false).catch(() => {
        /* No cerrar sesión por fallos transitorios de red; Firestore reportará si realmente no hay acceso. */
      });
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const finish = (user: any) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        clearTimeout(timer);
        if (user) resolve();
        else {
          reject();
        }
      };

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        finish(user);
      });

      const timer = setTimeout(() => {
        if (settled) return;
        // Tras dormir el equipo o IndexedDB lento, a veces currentUser aparece después del primer evento
        if (auth.currentUser) {
          finish(auth.currentUser);
        } else {
          finish(null);
        }
      }, CHECK_AUTH_MAX_WAIT_MS);
    });
  },
  getPermissions: () => Promise.resolve(),
}; 