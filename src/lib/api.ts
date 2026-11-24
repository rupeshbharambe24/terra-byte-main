// The single HTTP client for the TerraByte API.
import type {
  AdminUser,
  Notification,
  RegisterPayload,
  RegisterResponse,
  Role,
  TokenResponse,
  User,
  UserPage,
  UserStatus,
  MeUpdate,
} from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
export const TOKEN_STORAGE_KEY = 'terrabyte.token';
export const UNAUTHORIZED_EVENT = 'terrabyte:unauthorized';

export interface FieldError {
  field: string;
  message: string;
}

/** Error thrown for every failed request. `code` is a stable machine-readable string. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Absolute or proxied URL for an API path, e.g. apiUrl('/me') -> '/api/me'. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Attach the stored bearer token (default true). */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = apiUrl(path);
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText || 'Request failed';
  let code = `http_${res.status}`;
  let fieldErrors: FieldError[] = [];
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') detail = data.detail;
      if (typeof data.code === 'string') code = data.code;
      if (Array.isArray(data.errors)) fieldErrors = data.errors as FieldError[];
    }
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, code, detail, fieldErrors);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, auth = true } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection.');
  }

  if (!res.ok) {
    const error = await parseError(res);
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw error;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ---- Typed endpoints -------------------------------------------------------

export const authApi = {
  login: (identifier: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: { identifier, password }, auth: false }),
  register: (data: RegisterPayload) =>
    request<RegisterResponse>('/auth/register', { method: 'POST', body: data, auth: false }),
  me: (signal?: AbortSignal) => api.get<User>('/me', undefined, signal),
  updateMe: (data: MeUpdate) => api.patch<User>('/me', data),
};

export interface UserFilters {
  role?: Role | '';
  status?: UserStatus | '';
  q?: string;
  limit?: number;
  offset?: number;
}

export type StatusAction = 'approve' | 'reject' | 'suspend';

export const adminApi = {
  listUsers: (filters: UserFilters = {}, signal?: AbortSignal) =>
    api.get<UserPage>('/admin/users', { ...filters }, signal),
  changeStatus: (userId: number, action: StatusAction, reason?: string) =>
    api.post<AdminUser>(`/admin/users/${userId}/${action}`, reason ? { reason } : undefined),
};

export const notificationsApi = {
  list: () => api.get<{ items: Notification[]; unread: number }>('/notifications'),
  markRead: (id: number) => api.post<void>(`/notifications/${id}/read`),
};
