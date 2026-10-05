import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { IconName } from '@/ui/Icon';
import { itemForPath } from './nav';

export interface WorkTab { path: string; title: string; icon: IconName }

interface Ctx {
  tabs: WorkTab[];
  setMeta: (path: string, title: string, icon?: IconName) => void;
  close: (path: string) => void;
}
const WorkspaceCtx = createContext<Ctx | null>(null);
const MAX_TABS = 10;
const STORE_KEY = 'erp_tabs';

/** Browser-style workspace tabs: each visited page/record stays one click away. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [tabs, setTabs] = useState<WorkTab[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
  });
  const path = loc.pathname;

  useEffect(() => {
    if (path === '/login' || path.startsWith('/print')) return;
    setTabs((t) => {
      if (t.some((x) => x.path === path)) return t;
      const item = itemForPath(path);
      const next = [...t, { path, title: item?.label || 'Page', icon: item?.icon || 'file' }];
      return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
    });
  }, [path]);

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(tabs)); } catch { /* ignore */ }
  }, [tabs]);

  const setMeta = useCallback((p: string, title: string, icon?: IconName) => {
    setTabs((t) => {
      const i = t.findIndex((x) => x.path === p);
      if (i < 0 || (t[i].title === title && (!icon || t[i].icon === icon))) return t;
      const next = [...t];
      next[i] = { ...t[i], title, icon: icon || t[i].icon };
      return next;
    });
  }, []);

  const close = useCallback((p: string) => {
    setTabs((t) => {
      const i = t.findIndex((x) => x.path === p);
      const next = t.filter((x) => x.path !== p);
      if (p === path) nav(next[Math.max(0, i - 1)]?.path || '/home');
      return next;
    });
  }, [nav, path]);

  const v = useMemo(() => ({ tabs, setMeta, close }), [tabs, setMeta, close]);
  return <WorkspaceCtx.Provider value={v}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspace() {
  const c = useContext(WorkspaceCtx);
  if (!c) throw new Error('useWorkspace outside provider');
  return c;
}

/** Pages call this to label their workspace tab and the document title. */
export function usePageMeta(title: string | undefined, icon?: IconName) {
  const loc = useLocation();
  const setMeta = useContext(WorkspaceCtx)?.setMeta;
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · StartERP`;
    setMeta?.(loc.pathname, title, icon);
  }, [title, icon, loc.pathname, setMeta]);
}
