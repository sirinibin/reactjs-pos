import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortState } from '@/ui/DataGrid';

export interface ListState {
  q: string;
  page: number;
  size: number;
  sort: SortState | null;
  view: string;
  filters: Record<string, string>;
}

/** List UI state lives in the URL so back/forward, refresh and shared links restore it. */
export function useListState(defaults: { sort?: SortState; size?: number; view?: string } = {}) {
  const [sp, setSp] = useSearchParams();
  const state = useMemo<ListState>(() => {
    const s = sp.get('sort');
    const filters: Record<string, string> = {};
    sp.forEach((v, k) => {
      if (k.startsWith('f.') && v !== '') filters[k.slice(2)] = v;
    });
    return {
      q: sp.get('q') || '',
      page: Math.max(1, Number(sp.get('page')) || 1),
      size: Number(sp.get('size')) || defaults.size || 20,
      sort: s ? { key: s.replace(/^-/, ''), dir: s.startsWith('-') ? -1 : 1 } : defaults.sort || null,
      view: sp.get('view') || defaults.view || 'all',
      filters,
    };
  }, [sp, defaults.size, defaults.sort, defaults.view]);

  const update = useCallback(
    (patch: Partial<ListState>, resetPage = true) => {
      setSp(
        (prev) => {
          const n = new URLSearchParams(prev);
          const set = (k: string, v: string | null) => (v === null || v === '' ? n.delete(k) : n.set(k, v));
          if (patch.q !== undefined) set('q', patch.q);
          if (patch.size !== undefined) set('size', String(patch.size));
          if (patch.view !== undefined) set('view', patch.view === 'all' ? null : patch.view);
          if (patch.sort !== undefined) set('sort', patch.sort ? `${patch.sort.dir < 0 ? '-' : ''}${patch.sort.key}` : null);
          if (patch.filters !== undefined) {
            Array.from(n.keys()).filter((k) => k.startsWith('f.')).forEach((k) => n.delete(k));
            Object.entries(patch.filters).forEach(([k, v]) => v !== '' && v !== undefined && n.set(`f.${k}`, v));
          }
          if (patch.page !== undefined) set('page', patch.page > 1 ? String(patch.page) : null);
          else if (resetPage) n.delete('page');

          return n;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  const sortParam = state.sort ? `${state.sort.dir < 0 ? '-' : ''}${state.sort.key}` : undefined;
  return { state, update, sortParam };
}

/** Debounce a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
