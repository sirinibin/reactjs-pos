import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ALL_ITEMS, NAV } from '@/shell/nav';
import { useItemAllowed } from '@/shell/useVisibleNav';
import { usePageMeta } from '@/shell/Workspace';
import { Button, IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Pill } from '@/ui/Pill';
import { Banner, Spinner } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { landingId, loadMenuConfig, mergeMenuConfig, moveItem, resetMenu, setLanding, toggleItem, writeMenuConfig, type MenuEntry } from '../lib/menuConfig';
import '../admin.css';

const IDS = ALL_ITEMS.map((i) => i.id);
const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));
const MODULE_OF = new Map(NAV.flatMap((m) => m.groups.flatMap((g) => g.items.map((i) => [i.id, m.title] as const))));

/** Menu visibility & order editor (legacy Menu Settings page). Saved automatically. */
export function MenuSettingsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { store, refreshStore } = useAuth();
  const allowed = useItemAllowed();
  usePageMeta(t('Menu settings'), 'sliders');
  const [items, setItems] = useState<MenuEntry[]>(() => loadMenuConfig(IDS));
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const sync = !!store?.settings?.save_sidebar_config_to_server;
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Pull the server copy when syncing is on (only when this page opens — legacy behaviour).
  useEffect(() => {
    if (!sync || !store?.id) return;
    let off = false;
    setLoading(true);
    api.get<any>(`/v1/store/${store.id}`, { select: 'id,settings' })
      .then((r) => {
        const server = r.result?.settings?.sidebar_config;
        if (!off && Array.isArray(server) && server.length) {
          const merged = mergeMenuConfig(server, IDS);
          writeMenuConfig(merged);
          setItems(merged);
        }
      })
      .catch((e) => !off && setSyncError((e as Error).message))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [sync, store?.id]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const persist = (next: MenuEntry[]) => {
    setItems(next);
    writeMenuConfig(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      // Re-render the shell navigation (it re-reads the config when the store object changes).
      refreshStore().catch(() => undefined);
      if (!sync || !store?.id) return;
      try {
        await api.put(`/v1/store/${store.id}/sidebar-config`, { sidebar_config: next.map(({ id, visible }) => ({ id, visible })) });
        setSyncError('');
      } catch (e) {
        setSyncError((e as Error).message);
      }
    }, 500);
  };

  const isAllowed = useMemo(() => (id: string) => { const n = BY_ID.get(id); return !!n && allowed(n); }, [allowed]);
  const shown = items.filter((x) => isAllowed(x.id));
  const landing = landingId(items, isAllowed);
  const visibleCount = shown.filter((x) => x.visible).length;
  const idx = (id: string) => items.findIndex((x) => x.id === id);
  /** Move among the rows the user can see, keeping hidden rows' positions stable. */
  const moveShown = (from: number, to: number) => {
    if (to < 0 || to >= shown.length) return;
    persist(moveItem(items, idx(shown[from].id), idx(shown[to].id)));
  };

  return (
    <section className="pad">
      <div className="ph">
        <div>
          <h1>{t('Menu settings')} {loading && <Spinner />}</h1>
          <p>{t('Drag or use the arrows to reorder, switch to show or hide. Changes are saved automatically. The first visible item opens after sign-in.')}</p>
        </div>
      </div>
      <div className="stack">
        {syncError && <Banner tone="crit">{t('Server sync failed:')} {syncError}</Banner>}
        {visibleCount === 0 && <Banner tone="warn">{t('At least one item must be visible.')}</Banner>}
        <div className="card">
          <ul className="adm-menu" aria-label={t('Menu items')}>
            {shown.map((x, i) => {
              const n = BY_ID.get(x.id)!;
              return (
                <li key={x.id} className={[drag === i ? 'drag' : '', x.visible ? '' : 'off'].join(' ')} draggable
                  onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => { if (drag !== null && drag !== i) { moveShown(drag, i); setDrag(i); } }}
                  onDragEnd={() => setDrag(null)}>
                  <span className="grip" aria-hidden><Icon name="menu" size="s" /></span>
                  <Icon name={n.icon} size="s" />
                  <span className="nm">{t(n.label)} <span className="muted hide-sm" style={{ fontWeight: 400 }}>· {t(MODULE_OF.get(x.id) || '')}</span></span>
                  {n.adminOnly && <span className="hide-sm"><Pill tone="warn" icon="shield">{t('Admin')}</Pill></span>}
                  {x.id === landing ? <Pill tone="info" icon="home">{t('Landing')}</Pill> : <IconButton icon="home" label={t('Set landing')} onClick={() => persist(setLanding(items, x.id))} />}
                  <span className="mv">
                    <IconButton icon="chev" label={`${t('Move up')} ${t(n.label)}`} disabled={i === 0} onClick={() => moveShown(i, i - 1)} style={{ transform: 'rotate(180deg)' }} />
                    <IconButton icon="chev" label={`${t('Move down')} ${t(n.label)}`} disabled={i === shown.length - 1} onClick={() => moveShown(i, i + 1)} />
                  </span>
                  <span className="switch"><input type="checkbox" role="switch" checked={x.visible} aria-label={`${t('Show')} ${t(n.label)}`} onChange={() => persist(toggleItem(items, x.id))} /><span aria-hidden /></span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <p className="hint" style={{ margin: 0, flex: '1 1 260px' }}>{sync ? t('Your menu is synced to this store on the server.') : t('Your menu is saved on this device only. An administrator can enable server sync in store settings → Print & layout.')}</p>
          <Button icon="undo" onClick={() => { persist(resetMenu(IDS)); toast.success(t('Menu reset')); }}>{t('Reset')}</Button>
        </div>
      </div>
    </section>
  );
}
