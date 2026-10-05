import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord, useSave } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { ObjectBody, ObjectHeader, KeyValues } from '@/ui/ObjectPage';
import { Card } from '@/ui/Card';
import { Button, IconButton } from '@/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/ui/Field';
import { Modal } from '@/ui/Overlay';
import { EmptyState, ErrorState, Skeleton, Tabs, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtDateTime, fmtMoney, parseNumber, toInputDate } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EMPLOYEE, SALARY, type Employee } from './lib/api';
import { fromStoreLocalInput, loadPositions, periodLabel, savePositions, toStoreLocalInput, validateEmployee } from './lib/hr';
import { FormShell } from './components/FormShell';
import { BalanceText, tzOffsetHours } from './components/bits';
import { SalaryPaymentModal, type SalaryPaymentRec } from './components/SalaryPayment';

const LIST = '/workshop/employees';
const crumbs = () => [{ label: tt('Workshop'), to: '/workshop/board' }, { label: tt('Employees'), to: LIST }];
const SELECT = 'id,code,name,name_in_arabic,position,mob1,mob2,iqama_no,address,salary,salary_day,joining_date,account,is_active,created_by_name,created_at';

export function employeeListConfig(opts: { nav: (p: string) => void; onPay: (e: Employee) => void; onDelete: (e: Employee) => void; canPay: boolean; canEdit: boolean; canDelete: boolean }): ListConfig<Employee> {
  return {
    title: 'Employees',
    subtitle: 'Staff, salaries and balances',
    icon: 'badge',
    endpoint: EMPLOYEE,
    resource: 'employees',
    select: SELECT,
    baseSearch: { timezone_offset: tzOffsetHours() },
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'search',
    searchPlaceholder: 'Search by name, mobile or iqama…',
    createPath: `${LIST}/new`,
    createLabel: 'Create',
    detailPath: (r) => `${LIST}/${r.id}`,
    filters: [
      { id: 'mob1', label: 'Mobile', type: 'text' },
      { id: 'salary', label: 'Salary', type: 'number', placeholder: 'e.g. >=3000' },
      { id: 'joining', label: 'Joining Date', type: 'daterange', fromKey: 'joining_date_from', toKey: 'joining_date_to' },
      { id: 'created', label: 'Created At', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    summary: (m) => {
      const net = (Number(m.total_employees_owe) || 0) - (Number(m.total_owed_to_employees) || 0);
      return [
        { label: 'Total Employees', value: String(m.total_employees ?? 0) },
        { label: 'Total Monthly Salary', value: fmtMoney(m.total_salary) },
        { label: 'Total Salary Paid', value: fmtMoney(m.total_salary_paid) },
        { label: 'Owed to Employees', value: fmtMoney(m.total_owed_to_employees), tone: m.total_owed_to_employees > 0 ? 'crit' : undefined },
        { label: 'Employees Owe', value: fmtMoney(m.total_employees_owe) },
        { label: 'Net Balance', value: fmtMoney(net), tone: net < 0 ? 'crit' : net > 0 ? 'good' : undefined },
      ];
    },
    columns: [
      { key: 'name', header: tt('Name'), sortKey: 'name', render: (r) => <div className="ws-two"><b><bdi>{r.name}</bdi></b><span>{[r.position, r.name_in_arabic].filter(Boolean).join(' · ')}</span></div> },
      { key: 'mob1', header: tt('Mobile'), sortKey: 'mob1', render: (r) => <div className="ws-two"><span className="num" style={{ color: 'inherit' }}>{r.mob1 || '—'}</span>{r.mob2 && <span className="num">{r.mob2}</span>}</div> },
      { key: 'salary', header: tt('Salary'), sortKey: 'salary', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.salary)}</span> },
      { key: 'joining', header: tt('Joining Date'), sortKey: 'joining_date', hideBelow: 'lg', render: (r) => <span className="num">{fmtDate(r.joining_date)}</span> },
      { key: 'balance', header: tt('Balance'), align: 'end', render: (r) => <BalanceText account={r.account} block /> },
      { key: 'created', header: tt('Created At'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDateTime(r.created_at)}</span> },
    ],
    rowActions: (r) => (
      <div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
        {opts.canPay && <Button size="sm" icon="cash" onClick={() => opts.onPay(r)} style={{ color: 'var(--good)' }}>{tt('PAY SALARY')}</Button>}
        {opts.canEdit && <IconButton icon="edit" label={tt('Edit')} onClick={() => opts.nav(`${LIST}/${r.id}/edit`)} />}
        {opts.canDelete && <IconButton icon="trash" label={`${tt('Delete Permanently')} ${r.name}`} onClick={() => opts.onDelete(r)} />}
      </div>
    ),
    mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, amount: <BalanceText account={r.account} />, subtitle: <>{r.position || ''}</>, meta: <span className="num">{r.mob1} · {fmtMoney(r.salary)}</span> }),
    exportColumns: [
      { header: 'Name', value: (r) => r.name }, { header: 'Name (Arabic)', value: (r) => r.name_in_arabic }, { header: 'Position / Designation', value: (r) => r.position },
      { header: 'Mobile 1', value: (r) => r.mob1 }, { header: 'Mobile 2', value: (r) => r.mob2 }, { header: 'Iqama No.', value: (r) => r.iqama_no },
      { header: 'Salary', value: (r) => r.salary }, { header: 'Salary Day', value: (r) => r.salary_day }, { header: 'Joining Date', value: (r) => fmtDate(r.joining_date) },
      { header: 'Balance', value: (r) => (r.account?.type === 'asset' ? 1 : -1) * (r.account?.balance || 0) },
    ],
    exportName: 'employees',
    empty: <EmptyState icon="badge" title={tt('No Employees to display')} />,
  };
}

