import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/ui/Icon';
import { IconButton, Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { moduleForPath } from './nav';
import { useLandingPath, useVisibleNav } from './useVisibleNav';
import { useWorkspace } from './Workspace';
import { CommandPalette } from './CommandPalette';
import { applyDensity, applyTheme, getDensity, isDark } from './prefs';
import { NotificationBell } from './Notifications';
import { getTopbarItems } from './topbarItems';
import { ChangePasswordDialog, ServerStatusDialog } from './AccountDialogs';
import { RealtimeBridge } from '@/realtime/RealtimeBridge';
import { VersionWatcher } from './VersionWatcher';
import { LanguageMenu } from './LanguageMenu';

function initials(name?: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const { user, store, stores, switchStore, logout } = useAuth();
  const modules = useVisibleNav();
  const ws = useWorkspace();
  const landing = useLandingPath();
  const routeModule = moduleForPath(loc.pathname);
  const [activeMod, setActiveMod] = useState(routeModule?.id || modules[0]?.id);
  const [panel, setPanel] = useState<'auto' | 'on' | 'off'>('auto');
  const [drawer, setDrawer] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [menu, setMenu] = useState<'store' | 'user' | null>(null);
  const [dialog, setDialog] = useState<'password' | 'status' | null>(null);
  const [dark, setDark] = useState(isDark());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (routeModule) setActiveMod(routeModule.id); }, [routeModule]);
  useEffect(() => { setDrawer(false); setMenu(null); }, [loc.pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true); }
      if (e.key === 'Escape') { setDrawer(false); setMenu(null); }
    };
    const c = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('keydown', h);
    document.addEventListener('mousedown', c);
    return () => { document.removeEventListener('keydown', h); document.removeEventListener('mousedown', c); };
  }, []);

  const current = modules.find((m) => m.id === activeMod) || modules[0];
  const top = modules.filter((m) => !m.bottom);
  const bottom = modules.filter((m) => m.bottom);
  const shellCls = ['shell', panel === 'on' && 'panel-on', panel === 'off' && 'panel-off', drawer && 'nav-open'].filter(Boolean).join(' ');
  const firstPath = (id: string) => modules.find((m) => m.id === id)?.groups[0]?.items[0]?.path;

  const onRail = (id: string) => {
    setActiveMod(id);
    if (window.innerWidth <= 1280 && window.innerWidth > 760) setPanel('on');
    else if (panel === 'off') setPanel('auto');
  };
  const toggleNav = () => {
    if (window.innerWidth <= 760) setDrawer((d) => !d);
    else if (window.innerWidth <= 1280) setPanel((p) => (p === 'on' ? 'auto' : 'on'));
    else setPanel((p) => (p === 'off' ? 'auto' : 'off'));
  };
  const toggleTheme = () => { const d = !dark; applyTheme(d ? 'dark' : 'light'); setDark(d); };
  const onSwitch = async (id: string) => {
    setMenu(null);
    try { await switchStore(id); toast.success(t('Switched store')); nav('/home'); } catch (e) { toast.error((e as Error).message); }
  };

  const rail = (m: (typeof modules)[number]) => (
    <button key={m.id} className="rail-btn" aria-current={m.id === current?.id} title={t(m.title)} onClick={() => onRail(m.id)} type="button">
      <Icon name={m.icon} /><span>{t(m.title)}</span>
    </button>
  );

  const tabs = useMemo(() => ws.tabs, [ws.tabs]);

  return (
    <div className={shellCls}>
      <nav className="rail" aria-label={t('Modules')}>
        <Link to={landing} className="logo" aria-label="StartERP home">S</Link>
        {top.map(rail)}
        <span className="grow" />
        {bottom.map(rail)}
      </nav>

      <aside className="panel" aria-label={t('Module navigation')}>
        <div className="panel-h">
          <h2>{current ? t(current.title) : ''}</h2>
          <IconButton icon="panel" label={t('Hide panel')} className="flip" onClick={() => (window.innerWidth <= 760 ? setDrawer(false) : setPanel('off'))} />
        </div>
        <div style={{ position: 'relative' }} ref={menu === 'store' ? menuRef : undefined}>
          <button className="store" type="button" onClick={() => setMenu(menu === 'store' ? null : 'store')} aria-haspopup="listbox" aria-expanded={menu === 'store'}>
            <span className="ic">{initials(store?.name)}</span>
            <span className="t"><b>{store?.name || t('No store')}{store?.branch_name ? ` · ${store.branch_name}` : ''}</b><span>{store?.code || ''} {store?.vat_no ? `· VAT ${store.vat_no}` : ''}</span></span>
            <Icon name="chev" size="s" />
          </button>
          {menu === 'store' && (
            <div className="menu" role="listbox" aria-label={t('Switch store')}>
              {stores.map((s) => (
                <button key={s.id} role="option" aria-selected={s.id === store?.id} type="button" onClick={() => onSwitch(s.id)}>
                  <span className="ic sm">{initials(s.name)}</span><span>{s.name}{s.branch_name ? ` · ${s.branch_name}` : ''}</span>
                  {s.id === store?.id && <Icon name="check" size="s" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="panel-scroll">
          {current?.groups.map((g) => (
            <div className="pg" key={g.title}>
              <div className="pg-t">{t(g.title)}</div>
              {g.items.map((i) => (
                <NavLink key={i.id} to={i.path} className="pl" aria-current={loc.pathname === i.path || loc.pathname.startsWith(i.path + '/') ? 'page' : undefined}>
                  <Icon name={i.icon} size="s" /><span>{t(i.label)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <IconButton icon="menu" label={t('Navigation')} onClick={toggleNav} />
          <button className="gsearch" type="button" onClick={() => setCmdOpen(true)} aria-label={t('Search or jump to…')}>
            <Icon name="search" size="s" /><span>{t('Search or jump to…')}</span><kbd>Ctrl K</kbd>
          </button>
          <span className="spacer hide-sm" />
          {store?.zatca?.phase === '2' && store?.zatca?.connected && <span className="env hide-md">ZATCA · Live</span>}
          <Button variant="primary" size="sm" icon="plus" className="hide-sm" onClick={() => setCmdOpen(true)}>{t('Create')}</Button>
          <IconButton icon={dark ? 'sun' : 'moon'} label={t('Theme')} className="hide-sm" onClick={toggleTheme} />
          <LanguageMenu />
          {getTopbarItems().map(({ id, component: W }) => <W key={id} />)}
          <NotificationBell />
          <div style={{ position: 'relative' }} ref={menu === 'user' ? menuRef : undefined}>
            <button className="av" type="button" title={user?.name} onClick={() => setMenu(menu === 'user' ? null : 'user')} aria-haspopup="menu" aria-expanded={menu === 'user'} aria-label={t('Account menu')}>{initials(user?.name)}</button>
            {menu === 'user' && (
              <div className="menu end" role="menu">
                <div className="menu-h"><b>{user?.name}</b><span>{user?.email}</span></div>
                <button role="menuitem" type="button" onClick={toggleTheme}><Icon name={dark ? 'sun' : 'moon'} size="s" />{dark ? t('Light') : t('Dark')}</button>
                <button role="menuitem" type="button" onClick={() => { const d = getDensity() === 'compact' ? 'comfortable' : 'compact'; applyDensity(d); setMenu(null); }}><Icon name="sliders" size="s" />{t('Toggle density')}</button>
                <button role="menuitem" type="button" onClick={() => nav('/admin/menu')}><Icon name="gear" size="s" />{t('Menu settings')}</button>
                {(user?.admin || user?.role === 'Admin' || user?.role === 'Manager') && store && <button role="menuitem" type="button" onClick={() => nav(`/admin/stores/${store.id}/settings`)}><Icon name="store" size="s" />{t('Store settings')}</button>}
                <button role="menuitem" type="button" onClick={() => { setMenu(null); setDialog('password'); }}><Icon name="lock" size="s" />{t('Change password')}</button>
                <button role="menuitem" type="button" onClick={() => { setMenu(null); setDialog('status'); }}><Icon name="chart" size="s" />{t('Server status')}</button>
                <button role="menuitem" type="button" className="danger" onClick={() => logout()}><Icon name="lock" size="s" />{t('Sign out')}</button>
              </div>
            )}
          </div>
        </header>
        <div className="wtabs" role="tablist" aria-label={t('Open pages')}>
          {tabs.map((tb) => (
            <div key={tb.path} className="wt" role="tab" aria-selected={tb.path === loc.pathname}>
              <Link to={tb.path} className="wt-l"><Icon name={tb.icon} size="xs" /><span className="lbl">{t(tb.title)}</span></Link>
              <button className="x" type="button" aria-label={`${t('Close')} ${t(tb.title)}`} onClick={() => ws.close(tb.path)}><Icon name="x" size="xs" /></button>
            </div>
          ))}
          <button className="wt-add" type="button" aria-label={t('Open page')} onClick={() => setCmdOpen(true)}><Icon name="plus" size="s" /></button>
        </div>
        <main className="content" id="content">{children}</main>
        <nav className="tabbar" aria-label={t('Quick navigation')}>
          <NavLink to={landing} aria-current={loc.pathname === landing ? 'page' : undefined}><Icon name="home" /><span>{t('Home')}</span></NavLink>
          <NavLink to={firstPath('sales') && modules.some((m) => m.id === 'sales') ? '/sales/invoices' : '/home'} aria-current={loc.pathname.startsWith('/sales') ? 'page' : undefined}><Icon name="receipt" /><span>{t('Sales')}</span></NavLink>
          <button type="button" aria-label={t('Create')} onClick={() => setCmdOpen(true)}><span className="fab"><Icon name="plus" /></span></button>
          <NavLink to="/stock/products" aria-current={loc.pathname.startsWith('/stock') ? 'page' : undefined}><Icon name="box" /><span>{t('Stock')}</span></NavLink>
          <button type="button" onClick={() => setDrawer(true)}><Icon name="menu" /><span>{t('Menu')}</span></button>
        </nav>
      </div>
      <div className="scrim nav" onClick={() => setDrawer(false)} style={{ zIndex: 94 }} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ChangePasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} />
      <ServerStatusDialog open={dialog === 'status'} onClose={() => setDialog(null)} />
      <RealtimeBridge />
      {store?.settings?.enable_auto_refresh && <VersionWatcher />}
    </div>
  );
}
