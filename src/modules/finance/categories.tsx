import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import { IconButton } from '@/ui/Button';
import { fmtDateTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { loadExpenseCategories, loadUsers, useOnce } from './components';

export const CATEGORY = '/v1/expense-category';
type Category = { id: string; name: string; parent_id?: string | null; parent_name?: string; created_by_name?: string; created_at?: string };

export function categoryListConfig(storeId: string, onEdit: (c: Category) => void, onCreate: () => void, onExpenses: (c: Category) => void): ListConfig<Category> {
  return {
    title: 'Expense categories',
    subtitle: 'Group expenses for reporting; each category gets its own expense account',
    icon: 'tag',
    endpoint: CATEGORY,
    resource: 'expense_category',
    select: 'id,name,parent_id,parent_name,created_by_name,created_at',
    defaultSort: { key: 'name', dir: 1 },
    searchKey: 'name',
    searchPlaceholder: 'Search categories…',
    createLabel: 'New category',
    onCreate,
    onRowClick: onEdit,
    filters: [
      { id: 'parent_name', label: 'Parent', type: 'text' },
      { id: 'created_by', label: 'Created by', type: 'picker', load: (q, s) => loadUsers(storeId, q, s) },
      { id: 'created', label: 'Created at', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    columns: [
      { key: 'name', header: tt('Name'), sortKey: 'name', render: (r) => <b><bdi>{r.name}</bdi></b> },
      { key: 'parent', header: tt('Parent'), sortKey: 'parent_name', render: (r) => (r.parent_name ? <bdi>{r.parent_name}</bdi> : <span className="muted">—</span>) },
      { key: 'created_by', header: tt('Created by'), sortKey: 'created_by_name', hideBelow: 'md', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'md', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
    ],
    rowActions: (r) => <IconButton icon="wallet" label={`${tt('Expenses')}: ${r.name}`} onClick={() => onExpenses(r)} />,
    mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, subtitle: r.parent_name ? <bdi>{r.parent_name}</bdi> : undefined, meta: fmtDateTime(r.created_at) }),
  };
}

export function ExpenseCategoriesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [form, setForm] = useState<{ open: boolean; initial: Category | null }>({ open: false, initial: null });
  const openNew = useCallback(() => setForm({ open: true, initial: null }), []);
  useOnce(sp.get('new') === '1' && can('expense_category', 'create'), openNew);
  const close = () => {
    setForm({ open: false, initial: null });
    if (sp.has('new')) setSp((p) => { const n = new URLSearchParams(p); n.delete('new'); return n; }, { replace: true });
  };
  const fields = useMemo<FieldDef[]>(() => [
    { name: 'name', label: 'Name', type: 'text', required: true, span: 2 },
    { name: 'parent_id', label: 'Parent category (optional)', type: 'picker', labelField: 'parent_name', span: 2, load: (q, s) => loadExpenseCategories(storeId, q, s) },
  ], [storeId]);
  const cfg = categoryListConfig(
    storeId,
    (c) => setForm({ open: true, initial: c }),
    openNew,
    (c) => nav(`/finance/expenses?f.category=${encodeURIComponent(`${c.id}|${c.name}`)}`),
  );
  if (!can('expense_category', 'update')) cfg.onRowClick = undefined;
  return (
    <>
      <ListPage config={cfg} />
      <EntityForm open={form.open} onClose={close} endpoint={CATEGORY} title={form.initial ? t('Edit category') : t('New category')} fields={fields} initial={form.initial}
        toBody={(b) => ({ name: b.name, parent_id: b.parent_id || null })} />
    </>
  );
}
