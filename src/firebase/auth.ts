import { apiUrl } from '../config/api';

const REMEMBERED_EMAIL_KEY = 'qa_remembered_email';

interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
}

let cachedUser: SessionUser | null = null;

const jsonRequest = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(apiUrl(url), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
};

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

export function setupDraftUnloadWarning(): () => void {
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasActiveExecutionDrafts()) {
      e.preventDefault();
      e.returnValue = 'Tienes borradores de ejecución pendientes. Los cambios no guardados se mantendrán localmente.';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', onBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}

export const authProvider = {
  login: async ({ username, password, remember }: { username: string; password: string; remember?: boolean }) => {
    try {
      const { user } = await jsonRequest<{ user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      cachedUser = user;
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
      await jsonRequest('/auth/logout', { method: 'POST' });
      cachedUser = null;
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  checkError: (error: unknown) => {
    const status = (error as { status?: number })?.status;
    
    if (status === 401 || status === 403) {
      cachedUser = null;
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: async () => {
    try {
      const { user } = await jsonRequest<{ user: SessionUser }>('/auth/me');
      cachedUser = user;
      return Promise.resolve();
    } catch {
      cachedUser = null;
      return Promise.reject();
    }
  },
  getIdentity: async () => {
    if (!cachedUser) {
      const { user } = await jsonRequest<{ user: SessionUser }>('/auth/me');
      cachedUser = user;
    }

    return {
      id: cachedUser.id,
      fullName: cachedUser.fullName || cachedUser.email,
    };
  },
  getPermissions: async () => {
    if (!cachedUser) {
      const { user } = await jsonRequest<{ user: SessionUser }>('/auth/me');
      cachedUser = user;
    }

    return cachedUser.role || 'user';
  },
}; 