import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, request } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { ObjectBody, ObjectHeader, KeyValues } from '@/ui/ObjectPage';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Select, SearchInput, Checkbox } from '@/ui/Field';
import { Modal } from '@/ui/Overlay';
import { Pill, Tag } from '@/ui/Pill';
import { Banner, EmptyState, ErrorState, Segmented, Skeleton, useConfirm } from '@/ui/Misc';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { bus } from '@/realtime/bus';
import { fmtDate, fmtDateTime, fmtMoney, fmtRelative } from '@/lib/format';
import { t as tt } from '@/i18n';
import { buildUserBody, isAccessError, passwordStrength, presenceSince, roleOf, validatePasswordChange, validateUser, type UserFormValues, type UserRole } from '../lib/misc';
import { fromLocalInput, toLocalInput, useSaveShortcut, useUnsavedGuard } from '../components/kit';
import '../admin.css';

export const USER = '/v1/user';
export const USERS_PATH = '/admin/users';
interface U { id: string; name: string; [k: string]: any }

const LIST_SELECT = 'id,name,email,mob,role,admin,store_names,online,last_online_at,last_offline_at,connected_mobiles,connected_tabs,connected_computers,created_by_name,created_at';

export function Presence({ u }: { u: U }) {
  const since = presenceSince(u);
  return (
    <span title={since ? fmtDateTime(since) : undefined}>
      <span className={`adm-dot${u.online ? ' on' : ''}`} aria-hidden />
      {u.online ? tt('Online') : tt('Offline')}{since ? <span className="muted"> · {fmtRelative(since)}</span> : null}
    </span>
  );
}

export function RolePill({ u }: { u: { role?: string; admin?: boolean; [k: string]: any } }) {
  const r = roleOf(u);
  return <Pill tone={r === 'Admin' ? 'info' : r === 'Manager' ? 'neutral' : 'warn'} icon={r === 'Admin' ? 'shield' : 'user'}>{tt(r === 'SalesMan' ? 'Salesman' : r)}</Pill>;
}

export function usersListConfig(opts: { canCreate: boolean }): ListConfig<U> {
  return {
    title: 'Users',
    subtitle: 'Accounts, store access, roles and who is online',
    icon: 'users',
    endpoint: USER,
    resource: 'users',
    storeScoped: false,
    select: LIST_SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/@/.test(q) ? { email: q } : /^\+?\d[\d\s]*$/.test(q) ? { mob: q.replace(/\s/g, '') } : { name: q }),
    searchPlaceholder: 'Search name, email or mobile…',
    createPath: opts.canCreate ? `${USERS_PATH}/new` : undefined,
    createLabel: 'New user',
    detailPath: (r) => `${USERS_PATH}/${r.id}`,
    views: [
      { id: 'all', label: 'All users' },
      { id: 'online', label: 'Online now', search: { online: '1' } },
      { id: 'offline', label: 'Offline', search: { online: '0' } },
    ],
    filters: [
      { id: 'role', label: 'Role', type: 'select', options: [{ value: 'Admin', label: 'Admin' }, { value: 'Manager', label: 'Manager' }, { value: 'SalesMan', label: 'Salesman' }] },
      { id: 'email', label: 'Email', type: 'text' },
      { id: 'mob', label: 'Mobile', type: 'text' },
      { id: 'created_by', label: 'Created by', type: 'picker', load: async (q, s) => ((await api.get<U[]>(USER, { search: { name: q }, select: 'id,name', limit: 10 }, s)).result || []).map((u) => ({ id: u.id, label: u.name, data: u })) },
      { id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    baseSearch: { timezone_offset: String(new Date().getTimezoneOffset() / 60) },
    columns: [
      { key: 'online', header: tt('Status'), sortKey: 'online', render: (r) => <Presence u={r} /> },
      { key: 'name', header: tt('Name'), sortKey: 'name', className: 'two', render: (r) => <><b><bdi>{r.name}</bdi></b><span>{r.email}</span></> },
      { key: 'mob', header: tt('Mobile'), sortKey: 'mob', hideBelow: 'md', render: (r) => <span className="num">{r.mob || '—'}</span> },
      { key: 'role', header: tt('Role'), sortKey: 'role', render: (r) => <RolePill u={r} /> },
      { key: 'stores', header: tt('Stores'), hideBelow: 'lg', render: (r) => <StoreChips names={r.store_names} admin={roleOf(r) === 'Admin'} /> },
      { key: 'devices', header: tt('Devices'), hideBelow: 'xl', align: 'end', render: (r) => <span className="num muted" title={tt('Computers · mobiles · tabs')}>{r.connected_computers || 0} · {r.connected_mobiles || 0} · {r.connected_tabs || 0}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created'), sortKey: 'created_at', hideBelow: 'lg', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
    ],
    mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, amount: <RolePill u={r} />, subtitle: r.email, meta: <Presence u={r} /> }),
    exportColumns: [
      { header: 'Name', value: (r) => r.name },
      { header: 'Email', value: (r) => r.email },
      { header: 'Mobile', value: (r) => r.mob },
      { header: 'Role', value: (r) => roleOf(r) },
      { header: 'Stores', value: (r) => (r.store_names || []).join('; ') },
      { header: 'Online', value: (r) => (r.online ? 'yes' : 'no') },
      { header: 'Created', value: (r) => fmtDate(r.created_at) },
    ],
    exportName: 'users',
    refetchInterval: 60_000,
  };
}

