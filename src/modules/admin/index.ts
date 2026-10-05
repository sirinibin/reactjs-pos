import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { api } from '@/api/client';
import { ar } from './ar';

const stores = () => import('./stores/StorePages');
const editor = () => import('./stores/StoreEditor');
const users = () => import('./users/UserPages');
const roles = () => import('./roles/RolePages');

export const routes: ModuleRoute[] = [
  { path: '/admin/stores', navId: 'stores', component: lazy(() => stores().then((m) => ({ default: m.StoresListPage }))) },
  { path: '/admin/stores/new', navId: 'stores', component: lazy(() => editor().then((m) => ({ default: m.StoreEditorPage }))) },
  { path: '/admin/stores/:id', navId: 'stores', component: lazy(() => stores().then((m) => ({ default: m.StoreProfilePage }))) },
  { path: '/admin/stores/:id/settings', navId: 'stores', component: lazy(() => editor().then((m) => ({ default: m.StoreEditorPage }))) },
  { path: '/admin/users', navId: 'users', component: lazy(() => users().then((m) => ({ default: m.UsersListPage }))) },
  { path: '/admin/users/new', navId: 'users', component: lazy(() => users().then((m) => ({ default: m.UserEditorPage }))) },
  { path: '/admin/users/:id', navId: 'users', component: lazy(() => users().then((m) => ({ default: m.UserViewPage }))) },
  { path: '/admin/users/:id/edit', navId: 'users', component: lazy(() => users().then((m) => ({ default: m.UserEditorPage }))) },
  { path: '/admin/roles', navId: 'user_roles', component: lazy(() => roles().then((m) => ({ default: m.RolesListPage }))) },
  { path: '/admin/roles/new', navId: 'user_roles', component: lazy(() => roles().then((m) => ({ default: m.RoleEditorPage }))) },
  { path: '/admin/roles/:id', navId: 'user_roles', component: lazy(() => roles().then((m) => ({ default: m.RoleViewPage }))) },
  { path: '/admin/roles/:id/edit', navId: 'user_roles', component: lazy(() => roles().then((m) => ({ default: m.RoleEditorPage }))) },
  { path: '/admin/signatures', navId: 'signatures', component: lazy(() => import('./signatures/Signatures').then((m) => ({ default: m.SignaturesPage }))) },
  { path: '/admin/menu', navId: 'menu_settings', component: lazy(() => import('./menu/MenuSettings').then((m) => ({ default: m.MenuSettingsPage }))) },
];

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New store', path: '/admin/stores/new', icon: 'store', resource: 'stores', navId: 'stores' });
  registerCreate({ label: 'New user', path: '/admin/users/new', icon: 'user', resource: 'users', navId: 'users' });
  registerCreate({ label: 'New role', path: '/admin/roles/new', icon: 'shield', resource: 'user_roles', navId: 'user_roles' });
  registerSearch({
    id: 'admin-stores', group: 'Stores', resource: 'stores',
    search: async (q, _storeId, signal) => {
      const r = await api.get<any[]>('/v1/store', { search: { name: q }, limit: 5, select: 'id,name,code,branch_name' }, signal);
      return (r.result || []).map((s) => ({ id: `store:${s.id}`, label: `${s.name}${s.code ? ` (${s.code})` : ''}`, sub: s.branch_name, icon: 'store' as const, path: `/admin/stores/${s.id}`, group: 'Stores' }));
    },
  });
  registerSearch({
    id: 'admin-users', group: 'Users', resource: 'users',
    search: async (q, _storeId, signal) => {
      const r = await api.get<any[]>('/v1/user', { search: /@/.test(q) ? { email: q } : { name: q }, limit: 5, select: 'id,name,email' }, signal);
      return (r.result || []).map((u) => ({ id: `user:${u.id}`, label: u.name, sub: u.email, icon: 'user' as const, path: `/admin/users/${u.id}`, group: 'Users' }));
    },
  });
}
