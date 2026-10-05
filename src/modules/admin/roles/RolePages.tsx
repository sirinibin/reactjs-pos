import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useList, useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import type { Permission } from '@/auth/permissions';
import { NAV } from '@/shell/nav';
import { usePageMeta } from '@/shell/Workspace';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { DataGrid, Pager } from '@/ui/DataGrid';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, SearchInput } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Pill } from '@/ui/Pill';
import { Banner, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { useDebounced } from '@/framework/useListState';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { ACTIONS, buildMatrix, columnAll, everything, grantedCount, matrixToPermissions, resourcesFromNav, rowAll, setAll, setCell, setColumn, setRow, type Matrix, type ResourceRow } from '../lib/rbac';
import { useSaveShortcut, useUnsavedGuard } from '../components/kit';
import '../admin.css';

export const ROLE = '/v1/user-role';
export const ROLES_PATH = '/admin/roles';
type Role = { id: string; name: string; store_id?: string; store_name?: string; permissions?: Permission[]; created_by_name?: string; created_at?: string; updated_at?: string; updated_by_name?: string };

const ROWS: ResourceRow[] = resourcesFromNav(NAV);

/** Tell other tabs (and the shell) that permissions may have changed (legacy rbac_role_updated). */
function announceRoleChange() {
  try { localStorage.setItem('rbac_role_updated', String(Date.now())); } catch { /* storage off */ }
  window.dispatchEvent(new CustomEvent('rbac_role_updated'));
}

export function RolesListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  usePageMeta(t('Roles & permissions'), 'shield');
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [confirmEl, ask] = useConfirm();
  // This endpoint pages with page_size (not limit).
  const list = useList<Role>(ROLE, { search: { name: dq || undefined }, page, page_size: size });
  const rows = list.data?.rows || [];

  const del = async (r: Role) => {
    if (!(await ask(t('Delete role “{{name}}”?', { name: r.name }), { danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${ROLE}/${r.id}`, { search: { store_id: storeId } });
      toast.success(t('Role deleted'));
      announceRoleChange();
      qc.invalidateQueries({ queryKey: [ROLE] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Roles & permissions')}</h1><p>{t('Which screens each role can open and change in this store')}</p></div>
        <div className="acts">{can('user_roles', 'create') && <Button variant="primary" icon="plus" onClick={() => nav(`${ROLES_PATH}/new`)}>{t('New role')}</Button>}</div>
      </div>
      <div className="card">
        <div className="gridbar">
          <SearchInput value={q} onChange={(x) => { setQ(x); setPage(1); }} placeholder={t('Search role name…')} aria-label={t('Search')} />
          <span className="spacer" />
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => list.refetch()} />
        </div>
        {list.isError ? <div style={{ padding: 12 }}><ErrorState error={list.error} onRetry={() => list.refetch()} /></div> : (
          <DataGrid<Role>
            label={t('Roles')}
            rows={rows}
            rowKey={(r) => r.id}
            loading={list.isLoading}
            onRowClick={(r) => nav(`${ROLES_PATH}/${r.id}`)}
            columns={[
              { key: 'name', header: t('Role'), render: (r) => <b><bdi>{r.name}</bdi></b> },
              { key: 'res', header: t('Access'), render: (r) => <span className="num">{t('{{n}} resources', { n: grantedCount(r.permissions) })}</span> },
              { key: 'by', header: t('Created by'), hideBelow: 'md', render: (r) => r.created_by_name || '—' },
              { key: 'at', header: t('Created'), hideBelow: 'lg', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
            ]}
            rowActions={(r) => <span className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
              {can('user_roles', 'update') && <IconButton icon="edit" label={`${t('Edit')} ${r.name}`} onClick={() => nav(`${ROLES_PATH}/${r.id}/edit`)} />}
              {can('user_roles', 'delete') && <IconButton icon="trash" label={`${t('Delete')} ${r.name}`} onClick={() => del(r)} />}
            </span>}
            mobileCard={(r) => ({ title: <bdi>{r.name}</bdi>, amount: <span className="num">{grantedCount(r.permissions)}</span>, subtitle: r.created_by_name, meta: fmtDate(r.created_at) })}
            empty={<div style={{ padding: 24, textAlign: 'center' }} className="muted">{t('No roles yet. Create one to grant non-admin users access to specific screens.')}</div>}
          />
        )}
        <Pager page={page} pageSize={size} total={list.data?.total || 0} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} />
      </div>
      {confirmEl}
    </section>
  );
}

function PermissionMatrix({ m, onChange, readOnly }: { m: Matrix; onChange?: (m: Matrix) => void; readOnly?: boolean }) {
  const { t } = useTranslation();
  const groups = useMemo(() => {
    const g = new Map<string, ResourceRow[]>();
    ROWS.forEach((r) => { if (!g.has(r.group)) g.set(r.group, []); g.get(r.group)!.push(r); });
    return Array.from(g.entries());
  }, []);
  const label = (a: string) => t(a.charAt(0).toUpperCase() + a.slice(1));
  return (
    <div className="tw" style={{ maxHeight: '70vh' }}>
      <table className="adm-matrix" aria-label={t('Permissions')}>
        <thead>
          <tr>
            <th>{t('Screen')}</th>
            {ACTIONS.map((a) => (
              <th key={a}>
                {readOnly ? label(a) : (
                  <label className="row" style={{ justifyContent: 'center', gap: 4, flexWrap: 'nowrap' }}>
                    <input type="checkbox" className="chk" checked={columnAll(m, a)} onChange={(e) => onChange!(setColumn(m, a, e.target.checked))} aria-label={t('All {{action}}', { action: label(a) })} />
                    <span>{label(a)}</span>
                  </label>
                )}
              </th>
            ))}
            {!readOnly && (
              <th>
                <label className="row" style={{ justifyContent: 'center', gap: 4, flexWrap: 'nowrap' }}>
                  <input type="checkbox" className="chk" checked={everything(m)} onChange={(e) => onChange!(setAll(m, e.target.checked))} aria-label={t('Grant everything')} />
                  <span className="hide-sm">{t('All')}</span>
                </label>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map(([g, rows]) => (
            <Fragment key={g}>
              <tr className="grp"><td colSpan={readOnly ? 5 : 6}>{t(g)}</td></tr>
              {rows.map((r) => (
                <tr key={r.resource}>
                  <td>{t(r.label)}</td>
                  {ACTIONS.map((a) => (
                    <td key={a}>
                      {readOnly
                        ? (m[r.resource]?.[a] ? <Icon name="check" size="s" className="yes" label={t('Yes')} /> : <span className="no" aria-label={t('No')}>—</span>)
                        : <input type="checkbox" className="chk" checked={!!m[r.resource]?.[a]} onChange={(e) => onChange!(setCell(m, r.resource, a, e.target.checked))} aria-label={`${t(r.label)} · ${label(a)}`} />}
                    </td>
                  ))}
                  {!readOnly && <td><input type="checkbox" className="chk" checked={rowAll(m, r.resource)} onChange={(e) => onChange!(setRow(m, r.resource, e.target.checked))} aria-label={`${t(r.label)} · ${t('All')}`} /></td>}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoleViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const q = useRecord<Role>(ROLE, id);
  const r = q.data;
  usePageMeta(r ? `${t('Role')}: ${r.name}` : t('Role'), 'shield');
  const [confirmEl, ask] = useConfirm();
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!r) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  const del = async () => {
    if (!(await ask(t('Delete role “{{name}}”?', { name: r.name }), { danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${ROLE}/${r.id}`, { search: { store_id: storeId } });
      toast.success(t('Role deleted'));
      announceRoleChange();
      qc.invalidateQueries({ queryKey: [ROLE] });
      nav(ROLES_PATH);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Admin'), to: ROLES_PATH }, { label: t('Roles & permissions'), to: ROLES_PATH }, { label: <bdi>{r.name}</bdi> }]}
        icon="shield"
        title={<bdi>{r.name}</bdi>}
        pills={<>{' '}<Pill tone="info" icon="shield">{t('{{n}} resources', { n: grantedCount(r.permissions) })}</Pill></>}
        subtitle={`${t('Created by')} ${r.created_by_name || '—'} · ${fmtDateTime(r.created_at)}`}
        actions={<>
          {can('user_roles', 'delete') && <Button variant="danger" icon="trash" onClick={del}>{t('Delete')}</Button>}
          {can('user_roles', 'update') && <Button variant="primary" icon="edit" onClick={() => nav(`${ROLES_PATH}/${r.id}/edit`)}>{t('Edit')}</Button>}
        </>}
      />
      <ObjectBody>
        <Card title={t('Permissions')} bodyClass="card-b-tight"><PermissionMatrix m={buildMatrix(ROWS, r.permissions || [])} readOnly /></Card>
      </ObjectBody>
      {confirmEl}
    </>
  );
}

export function RoleEditorPage() {
  const { id } = useParams();
  const q = useRecord<Role>(ROLE, id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <RoleEditor key={id || 'new'} id={id} existing={q.data} />;
}

function RoleEditor({ id, existing }: { id?: string; existing?: Role }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const init = useMemo(() => ({ name: existing?.name || '', m: buildMatrix(ROWS, existing ? existing.permissions || [] : null) }), [existing]);
  const [name, setName] = useState(init.name);
  const [m, setM] = useState<Matrix>(init.m);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = name !== init.name || JSON.stringify(m) !== JSON.stringify(init.m);
  useUnsavedGuard(dirty);
  usePageMeta(id ? `${t('Edit')} ${existing?.name || ''}` : t('New role'), 'shield');
  const allowed = can('user_roles', id ? 'update' : 'create');

  const save = async () => {
    if (saving || !allowed) return;
    if (!name.trim()) { setErrs({ name: t('Role name is required') }); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), store_id: storeId, permissions: matrixToPermissions(m) };
      const query = { search: { store_id: storeId } };
      const r = id ? await api.put<Role>(`${ROLE}/${id}`, body, query) : await api.post<Role>(ROLE, body, query);
      toast.success(id ? t('Role updated') : t('Role created'));
      announceRoleChange();
      qc.invalidateQueries({ queryKey: [ROLE] });
      nav(`${ROLES_PATH}/${r.result?.id || id}`, { replace: !id });
    } catch (e) {
      if (e instanceof ApiError) setErrs(e.errors);
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  useSaveShortcut(save, allowed);
  const other = Object.entries(errs).filter(([k, v]) => v && k !== 'name');

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Admin'), to: ROLES_PATH }, { label: t('Roles & permissions'), to: ROLES_PATH }, { label: id ? <bdi>{existing?.name}</bdi> : t('New') }]}
        icon="shield"
        title={id ? <bdi>{existing?.name}</bdi> : t('New role')}
        pills={dirty ? <>{' '}<Pill tone="warn" icon="clock">{t('Unsaved')}</Pill></> : undefined}
        actions={<div className="row doc-actions">
          <Button variant="ghost" onClick={() => nav(id ? `${ROLES_PATH}/${id}` : ROLES_PATH)}>{t(dirty ? 'Discard' : 'Close')}</Button>
          <Button variant="primary" icon="check" loading={saving} disabled={!allowed} onClick={save}>{t(id ? 'Save changes' : 'Create role')} <kbd className="hide-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd></Button>
        </div>}
      />
      <ObjectBody>
        {other.length > 0 && <Banner tone="crit">{other.map(([, v]) => v).join(' · ')}</Banner>}
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            <Field label={t('Role name')} required error={errs.name}>{(fid, d) => <Input id={fid} aria-describedby={d} placeholder={t('e.g. Sales Manager')} value={name} invalid={!!errs.name} onChange={(e) => { setName(e.target.value); setErrs((x) => ({ ...x, name: '' })); }} autoFocus />}</Field>
          </form>
        </Card>
        <Card title={t('Permissions')} sub={t('Read lets users open a screen; create, update and delete control the actions on it. Granting an action also grants read.')} bodyClass="card-b-tight">
          <PermissionMatrix m={m} onChange={setM} />
        </Card>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{id ? t('Edit role') : t('New role')}</span><b style={{ fontSize: 14 }}>{dirty ? t('Unsaved changes') : t('No changes')}</b></div>
        <Button variant="primary" icon="check" loading={saving} disabled={!allowed} onClick={save}>{t('Save')}</Button>
      </div>
    </>
  );
}
