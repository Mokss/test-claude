import { useAuthStore } from '../store/auth.ts';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;

  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'UNKNOWN', data.message ?? res.statusText);
  }

  return data as T;
}

export function get<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function del(path: string) {
  return request<void>(path, { method: 'DELETE' });
}

export { ApiError };
