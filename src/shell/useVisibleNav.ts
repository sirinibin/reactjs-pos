import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { session } from '@/api/session';
import { NAV, type NavItem, type NavModule } from './nav';

const MENU_KEY = 'sidebar_config';

/** Ids the user hid via Menu settings (legacy key `sidebar_config`: [{id, visible}]). */
export function hiddenMenuIds(): Set<string> {
  const saved = session.getJSON<{ id: string; visible: boolean }[]>(MENU_KEY, []);
  return new Set(saved.filter((s) => s && s.visible === false).map((s) => s.id));
}

/** Saved menu order (ids), from Menu settings. */
export function menuOrder(): string[] {
  return session.getJSON<{ id: string }[]>(MENU_KEY, []).filter(Boolean).map((s) => s.id);
}

/** Re-render when Menu settings change (this tab dispatches a synthetic storage event; other tabs a real one). */
function useMenuVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = (e: StorageEvent) => { if (!e.key || e.key === MENU_KEY) setV((x) => x + 1); };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);
  return v;
}

/** v2 pages without a legacy menu id follow the legacy item they belong to (customer packages, menu settings). */
const PACKAGE_PARENT: Record<string, string | null> = {
  sales_payments: 'sales', sales_cash_discounts: 'sales', sales_return_payments: 'sales_return',
  purchase_payments: 'purchases', purchase_cash_discounts: 'purchases', purchase_return_payments: 'purchase_return',
  capital_withdrawals: 'capitals', postings: 'ledger', signatures: 'stores', menu_settings: null,
};

/** Customer package (store.customer_package_tab_ids): non-admins only see listed menu ids (admin.md §2.4 rule 18). */
export function inPackage(id: string, tabIds: string[] | undefined | null, isAdmin: boolean): boolean {
  if (isAdmin || !tabIds?.length) return true;
  if (id in PACKAGE_PARENT) {
    const parent = PACKAGE_PARENT[id];
    return parent === null || tabIds.includes(parent);
  }
  return tabIds.includes(id);
}

export function useItemAllowed() {
  const { can, store, isAdmin } = useAuth();
  const s = store?.settings || {};
  return (i: NavItem) => (!i.gate || i.gate(s)) && can(i.resource, 'read', !!i.adminOnly) && inPackage(i.id, store?.customer_package_tab_ids, isAdmin);
}

/** Navigation filtered by store feature flags, permissions and user menu preferences. */
export function useVisibleNav(): NavModule[] {
  const { can, store, isAdmin } = useAuth();
  const version = useMenuVersion();
  return useMemo(() => {
    const s = store?.settings || {};
    const hidden = hiddenMenuIds();
    const order = menuOrder();
    const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? 1e6 : i; };
    return NAV.map((m) => ({
      ...m,
      groups: m.groups
        .map((g) => ({ ...g, items: g.items.filter((i) => !hidden.has(i.id) && (!i.gate || i.gate(s)) && can(i.resource, 'read', !!i.adminOnly) && inPackage(i.id, store?.customer_package_tab_ids, isAdmin)) }))
        .map((g) => (order.length ? { ...g, items: [...g.items].sort((a, b) => rank(a.id) - rank(b.id)) } : g))
        .filter((g) => g.items.length > 0),
    })).filter((m) => m.groups.length > 0);
    // version: recompute when Menu settings change
  }, [can, store, isAdmin, version]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Landing page = first visible, allowed item in the saved menu order (legacy getLandingPath). */
export function useLandingPath(): string {
  const modules = useVisibleNav();
  return useMemo(() => {
    const items = modules.flatMap((m) => m.groups.flatMap((g) => g.items));
    const order = menuOrder();
    const first = order.map((id) => items.find((i) => i.id === id)).find(Boolean) || items[0];
    return first?.path || '/home';
  }, [modules]);
}