/** Permanent delete with the legacy confirmation text. Returns true when deleted. */
export function useDeleteEmployee() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [el, ask] = useConfirm();
  const run = async (e: Pick<Employee, 'id' | 'name'>) => {
    const ok = await ask(t('Delete Permanently'), { danger: true, confirmLabel: t('Delete Permanently'), body: <p style={{ margin: 0 }}>{t('Permanently delete "{{name}}"? This will remove the employee along with ALL related salary payments, accrual entries and balance sheet postings. This cannot be undone.', { name: e.name })}</p> });
    if (!ok) return false;
    try {
      await api.del(`${EMPLOYEE}/permanent/${e.id}`, { search: { store_id: storeId } });
      toast.success(t('Employee deleted permanently'));
      [EMPLOYEE, SALARY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('Unable to delete employee'));
      return false;
    }
  };
  return [el, run] as const;
}

export function EmployeeListPage() {
  const nav = useNavigate();
  const { can } = useAuth();
  const [pay, setPay] = useState<Employee | null>(null);
  const [delEl, del] = useDeleteEmployee();
  const cfg = employeeListConfig({ nav, onPay: setPay, onDelete: (e) => { del(e); }, canPay: can('salaries', 'create'), canEdit: can('employees', 'update'), canDelete: can('employees', 'delete') });
  return (
    <>
      <ListPage config={cfg} />
      <SalaryPaymentModal open={!!pay} onClose={() => setPay(null)} employee={pay} />
      {delEl}
    </>
  );
}

// ---------------------------------------------------------------- salary history

