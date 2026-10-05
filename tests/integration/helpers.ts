import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { api, setBaseUrl } from '../../src/api/client';
import { KEYS } from '../../src/api/session';

export const API_URL = process.env.API_URL || 'http://127.0.0.1:2000';
export const EMAIL = process.env.SEED_EMAIL || 'sirinibin2006@gmail.com';
export const PASSWORD = process.env.SEED_PASSWORD || '123456';

export interface Seed { storeId: string; products: any[]; customers: any[]; vendors: any[]; orders: any[]; purchases: any[]; quotations: any[]; warehouseId?: string }

export function loadSeed(): Seed {
  const p = resolve(__dirname, '../.seed.json');
  if (!existsSync(p)) throw new Error('tests/.seed.json missing — run `npm run seed` first');
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Minimal localStorage so the app's session module works in Node. */
const mem = new Map<string, string>();
(globalThis as any).window = (globalThis as any).window || {};
(globalThis as any).window.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) };

/** Sign in through the real authorize → accesstoken flow and point the app's API client at the server. */
const TOKEN_CACHE = resolve(__dirname, '../.token');

export async function signIn(): Promise<string> {
  setBaseUrl(API_URL);
  // Reuse a still-valid token: the API allows only 10 sign-ins per IP per 15 minutes.
  if (existsSync(TOKEN_CACHE)) {
    const cached = readFileSync(TOKEN_CACHE, 'utf8').trim();
    const ok = await fetch(`${API_URL}/v1/me`, { headers: { Authorization: cached } }).then((r) => r.ok).catch(() => false);
    if (ok) { mem.set(KEYS.token, cached); return cached; }
  }
  const a = await api.post<{ code: string }>('/v1/authorize', { email: EMAIL, password: PASSWORD });
  const res = await fetch(`${API_URL}/v1/accesstoken`, { method: 'POST', headers: { Authorization: a.result!.code } });
  const token = (await res.json()).result.access_token as string;
  mem.set(KEYS.token, token);
  writeFileSync(TOKEN_CACHE, token);
  return token;
}

export const S = (storeId: string) => ({ search: { store_id: storeId } });

/** RFC3339 timestamp with local offset. */
export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
