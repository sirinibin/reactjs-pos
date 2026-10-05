import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Query } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { filtersToSearch, type FilterDef } from '@/framework/filters';
import { useListState } from '@/framework/useListState';
import { searchParties, partyToOption, type Party } from '@/framework/doc/lookups';
import { AsyncPicker } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner, EmptyState, ErrorState, Skeleton } from '@/ui/Misc';
import { KeyValues, ObjectBody, ObjectHeader, SidePanel } from '@/ui/ObjectPage';
import { Pill, Tag } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { downloadText, toCsv } from '@/lib/exportCsv';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, parseNumber, toApiDate } from '@/lib/format';
import { t as tt } from '@/i18n';
import { attachmentUrl, FileDrop, loadExpenseCategories, loadUsers, Money, PayTag, Thumb } from './components';
import { blankExpense as blank, fromExpense, toExpenseBody, type Expense, type FormState } from './bodies';

export { fromExpense, toExpenseBody, type Expense };
import { BANK_METHODS, EXPENSE_PAYMENT_METHODS, EXPENSE_REPORT_HEADERS, expenseReport, expenseReportName, expenseVat, validateExpense, type ExpenseRow } from './logic';

export const EXPENSE = '/v1/expense';
const LIST = '/finance/expenses';


const SELECT = 'id,code,date,amount,vendor_id,vendor_name,vendor_name_arabic,vendor_invoice_no,description,payment_method,vat_price,category_name,category_id,created_by_name,created_at,images';

