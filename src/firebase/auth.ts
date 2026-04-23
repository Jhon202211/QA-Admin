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

/** Tiempo máximo de espera a que Firebase restaure la sesión desde IndexedDB (p. ej. tras dormir el equipo). */
const CHECK_AUTH_MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutos

/** Refresco proactivo del ID token (expira ~1h); evita fallos tras mucho tiempo en segundo plano. */
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000; // Reducido a 20 min para mayor seguridad
const EXECUTION_DRAFTS_MODAL_REQUEST_KEY = 'execution_drafts_modal_requested';

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

function notifyExecutionDraftsAvailable() {
  sessionStorage.setItem(EXECUTION_DRAFTS_MODAL_REQUEST_KEY, '1');
  window.dispatchEvent(new CustomEvent('execution-drafts-available'));
}

/**
 * Mantiene el token válido cuando la pestaña vuelve al frente o tras largos periodos inactivos.
 * Firebase renueva solo, pero el throttling del navegador en pestañas ocultas puede retrasarlo.
 */
export function setupAuthSessionMaintenance(): () => void {
  const refresh = () => {
    const user = auth.currentUser;
    if (user) {
      // Forzar refresco del token para extender la sesión de Firebase
      user.getIdToken(true).catch(() => {
        /* red / revocación: siguiente lectura de Firestore o checkAuth lo gestionarán */
      });
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') refresh();
  };

  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasActiveExecutionDrafts()) {
      e.preventDefault();
      e.returnValue = 'Tienes una ejecución de prueba en curso. Si sales ahora, los cambios no guardados se mantendrán solo localmente.';
      return e.returnValue;
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', onBeforeUnload);
  const intervalId = window.setInterval(refresh, TOKEN_REFRESH_INTERVAL_MS);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('beforeunload', onBeforeUnload);
    window.clearInterval(intervalId);
  };
}

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
  logout: async (): Promise<string | false | void> => {
    try {
      if (hasActiveExecutionDrafts()) {
        const confirmLogout = window.confirm(
          'Tienes ejecuciones de prueba pendientes de guardar. ¿Estás seguro de que deseas cerrar sesión?'
        );
        if (!confirmLogout) {
          // Mantener la sesión activa y abrir el modal con los borradores pendientes.
          notifyExecutionDraftsAvailable();
          return Promise.resolve(false);
        }
      }
      await signOut(auth);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  checkError: ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      if (hasActiveExecutionDrafts()) {
        notifyExecutionDraftsAvailable();
      }
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: async () => {
    if (auth.currentUser) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const finish = (user: any) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        clearTimeout(timer);
        if (user) resolve();
        else {
          if (hasActiveExecutionDrafts()) {
            notifyExecutionDraftsAvailable();
          }
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