import { auth } from './config';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const REMEMBERED_EMAIL_KEY = 'qa_remembered_email';

/** Firebase renueva automáticamente el ID token; esto ayuda al reanudar pestañas suspendidas. */
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000;
const ACTIVITY_REFRESH_THROTTLE_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_RETRY_DELAY_MS = 1500;
const AUTH_GRACE_MS = 5000;

const TRANSIENT_AUTH_ERROR_CODES = new Set([
  'auth/network-request-failed',
  'auth/too-many-requests',
  'unavailable',
  'deadline-exceeded',
]);

const IRRECOVERABLE_SESSION_ERROR_CODES = new Set([
  'auth/invalid-user-token',
  'auth/user-disabled',
  'auth/user-token-expired',
]);

const getErrorCode = (error: unknown): string | undefined =>
  (error as { code?: string } | null)?.code;

const isTransientAuthError = (error: unknown): boolean =>
  TRANSIENT_AUTH_ERROR_CODES.has(getErrorCode(error) ?? '');

const isIrrecoverableSessionError = (error: unknown): boolean =>
  IRRECOVERABLE_SESSION_ERROR_CODES.has(getErrorCode(error) ?? '');

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

export async function refreshAuthToken(force = false, retries = 1): Promise<void> {
  await refreshCurrentUserToken(force, retries);
}

let didCompleteInitialAuth = false;

/**
 * Devuelve el usuario actual, o espera a que Auth se rehidrate tras un freeze.
 * En la primera carga, `authStateReady` ya consultó IndexedDB: un null es definitivo.
 */
export async function ensureCurrentUser(timeoutMs = AUTH_GRACE_MS): Promise<User | null> {
  await auth.authStateReady().catch(() => undefined);

  if (auth.currentUser) {
    didCompleteInitialAuth = true;
    return auth.currentUser;
  }

  if (!didCompleteInitialAuth) {
    didCompleteInitialAuth = true;
    return null;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      window.clearTimeout(timer);
      resolve(user);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) finish(user);
    });

    const timer = window.setTimeout(() => {
      finish(auth.currentUser);
    }, timeoutMs);
  });
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
  let lastActivityRefresh = 0;

  const refresh = () => {
    ensureCurrentUser()
      .then((user) => {
        if (!user) return;
        return refreshCurrentUserToken(false, 0);
      })
      .catch((error) => {
        console.warn('[Auth] No se pudo renovar el token en segundo plano:', getErrorCode(error) ?? error);
      });
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') refresh();
  };

  const onActivity = () => {
    const now = Date.now();
    if (now - lastActivityRefresh < ACTIVITY_REFRESH_THROTTLE_MS) return;
    lastActivityRefresh = now;
    refresh();
  };

  const onOnline = () => refresh();

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
  const intervalId = window.setInterval(() => refresh(), TOKEN_REFRESH_INTERVAL_MS);

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
      // Persistencia la fija initializeAuth; el checkbox solo recuerda el correo.
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
      code === 'auth/id-token-expired' || isIrrecoverableSessionError(error);
    if (!mayBeExpired) {
      return;
    }

    const user = await ensureCurrentUser();
    if (!user) {
      return Promise.reject();
    }

    try {
      await refreshCurrentUserToken(true, 1);
      return;
    } catch (refreshError) {
      if (isTransientAuthError(refreshError)) {
        console.warn('[Auth] La sesión no pudo verificarse por un problema temporal de red.');
        return;
      }
      if (isIrrecoverableSessionError(refreshError)) {
        return Promise.reject(refreshError);
      }
      // Cualquier otro fallo con usuario aún presente no debe expulsar.
      if (auth.currentUser) {
        console.warn('[Auth] No se pudo verificar la sesión temporalmente:', getErrorCode(refreshError) ?? refreshError);
        return;
      }
      return Promise.reject(refreshError);
    }
  },
  checkAuth: async () => {
    try {
      const user = await ensureCurrentUser();
      if (!user) {
        return Promise.reject();
      }

      try {
        await refreshCurrentUserToken(false, 1);
      } catch (error) {
        if (isIrrecoverableSessionError(error)) {
          return Promise.reject(error);
        }
        console.warn('[Auth] No se pudo verificar la sesión temporalmente:', getErrorCode(error) ?? error);
      }
      return;
    } catch (error) {
      if (auth.currentUser && !isIrrecoverableSessionError(error)) {
        return;
      }
      return Promise.reject(error);
    }
  },
  getPermissions: () => Promise.resolve(),
};
