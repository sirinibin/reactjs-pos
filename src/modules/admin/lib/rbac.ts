// RBAC role-editor logic: resources × read/create/update/delete matrix.
import type { Permission } from '@/auth/permissions';

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const;
export type RbacAction = (typeof ACTIONS)[number];
export interface ResourceRow { resource: string; label: string; group: string }
export type Matrix = Record<string, Record<RbacAction, boolean>>;

/** Legacy DEFAULT_MENU resource ids (spec §8.2) — always offered even if no nav item uses them. */
export const LEGACY_RESOURCES = ['dashboard', 'sales', 'sales_return', 'purchases', 'purchase_orders', 'purchase_requests', 'rfq_received', 'rfq_suppliers', 'procurement_emails', 'procurement_whatsapp', 'purchase_bill_images', 'purchase_return', 'delivery_notes', 'quotations', 'qtn_sales_return', 'non_vat_sales', 'non_vat_sales_return', 'stats', 'vendors', 'stores', 'warehouses', 'stock_transfers', 'customers', 'products', 'services', 'product_category', 'service_category', 'product_brand', 'expense_category', 'expenses', 'analytics', 'receivables', 'payables', 'capitals', 'dividents', 'ledger', 'accounts', 'users', 'user_roles', 'customer_packages', 'automobile_dashboard', 'employees', 'salaries', 'vehicles', 'repair_jobs'];

/** Unique resources from the nav (first item's label, module as group), plus legacy-only ones. */
export function resourcesFromNav(nav: { title: string; groups: { items: { label: string; resource?: string }[] }[] }[]): ResourceRow[] {
  const out: ResourceRow[] = [];
  const seen = new Set<string>();
  for (const m of nav) for (const g of m.groups) for (const i of g.items) {
    if (!i.resource || seen.has(i.resource)) continue;
    seen.add(i.resource);
    out.push({ resource: i.resource, label: i.label, group: m.title });
  }
  for (const r of LEGACY_RESOURCES) if (!seen.has(r)) { seen.add(r); out.push({ resource: r, label: r.replace(/_/g, ' '), group: 'Other' }); }
  return out;
}

const all = (v: boolean) => ({ read: v, create: v, update: v, delete: v });

/** New role: every action granted. Edit: saved permissions merged onto all rows (missing → none). */
export function buildMatrix(rows: ResourceRow[], saved?: Permission[] | null): Matrix {
  const m: Matrix = {};
  const map = new Map((saved || []).map((p) => [p.resource, p]));
  for (const r of rows) {
    if (!saved) m[r.resource] = all(true);
    else {
      const p = map.get(r.resource);
      m[r.resource] = { read: !!p?.read, create: !!p?.create, update: !!p?.update, delete: !!p?.delete };
    }
  }
  return m;
}

export function matrixToPermissions(m: Matrix): Permission[] {
  return Object.entries(m).map(([resource, a]) => ({ resource, read: a.read, create: a.create, update: a.update, delete: a.delete }));
}

export const setCell = (m: Matrix, r: string, a: RbacAction, v: boolean): Matrix => {
  const row = { ...m[r], [a]: v };
  // Granting create/update/delete without read makes no sense in the UI — imply read.
  if (v && a !== 'read') row.read = true;
  // Removing read removes everything else.
  if (!v && a === 'read') Object.assign(row, all(false));
  return { ...m, [r]: row };
};
export const setRow = (m: Matrix, r: string, v: boolean): Matrix => ({ ...m, [r]: all(v) });
export const setColumn = (m: Matrix, a: RbacAction, v: boolean, only?: string[]): Matrix => {
  const n: Matrix = { ...m };
  for (const r of only || Object.keys(m)) n[r] = { ...n[r], [a]: v, ...(v && a !== 'read' ? { read: true } : {}), ...(!v && a === 'read' ? all(false) : {}) };
  return n;
};
export const setAll = (m: Matrix, v: boolean): Matrix => Object.fromEntries(Object.keys(m).map((r) => [r, all(v)]));

export const rowAll = (m: Matrix, r: string) => ACTIONS.every((a) => m[r]?.[a]);
export const columnAll = (m: Matrix, a: RbacAction, only?: string[]) => (only || Object.keys(m)).every((r) => m[r]?.[a]);
export const everything = (m: Matrix) => Object.keys(m).every((r) => rowAll(m, r));

/** Count of resources the role can at least read. */
export const grantedCount = (perms: Permission[] | null | undefined) => new Set((perms || []).filter((p) => p.read || p.create || p.update || p.delete).map((p) => p.resource)).size;
