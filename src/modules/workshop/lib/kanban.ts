// Repair-job board state. Lists, card placement and card order are per-browser
// localStorage (same keys as the legacy app, so existing boards carry over).
// Only "closed"/"open" status writes ever reach the server (workshop spec §2.6).

export interface KList { id: string; name: string; color: string }
export interface BoardState { lists: KList[]; cardMap: Record<string, string>; cardOrder: Record<string, string[]> }
export interface BoardJob { id: string; status?: string; estimated_delivery?: string | null; [k: string]: any }

export const BOARD_KEYS = { lists: 'repair_job_kanban_lists', map: 'repair_job_kanban_card_map', order: 'repair_job_kanban_card_order' } as const;

export const DEFAULT_LISTS: KList[] = [
  { id: 'todo', name: 'TO DO', color: '#0052cc' },
  { id: 'in_progress', name: 'IN PROGRESS', color: '#ff8b00' },
  { id: 'done', name: 'DONE', color: '#00875a' },
];
export const NEW_LIST_COLOR = '#5e6c84';

/** Left-border accent per status (spec §2.4 STATUS_ACCENT). */
export const STATUS_ACCENT: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f97316', completed: '#22c55e', delivered: '#a855f7', cancelled: '#ef4444', closed: '#64748b',
};
export const accentFor = (status?: string) => STATUS_ACCENT[status || ''] || '#94a3b8';
const FINISHED = new Set(['completed', 'delivered', 'cancelled', 'closed']);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadBoard(): BoardState {
  const lists = read<KList[]>(BOARD_KEYS.lists, DEFAULT_LISTS);
  return {
    lists: Array.isArray(lists) && lists.length ? lists.filter((l) => l && typeof l.id === 'string') : DEFAULT_LISTS,
    cardMap: read<Record<string, string>>(BOARD_KEYS.map, {}),
    cardOrder: read<Record<string, string[]>>(BOARD_KEYS.order, {}),
  };
}

export function saveBoard(s: BoardState) {
  try {
    localStorage.setItem(BOARD_KEYS.lists, JSON.stringify(s.lists));
    localStorage.setItem(BOARD_KEYS.map, JSON.stringify(s.cardMap));
    localStorage.setItem(BOARD_KEYS.order, JSON.stringify(s.cardOrder));
  } catch { /* storage full / private mode — board still works for this session */ }
}

/** Legacy mapping: in_progress → in_progress, completed|delivered → done, else → todo. A status equal to a list id lands there. */
export function statusToListId(status: string | undefined, lists: KList[]): string {
  const has = (id: string) => lists.some((l) => l.id === id);
  const s = status || '';
  if (s && has(s)) return s;
  const target = s === 'in_progress' ? 'in_progress' : s === 'completed' || s === 'delivered' ? 'done' : 'todo';
  return has(target) ? target : lists[0]?.id || 'todo';
}

export function columnOf(job: BoardJob, s: BoardState): string {
  const m = s.cardMap[job.id];
  if (m && s.lists.some((l) => l.id === m)) return m;
  return statusToListId(job.status, s.lists);
}

/** Jobs grouped per list, ordered by cardOrder (unknown ids keep their incoming order, after known ones). */
export function groupJobs<T extends BoardJob>(jobs: T[], s: BoardState): Record<string, T[]> {
  const out: Record<string, T[]> = Object.fromEntries(s.lists.map((l) => [l.id, [] as T[]]));
  jobs.forEach((j) => out[columnOf(j, s)]?.push(j));
  for (const l of s.lists) {
    const order = s.cardOrder[l.id] || [];
    const pos = new Map(order.map((id, i) => [id, i]));
    const arr = out[l.id];
    const idx = new Map(arr.map((j, i) => [j.id, i]));
    arr.sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id)! : Infinity;
      const pb = pos.has(b.id) ? pos.get(b.id)! : Infinity;
      return pa === pb ? idx.get(a.id)! - idx.get(b.id)! : pa - pb;
    });
  }
  return out;
}

