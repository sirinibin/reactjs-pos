import { ApiError } from '../../api/client';
import { session } from '../../api/session';

/**
 * Procurement endpoints do not follow the standard StartPOS envelope (procurement.md §0):
 * plain `?store_id=`, `{error}` bodies sent as text/plain via http.Error, and per-endpoint
 * success shapes (`items`, `messages`, `threads`, bare objects). This helper normalises errors
 * into ApiError so the shared ErrorState/toasts keep working.
 */
let base = '';
/** Point the helper at another API origin (integration tests). */
export const setProcurementBaseUrl = (url: string) => { base = url.replace(/\/$/, ''); };

export type PQuery = Record<string, string | number | boolean | null | undefined>;

export function qs(q?: PQuery): string {
  if (!q) return '';
  const s = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, String(v)); });
  const out = s.toString();
  return out ? `?${out}` : '';
}

/** Extract a human message from any error body the procurement handlers produce. */
export function errorMessage(status: number, text: string): string {
  const raw = (text || '').trim();
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === 'object') {
        if (typeof j.error === 'string' && j.error) return j.error;
        if (typeof j.message === 'string' && j.message && j.success === false) return j.message;
        if (j.errors && typeof j.errors === 'object') {
          const first = Object.values(j.errors).find(Boolean);
          if (first) return String(first);
        }
      }
    } catch { /* plain text */ }
    if (raw.length < 400 && !raw.startsWith('<')) return raw;
  }
  if (status === 0) return 'Cannot reach the server. Check your connection and try again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  return `Request failed (${status})`;
}

export interface POpts { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; query?: PQuery; body?: unknown; signal?: AbortSignal; raw?: boolean }

export async function pfetch<T = any>(path: string, o: POpts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = session.token();
  if (token) headers.Authorization = token;
  let body: BodyInit | undefined;
  if (o.body instanceof FormData) body = o.body;
  else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
  let res: Response;
  try {
    res = await fetch(`${base}${path}${qs(o.query)}`, { method: o.method || 'GET', headers, body, signal: o.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, { network: errorMessage(0, '') });
  }
  if (o.raw && res.ok) return res as unknown as T;
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const msg = errorMessage(res.status, text);
    let extra: Record<string, string> = {};
    try { const j = JSON.parse(text); if (j?.errors && typeof j.errors === 'object') extra = j.errors; } catch { /* ignore */ }
    throw new ApiError(res.status, { server: msg, ...extra }, msg);
  }
  if (!text) return {} as T;
  let data: any;
  try { data = JSON.parse(text); } catch { return text as unknown as T; }
  // A few handlers answer 200 with {error} or {status:false, errors}.
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.error === 'string' && data.error && data.success !== true) throw new ApiError(res.status, { server: data.error }, data.error);
    if (data.status === false && data.errors && Object.keys(data.errors).length) {
      const msg = String(Object.values(data.errors)[0]);
      throw new ApiError(res.status, data.errors, msg);
    }
  }
  return data as T;
}

export const papi = {
  get: <T = any>(path: string, query?: PQuery, signal?: AbortSignal) => pfetch<T>(path, { query, signal }),
  post: <T = any>(path: string, body?: unknown, query?: PQuery) => pfetch<T>(path, { method: 'POST', body, query }),
  put: <T = any>(path: string, body?: unknown, query?: PQuery) => pfetch<T>(path, { method: 'PUT', body, query }),
  patch: <T = any>(path: string, body?: unknown, query?: PQuery) => pfetch<T>(path, { method: 'PATCH', body, query }),
  del: <T = any>(path: string, query?: PQuery) => pfetch<T>(path, { method: 'DELETE', query }),
  /** Binary download (PDF) as a Blob. */
  async blob(path: string, query?: PQuery): Promise<Blob> {
    const res = await pfetch<Response>(path, { query, raw: true });
    return res.blob();
  },
};

/** Absolute URL for media/attachment paths served by the API host (/cdn/…, /v1/…). */
export const mediaUrl = (u: string | undefined | null) => (!u ? '' : /^(https?:|data:|blob:)/.test(u) ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`);

export const sseUrl = (storeId: string) => `${base}/v1/rfq-bot/events${qs({ store_id: storeId })}`;