function StoreChips({ names, admin }: { names?: string[] | null; admin?: boolean }) {
  if (admin && !names?.length) return <span className="muted">{tt('All stores')}</span>;
  if (!names?.length) return <span className="muted">—</span>;
  return <span className="adm-chips">{names.slice(0, 2).map((n) => <Tag key={n}><bdi>{n}</bdi></Tag>)}{names.length > 2 && <Tag>+{names.length - 2}</Tag>}</span>;
}

/** Reload user lists when presence changes arrive over the realtime socket. */
function usePresenceRefresh() {
  const qc = useQueryClient();
  useEffect(() => {
    const h = () => qc.invalidateQueries({ queryKey: [USER] });
    const a = bus.on('user_status_change', h);
    const b = bus.on('user_device_count_change', h);
    return () => { a(); b(); };
  }, [qc]);
}

export function UsersListPage() {
  const { isAdmin, can } = useAuth();
  usePresenceRefresh();
  return <ListPage config={usersListConfig({ canCreate: isAdmin || can('users', 'create') })} />;
}

function useUser(id: string | undefined) {
  return useQuery<U>({
    queryKey: [USER, 'one', id],
    queryFn: async ({ signal }) => (await api.get<U>(`${USER}/${id}`, undefined, signal)).result as U,
    enabled: !!id,
  });
}

