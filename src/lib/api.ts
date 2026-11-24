// The single HTTP client for the TerraByte API.
import type {
  AdminAnalyticsData,
  AdminUser,
  Article,
  ArticleInput,
  Booking,
  BookingAction,
  BookingInput,
  BookingStatus,
  BusySlot,
  Consultation,
  ConsultationDetail,
  ConsultationInput,
  ConsultationStatus,
  Equipment,
  EquipmentInput,
  ExpertDashboardData,
  FarmerDashboardData,
  FieldInput,
  FieldPlot,
  ForumPost,
  ForumPostDetail,
  ForumPostInput,
  ForumReport,
  HardwareDashboardData,
  KVK,
  KVKInput,
  KVKStatus,
  LedgerEntry,
  LedgerInput,
  LedgerSummary,
  LedgerType,
  ModelEvaluation,
  NotificationPage,
  Order,
  OrderAction,
  OrderInput,
  OrderStatus,
  Page,
  Product,
  ProductCategory,
  ProductInput,
  RegisterPayload,
  RegisterResponse,
  ReportStatus,
  Role,
  TokenResponse,
  UploadResult,
  User,
  UserPage,
  UserStatus,
  MeUpdate,
  VendorDashboardData,
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

type QueryValue = string | number | boolean | null | undefined;
type Query = Record<string, QueryValue | QueryValue[]>;

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
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null && item !== '') params.append(key, String(item));
    }
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

/** URL of an uploaded file (paths come from POST /uploads/image). */
export function fileUrl(path: string | null | undefined): string | null {
  return path ? apiUrl(`/files/${path}`) : null;
}

/** Download an authenticated file (e.g. the ledger CSV) and hand it to the browser. */
export async function downloadFile(path: string, query: Query, filename: string): Promise<void> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection.');
  }
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export interface PageQuery {
  limit?: number;
  offset?: number;
}

export const notificationsApi = {
  list: (query: PageQuery & { unread_only?: boolean } = {}) => api.get<NotificationPage>('/notifications', { ...query }),
  unreadCount: () => api.get<{ unread: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.post<void>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
};

export const uploadsApi = {
  image: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResult>('/uploads/image', { method: 'POST', body: form });
  },
};

export const marketApi = {
  products: (q: PageQuery & { q?: string; category?: ProductCategory; district?: string; in_stock?: boolean } = {}) =>
    api.get<Page<Product>>('/products', { ...q }),
  product: (id: number) => api.get<Product>(`/products/${id}`),
  myProducts: (q: PageQuery & { q?: string; active?: boolean } = {}) => api.get<Page<Product>>('/vendor/products', { ...q }),
  createProduct: (data: ProductInput) => api.post<Product>('/vendor/products', data),
  updateProduct: (id: number, data: Partial<ProductInput>) => api.patch<Product>(`/vendor/products/${id}`, data),
  placeOrder: (data: OrderInput) => api.post<Order[]>('/orders', data),
  orders: (q: PageQuery & { status?: OrderStatus[] } = {}) => api.get<Page<Order>>('/orders', { ...q }),
  order: (id: number) => api.get<Order>(`/orders/${id}`),
  orderAction: (id: number, action: OrderAction, reason?: string) =>
    api.post<Order>(`/orders/${id}/${action}`, reason ? { reason } : undefined),
};

export const rentalsApi = {
  equipment: (q: PageQuery & { q?: string; type?: string; district?: string } = {}) =>
    api.get<Page<Equipment>>('/equipment', { ...q }),
  equipmentItem: (id: number) => api.get<Equipment>(`/equipment/${id}`),
  busy: (id: number, from: string, to: string) => api.get<BusySlot[]>(`/equipment/${id}/busy`, { from, to }),
  myEquipment: (q: PageQuery & { active?: boolean } = {}) => api.get<Page<Equipment>>('/hardware/equipment', { ...q }),
  createEquipment: (data: EquipmentInput) => api.post<Equipment>('/hardware/equipment', data),
  updateEquipment: (id: number, data: Partial<EquipmentInput>) => api.patch<Equipment>(`/hardware/equipment/${id}`, data),
  book: (data: BookingInput) => api.post<Booking>('/bookings', data),
  bookings: (
    q: PageQuery & { status?: BookingStatus[]; equipment_id?: number; from?: string; to?: string; upcoming?: boolean } = {}
  ) => api.get<Page<Booking>>('/bookings', { ...q }),
  bookingAction: (id: number, action: BookingAction, reason?: string) =>
    api.post<Booking>(`/bookings/${id}/${action}`, reason ? { reason } : undefined),
};

