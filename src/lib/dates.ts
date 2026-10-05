import { toApiDate } from './format';

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'last_30' | 'all';

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'this_year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

/** Resolve a preset to [from, to] API dates (inclusive), relative to `now`. */
export function presetRange(p: DatePreset, now: Date = new Date()): [string, string] | null {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const add = (x: Date, n: number) => new Date(x.getFullYear(), x.getMonth(), x.getDate() + n);
  switch (p) {
    case 'today': return [toApiDate(d), toApiDate(d)];
    case 'yesterday': { const y = add(d, -1); return [toApiDate(y), toApiDate(y)]; }
    case 'this_week': { const s = add(d, -((d.getDay() + 6) % 7)); return [toApiDate(s), toApiDate(d)]; }
    case 'this_month': return [toApiDate(new Date(d.getFullYear(), d.getMonth(), 1)), toApiDate(d)];
    case 'last_month': return [toApiDate(new Date(d.getFullYear(), d.getMonth() - 1, 1)), toApiDate(new Date(d.getFullYear(), d.getMonth(), 0))];
    case 'last_30': return [toApiDate(add(d, -29)), toApiDate(d)];
    case 'this_year': return [toApiDate(new Date(d.getFullYear(), 0, 1)), toApiDate(d)];
    default: return null;
  }
}