export function UserViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { user: me, isAdmin, can } = useAuth();
  const q = useUser(id);
  const u = q.data;
  usePageMeta(u?.name || t('User'), 'user');
  usePresenceRefresh();
  const [confirmEl, ask] = useConfirm();
  const [pw, setPw] = useState(false);
  const [busy, setBusy] = useState('');
  const [allDevices, setAllDevices] = useState(false);

  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!u) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={240} /></div>;
  const self = me?.id === u.id;
  const canEdit = isAdmin || can('users', 'update');
  const devices = Object.values((u.devices || {}) as Record<string, any>).sort((a, b) => (Number(!!b.connected) - Number(!!a.connected)) || String(b.last_connected_at || '').localeCompare(String(a.last_connected_at || '')));
  const shownDevices = allDevices ? devices : devices.slice(0, 12);
  const since = presenceSince(u);

  const toggle = async () => {
    if (!(await ask(u.deleted ? t('Activate {{name}}?', { name: u.name }) : t('Deactivate {{name}}?', { name: u.name }), { danger: !u.deleted, confirmLabel: u.deleted ? t('Activate') : t('Deactivate'), body: u.deleted ? undefined : t('They will be signed out and can’t sign in until re-activated.') }))) return;
    setBusy('toggle');
    try {
      await patch(`${USER}/${u.id}/toggle-status`);
      toast.success(u.deleted ? t('User activated') : t('User deactivated'));
      qc.invalidateQueries({ queryKey: [USER] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const del = async () => {
    if (!(await ask(t('Delete {{name}}?', { name: u.name }), { danger: true, confirmLabel: t('Delete'), body: t('The account is removed from the user list.') }))) return;
    setBusy('delete');
    try {
      await api.del(`${USER}/${u.id}`);
      toast.success(t('User deleted'));
      qc.invalidateQueries({ queryKey: [USER] });
      nav(USERS_PATH);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Admin'), to: USERS_PATH }, { label: t('Users'), to: USERS_PATH }, { label: <bdi>{u.name}</bdi> }]}
        icon="user"
        title={<bdi>{u.name}</bdi>}
        pills={<>{' '}<RolePill u={u} />{u.deleted ? <Pill tone="crit" icon="lock">{t('Inactive')}</Pill> : u.online ? <Pill tone="good" icon="checkc">{t('Online')}</Pill> : null}</>}
        subtitle={u.email}
        actions={<>
          {canEdit && !self && <Button icon="lock" onClick={() => setPw(true)}>{t('Change password')}</Button>}
          {canEdit && !self && <Button loading={busy === 'toggle'} onClick={toggle}>{u.deleted ? t('Activate') : t('Deactivate')}</Button>}
          {isAdmin && !self && <Button variant="danger" icon="trash" loading={busy === 'delete'} onClick={del}>{t('Delete')}</Button>}
          {canEdit && <Button variant="primary" icon="edit" onClick={() => nav(`${USERS_PATH}/${u.id}/edit`)}>{t('Edit')}</Button>}
        </>}
        facets={[
          { label: t('Mobile'), value: u.mob || '—' },
          { label: t('Status'), value: <span style={{ fontSize: 14 }}>{u.online ? t('Online') : t('Offline')}{since ? ` · ${fmtRelative(since)}` : ''}</span> },
          { label: t('Stores'), value: roleOf(u) === 'Admin' && !u.store_ids?.length ? t('All') : (u.store_ids || []).length },
          { label: t('Devices'), value: devices.length, hideOnMobile: true },
        ]}
      />
      <ObjectBody side={
        <aside className="stack">
          <Card title={t('Record')}>
            <KeyValues items={[
              { k: t('Created'), v: fmtDateTime(u.created_at) }, { k: t('Created by'), v: u.created_by_name || '—' },
              { k: t('Updated'), v: fmtDateTime(u.updated_at) }, { k: t('Updated by'), v: u.updated_by_name || '—' },
            ]} />
          </Card>
          {(u.opening_balance || 0) > 0 && (
            <Card title={t('Opening balance')}>
              <KeyValues items={[
                { k: t('Amount'), v: <span className="num">{fmtMoney(u.opening_balance)}</span> },
                { k: t('Direction'), v: u.opening_balance_type === 'receivable' ? t('User owes store') : t('Store owes user') },
                { k: t('As of'), v: fmtDateTime(u.opening_balance_date) },
                { k: t('Posted'), v: u.opening_balance_posted ? t('Yes') : t('No') },
              ]} />
            </Card>
          )}
        </aside>
      }>
        <Card title={t('Access')}>
          <div className="stack">
            <div><div className="hint">{t('Stores')}</div><StoreChipsFull names={u.store_names} admin={roleOf(u) === 'Admin'} /></div>
            <div><div className="hint">{t('RBAC roles')}</div>{(u.role_names || []).length ? <span className="adm-chips">{u.role_names.map((n: string) => <Tag key={n}>{n}</Tag>)}</span> : <span className="muted">—</span>}</div>
          </div>
        </Card>
        <Card title={<>{t('Devices')} <span className="muted" style={{ fontWeight: 500 }}>· {devices.length}</span></>}>
          {devices.length === 0 ? <EmptyState icon="globe" title={t('No devices yet')}>{t('Devices appear after the user signs in to the new app.')}</EmptyState> : (
            <div className="adm-devices">
              {shownDevices.map((d) => (
                <div key={d.device_id} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><b>{d.device_type || t('Device')}</b>{d.connected ? <Pill tone="good" icon="checkc">{t('Online')}</Pill> : <Pill tone="neutral" icon="clock">{t('Offline')}</Pill>}</div>
                  <dl className="kv" style={{ marginTop: 8 }}>
                    <dt>{t('Platform')}</dt><dd>{d.platform || '—'}</dd>
                    <dt>{t('Screen')}</dt><dd className="num">{d.screen_width && d.screen_height ? `${d.screen_width} × ${d.screen_height}` : '—'}</dd>
                    <dt>{t('Touch')}</dt><dd>{d.touch ? t('Yes') : t('No')}</dd>
                    <dt>{t('Battery')}</dt><dd className="num">{!d.battery || d.battery === 'N/A' ? t('Unknown') : `${Number(d.battery) <= 1 ? Math.round(Number(d.battery) * 100) : d.battery}%`}</dd>
                    <dt>IP</dt><dd className="mono">{d.ip_address || '—'}</dd>
                    <dt>{t('Tabs open')}</dt><dd className="num">{d.tabs_open ?? 0}</dd>
                    <dt>{t('Last connected')}</dt><dd>{d.last_connected_at ? fmtRelative(d.last_connected_at) : '—'}</dd>
                  </dl>
                </div>
              ))}
            </div>
          )}
          {devices.length > shownDevices.length && <div style={{ marginTop: 12 }}><Button variant="ghost" onClick={() => setAllDevices(true)}>{t('Show all {{n}} devices', { n: devices.length })}</Button></div>}
        </Card>
      </ObjectBody>
      {confirmEl}
      <ChangePasswordModal open={pw} onClose={() => setPw(false)} userId={u.id} userName={u.name} skipCurrent />
    </>
  );
}

function StoreChipsFull({ names, admin }: { names?: string[] | null; admin?: boolean }) {
  if (admin && !names?.length) return <span className="muted">{tt('All stores (administrator)')}</span>;
  if (!names?.length) return <span className="muted">{tt('No stores assigned')}</span>;
  return <span className="adm-chips">{names.map((n) => <Tag key={n}><bdi>{n}</bdi></Tag>)}</span>;
}

/** PATCH helper (the shared client exposes get/post/put/del only). */
const patch = (path: string, body?: unknown) => request(path, { method: 'PATCH', body });

export function ChangePasswordModal({ open, onClose, userId, userName, skipCurrent }: { open: boolean; onClose: () => void; userId: string; userName: string; skipCurrent?: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV({ current: '', next: '', confirm: '' }); setErrs({}); } }, [open]);
  const strength = passwordStrength(v.next);
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const local = validatePasswordChange(v, !skipCurrent);
    if (Object.keys(local).length) { setErrs(local); return; }
    setBusy(true);
    try {
      await patch(`${USER}/${userId}/change-password`, { new_password: v.next, ...(skipCurrent ? {} : { current_password: v.current }) });
      toast.success(t('Password changed successfully!'));
      onClose();
    } catch (x) {
      setErrs(x instanceof ApiError ? x.errors : { server: (x as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const other = Object.entries(errs).filter(([k, m]) => m && !['current_password', 'new_password', 'confirm'].includes(k));
  return (
    <Modal open={open} onClose={onClose} title={t('Change password for {{name}}', { name: userName })} width={460}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="lock" loading={busy} onClick={() => submit()}>{t('Change password')}</Button></>}>
      <form className="stack" onSubmit={submit} noValidate>
        {skipCurrent && <div className="hint">{t('No current password required.')}</div>}
        {other.length > 0 && <Banner tone="crit">{other.map(([, m]) => m).join(' · ')}</Banner>}
        {!skipCurrent && <Field label={t('Current password')} required error={errs.current_password ? t(errs.current_password) : undefined}>{(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} />}</Field>}
        <Field label={t('New password')} required error={errs.new_password ? t(errs.new_password) : undefined} hint={v.next ? `${t('Strength')}: ${t(strength.label)}` : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} data-autofocus />}
        </Field>
        {v.next && <div className={`adm-bar${strength.tone === 'good' ? ' done' : strength.tone === 'crit' ? ' err' : ''}`} aria-hidden><i style={{ width: `${Math.min(100, (strength.score / 5) * 100)}%` }} /></div>}
        <Field label={t('Confirm new password')} required error={errs.confirm ? t(errs.confirm) : undefined} hint={v.confirm && v.confirm === v.next ? t('Passwords match') : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} />}
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

const blankForm = (): UserFormValues => ({ name: '', email: '', mob: '', password: '', role: 'Manager', store_ids: [], role_ids: [], opening_balance: '', opening_balance_type: 'payable', opening_balance_date: '', store_id: '' });

export function UserEditorPage() {
  const { id } = useParams();
  const q = useUser(id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <UserEditor key={id || 'new'} id={id} existing={q.data} />;
}

function UserEditor({ id, existing }: { id?: string; existing?: U }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const activeStoreId = useStoreId();
  const { user: me, isAdmin, can } = useAuth();
  const creating = !id;
  const init = useMemo<UserFormValues>(() => existing ? {
    ...blankForm(), name: existing.name || '', email: existing.email || '', mob: existing.mob || '', role: roleOf(existing),
    store_ids: existing.store_ids || [], role_ids: existing.role_ids || [],
    opening_balance: existing.opening_balance ? String(existing.opening_balance) : '', opening_balance_type: existing.opening_balance_type === 'receivable' ? 'receivable' : 'payable',
    opening_balance_date: toLocalInput(existing.opening_balance_date), store_id: existing.store_id || '',
  } : blankForm(), [existing]);
  const [v, setV] = useState<UserFormValues>(init);
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>(() => Object.fromEntries((existing?.role_ids || []).map((rid: string, i: number) => [rid, existing?.role_names?.[i] || rid])));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [storeQ, setStoreQ] = useState('');
  const dirty = JSON.stringify(v) !== JSON.stringify(init);
  useUnsavedGuard(dirty);
  usePageMeta(creating ? t('New user') : `${t('Edit')} ${existing?.name || ''}`, 'user');
  const self = me?.id === id;
  const allowed = creating ? isAdmin || can('users', 'create') : isAdmin || can('users', 'update');

  const stores = useQuery<{ id: string; name: string; branch_name?: string; code?: string }[]>({
    queryKey: ['/v1/store', 'user-form'],
    queryFn: async () => (await api.get<any[]>('/v1/store', { select: 'id,name,branch_name,code', limit: 200, sort: 'name' })).result || [],
  });
  const firstStore = v.store_ids[0];
  const rbac = useQuery<boolean>({
    queryKey: ['/v1/store', 'rbac', firstStore],
    // Legacy read result.enable_rbac_module (top level, always undefined); the flag lives in settings.
    queryFn: async () => !!(await api.get<any>(`/v1/store/${firstStore}`, { select: 'id,settings' })).result?.settings?.enable_rbac_module,
    enabled: !!firstStore,
  });

  const set = <K extends keyof UserFormValues>(k: K, val: UserFormValues[K]) => { setV((x) => ({ ...x, [k]: val })); if (errs[k as string]) setErrs((e) => ({ ...e, [k]: '' })); };
  const roleOptions: { value: UserRole; label: string }[] = [{ value: 'Manager', label: t('Manager') }, { value: 'SalesMan', label: t('Salesman') }, ...(isAdmin ? [{ value: 'Admin' as UserRole, label: t('Admin') }] : [])];

  const save = async () => {
    if (saving || !allowed) return;
    const local = validateUser(v, creating);
    if (Object.keys(local).length) { setErrs(local); toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const body = buildUserBody(v, { creating, activeStoreId, toIso: (x) => fromLocalInput(x) || '' });
      const r = creating ? await api.post<U>(USER, body) : await api.put<U>(`${USER}/${id}`, body);
      qc.invalidateQueries({ queryKey: [USER] });
      toast.success(creating ? t('User created successfully!') : t('User updated successfully!'));
      nav(`${USERS_PATH}/${r.result?.id || id}`, { replace: creating });
    } catch (e) {
      if (e instanceof ApiError) setErrs(e.errors);
      toast.error(e instanceof ApiError ? e.message : t('Failed to process user!'));
    } finally {
      setSaving(false);
    }
  };
  useSaveShortcut(save, allowed);

  if (!allowed) return <div className="pad"><EmptyState icon="lock" title={t('You don’t have access to this page.')} /></div>;

  const storeList = (stores.data || []).filter((s) => !storeQ || `${s.name} ${s.branch_name || ''} ${s.code || ''}`.toLowerCase().includes(storeQ.toLowerCase()));
  const toggleStore = (sid: string) => set('store_ids', v.store_ids.includes(sid) ? v.store_ids.filter((x) => x !== sid) : [...v.store_ids, sid]);
  const accessErrors = Object.entries(errs).filter(([k, m]) => m && isAccessError(k));
  const known = new Set(['name', 'email', 'mob', 'password', 'opening_balance', 'opening_balance_date', 'opening_balance_type', 'store_id']);
  const otherErrors = Object.entries(errs).filter(([k, m]) => m && !known.has(k) && !isAccessError(k));
  const strength = passwordStrength(v.password);

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Admin'), to: USERS_PATH }, { label: t('Users'), to: USERS_PATH }, { label: creating ? t('New') : <bdi>{existing?.name}</bdi> }]}
        icon="user"
        title={creating ? t('New user') : <bdi>{existing?.name}</bdi>}
        pills={dirty ? <>{' '}<Pill tone="warn" icon="clock">{t('Unsaved')}</Pill></> : undefined}
        actions={<div className="row doc-actions">
          <Button variant="ghost" onClick={() => nav(creating ? USERS_PATH : `${USERS_PATH}/${id}`)}>{t(dirty ? 'Discard' : 'Close')}</Button>
          <Button variant="primary" icon="check" loading={saving} onClick={save}>{t(creating ? 'Create user' : 'Save changes')} <kbd className="hide-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd></Button>
        </div>}
      />
      <ObjectBody>
        {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => m).join(' · ')}</Banner>}
        <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <Card title={t('Account')}>
            <div className="fgrid">
              <Field label={t('Name')} required error={errs.name} className="span2">{(fid, d) => <Input id={fid} aria-describedby={d} value={v.name} invalid={!!errs.name} onChange={(e) => set('name', e.target.value)} autoFocus />}</Field>
              <Field label={t('Email')} required error={errs.email} className="span2">{(fid, d) => <Input id={fid} aria-describedby={d} type="email" autoComplete="off" value={v.email} invalid={!!errs.email} onChange={(e) => set('email', e.target.value)} />}</Field>
              <Field label={t('Mobile')} required error={errs.mob} className="span2">{(fid, d) => <Input id={fid} aria-describedby={d} type="tel" inputMode="tel" value={v.mob} invalid={!!errs.mob} onChange={(e) => set('mob', e.target.value)} />}</Field>
              <Field label={t('Password')} required={creating} error={errs.password ? t(errs.password) : undefined} className="span2" hint={creating ? (v.password ? `${t('Strength')}: ${t(strength.label)}` : t('At least 6 characters.')) : t('Leave blank to keep the current password.')}>
                {(fid, d) => <Input id={fid} aria-describedby={d} type="password" autoComplete="new-password" placeholder={creating ? undefined : t('Change password')} value={v.password} invalid={!!errs.password} onChange={(e) => set('password', e.target.value)} />}
              </Field>
            </div>
          </Card>
          <Card title={t('Access')}>
            <div className="stack">
              {accessErrors.length > 0 && <Banner tone="crit">{accessErrors.map(([, m]) => m).join(' · ')}</Banner>}
              <Field label={t('Role')} hint={self && !isAdmin ? t('You cannot change your own role.') : t('Admins see every store; managers and salesmen only their assigned stores.')}>
                {() => <Segmented label={t('Role')} value={v.role} onChange={(r) => !(self && !isAdmin) && set('role', r)} options={roleOptions} />}
              </Field>
              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <b>{t('Stores')}</b><span className="muted num">{t('{{n}} selected', { n: v.store_ids.length })}</span>
                </div>
                {(stores.data || []).length > 8 && <div style={{ marginBottom: 6 }}><SearchInput value={storeQ} onChange={setStoreQ} placeholder={t('Search stores…')} aria-label={t('Search stores')} /></div>}
                <div className="adm-storelist" role="group" aria-label={t('Stores')}>
                  {stores.isLoading && <Skeleton height={60} />}
                  {storeList.map((s) => <Checkbox key={s.id} checked={v.store_ids.includes(s.id)} onChange={() => toggleStore(s.id)} label={<><bdi>{s.name}</bdi>{s.branch_name ? <> · <bdi>{s.branch_name}</bdi></> : null} <span className="muted mono">({s.code})</span></>} />)}
                  {!stores.isLoading && storeList.length === 0 && <div className="muted" style={{ padding: 8 }}>{t('No stores found')}</div>}
                </div>
              </div>
              {firstStore && rbac.data && (
                <div>
                  <b>{t('RBAC roles')}</b>
                  <div className="adm-chips" style={{ margin: '6px 0' }}>
                    {v.role_ids.map((rid) => <Tag key={rid}>{roleLabels[rid] || rid} <button type="button" className="link" aria-label={`${t('Remove')} ${roleLabels[rid] || rid}`} onClick={() => set('role_ids', v.role_ids.filter((x) => x !== rid))}>×</button></Tag>)}
                    {v.role_ids.length === 0 && <span className="muted">{t('No roles assigned')}</span>}
                  </div>
                  <AsyncPicker<any> value={null} eager aria-label={t('Add role')} placeholder={t('Add role…')}
                    load={async (qq, sig) => ((await api.get<any[]>('/v1/user-role', { search: { name: qq, store_ids: v.store_ids.join(',') } }, sig)).result || []).filter((r) => !v.role_ids.includes(r.id)).map((r): PickerOption => ({ id: r.id, label: r.name, sub: r.store_name, data: r }))}
                    onChange={(o) => { if (o) { setRoleLabels((m) => ({ ...m, [o.id]: o.label })); set('role_ids', [...v.role_ids, o.id]); } }} />
                </div>
              )}
            </div>
          </Card>
          <Card title={t('Opening balance')} sub={existing?.opening_balance_posted ? t('Already posted to the ledger — changes adjust the posting.') : t('Optional. Money owed between the store and this user when they start.')}>
            <div className="fgrid">
              <Field label={t('Direction')} className="span2">
                {() => <Segmented label={t('Direction')} value={v.opening_balance_type} onChange={(x) => set('opening_balance_type', x)} options={[{ value: 'payable', label: t('Store owes user') }, { value: 'receivable', label: t('User owes store') }]} />}
              </Field>
              <Field label={t('Amount')} error={errs.opening_balance}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" value={v.opening_balance} invalid={!!errs.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} />}</Field>
              <Field label={t('As of')} error={errs.opening_balance_date}>{(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={v.opening_balance_date} invalid={!!errs.opening_balance_date} onChange={(e) => set('opening_balance_date', e.target.value)} />}</Field>
              {Number(v.opening_balance) > 0 && (
                <Field label={t('Store')} error={errs.store_id} className="span2">
                  {(fid, d) => <Select id={fid} aria-describedby={d} value={v.store_id || activeStoreId} onChange={(e) => set('store_id', e.target.value)} options={(stores.data || []).map((s) => ({ value: s.id, label: `${s.name}${s.branch_name ? ` · ${s.branch_name}` : ''}` }))} />}
                </Field>
              )}
            </div>
          </Card>
          <button type="submit" hidden />
        </form>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{creating ? t('New user') : t('Edit user')}</span><b style={{ fontSize: 14 }}>{dirty ? t('Unsaved changes') : t('No changes')}</b></div>
        <Button variant="primary" icon="check" loading={saving} onClick={save}>{t('Save')}</Button>
      </div>
    </>
  );
}
