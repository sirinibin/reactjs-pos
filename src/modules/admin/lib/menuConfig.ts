// Menu visibility/order persisted in localStorage `sidebar_config` as [{id, visible}],
// using nav item ids from src/shell/nav.ts (legacy sidebar_menu_config.js semantics).

export interface MenuEntry { id: string; visible: boolean }
export const MENU_KEY = 'sidebar_config';

/**
 * Merge a saved config with the default id order:
 * - unknown saved ids are dropped;
 * - new default ids are inserted after the right-most saved item that precedes them in the
 *   default order (index 0 if none), visible.
 */
export function mergeMenuConfig(saved: unknown, defaults: string[]): MenuEntry[] {
  const list = Array.isArray(saved) ? (saved as any[]).filter((x) => x && typeof x.id === 'string' && defaults.includes(x.id)) : [];
  const seen = new Set<string>();
  const out: MenuEntry[] = [];
  for (const x of list) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push({ id: x.id, visible: x.visible !== false });
  }
  if (!out.length) return defaults.map((id) => ({ id, visible: true }));
  defaults.forEach((id, di) => {
    if (seen.has(id)) return;
    let at = 0;
    for (let j = di - 1; j >= 0; j--) {
      const pos = out.findIndex((e) => e.id === defaults[j]);
      if (pos >= 0) { at = pos + 1; break; }
    }
    out.splice(at, 0, { id, visible: true });
    seen.add(id);
  });
  return out;
}

export function loadMenuConfig(defaults: string[]): MenuEntry[] {
  try {
    const raw = window.localStorage.getItem(MENU_KEY);
    return mergeMenuConfig(raw ? JSON.parse(raw) : null, defaults);
  } catch {
    return mergeMenuConfig(null, defaults);
  }
}

/** Write localStorage and notify listeners in this tab (other tabs get the native event). */
export function writeMenuConfig(items: MenuEntry[]) {
  const value = JSON.stringify(items.map(({ id, visible }) => ({ id, visible })));
  try {
    window.localStorage.setItem(MENU_KEY, value);
  } catch {
    /* storage unavailable */
  }
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: MENU_KEY, newValue: value }));
  } catch {
    /* old browsers */
  }
}

export function moveItem(items: MenuEntry[], from: number, to: number): MenuEntry[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const n = [...items];
  const [x] = n.splice(from, 1);
  n.splice(to, 0, x);
  return n;
}

export const toggleItem = (items: MenuEntry[], id: string): MenuEntry[] => items.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));

/** "Set landing": move to the top and make visible. */
export function setLanding(items: MenuEntry[], id: string): MenuEntry[] {
  const x = items.find((i) => i.id === id);
  if (!x) return items;
  return [{ id, visible: true }, ...items.filter((i) => i.id !== id)];
}

/** First visible id among those the user can actually see (the page that opens after login). */
export const landingId = (items: MenuEntry[], allowed: (id: string) => boolean = () => true) => items.find((i) => i.visible && allowed(i.id))?.id;

/** Legacy applyAutomobileMenuOrder(): workshop items first when the automobile module is switched on. */
export const AUTOMOBILE_FIRST = ['automobile_dashboard', 'repair_jobs_board', 'repair_jobs', 'vehicles', 'customers', 'employees'];
export function automobileOrder(items: MenuEntry[]): MenuEntry[] {
  const top = AUTOMOBILE_FIRST.map((id) => items.find((i) => i.id === id)).filter(Boolean) as MenuEntry[];
  return [...top, ...items.filter((i) => !AUTOMOBILE_FIRST.includes(i.id))];
}

export const resetMenu =(defaults: string[]): MenuEntry[] => defaults.map((id) => ({ id, visible: true }));