export function SalaryHistory({ employee, compact }: { employee: Employee; compact?: boolean }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const toast = useToast();
  const qc = useQueryClient();
  const { can, store } = useAuth();
  const [edit, setEdit] = useState<SalaryPaymentRec | null>(null);
  const [paying, setPaying] = useState(false);
  const [el, ask] = useConfirm();
  const q = useQuery({
    queryKey: [SALARY, 'by-employee', employee.id, storeId],
    queryFn: async () => (await api.get<SalaryPaymentRec[]>(SALARY, { search: { store_id: storeId, employee_id: employee.id }, sort: '-date', limit: 100, select: 'id,code,employee_id,employee_name,date,amount,payment_method,month,year,description' })).result || [],
    enabled: !!storeId,
  });
  const rows = q.data || [];
  const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const remove = async (r: SalaryPaymentRec) => {
    if (!(await ask(t('Delete'), { danger: true, confirmLabel: t('Delete'), body: t('Are you sure you want to delete this salary payment? This will reverse the ledger entries.') }))) return;
    try {
      await api.del(`${SALARY}/${r.id}`, { search: { store_id: storeId } });
      toast.success(t('Salary payment deleted'));
      [SALARY, EMPLOYEE].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch {
      toast.error(t('Failed to delete payment'));
    }
  };
  return (
    <Card title={t('Salary Payment History')} sub={compact ? undefined : `${t('Payments')}: ${rows.length} · ${t('Total Paid')}: ${fmtMoney(total)}`}
      actions={can('salaries', 'create') && <Button size="sm" variant="primary" icon="cash" onClick={() => setPaying(true)}>{t('Pay Salary')}</Button>}>
      {q.isLoading ? <Skeleton height={80} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !rows.length ? <p className="muted" style={{ margin: 0 }}>{t('No salary payments recorded yet.')}</p> : (
        <div className="ws-tbl-wrap">
          <table className="ws-tbl" aria-label={t('Salary Payment History')}>
            <thead><tr><th>{t('ID')}</th><th>{t('Date')}</th><th className="r">{t('Amount')}</th><th>{t('Method')}</th><th>{t('Period')}</th><th className="hide-sm">{t('Description')}</th><th aria-label={t('Actions')} /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.code}</td>
                <td className="num">{toStoreLocalInput(r.date, store?.country_code).replace('T', ' ')}</td>
                <td className="r num">{fmtMoney(r.amount)}</td>
                <td>{t(r.payment_method === 'bank_transfer' ? 'Bank' : 'Cash')}</td>
                <td>{periodLabel(r.month, r.year)}</td>
                <td className="hide-sm">{r.description || '—'}</td>
                <td className="r" style={{ whiteSpace: 'nowrap' }}>
                  {can('salaries', 'update') && <IconButton icon="edit" label={`${t('Edit')} ${r.code}`} onClick={() => setEdit(r)} />}
                  {can('salaries', 'delete') && <IconButton icon="trash" label={`${t('Delete')} ${r.code}`} onClick={() => remove(r)} />}
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={2}><b>{t('Total Paid')}</b></td><td className="r num"><b>{fmtMoney(total)}</b></td><td colSpan={4} /></tr></tfoot>
          </table>
        </div>
      )}
      <SalaryPaymentModal open={paying || !!edit} onClose={() => { setPaying(false); setEdit(null); }} employee={edit ? null : employee} payment={edit} />
      {el}
    </Card>
  );
}

// ---------------------------------------------------------------- editor

export interface EmpForm {
  name: string; name_in_arabic: string; position: string; mob1: string; mob2: string; iqama_no: string; joining_date: string; is_active: boolean; address: string;
  salary: string; salary_day: string; opening_balance_type: 'payable' | 'receivable'; opening_balance: string; opening_balance_date: string;
}
const blank = (): EmpForm => ({
  name: '', name_in_arabic: '', position: '', mob1: '', mob2: '', iqama_no: '', joining_date: toInputDate(new Date()), is_active: true, address: '',
  salary: '0', salary_day: '1', opening_balance_type: 'payable', opening_balance: '0', opening_balance_date: '',
});

export function employeeBody(f: EmpForm, cc?: string | null) {
  const ob = parseNumber(f.opening_balance);
  return {
    name: f.name.trim(), name_in_arabic: f.name_in_arabic.trim(), position: f.position, mob1: f.mob1.trim(), mob2: f.mob2.trim(), iqama_no: f.iqama_no.trim(),
    address: f.address.trim(), is_active: f.is_active,
    joining_date: f.joining_date ? fromStoreLocalInput(f.joining_date, cc) : null,
    salary: parseNumber(f.salary), salary_day: parseInt(f.salary_day, 10) || 0,
    opening_balance: ob, opening_balance_type: ob > 0 ? f.opening_balance_type : '',
    opening_balance_date: f.opening_balance_date ? fromStoreLocalInput(f.opening_balance_date, cc) : null,
  };
}

