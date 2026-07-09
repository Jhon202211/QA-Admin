import { apiUrl } from '../config/api';

interface DataItem {
  id: string;
  [key: string]: unknown;
}

interface ListParams {
  filter?: Record<string, unknown>;
  sort?: { field: string; order?: 'ASC' | 'DESC' };
  pagination?: { page: number; perPage: number };
}

interface IdParams {
  id: string | number;
}

interface IdsParams {
  ids: Array<string | number>;
}

interface DataParams {
  data: unknown;
  previousData?: unknown;
}

interface ReferenceParams {
  target: string;
  id: string | number;
}

interface HttpDataProvider {
  getList: (resource: string, params?: ListParams) => Promise<{ data: unknown[]; total: number }>;
  getOne: (resource: string, params: IdParams) => Promise<{ data: unknown }>;
  getMany: (resource: string, params: IdsParams) => Promise<{ data: unknown[] }>;
  create: (resource: string, params: DataParams) => Promise<{ data: unknown }>;
  update: (resource: string, params: IdParams & DataParams) => Promise<{ data: unknown }>;
  delete: (resource: string, params: IdParams) => Promise<{ data: unknown }>;
  deleteMany: (resource: string, params: IdsParams) => Promise<{ data: Array<string | number> }>;
  updateMany: (resource: string, params: IdsParams & DataParams) => Promise<{ data: Array<string | number> }>;
  getManyReference: (resource: string, params: ReferenceParams) => Promise<{ data: unknown[]; total: number }>;
}

const convertServerDates = (data: DataItem): DataItem => {
  if (!data) return data;
  
  const newData = { ...data };
  Object.keys(newData).forEach(key => {
    if (key === 'date' && typeof newData[key] === 'string') {
      newData[key] = new Date(newData[key]);
    }
  });
  return newData;
};

const request = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(apiUrl(url), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Error HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
};

const queryString = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, JSON.stringify(value));
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
};

export const dataProvider: HttpDataProvider = {
  getList: async (resource, params = {}) => {
    const result = await request<{ data: DataItem[]; total: number }>(
      `/api/data/${resource}${queryString({
        filter: params.filter,
        sort: params.sort,
        pagination: params.pagination,
      })}`
    );

    return {
      data: result.data.map(convertServerDates),
      total: result.total,
    };
  },

  getOne: async (resource, params) => {
    const result = await request<{ data: DataItem }>(`/api/data/${resource}/${encodeURIComponent(params.id)}`);
    return { data: convertServerDates(result.data) };
  },

  getMany: async (resource, params) => {
    const result = await request<{ data: DataItem[] }>(`/api/data/${resource}/getMany`, {
      method: 'POST',
      body: JSON.stringify({ ids: params.ids }),
    });

    return { data: result.data.map(convertServerDates) };
  },

  create: async (resource, params) => {
    const result = await request<{ data: DataItem }>(`/api/data/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    });

    return { data: convertServerDates(result.data) };
  },

  update: async (resource, params) => {
    const result = await request<{ data: DataItem }>(`/api/data/${resource}/${encodeURIComponent(params.id)}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    });

    return { data: convertServerDates(result.data) };
  },

  delete: async (resource, params) => {
    const result = await request<{ data: DataItem }>(`/api/data/${resource}/${encodeURIComponent(params.id)}`, {
      method: 'DELETE',
    });

    return { data: result.data };
  },

  deleteMany: async (resource, params) => {
    const result = await request<{ data: Array<string | number> }>(`/api/data/${resource}/deleteMany`, {
      method: 'POST',
      body: JSON.stringify({ ids: params.ids }),
    });

    return { data: result.data };
  },

  updateMany: async (resource, params) => {
    const result = await request<{ data: Array<string | number> }>(`/api/data/${resource}/updateMany`, {
      method: 'POST',
      body: JSON.stringify({ ids: params.ids, data: params.data }),
    });

    return { data: result.data };
  },

  getManyReference: async (resource, params) => {
    const result = await request<{ data: DataItem[]; total: number }>(`/api/data/${resource}/getManyReference`, {
      method: 'POST',
      body: JSON.stringify({ target: params.target, id: params.id }),
    });

    return {
      data: result.data.map(convertServerDates),
      total: result.total,
    };
  },
};
