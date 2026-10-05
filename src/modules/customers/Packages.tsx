import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/client';
import { useRemove, useSave } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { NAV } from '@/shell/nav';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';
import { Banner, useConfirm } from '@/ui/Misc';
import { Drawer } from '@/ui/Overlay';
import { Tag } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate } from '@/lib/format';
import { t as tt } from '@/i18n';
import { PACKAGE } from './api';
import { LEGACY_TAB_IDS, toggleTab } from './logic';
import './customers.css';

export interface CustomerPackage { id: string; name: string; name_in_arabic?: string; code?: string; tab_ids?: string[]; created_by_name?: string; created_at?: string }

/** Menu tabs a package can enable, grouped like the sidebar; limited to ids the legacy sidebar understands. */
export function packageTabGroups(): { title: string; items: { id: string; label: string; adminOnly?: boolean }[] }[] {
  const seen = new Set<string>();
  return NAV.map((m) => ({
    title: m.title,
    items: m.groups.flatMap((g) => g.items).filter((i) => LEGACY_TAB_IDS.includes(i.id) && !seen.has(i.id) && seen.add(i.id)).map((i) => ({ id: i.id, label: i.label, adminOnly: i.adminOnly })),
  })).filter((g) => g.items.length > 0);
}

export function PackageForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: CustomerPackage | null }) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSave<CustomerPackage>(PACKAGE);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  const [tabs, setTabs] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const groups = useMemo(packageTabGroups, []);
  const all = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.id)), [groups]);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || ''); setNameAr(initial?.name_in_arabic || ''); setCode(initial?.code || ''); setTabs(initial?.tab_ids || []); setErrors({});
  }, [open, initial]);

  const submit = async () => {
    if (!name.trim()) { setErrors({ name: t('Name is required') }); return; }
    try {
      await save.mutateAsync({ id: initial?.id, body: { name: name.trim(), name_in_arabic: nameAr.trim(), code: code.trim(), tab_ids: tabs } });
      toast.success(initial?.id ? t('Saved') : t('Created'));
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors); else toast.error((e as Error).message);
    }
  };
  const other = Object.entries(errors).filter(([k, m]) => m && !['name'].includes(k));
  return (
    <Drawer open={open} onClose={onClose} title={initial?.id ? t('Edit package') : t('New customer package')} width={620}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="check" loading={save.isPending} onClick={() => void submit()}>{initial?.id ? t('Save changes') : t('Create')}</Button></>}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        {other.length > 0 && <Banner tone="crit">{other.map(([, m]) => m).join(' · ')}</Banner>}
        <div className="grid-2c">
          <Field label={t('Name')} required error={errors.name}>{(id, d) => <Input id={id} aria-describedby={d} value={name} invalid={!!errors.name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: '' })); }} autoFocus />}</Field>
          <Field label={t('Name (Arabic)')}>{(id) => <Input id={id} dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />}</Field>
          <Field label={t('Code')}>{(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>{t('Enabled menu tabs')} <span className="muted num">({tabs.length}/{all.length})</span></b>
          <span className="row" style={{ gap: 6 }}>
            <Button size="sm" variant="ghost" onClick={() => setTabs(all)}>{t('Select all')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setTabs([])}>{t('Clear all')}</Button>
          </span>
        </div>
        {groups.map((g) => (
          <fieldset key={g.title} className="cu-tabset">
            <legend>{t(g.title)}</legend>
            {g.items.map((i) => (
              <label key={i.id} className="checkline">
                <input type="checkbox" className="chk" checked={tabs.includes(i.id)} onChange={() => setTabs((x) => toggleTab(x, i.id))} />
                <span>{t(i.label)}{i.adminOnly && <> <Tag>{t('admin')}</Tag></>}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}

export function packageListConfig(o: { onEdit: (p: CustomerPackage | null) => void; onDelete: (p: CustomerPackage) => void; canUpdate: boolean; canDelete: boolean }): ListConfig<CustomerPackage> {
  return {
    title: 'Customer packages',
    subtitle: 'Menu packages for SaaS stores — which sidebar tabs a store gets',
    icon: 'box',
    endpoint: PACKAGE,
    resource: 'customer_packages',
    storeScoped: false,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'name',
    searchPlaceholder: 'Search package name…',
    onCreate: () => o.onEdit(null),
    createLabel: 'New package',
    onRowClick: o.canUpdate ? (r) => o.onEdit(r) : undefined,
    columns: [
      { key: 'name', header: tt('Name'), sortKey: 'name', className: 'two', render: (r) => <><b>{r.name}</b>{r.name_in_arabic && <span><bdi dir="rtl">{r.name_in_arabic}</bdi></span>}</> },
      { key: 'code', header: tt('Code'), hideBelow: 'md', render: (r) => <span className="mono">{r.code || '—'}</span> },
      { key: 'tabs', header: tt('Tabs enabled'), align: 'end', render: (r) => <span className="num">{tt('{{n}} tabs', { n: r.tab_ids?.length || 0 })}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'md', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'lg', render: (r) => <span className="num muted">{fmtDate(r.created_at)}</span> },
    ],
    rowActions: (r) => (
      <span className="row" style={{ gap: 2, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
        {o.canUpdate && <IconButton icon="edit" label={tt('Edit')} onClick={() => o.onEdit(r)} />}
        {o.canDelete && <IconButton icon="trash" label={tt('Delete')} onClick={() => o.onDelete(r)} />}
      </span>
    ),
    mobileCard: (r) => ({ title: r.name, amount: tt('{{n}} tabs', { n: r.tab_ids?.length || 0 }), subtitle: r.code, meta: r.created_by_name }),
  };
}

export function CustomerPackagesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { can } = useAuth();
  const remove = useRemove(PACKAGE);
  const [dlg, ask] = useConfirm();
  const [editing, setEditing] = useState<CustomerPackage | null | undefined>(undefined);
  const onDelete = async (p: CustomerPackage) => {
    if (!(await ask(t('Delete package?'), { body: <p>{p.name} — {t('Stores using this package keep their current tabs until it is changed.')}</p>, danger: true, confirmLabel: t('Delete') }))) return;
    try { await remove.mutateAsync(p.id); toast.success(t('Package deleted')); } catch (e) { toast.error((e as Error).message); }
  };
  const cfg = packageListConfig({ onEdit: setEditing, onDelete: (p) => void onDelete(p), canUpdate: can('customer_packages', 'update', true), canDelete: can('customer_packages', 'delete', true) });
  return (
    <>
      <ListPage config={cfg} />
      <PackageForm open={editing !== undefined} initial={editing || null} onClose={() => setEditing(undefined)} />
      {dlg}
    </>
  );
}