export function EmployeeEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { can, store } = useAuth();
  const cc = store?.country_code;
  const q = useRecord<Employee>(EMPLOYEE, id);
  const save = useSave<Employee>(EMPLOYEE, { invalidate: [SALARY] });
  const editing = !!id;
  const [f, setF] = useState<EmpForm>(() => ({ ...blank(), position: sp.get('position') || '' }));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<string[]>(loadPositions);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    setF({
      name: d.name || '', name_in_arabic: d.name_in_arabic || '', position: d.position || '', mob1: d.mob1 || '', mob2: d.mob2 || '', iqama_no: d.iqama_no || '',
      joining_date: d.joining_date ? toStoreLocalInput(d.joining_date, cc).slice(0, 10) : '', is_active: d.is_active !== false, address: d.address || '',
      salary: String(d.salary ?? 0), salary_day: String(d.salary_day || 1), opening_balance_type: d.opening_balance_type === 'receivable' ? 'receivable' : 'payable',
      opening_balance: String(d.opening_balance ?? 0), opening_balance_date: d.opening_balance_date ? toStoreLocalInput(d.opening_balance_date, cc) : '',
    });
  }, [q.data, cc]);

  const set = <K extends keyof EmpForm>(k: K, v: EmpForm[K]) => { setF((x) => ({ ...x, [k]: v })); if (errs[k as string]) setErrs((e) => ({ ...e, [k]: '' })); };

  const submit = async () => {
    const local = validateEmployee(f);
    if (Object.keys(local).length) { setErrs(Object.fromEntries(Object.entries(local).map(([k, m]) => [k, t(m)]))); return; }
    try {
      const rec = await save.mutateAsync({ id, body: employeeBody(f, cc) });
      toast.success(t(editing ? 'Employee updated successfully!' : 'Employee created successfully!'));
      nav(`${LIST}/${rec?.id || id}`, { replace: !editing });
    } catch (e) {
      if (e instanceof ApiError) { setErrs(e.errors); toast.error(t('Failed to process employee!')); }
      else toast.error((e as Error).message);
    }
  };

  if (editing && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (editing && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const title = editing ? `${t('Update Employee')} — ${q.data?.name}` : t('Create New Employee');
  const known = new Set(Object.keys(blank()));
  const posOptions = [...positions, ...(f.position && !positions.includes(f.position) ? [f.position] : [])];

  return (
    <FormShell title={title} crumbs={[...crumbs(), { label: editing ? q.data?.name || '' : t('New') }]} icon="badge" editing={editing} saving={save.isPending}
      canSave={can('employees', editing ? 'update' : 'create')} onSave={submit} onCancel={() => nav(editing ? `${LIST}/${id}` : LIST)}
      errors={Object.entries(errs).filter(([k, m]) => m && !known.has(k)).map(([, m]) => m)}
      side={editing && q.data?.account ? (
        <aside className="stack">
          <Card title={t('Account Balance')}>
            <KeyValues items={[{ k: t('Account Name'), v: q.data.account.name || '—' }, { k: t('Balance'), v: <BalanceText account={q.data.account} block /> }]} />
          </Card>
        </aside>
      ) : undefined}>
      <Card title={t('Employee Details')}>
        <div className="fgrid">
          <Field label={t('Name')} required error={errs.name} className="span2">{(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errs.name} autoFocus={!editing} value={f.name} placeholder={t('Full name')} onChange={(e) => set('name', e.target.value)} />}</Field>
          <Field label={t('Name (Arabic)')} className="span2" error={errs.name_in_arabic}>{(fid) => <Input id={fid} dir="rtl" lang="ar" value={f.name_in_arabic} onChange={(e) => set('name_in_arabic', e.target.value)} />}</Field>
          <Field label={t('Position / Designation')} error={errs.position}>
            {(fid) => (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <Select id={fid} value={f.position} onChange={(e) => set('position', e.target.value)} placeholder={t('Select position...')} options={posOptions.map((p) => ({ value: p, label: t(p) }))} />
                <IconButton icon="gear" label={t('Manage Positions')} onClick={() => setManaging(true)} />
              </div>
            )}
          </Field>
          <Field label={t('Mobile 1')} error={errs.mob1}>{(fid, d) => <Input id={fid} aria-describedby={d} type="tel" invalid={!!errs.mob1} value={f.mob1} placeholder="05xxxxxxxx" onChange={(e) => set('mob1', e.target.value)} />}</Field>
          <Field label={t('Mobile 2')}>{(fid) => <Input id={fid} type="tel" value={f.mob2} onChange={(e) => set('mob2', e.target.value)} />}</Field>
          <Field label={t('Iqama No.')}>{(fid) => <Input id={fid} value={f.iqama_no} onChange={(e) => set('iqama_no', e.target.value)} />}</Field>
          <Field label={t('Joining Date')} required error={errs.joining_date}>{(fid, d) => <Input id={fid} aria-describedby={d} type="date" invalid={!!errs.joining_date} value={f.joining_date} onChange={(e) => set('joining_date', e.target.value)} />}</Field>
          <Field label={t('Status')}>{(fid) => <Checkbox id={fid} label={t(f.is_active ? 'Active' : 'Inactive')} checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} />}</Field>
          <Field label={t('Address')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} />}</Field>
        </div>
      </Card>
      <Card title={t('Salary Information')}>
        <div className="fgrid">
          <Field label={t('Salary')} required error={errs.salary}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" invalid={!!errs.salary} value={f.salary} onChange={(e) => set('salary', e.target.value)} />}</Field>
          <Field label={t('Salary Date (Day of Month)')} required error={errs.salary_day} hint={t('Day of month (1-28) when salary is due')}>
            {(fid, d) => <Input id={fid} aria-describedby={d} type="number" min={1} max={28} className="num" invalid={!!errs.salary_day} value={f.salary_day} onChange={(e) => set('salary_day', e.target.value)} />}
          </Field>
        </div>
      </Card>
      <Card title={t('Opening Balance')} sub={<>{t('If this employee has an outstanding balance from your previous system, enter the amount and date. Leave as 0 if fully settled.')}{q.data?.opening_balance_posted ? ` ${t('(An opening balance entry has already been posted for this employee — changing the values below will update it.)')}` : ''}</>}>
        <div className="fgrid">
          <Field label={t('Balance Direction')} className="span2" error={errs.opening_balance_type}>
            {() => (
              <div className="ws-radio" role="radiogroup" aria-label={t('Balance Direction')}>
                <label><input type="radio" name="ob-type" checked={f.opening_balance_type === 'payable'} onChange={() => set('opening_balance_type', 'payable')} />{t('Store owes Employee')}</label>
                <label><input type="radio" name="ob-type" checked={f.opening_balance_type === 'receivable'} onChange={() => set('opening_balance_type', 'receivable')} />{t('Employee owes Store')}</label>
              </div>
            )}
          </Field>
          <Field label={t('Opening Balance Amount')} error={errs.opening_balance}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" invalid={!!errs.opening_balance} value={f.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} />}</Field>
          <Field label={t('As Of Date')} error={errs.opening_balance_date} hint={t('This system starts tracking salary due from this date')}>
            {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" invalid={!!errs.opening_balance_date} value={f.opening_balance_date} onChange={(e) => set('opening_balance_date', e.target.value)} />}
          </Field>
        </div>
      </Card>
      {editing && q.data && <SalaryHistory employee={q.data} compact />}
      <ManagePositions open={managing} onClose={() => setManaging(false)} positions={positions} selected={f.position}
        onChange={(list, sel) => { setPositions(list); savePositions(list); if (sel !== undefined) set('position', sel); }} />
    </FormShell>
  );
}

