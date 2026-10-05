import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { ar } from './ar';

export const routes: ModuleRoute[] = [
  { path: '/insights/stats', navId: 'stats', component: lazy(() => import('./StatsPage').then((m) => ({ default: m.StatsPage }))) },
  { path: '/insights/analytics', navId: 'analytics', component: lazy(() => import('./AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))) },
];

export function setup() {
  registerArabic(ar);
}