export const adviceApi = {
  ask: (data: ConsultationInput) => api.post<ConsultationDetail>('/consultations', data),
  consultations: (q: PageQuery & { scope?: 'all' | 'open' | 'mine'; status?: ConsultationStatus[]; kvk_id?: number } = {}) =>
    api.get<Page<Consultation>>('/consultations', { ...q }),
  consultation: (id: number) => api.get<ConsultationDetail>(`/consultations/${id}`),
  claim: (id: number) => api.post<ConsultationDetail>(`/consultations/${id}/claim`),
  reply: (id: number, body: string, image_path?: string | null) =>
    api.post<ConsultationDetail>(`/consultations/${id}/messages`, { body, image_path: image_path ?? null }),
  setStatus: (id: number, status: 'answered' | 'closed') =>
    api.post<ConsultationDetail>(`/consultations/${id}/status`, { status }),
  assign: (id: number, expert_id: number) =>
    api.post<ConsultationDetail>(`/admin/consultations/${id}/assign`, { expert_id }),
  kvks: (q: PageQuery & { q?: string; district?: string; state?: string } = {}) => api.get<Page<KVK>>('/kvks', { ...q }),
  createKvk: (data: KVKInput) => api.post<KVK>('/admin/kvks', data),
  updateKvk: (id: number, data: Partial<KVKInput>) => api.patch<KVK>(`/admin/kvks/${id}`, data),
  deleteKvk: (id: number) => api.delete<void>(`/admin/kvks/${id}`),
  kvkStatus: () => api.get<KVKStatus>('/admin/kvk-status'),
  articles: (q: PageQuery & { q?: string; crop?: string } = {}) => api.get<Page<Article>>('/articles', { ...q }),
  article: (id: number) => api.get<Article>(`/articles/${id}`),
  myArticles: (q: PageQuery = {}) => api.get<Page<Article>>('/expert/articles', { ...q }),
  createArticle: (data: ArticleInput) => api.post<Article>('/expert/articles', data),
  updateArticle: (id: number, data: Partial<ArticleInput>) => api.patch<Article>(`/expert/articles/${id}`, data),
  deleteArticle: (id: number) => api.delete<void>(`/expert/articles/${id}`),
};

export const forumApi = {
  posts: (q: PageQuery & { category?: string; q?: string; mine?: boolean } = {}) =>
    api.get<Page<ForumPost>>('/forum/posts', { ...q }),
  post: (id: number) => api.get<ForumPostDetail>(`/forum/posts/${id}`),
  createPost: (data: ForumPostInput) => api.post<ForumPostDetail>('/forum/posts', data),
  reply: (postId: number, body: string) => api.post<ForumPostDetail>(`/forum/posts/${postId}/replies`, { body }),
  deletePost: (id: number) => api.delete<void>(`/forum/posts/${id}`),
  deleteReply: (id: number) => api.delete<void>(`/forum/replies/${id}`),
  report: (kind: 'post' | 'reply', id: number, reason: string) =>
    api.post<void>(`/forum/${kind === 'post' ? 'posts' : 'replies'}/${id}/report`, { reason }),
  reports: (q: PageQuery & { status?: ReportStatus } = {}) => api.get<Page<ForumReport>>('/admin/forum/reports', { ...q }),
  dismissReport: (id: number) => api.post<void>(`/admin/forum/reports/${id}/dismiss`),
  moderate: (kind: 'post' | 'reply', id: number, action: 'hide' | 'restore', reason?: string) =>
    api.post<void>(`/admin/forum/${kind === 'post' ? 'posts' : 'replies'}/${id}/${action}`, reason ? { reason } : undefined),
};

export interface LedgerFilters extends PageQuery {
  from?: string;
  to?: string;
  type?: LedgerType;
  category?: string;
  field_id?: number;
}

export const farmApi = {
  fields: () => api.get<FieldPlot[]>('/fields'),
  createField: (data: FieldInput) => api.post<FieldPlot>('/fields', data),
  updateField: (id: number, data: Partial<FieldInput>) => api.patch<FieldPlot>(`/fields/${id}`, data),
  deleteField: (id: number) => api.delete<void>(`/fields/${id}`),
  ledger: (q: LedgerFilters = {}) => api.get<Page<LedgerEntry>>('/ledger', { ...q }),
  ledgerSummary: (q: { from?: string; to?: string } = {}) => api.get<LedgerSummary>('/ledger/summary', { ...q }),
  createEntry: (data: LedgerInput) => api.post<LedgerEntry>('/ledger', data),
  updateEntry: (id: number, data: Partial<LedgerInput>) => api.patch<LedgerEntry>(`/ledger/${id}`, data),
  deleteEntry: (id: number) => api.delete<void>(`/ledger/${id}`),
  exportCsv: (q: { from?: string; to?: string } = {}) =>
    downloadFile('/ledger/export.csv', { ...q }, 'terrabyte-farm-accounts.csv'),
};

export const dashboardApi = {
  farmer: () => api.get<FarmerDashboardData>('/dashboard/farmer'),
  vendor: () => api.get<VendorDashboardData>('/dashboard/vendor'),
  hardware: () => api.get<HardwareDashboardData>('/dashboard/hardware'),
  expert: () => api.get<ExpertDashboardData>('/dashboard/expert'),
  admin: () => api.get<AdminAnalyticsData>('/admin/analytics'),
  modelEvaluations: (q: PageQuery = {}) => api.get<Page<ModelEvaluation>>('/admin/model-evaluations', { ...q }),
};

export const accountApi = {
  changePassword: (current_password: string, new_password: string) =>
    api.post<void>('/me/password', { current_password, new_password }),
};
