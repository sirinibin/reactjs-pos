import type { ComponentType } from 'react';

/** Modules can contribute small top-bar widgets (e.g. unread counters) from their setup(). */
const items: { id: string; component: ComponentType; order?: number }[] = [];
export function registerTopbarItem(id: string, component: ComponentType, order = 50) {
  if (!items.some((i) => i.id === id)) items.push({ id, component, order });
}
export const getTopbarItems = () => [...items].sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