/**
 * Move a card into `toList` before `beforeId` (null = end). `visibleOrder` is the target column's
 * current rendered order so cards that were never ordered keep their place.
 */
export function moveCard(s: BoardState, jobId: string, toList: string, beforeId: string | null, visibleOrder: string[] = []): BoardState {
  const cardOrder: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(s.cardOrder)) cardOrder[k] = v.filter((id) => id !== jobId);
  const base = [...(cardOrder[toList] || [])];
  visibleOrder.filter((id) => id !== jobId && !base.includes(id)).forEach((id) => base.push(id));
  const at = beforeId ? base.indexOf(beforeId) : -1;
  if (at >= 0) base.splice(at, 0, jobId);
  else base.push(jobId);
  cardOrder[toList] = base;
  return { ...s, cardMap: { ...s.cardMap, [jobId]: toList }, cardOrder };
}

/** Status the server must receive after a drop, or null (spec §2.6 rule 2). */
export function statusWriteFor(currentStatus: string | undefined, toList: string, lists: KList[]): 'closed' | 'open' | null {
  const last = lists[lists.length - 1]?.id === toList;
  if (last && currentStatus !== 'closed') return 'closed';
  if (!last && currentStatus === 'closed') return 'open';
  return null;
}

export function addList(s: BoardState, name: string, now = Date.now()): BoardState {
  const n = name.trim();
  if (!n) return s;
  return { ...s, lists: [...s.lists, { id: `list_${now}`, name: n, color: NEW_LIST_COLOR }] };
}

export function renameList(s: BoardState, id: string, name: string): BoardState {
  const n = name.trim();
  if (!n) return s;
  return { ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, name: n } : l)) };
}

/** Delete a list; its cards move to the first remaining list. The last list can't be deleted. */
export function deleteList(s: BoardState, id: string): BoardState {
  if (s.lists.length <= 1) return s;
  const lists = s.lists.filter((l) => l.id !== id);
  const first = lists[0].id;
  const cardMap = Object.fromEntries(Object.entries(s.cardMap).map(([k, v]) => [k, v === id ? first : v]));
  const moved = s.cardOrder[id] || [];
  const cardOrder = { ...s.cardOrder, [first]: [...(s.cardOrder[first] || []), ...moved] };
  delete cardOrder[id];
  return { lists, cardMap, cardOrder };
}

export function reorderLists(s: BoardState, fromId: string, toId: string): BoardState {
  const from = s.lists.findIndex((l) => l.id === fromId);
  const to = s.lists.findIndex((l) => l.id === toId);
  if (from < 0 || to < 0 || from === to) return s;
  const lists = [...s.lists];
  const [m] = lists.splice(from, 1);
  lists.splice(to, 0, m);
  return { ...s, lists };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function isOverdue(job: Pick<BoardJob, 'status' | 'estimated_delivery'>, now = new Date()): boolean {
  if (!job.estimated_delivery || FINISHED.has(job.status || '')) return false;
  const due = new Date(job.estimated_delivery);
  return !Number.isNaN(due.getTime()) && due < startOfDay(now);
}

export function isDueToday(job: Pick<BoardJob, 'status' | 'estimated_delivery'>, now = new Date()): boolean {
  if (!job.estimated_delivery || FINISHED.has(job.status || '')) return false;
  const due = new Date(job.estimated_delivery);
  return !Number.isNaN(due.getTime()) && startOfDay(due).getTime() === startOfDay(now).getTime();
}

export function initials(name: string | undefined | null): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Human status label; list ids resolve to list names. */
export function statusLabel(status: string | undefined, lists: KList[] = []): string {
  const s = status || 'open';
  const l = lists.find((x) => x.id === s);
  if (l) return l.name;
  const txt = s.replace(/_/g, ' ');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** Stage progress 0–100 from the column position (first list 0 %, last list 100 %). */
export function stageProgress(listId: string, lists: KList[]): number {
  const i = lists.findIndex((l) => l.id === listId);
  if (i < 0 || lists.length < 2) return 0;
  return Math.round((i / (lists.length - 1)) * 100);
}
