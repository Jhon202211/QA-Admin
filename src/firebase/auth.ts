import { auth } from './config';
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

const REMEMBERED_EMAIL_KEY = 'qa_remembered_email';

/** Firebase renueva automáticamente el ID token; esto ayuda al reanudar pestañas suspendidas. */
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000;
const ACTIVITY_REFRESH_THROTTLE_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_RETRY_DELAY_MS = 1500;

const TRANSIENT_AUTH_ERROR_CODES = new Set([
  'auth/network-request-failed',
  'auth/too-many-requests',
  'unavailable',
  'deadline-exceeded',
]);

const INVALID_SESSION_ERROR_CODES = new Set([
  'auth/id-token-expired',
  'auth/invalid-user-token',
  'auth/user-disabled',
  'auth/user-token-expired',
]);

const getErrorCode = (error: unknown): string | undefined =>
  (error as { code?: string } | null)?.code;

const isTransientAuthError = (error: unknown): boolean =>
  TRANSIENT_AUTH_ERROR_CODES.has(getErrorCode(error) ?? '');

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

/**
 * Obtiene un token vigente y reintenta únicamente fallos transitorios.
 * El refresh token permanece bajo control del SDK de Firebase.
 */
async function refreshCurrentUserToken(force = false, retries = 0): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay una sesión de Firebase activa');
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      await user.getIdToken(force);
      return;
    } catch (error) {
      if (!isTransientAuthError(error) || attempt >= retries) {
        throw error;
      }
      await wait(TOKEN_REFRESH_RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

/** Verifica si hay borradores activos (ejecuciones o casos en construcción). */
export function hasActiveExecutionDrafts(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('execution_draft_') || key.startsWith('test_case_draft_'))
      ) {
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
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('[Auth] No se pudo habilitar la persistencia local:', error);
  });

  let lastActivityRefresh = 0;

  const refresh = (force = false) => {
    if (!auth.currentUser) return;
    refreshCurrentUserToken(force, force ? 1 : 0).catch((error) => {
      // No cerrar sesión por un fallo en segundo plano. checkAuth/checkError decidirán
      // cuando una operación autenticada necesite realmente el token.
      console.warn('[Auth] No se pudo renovar el token en segundo plano:', getErrorCode(error) ?? error);
    });
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

  const onOnline = () => refresh(true);

  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasActiveExecutionDrafts()) {
      e.preventDefault();
      e.returnValue = 'Tienes borradores pendientes. Los cambios no guardados se mantendrán localmente.';
      return e.returnValue;
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onActivity);
  window.addEventListener('online', onOnline);
  window.addEventListener('mousemove', onActivity, { passive: true });
  window.addEventListener('keydown', onActivity);
  window.addEventListener('beforeunload', onBeforeUnload);
  const intervalId = window.setInterval(() => refresh(false), TOKEN_REFRESH_INTERVAL_MS);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onActivity);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('mousemove', onActivity);
    window.removeEventListener('keydown', onActivity);
    window.removeEventListener('beforeunload', onBeforeUnload);
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
  checkError: async (error: unknown) => {
    const status = (error as { status?: number })?.status;
    const code = getErrorCode(error);

    // Una regla o rol insuficiente no significa que la sesión haya expirado.
    if (status === 403 || code === 'permission-denied') {
      return;
    }

    const mayBeExpired = status === 401 || code === 'unauthenticated' ||
      INVALID_SESSION_ERROR_CODES.has(code ?? '');
    if (!mayBeExpired) {
      return;
    }

    await auth.authStateReady().catch(() => undefined);
    if (!auth.currentUser) {
      return Promise.reject();
    }

    try {
      // Antes de expulsar al usuario, comprobar si Firebase puede renovar la sesión.
      await refreshCurrentUserToken(true, 1);
      return;
    } catch (refreshError) {
      // Una caída de red no debe destruir una sesión persistida que puede recuperarse.
      if (isTransientAuthError(refreshError)) {
        console.warn('[Auth] La sesión no pudo verificarse por un problema temporal de red.');
        return;
      }
      return Promise.reject(refreshError);
    }
  },
  checkAuth: async () => {
    try {
      // authStateReady() es la forma más robusta de esperar a que Firebase inicialice el estado de auth
      // desde IndexedDB (persistencia local).
      await auth.authStateReady();
      
      if (!auth.currentUser) {
        return Promise.reject();
      }

      try {
        await refreshCurrentUserToken(false, 1);
      } catch (error) {
        if (INVALID_SESSION_ERROR_CODES.has(getErrorCode(error) ?? '')) {
          return Promise.reject(error);
        }
        // Mantener la sesión local ante red inestable; Firestore podrá reintentar después.
        console.warn('[Auth] No se pudo verificar la sesión temporalmente:', getErrorCode(error) ?? error);
      }
      return;
    } catch (error) {
      if (auth.currentUser && !INVALID_SESSION_ERROR_CODES.has(getErrorCode(error) ?? '')) {
        return;
      }
      return Promise.reject(error);
    }
  },
  getPermissions: () => Promise.resolve(),
}; 