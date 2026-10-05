import type { IconName } from '@/ui/Icon';

export interface CommandHit { id: string; label: string; sub?: string; icon: IconName; path: string; group: string }
export interface SearchProvider {
  id: string;
  group: string;
  /** Resource used for permission checks. */
  resource?: string;
  /** Nav item id: hide the provider when that page is hidden (feature flags, packages). */
  navId?: string;
  search: (q: string, storeId: string, signal: AbortSignal) => Promise<CommandHit[]>;
}
export interface CreateAction { label: string; path: string; icon: IconName; resource?: string; navId: string }

const providers: SearchProvider[] = [];
const creates: CreateAction[] = [];

/** Modules register record search for the Ctrl+K palette. */
export function registerSearch(p: SearchProvider) {
  if (!providers.some((x) => x.id === p.id)) providers.push(p);
}
/** Modules register "New …" actions shown in the palette and the Create button. */
export function registerCreate(a: CreateAction) {
  if (!creates.some((x) => x.path === a.path)) creates.push(a);
}
export const getProviders = () => providers;
export const getCreates = () => creates;
