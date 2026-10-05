import type { ModuleRoute } from './routeTypes';

/**
 * Every feature module lives in src/modules/<name>/ and exports from index.ts:
 *   export const routes: ModuleRoute[]
 *   export function setup(): void   // optional: register i18n, search providers, create actions
 * They are discovered automatically, so modules never edit a shared registry.
 */
const mods = import.meta.glob<{ routes?: ModuleRoute[]; setup?: () => void }>('../modules/*/index.ts', { eager: true });

export const MODULE_ROUTES: ModuleRoute[] = [];
for (const m of Object.values(mods)) {
  m.setup?.();
  if (m.routes) MODULE_ROUTES.push(...m.routes);
}
