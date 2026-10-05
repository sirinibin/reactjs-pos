import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { ar } from './ar';

export const routes: ModuleRoute[] = [
  { path: '/home', navId: 'dashboard', component: lazy(() => import('./HomePage')) },
];

export function setup() {
  registerArabic(ar);
}
