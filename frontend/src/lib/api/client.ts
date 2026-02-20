const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new ApiError(res.status, json.error || text);
    } catch {
      throw new ApiError(res.status, text || 'Request failed');
    }
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {} as T;
}

export const apiClient = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      credentials: 'include',
    });
    return handleResponse<T>(res);
  },

  post: async <T>(url: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    return handleResponse<T>(res);
  },

  del: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<T>(res);
  },
};
