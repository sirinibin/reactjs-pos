import type { StoreSettings } from './types';

export interface Permission {
  resource: string;
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  [k: string]: unknown;
}
export type Action = 'read' | 'create' | 'update' | 'delete';

export interface AccessContext {
  isAdmin: boolean;
  rbacEnabled: boolean;
  permissions: Record<string, Permission>;
}

/**
 * Mirrors the legacy Sidebar logic:
 * - admins see everything;
 * - when RBAC is enabled, an explicit permission row for the resource decides;
 * - admin-only items are hidden from non-admins unless RBAC explicitly grants read;
 * - with RBAC off, non-admins see all non-admin-only items.
 */
export function can(ctx: AccessContext, resource: string | undefined, action: Action = 'read', adminOnly = false): boolean {
  if (ctx.isAdmin) return true;
  if (!resource) return !adminOnly;
  const p = ctx.rbacEnabled ? ctx.permissions[resource] : undefined;
  if (adminOnly) return !!(p && p[action]);
  if (ctx.rbacEnabled && p) return !!p[action];
  return true;
}

export function toPermissionMap(list: Permission[] | null | undefined): Record<string, Permission> {
  const m: Record<string, Permission> = {};
  (list || []).forEach((p) => {
    if (p && p.resource) m[p.resource] = p;
  });
  return m;
}

export const rbacEnabled = (s: StoreSettings | null | undefined) => !!s?.enable_rbac_module;
