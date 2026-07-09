import { apiUrl } from '../config/api';

export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
}

export const getCurrentSessionUser = async (): Promise<SessionUser | null> => {
  const response = await fetch(apiUrl('/auth/me'), {
    credentials: 'include',
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`No se pudo validar la sesión (${response.status})`);
  }

  const { user } = (await response.json()) as { user: SessionUser };
  return user;
};
