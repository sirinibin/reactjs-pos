import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, request, setUnauthorizedHandler } from '@/api/client';
import { KEYS, session } from '@/api/session';
import { can as canFn, rbacEnabled, toPermissionMap, type Action, type Permission } from './permissions';
import type { Store, User } from './types';

const BOOT_RETRIES = 2;
const BOOT_RETRY_MS = 1000;

const STORE_SELECT = [
  'id', 'name', 'name_in_arabic', 'code', 'branch_name', 'title', 'title_in_arabic', 'registration_number', 'email', 'phone',
  'vat_no', 'vat_percent', 'logo', 'country_code', 'settings', 'zatca', 'bank_account', 'national_address', 'business_category', 'customer_package_id', 'customer_package_tab_ids',
].join(',');

type Status = 'loading' | 'signed-out' | 'ready';

interface AuthValue {
  status: Status;
  user: User | null;
  store: Store | null;
  stores: Store[];
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchStore: (id: string) => Promise<void>;
  refreshStore: () => Promise<void>;
  can: (resource: string | undefined, action?: Action, adminOnly?: boolean) => boolean;
  setting: <T = any>(key: string, fallback?: T) => T;
}

const Ctx = createContext<AuthValue | null>(null);

async function fetchStore(id: string): Promise<Store | null> {
  try {
    const r = await api.get<Store>(`/v1/store/${id}`, { select: STORE_SELECT });
    return r.result ?? null;
  } catch {
    return null;
  }
}

async function fetchStores(): Promise<Store[]> {
  try {
    const r = await api.get<Store[]>('/v1/store', { select: 'id,name,branch_name,code', limit: 200, sort: 'name' });
    return r.result || [];
  } catch {
    return [];
  }
}

async function fetchPermissions(): Promise<Permission[] | null> {
  try {
    const r = await api.get<Permission[]>('/v1/user-role/effective-permissions');
    return r.result || [];
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>(session.token() ? 'loading' : 'signed-out');
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [perms, setPerms] = useState<Record<string, Permission>>(() => toPermissionMap(session.getJSON<Permission[]>(KEYS.permissions, [])));

  const applyStore = useCallback((s: Store | null, userId?: string) => {
    setStore(s);
    session.set(KEYS.storeId, s?.id ?? null);
    session.set(KEYS.storeName, s?.name ?? null);
    session.set(KEYS.branchName, s?.branch_name ?? null);
    session.setJSON(KEYS.storeSettings, s?.settings ?? null);
    if (s && userId) session.set(KEYS.lastStore(userId), s.id);
  }, []);

  /** Load user, stores, active store and permissions for the current token. */
  const bootstrap = useCallback(async () => {
    const me = await request<User>('/v1/me', { skipAuthRedirect: true });
    const u = me.result!;
    setUser(u);
    session.set(KEYS.userId, u.id);
    session.set(KEYS.userName, u.name);
    session.set(KEYS.userRole, u.role || (u.admin ? 'Admin' : 'User'));
    session.set(KEYS.admin, String(!!u.admin));

    const list = await fetchStores();
    const allowed = u.admin || !u.store_ids?.length ? list : list.filter((s) => u.store_ids!.includes(s.id));
    setStores(allowed);
    const preferred = session.get(KEYS.lastStore(u.id)) || session.storeId();
    const pick = allowed.find((s) => s.id === preferred) || allowed[0];
    const full = pick ? await fetchStore(pick.id) : null;
    applyStore(full, u.id);

    if (!u.admin && rbacEnabled(full?.settings)) {
      const p = await fetchPermissions();
      session.setJSON(KEYS.permissions, p);
      setPerms(toPermissionMap(p));
    } else {
      session.set(KEYS.permissions, null);
      setPerms({});
    }
    setStatus('ready');
  }, [applyStore]);

  const signOutLocal = useCallback(() => {
    session.clear();
    setUser(null);
    setStore(null);
    setStores([]);
    setPerms({});
    qc.clear();
    setStatus('signed-out');
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(signOutLocal);
    if (session.token()) {
      // Transient failures (network blip, API restart) are retried; only a rejected token signs out.
      const attempt = (left: number): Promise<void> => bootstrap().catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { signOutLocal(); return; }
        if (left > 0) return new Promise<void>((r) => setTimeout(r, BOOT_RETRY_MS)).then(() => attempt(left - 1));
        setStatus('signed-out');
      });
      attempt(BOOT_RETRIES);
    }
    // Keep other tabs in sync with sign-out / store switches.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.token && !e.newValue) signOutLocal();
      if (e.key === KEYS.storeId && e.newValue && e.newValue !== e.oldValue) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [bootstrap, signOutLocal]);

  const login = useCallback(async (email: string, password: string) => {
    const a = await request<{ code: string }>('/v1/authorize', { method: 'POST', body: { email: email.trim(), password }, auth: null, skipAuthRedirect: true });
    const t = await request<{ access_token: string }>('/v1/accesstoken', { method: 'POST', auth: a.result!.code, skipAuthRedirect: true });
    session.set(KEYS.token, t.result!.access_token);
    setStatus('loading');
    try {
      await bootstrap();
    } catch (e) {
      signOutLocal();
      throw e;
    }
  }, [bootstrap, signOutLocal]);

  const logout = useCallback(async () => {
    try {
      await request('/v1/logout', { method: 'DELETE', skipAuthRedirect: true });
    } catch {
      /* token may already be invalid — sign out locally regardless */
    }
    signOutLocal();
  }, [signOutLocal]);

  const switchStore = useCallback(async (id: string) => {
    const full = await fetchStore(id);
    if (!full) throw new Error('Could not load that store.');
    applyStore(full, user?.id);
    qc.clear();
  }, [applyStore, qc, user?.id]);

  const refreshStore = useCallback(async () => {
    if (!store) return;
    const full = await fetchStore(store.id);
    if (full) applyStore(full, user?.id);
  }, [store, user?.id, applyStore]);

  const value = useMemo<AuthValue>(() => {
    const isAdmin = !!user?.admin || user?.role === 'Admin';
    const ctx = { isAdmin, rbacEnabled: rbacEnabled(store?.settings), permissions: perms };
    return {
      status, user, store, stores, isAdmin, login, logout, switchStore, refreshStore,
      can: (r, a = 'read', adminOnly = false) => canFn(ctx, r, a, adminOnly),
      setting: <T,>(key: string, fallback?: T) => ((store?.settings?.[key] ?? fallback) as T),
    };
  }, [status, user, store, stores, perms, login, logout, switchStore, refreshStore]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}

/** Active store id — every list/create call is scoped by it. */
export function useStoreId(): string {
  return useAuth().store?.id || '';
}
