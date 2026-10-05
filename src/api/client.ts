import { session } from './session';

/** Standard envelope returned by every StartPOS endpoint. */
export interface ApiEnvelope<T> {
  status: boolean;
  total_count?: number;
  result?: T;
  meta?: Record<string, any>;
  errors?: Record<string, string>;
  criterias?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string>;
  constructor(status: number, errors: Record<string, string>, message?: string) {
    super(message || Object.values(errors)[0] || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
  /** First error message, for toasts. */
  get summary(): string {
    return this.message;
  }
}

export type QueryValue = string | number | boolean | null | undefined | (string | number)[];
export type Query = Record<string, QueryValue>;

/**
 * Build a query string. `search` keys are wrapped as search[key]; empty values
 * are dropped so we never send search[x]= (the API treats that as a filter).
 */
export function buildQuery(params: { search?: Query; [k: string]: QueryValue | Query | undefined }): string {
  const qs = new URLSearchParams();
  const add = (k: string, v: QueryValue) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      if (v.length) qs.append(k, v.join(','));
      return;
    }
    qs.append(k, String(v));
  };
  for (const [k, v] of Object.entries(params)) {
    if (k === 'search' && v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [sk, sv] of Object.entries(v as Query)) add(`search[${sk}]`, sv);
    } else add(k, v as QueryValue);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};
export const setUnauthorizedHandler = (fn: UnauthorizedHandler) => {
  onUnauthorized = fn;
};

let baseUrl = '';
/** Override the API origin (integration tests, or a cross-origin deployment). */
export const setBaseUrl = (url: string) => {
  baseUrl = url.replace(/\/$/, '');
};

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  query?: Parameters<typeof buildQuery>[0];
  signal?: AbortSignal;
  /** Send this exact Authorization value instead of the session token. */
  auth?: string | null;
  /** Do not trigger the global sign-out on 401 (used by the login flow). */
  skipAuthRedirect?: boolean;
}

export async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = opts.auth !== undefined ? opts.auth : session.token();
  if (token) headers.Authorization = token;
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const url = `${baseUrl}${path}${opts.query ? buildQuery(opts.query) : ''}`;

  let res: Response;
  try {
    res = await fetch(url, { method: opts.method || 'GET', headers, body, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, { network: 'Cannot reach the server. Check your connection and try again.' });
  }

  // Some handlers send JSON as text/plain, and some reply {error: "..."} instead of {errors:{...}}.
  const text = await res.text().catch(() => '');
  let parsed: any = null;
  if (text) { try { parsed = JSON.parse(text); } catch { parsed = null; } }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.error === 'string' && !parsed.errors) {
    parsed = { ...parsed, status: parsed.status ?? false, errors: { error: parsed.error } };
  }
  const data = parsed as ApiEnvelope<T> | null;

  if (res.status === 401 && !opts.skipAuthRedirect) onUnauthorized();
  if (res.status === 429) throw new ApiError(429, { rate_limit: 'Too many requests. Please wait a moment and try again.' });
  // Some handlers (e.g. CreateProduct) succeed with HTTP 200 but never set status:true,
  // while others report validation errors with HTTP 200 + status:false. Treat a 200 as a
  // failure only when it carries errors or no result.
  const hasErrors = !!data?.errors && Object.keys(data.errors).length > 0;
  const softFail = res.ok && data?.status === false && (hasErrors || data.result === undefined || data.result === null);
  if (!res.ok || softFail) {
    const plain = !data && text && text.length < 300 ? text.trim() : '';
    const errors = data?.errors && Object.keys(data.errors).length ? data.errors : { server: plain || `Request failed (${res.status})` };
    throw new ApiError(res.status, errors);
  }
  return data ?? { status: true };
}

export const api = {
  get: <T = any>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T = any>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'POST', body, query }),
  put: <T = any>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'PUT', body, query }),
  patch: <T = any>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'PATCH', body, query }),
  del: <T = any>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'DELETE', query }),
};