function ManagePositions({ open, onClose, positions, selected, onChange }: { open: boolean; onClose: () => void; positions: string[]; selected: string; onChange: (list: string[], selected?: string) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [edit, setEdit] = useState<{ i: number; v: string } | null>(null);
  const add = () => { const v = draft.trim(); if (v && !positions.includes(v)) onChange([...positions, v]); setDraft(''); };
  const commit = () => {
    if (!edit) return;
    const v = edit.v.trim(), old = positions[edit.i];
    if (v && v !== old) onChange(positions.map((p, i) => (i === edit.i ? v : p)), selected === old ? v : undefined);
    setEdit(null);
  };
  return (
    <Modal open={open} onClose={onClose} title={t('Manage Positions')} width={440} footer={<Button variant="primary" onClick={onClose}>{t('Done')}</Button>}>
      <form className="row" style={{ flexWrap: 'nowrap', marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="inp" aria-label={t('New position name...')} placeholder={t('New position name...')} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" icon="plus" disabled={!draft.trim()}>{t('Add')}</Button>
      </form>
      {!positions.length ? <p className="muted">{t('No positions defined. Add one above.')}</p> : (
        <div className="stack" style={{ gap: 4 }}>
          {positions.map((p, i) => (
            <div key={p + i} className="row" style={{ flexWrap: 'nowrap' }}>
              {edit?.i === i ? <input className="inp" autoFocus aria-label={t('Position / Designation')} value={edit.v} onChange={(e) => setEdit({ i, v: e.target.value })} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEdit(null); }} />
                : <button type="button" className="btn gh" style={{ flex: 1, justifyContent: 'flex-start', fontWeight: p === selected ? 700 : undefined }} title={t('Click to select')} onClick={() => { onChange(positions, p); onClose(); }}>{t(p)}</button>}
              <IconButton icon="edit" label={`${t('Edit')} ${p}`} onClick={() => setEdit({ i, v: p })} />
              <IconButton icon="trash" label={`${t('Delete')} ${p}`} onClick={() => onChange(positions.filter((_, j) => j !== i), selected === p ? '' : undefined)} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- view

export function EmployeeViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { can } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'salary' ? 'salary' : 'info';
  const q = useRecord<Employee>(EMPLOYEE, id);
  const [pay, setPay] = useState(false);
  const [delEl, del] = useDeleteEmployee();
  const d = q.data;
  usePageMeta(d?.name || t('Employee'), 'badge');
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!d) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return (
    <>
      <ObjectHeader crumbs={[...crumbs(), { label: d.name }]} icon="badge" title={<bdi>{d.name}</bdi>}
        pills={d.is_active === false ? <span className="tag">{t('Inactive')}</span> : undefined}
        subtitle={[d.position, d.name_in_arabic].filter(Boolean).join(' · ')}
        actions={<>
          {can('salaries', 'create') && <Button variant="primary" icon="cash" onClick={() => setPay(true)}>{t('Pay Salary')}</Button>}
          {can('employees', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
          {can('employees', 'delete') && <Button icon="trash" variant="danger" onClick={async () => { if (await del(d)) nav(LIST); }}>{t('Delete Permanently')}</Button>}
        </>}
        facets={[
          { label: t('Salary'), value: fmtMoney(d.salary) },
          { label: t('Salary Day'), value: d.salary_day || '—' },
          { label: t('Balance'), value: <BalanceText account={d.account} block /> },
          { label: t('Joining Date'), value: fmtDate(d.joining_date), hideOnMobile: true },
        ]}
        tabs={<Tabs value={tab} label={t('Employee')} onChange={(x) => setSp(x === 'info' ? {} : { tab: x }, { replace: true })} tabs={[{ id: 'info', label: t('Employee Info') }, { id: 'salary', label: t('Salary History') }]} />}
      />
      <ObjectBody>
        {tab === 'info' ? (
          <div className="grid-2c">
            <Card title={t('Employee Information')}>
              <KeyValues items={[
                { k: t('Name'), v: <bdi>{d.name}</bdi> }, { k: t('Name (Arabic)'), v: <bdi>{d.name_in_arabic || '—'}</bdi> }, { k: t('Position / Designation'), v: d.position ? t(d.position) : '—' },
                { k: t('Mobile 1'), v: <span className="num">{d.mob1 || '—'}</span> }, { k: t('Mobile 2'), v: <span className="num">{d.mob2 || '—'}</span> },
                { k: t('Iqama No.'), v: d.iqama_no || '—' }, { k: t('Joining Date'), v: fmtDate(d.joining_date) }, { k: t('Address'), v: d.address || '—' },
              ]} />
            </Card>
            <Card title={t('Salary Information')}>
              <KeyValues items={[
                { k: t('Salary'), v: <span className="num">{fmtMoney(d.salary)}</span> }, { k: t('Salary Day'), v: d.salary_day || '—' },
                { k: t('Balance'), v: <BalanceText account={d.account} /> },
                { k: t('Opening Balance (From Previous System)'), v: d.opening_balance ? `${fmtMoney(d.opening_balance)} · ${t(d.opening_balance_type === 'receivable' ? 'Employee owes Store' : 'Store owes Employee')}` : '—' },
                { k: t('Opening Balance As Of'), v: d.opening_balance_date ? fmtDateTime(d.opening_balance_date) : '—' },
                { k: t('Account Name'), v: d.account?.name || '—' },
              ]} />
            </Card>
          </div>
        ) : <SalaryHistory employee={d} />}
      </ObjectBody>
      <SalaryPaymentModal open={pay} onClose={() => setPay(false)} employee={d} />
      {delEl}
    </>
  );
}