export function expenseFilters(storeId: string): FilterDef[] {
  return [
    { id: 'date', label: 'Date', type: 'daterange' },
    { id: 'category', label: 'Category', type: 'picker', toSearch: (v) => ({ category_id: v }), load: (q, s) => loadExpenseCategories(storeId, q, s) },
    { id: 'exclude_category', label: 'Excl. category', type: 'picker', toSearch: (v) => ({ exclude_category_id: v }), load: (q, s) => loadExpenseCategories(storeId, q, s) },
    { id: 'vendor', label: 'Vendor', type: 'picker', toSearch: (v) => ({ vendor_id: v }), load: async (q, s) => (await searchParties('vendor', storeId, q, s)).map(partyToOption) },
    { id: 'payment_method', label: 'Payment method', type: 'select', options: EXPENSE_PAYMENT_METHODS },
    { id: 'exclude_payment_method', label: 'Excl. payment method', type: 'select', options: EXPENSE_PAYMENT_METHODS },
    { id: 'amount', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    { id: 'vat_price', label: 'VAT', type: 'number', placeholder: 'e.g. >0' },
    { id: 'vendor_invoice_no', label: 'Vendor invoice no.', type: 'text' },
    { id: 'description', label: 'Description', type: 'text' },
    { id: 'created_by', label: 'Created by', type: 'picker', load: (q, s) => loadUsers(storeId, q, s) },
    { id: 'created', label: 'Created at', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
  ];
}

export function expenseListConfig(opts: { storeId: string; salary: boolean }): ListConfig<Expense> {
  return {
    title: 'Expenses',
    subtitle: 'Operating costs paid from cash, bank or the purchase fund',
    icon: 'wallet',
    endpoint: EXPENSE,
    resource: 'expenses',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/^\d|^EXP-?/i.test(q) ? { code: q } : { description: q }),
    searchPlaceholder: 'Search expense # or description…',
    createPath: `${LIST}/new`,
    createLabel: 'New expense',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All expenses' },
      { id: 'cash', label: 'Cash', search: { payment_method: 'cash' } },
      { id: 'bank', label: 'Bank', search: { payment_method: BANK_METHODS.join(',') } },
      { id: 'fund', label: 'Purchase fund', search: { payment_method: 'purchase_fund' } },
      { id: 'vat', label: 'With VAT', search: { vat_price: '>0' } },
    ],
    filters: expenseFilters(opts.storeId),
    summary: (m) => [
      { label: 'Total', value: fmtMoney(m.total) },
      { label: 'Cash', value: fmtMoney(m.cash) },
      { label: 'Bank', value: fmtMoney(m.bank) },
      { label: 'Purchase fund', value: fmtMoney(m.purchase_fund) },
      { label: 'VAT paid', value: fmtMoney(m.vat) },
      ...(opts.salary ? [{ label: 'Salary paid', value: fmtMoney(m.salary_paid) }] : []),
    ],
    columns: [
      { key: 'code', header: tt('Expense #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'description', header: tt('Description'), className: 'two', render: (r) => <><b><bdi>{r.description || '—'}</bdi></b><span>{(r.category_name || []).join(', ')}</span></> },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <Money value={r.amount} strong /> },
      { key: 'vat', header: tt('VAT'), sortKey: 'vat_price', align: 'end', hideBelow: 'md', render: (r) => <Money value={r.vat_price} tone={r.vat_price ? undefined : 'muted'} /> },
      { key: 'vendor', header: tt('Vendor'), sortKey: 'vendor_name', hideBelow: 'md', render: (r) => (r.vendor_name ? <bdi>{[r.vendor_name, r.vendor_name_arabic].filter(Boolean).join(' | ')}</bdi> : <span className="muted">—</span>) },
      { key: 'vinv', header: tt('Vendor invoice no.'), hideBelow: 'xl', render: (r) => r.vendor_invoice_no || '—' },
      { key: 'pm', header: tt('Payment method'), sortKey: 'payment_method', render: (r) => <PayTag method={r.payment_method} /> },
      { key: 'created_by', header: tt('Created by'), sortKey: 'created_by_name', hideBelow: 'lg', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.amount), subtitle: <bdi>{r.description}</bdi>, meta: <>{fmtDate(r.date)} <PayTag method={r.payment_method} /> {(r.category_name || [])[0]}</> }),
    exportColumns: [
      { header: 'Expense #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Description', value: (r) => r.description },
      { header: 'Category', value: (r) => (r.category_name || []).join(', ') },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'VAT', value: (r) => r.vat_price },
      { header: 'Vendor', value: (r) => r.vendor_name },
      { header: 'Vendor invoice no.', value: (r) => r.vendor_invoice_no },
      { header: 'Payment method', value: (r) => r.payment_method },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: 'expenses',
  };
}

/** Legacy "Expense Report": every matching expense with bilingual VAT columns + TOTAL row. */
function ExpenseReportButton({ filters, q }: { filters: FilterDef[]; q: Record<string, string> }) {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const search: Query = { store_id: storeId, ...filtersToSearch(filters, q) };
      const all: ExpenseRow[] = [];
      for (let page = 1; page <= 50; page++) {
        const r = await api.get<ExpenseRow[]>(EXPENSE, { search, page, limit: 500, sort: 'date', select: `${SELECT},vendor.id,vendor.vat_no` });
        all.push(...(r.result || []));
        if (!r.result || r.result.length < 500) break;
      }
      if (!all.length) { toast.info(t('No expenses match these filters.')); return; }
      const name = expenseReportName({ from: search.from_date as string, to: search.to_date as string }, toApiDate(new Date()));
      downloadText(`${name}.csv`, toCsv(EXPENSE_REPORT_HEADERS, expenseReport(all)));
      toast.success(t('Exported {{n}} rows', { n: all.length }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return <Button icon="file" loading={busy} onClick={run}>{t('Expense report')}</Button>;
}

export function ExpensesListPage() {
  const storeId = useStoreId();
  const { setting } = useAuth();
  const cfg = expenseListConfig({ storeId, salary: !!setting('enable_employee_module') });
  const { state } = useListState({ sort: cfg.defaultSort });
  cfg.headerActions = <ExpenseReportButton filters={cfg.filters!} q={state.filters} />;
  return <ListPage config={cfg} />;
}

// ------------------------------------------------------------------ editor




export function ExpenseEditorPage() {
  const { id } = useParams();
  const q = useRecord<Expense>(EXPENSE, id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <ExpenseEditor key={id || 'new'} id={id} existing={q.data} />;
}

function ExpenseEditor({ id, existing }: { id?: string; existing?: Expense }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can, store } = useAuth();
  usePageMeta(id ? existing?.code : t('New expense'), 'wallet');
  const [s, setS] = useState<FormState>(() => (existing ? fromExpense(existing) : blank()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const update = (p: Partial<FormState>) => {
    setS((x) => ({ ...x, ...p }));
    setDirty(true);
    setErrors((e) => {
      const n = { ...e };
      Object.keys(p).forEach((k) => delete n[k === 'categories' ? 'category_id' : k === 'date' ? 'date_str' : k]);
      return n;
    });
  };
  const vat = store?.vat_percent ?? 15;
  const vatPreview = expenseVat(parseNumber(s.amount), vat, !!s.vendor && !s.vendor.id.startsWith('new:'));
  const canSave = can('expenses', id ? 'update' : 'create');

  const save = useCallback(async (andNew?: boolean) => {
    const local = validateExpense({ amount: s.amount, description: s.description, payment_method: s.payment_method, category_ids: s.categories.map((c) => c.id), date: s.date });
    if (Object.keys(local).length) {
      setErrors(Object.fromEntries(Object.entries(local).map(([k, v]) => [k, t(v)])));
      toast.error(t('Please fix the highlighted fields.'));
      return;
    }
    setSaving(true);
    try {
      const body = toExpenseBody(s, storeId);
      const r = id ? await api.put<Expense>(`${EXPENSE}/${id}`, body, { search: { store_id: storeId } }) : await api.post<Expense>(EXPENSE, body, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [EXPENSE] });
      toast.success(id ? t('{{code}} saved', { code: r.result?.code || existing?.code }) : t('{{code}} created', { code: r.result?.code || '' }));
      setDirty(false);
      if (andNew) { setS(blank()); setErrors({}); nav(`${LIST}/new`, { replace: true }); }
      else nav(`${LIST}/${r.result?.id || id}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.errors); toast.error(err.message); }
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [s, id, storeId, qc, toast, t, nav, existing?.code]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (canSave) save(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [save, canSave]);

  const createCategory = async (name: string) => {
    try {
      const r = await api.post<any>('/v1/expense-category', { store_id: storeId, name }, { search: { store_id: storeId } });
      update({ categories: [...s.categories, { id: r.result.id, label: r.result.name, data: r.result }] });
      qc.invalidateQueries({ queryKey: ['/v1/expense-category'] });
      toast.success(t('Category “{{n}}” created', { n: name }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const known = ['amount', 'description', 'payment_method', 'category_id', 'date_str', 'vendor_id', 'vendor_invoice_no'];
  const other = Object.entries(errors).filter(([k, m]) => m && !known.includes(k) && !/^category_id_\d+$/.test(k));
  const catErr = errors.category_id || Object.entries(errors).find(([k]) => /^category_id_\d+$/.test(k))?.[1];

  const actions = (
    <div className="row doc-actions">
      <Button variant="ghost" onClick={() => nav(id ? `${LIST}/${id}` : LIST)}>{t(dirty ? 'Discard' : 'Close')}</Button>
      {!id && <Button onClick={() => save(true)} disabled={!canSave} loading={saving}>{t('Save & new')}</Button>}
      <Button variant="primary" icon="check" onClick={() => save()} loading={saving} disabled={!canSave}>{t(id ? 'Save changes' : 'Save')} <kbd className="kbd-on-pri">Ctrl S</kbd></Button>
    </div>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Finance'), to: LIST }, { label: t('Expenses'), to: LIST }, { label: id ? existing?.code || '' : t('New') }]}
        icon="wallet"
        title={id ? <span className="mono" style={{ fontSize: 20 }}>{existing?.code}</span> : t('New expense')}
        pills={<>{!id && <Pill tone="neutral" icon="edit">{t('Draft')}</Pill>}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
        actions={actions}
      />
      <ObjectBody side={
        <aside className="stack">
          <Card title={t('Summary')}>
            <KeyValues items={[
              { k: t('Amount (incl. VAT)'), v: <Money value={parseNumber(s.amount)} strong /> },
              { k: `${t('VAT')} ${vatPreview ? `${vat}%` : ''}`, v: <Money value={vatPreview} /> },
              { k: t('Before VAT'), v: <Money value={parseNumber(s.amount) - vatPreview} /> },
            ]} />
            <p className="hint" style={{ marginTop: 10 }}>{t('VAT is only claimed when the expense is linked to a registered vendor.')}</p>
          </Card>
        </aside>
      }>
        {other.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {other.map(([, m]) => m).join(' · ')}</Banner>}
        <Card title={t('Details')}>
          <form className="fgrid" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label={t('Description')} required error={errors.description} className="span2">
              {(fid, d) => <Textarea id={fid} aria-describedby={d} rows={2} autoFocus={!id} invalid={!!errors.description} value={s.description} onChange={(e) => update({ description: e.target.value })} />}
            </Field>
            <Field label={t('Amount')} required error={errors.amount} hint={t('Including VAT')}>
              {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" invalid={!!errors.amount} value={s.amount} onChange={(e) => update({ amount: e.target.value })} />}
            </Field>
            <Field label={t('Date')} required error={errors.date_str}>
              {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" invalid={!!errors.date_str} value={s.date} onChange={(e) => update({ date: e.target.value })} />}
            </Field>
            <Field label={t('Payment method')} required error={errors.payment_method}>
              {(fid, d) => <Select id={fid} aria-describedby={d} invalid={!!errors.payment_method} value={s.payment_method} onChange={(e) => update({ payment_method: e.target.value })} options={EXPENSE_PAYMENT_METHODS.map((o) => ({ ...o, label: t(o.label) }))} />}
            </Field>
            <Field label={t('Vendor')} error={errors.vendor_id} hint={t('Optional — type a new name to create the vendor on save')} className="span2">
              {(fid, d) => (
                <AsyncPicker<Party> id={fid} aria-describedby={d} value={s.vendor} onChange={(o) => update({ vendor: o })} clearable eager
                  placeholder={t('Vendor name / mobile / VAT no.')}
                  load={async (q, sig) => (await searchParties('vendor', storeId, q, sig)).map(partyToOption)}
                  onCreate={(q) => update({ vendor: { id: `new:${q}`, label: q, data: { id: '', name: q } } })} createLabel={t('Use as a new vendor')} />
              )}
            </Field>
            <Field label={t('Vendor invoice no.')} error={errors.vendor_invoice_no}>
              {(fid, d) => <Input id={fid} aria-describedby={d} value={s.vendor_invoice_no} onChange={(e) => update({ vendor_invoice_no: e.target.value })} />}
            </Field>
            <Field label={t('Categories')} required error={catErr} className="span2">
              {(fid, d) => (
                <div className="stack" style={{ gap: 8 }}>
                  <AsyncPicker id={fid} aria-describedby={d} value={null} resetOnPick eager invalid={!!catErr} placeholder={t('Add a category…')}
                    onChange={(o) => o && !s.categories.some((c) => c.id === o.id) && update({ categories: [...s.categories, o] })}
                    load={async (q, sig) => (await loadExpenseCategories(storeId, q, sig)).filter((o) => !s.categories.some((c) => c.id === o.id))}
                    onCreate={can('expense_category', 'create') ? createCategory : undefined} createLabel={t('Create category')} />
                  {s.categories.length > 0 && (
                    <div className="row" aria-label={t('Selected categories')}>
                      {s.categories.map((c) => (
                        <span key={c.id} className="chip"><bdi>{c.label}</bdi>
                          <IconButton icon="x" label={`${t('Remove')} ${c.label}`} onClick={() => update({ categories: s.categories.filter((x) => x.id !== c.id) })} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
            <button type="submit" hidden />
          </form>
        </Card>
        <Card title={<>{t('Attachments')} <span className="muted" style={{ fontWeight: 500 }}>· {s.images.length + s.pending.length}</span></>}>
          <div className="stack" style={{ gap: 10 }}>
            <FileDrop onFiles={(f) => update({ pending: [...s.pending, ...f] })} />
            {(s.images.length > 0 || s.pending.length > 0) && (
              <div className="thumbs">
                {s.images.map((img) => <Thumb key={img} src={attachmentUrl(img, storeId, 'expenses')} name={img.split('/').pop() || img} onRemove={() => update({ images: s.images.filter((x) => x !== img) })} />)}
                {s.pending.map((p, i) => <Thumb key={`p${i}`} src={p.dataUrl} name={p.name} onRemove={() => update({ pending: s.pending.filter((_, j) => j !== i) })} />)}
              </div>
            )}
            {s.pending.length > 0 && <div className="hint">{t('New files are uploaded when you save.')}</div>}
          </div>
        </Card>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Amount')}</span><b className="num">{fmtMoney(parseNumber(s.amount))}</b></div>
        <Button variant="primary" icon="check" onClick={() => save()} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ view

export function ExpenseViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can } = useAuth();
  const q = useRecord<Expense>(EXPENSE, id);
  usePageMeta(q.data?.code, 'wallet');
  const d = q.data;
  const cats = useMemo<string[]>(() => (d ? d.category_name || (d.category || []).map((c: any) => c.name) : []), [d]);
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!d) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={200} /></div>;
  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Finance'), to: LIST }, { label: t('Expenses'), to: LIST }, { label: d.code }]}
        icon="wallet"
        title={<span className="mono" style={{ fontSize: 20 }}>{d.code}</span>}
        pills={<PayTag method={d.payment_method} />}
        subtitle={<bdi>{d.description}</bdi>}
        actions={can('expenses', 'update') ? <Button variant="primary" icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button> : undefined}
        facets={[
          { label: t('Amount'), value: <>{fmtMoney(d.amount)} <small>SAR</small></> },
          { label: t('VAT'), value: fmtMoney(d.vat_price) },
          { label: t('Date'), value: fmtDateTime(d.date) },
          { label: t('Vendor'), value: d.vendor_name ? <bdi>{d.vendor_name}</bdi> : '—', hideOnMobile: true },
        ]}
      />
      <ObjectBody side={
        <SidePanel sections={[{
          title: t('Record'), body: <KeyValues items={[
            { k: t('Created by'), v: d.created_by_name || d.created_by_user?.name || '—' },
            { k: t('Created at'), v: fmtDateTime(d.created_at) },
            { k: t('Updated by'), v: d.updated_by_name || d.updated_by_user?.name || '—' },
            { k: t('Last updated'), v: fmtDateTime(d.updated_at) },
          ]} />,
        }]} />
      }>
        <Card title={t('Details')}>
          <KeyValues items={[
            { k: t('Description'), v: <bdi>{d.description}</bdi> },
            { k: t('Payment method'), v: <PayTag method={d.payment_method} /> },
            { k: t('Categories'), v: cats.length ? <span className="row" style={{ justifyContent: 'flex-end' }}>{cats.map((c) => <Tag key={c}>{c}</Tag>)}</span> : '—' },
            { k: t('Vendor invoice no.'), v: d.vendor_invoice_no || '—' },
            { k: t('VAT %'), v: d.vat_percent ? `${d.vat_percent}%` : '—' },
          ]} />
        </Card>
        <Card title={t('Attachments')}>
          {d.images?.length ? <div className="thumbs">{d.images.map((img: string) => <Thumb key={img} src={attachmentUrl(img, storeId, 'expenses')} name={img.split('/').pop() || img} />)}</div>
            : <EmptyState icon="paper" title={t('No attachments')} />}
        </Card>
      </ObjectBody>
    </>
  );
}
