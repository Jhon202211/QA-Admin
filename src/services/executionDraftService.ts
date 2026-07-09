import { getCurrentSessionUser, type SessionUser } from './sessionService';

interface TimestampLike {
  toDate: () => Date;
}

type DraftTimestamp = string | Date | TimestampLike;

export interface ExecutionDraftRecord {
  id: string;
  testCaseId: string;
  userId: string;
  userEmail?: string | null;
  data: Record<string, unknown>;
  updatedAt?: DraftTimestamp;
  createdAt?: DraftTimestamp;
}

const COLLECTION = 'execution_drafts';

const apiJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Error consultando borradores (${response.status})`);
  }

  return response.json();
};

const requireUser = async (): Promise<SessionUser> => {
  const user = await getCurrentSessionUser();
  if (!user) {
    throw new Error('No hay usuario autenticado para guardar el borrador');
  }
  return user;
};

const draftDocId = (userId: string, testCaseId: string) =>
  `${encodeURIComponent(userId)}_${encodeURIComponent(testCaseId)}`;

export const executionDraftService = {
  async save(testCaseId: string, data: Record<string, unknown>) {
    const user = await requireUser();
    const id = draftDocId(user.id, testCaseId);

    await apiJson(`/api/data/${COLLECTION}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        testCaseId,
        userId: user.id,
        userEmail: user.email ?? null,
        data,
      }),
    });
  },

  async get(testCaseId: string): Promise<ExecutionDraftRecord | null> {
    const user = await getCurrentSessionUser();
    if (!user) return null;

    const id = draftDocId(user.id, testCaseId);
    const response = await fetch(`/api/data/${COLLECTION}/${encodeURIComponent(id)}`, {
      credentials: 'include',
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Error consultando borrador (${response.status})`);

    const { data } = (await response.json()) as { data: ExecutionDraftRecord };
    return data;
  },

  async list(): Promise<ExecutionDraftRecord[]> {
    const user = await getCurrentSessionUser();
    if (!user) return [];

    const { data } = await apiJson<{ data: ExecutionDraftRecord[] }>(`/api/data/${COLLECTION}/getManyReference`, {
      method: 'POST',
      body: JSON.stringify({ target: 'userId', id: user.id }),
    });

    return data;
  },

  async remove(testCaseId: string) {
    const user = await getCurrentSessionUser();
    if (!user) return;

    const id = draftDocId(user.id, testCaseId);
    await fetch(`/api/data/${COLLECTION}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  },
};
