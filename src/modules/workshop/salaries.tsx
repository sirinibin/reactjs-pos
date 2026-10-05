import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { IconButton } from '@/ui/Button';
import { EmptyState, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EMPLOYEE, SALARY } from './lib/api';
import { periodLabel } from './lib/hr';
import { tzOffsetHours } from './components/bits';
import { SalaryPaymentModal, type SalaryPaymentRec } from './components/SalaryPayment';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function salaryListConfig(opts: { onCreate: () => void; onEdit: (r: SalaryPaymentRec) => void; onDelete: (r: SalaryPaymentRec) => void; canEdit: boolean; canDelete: boolean }): ListConfig<SalaryPaymentRec> {
  const year = new Date().getFullYear();
  return {
    title: 'Salaries',
    subtitle: 'Salary payments to employees',
    icon: 'cash',
    endpoint: SALARY,
    resource: 'salaries',
    select: 'id,code,employee_id,employee_name,amount,payment_method,date,month,year,description',
    baseSearch: { timezone_offset: tzOffsetHours() },
    defaultSort: { key: 'date', dir: -1 },
    searchKey: 'employee_name',
    searchPlaceholder: 'Search by employee name…',
    onCreate: opts.onCreate,
    createLabel: 'Pay Salary',
    views: [
      { id: 'all', label: 'All' },
      { id: 'cash', label: 'Cash', search: { payment_method: 'cash' } },
      { id: 'bank', label: 'Bank Transfer', search: { payment_method: 'bank_transfer' } },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange', fromKey: 'date_from', toKey: 'date_to' },
      { id: 'month', label: 'Month', type: 'select', options: MONTHS.map((m, i) => ({ value: String(i + 1), label: m })) },
      { id: 'year', label: 'Year', type: 'select', options: Array.from({ length: 6 }, (_, i) => String(year - i)).map((y) => ({ value: y, label: y })) },
    ],
    summary: (m) => [
      { label: 'Total Payments', value: String(m.total_payments ?? 0) },
      { label: 'Total Amount Paid', value: fmtMoney(m.total_amount) },
      { label: 'Total Cash', value: fmtMoney(m.total_cash) },
      { label: 'Total Bank Transfer', value: fmtMoney(m.total_bank_transfer) },
    ],
    columns: [
      { key: 'code', header: tt('Code'), className: 'code', render: (r) => <span className="mono muted">{r.code}</span> },
      { key: 'employee', header: tt('Employee'), sortKey: 'employee_name', render: (r) => <b><bdi>{r.employee_name}</bdi></b> },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <b className="num">{fmtMoney(r.amount)}</b> },
      { key: 'method', header: tt('Method'), render: (r) => tt(r.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash') },
      { key: 'period', header: tt('Period'), hideBelow: 'md', render: (r) => periodLabel(r.month, r.year) },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDateTime(r.date)}</span> },
      { key: 'desc', header: tt('Description'), hideBelow: 'lg', render: (r) => r.description || '—' },
    ],
    onRowClick: opts.canEdit ? opts.onEdit : undefined,
    rowActions: (r) => (
      <div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
        {opts.canEdit && <IconButton icon="edit" label={`${tt('Edit')} ${r.code}`} onClick={() => opts.onEdit(r)} />}
        {opts.canDelete && <IconButton icon="trash" label={`${tt('Delete')} ${r.code}`} onClick={() => opts.onDelete(r)} />}
      </div>
    ),
    mobileCard: (r) => ({ title: <bdi>{r.employee_name}</bdi>, amount: fmtMoney(r.amount), subtitle: <>{periodLabel(r.month, r.year)} · {tt(r.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash')}</>, meta: <span className="mono">{r.code} · {fmtDateTime(r.date)}</span> }),
    exportColumns: [
      { header: 'Code', value: (r) => r.code }, { header: 'Employee', value: (r) => r.employee_name }, { header: 'Amount', value: (r) => r.amount },
      { header: 'Method', value: (r) => r.payment_method }, { header: 'Period', value: (r) => periodLabel(r.month, r.year) }, { header: 'Date', value: (r) => fmtDateTime(r.date) },
      { header: 'Description', value: (r) => r.description },
    ],
    exportName: 'salaries',
    empty: <EmptyState icon="cash" title={tt('No salary payments to display')} />,
  };
}

export function SalaryListPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [modal, setModal] = useState<{ payment: SalaryPaymentRec | null } | null>(null);
  const [el, ask] = useConfirm();
  const remove = async (r: SalaryPaymentRec) => {
    const ok = await ask(t('Delete'), { danger: true, confirmLabel: t('Delete'), body: t('Permanently delete this salary payment of {{amount}} for {{name}}? This cannot be undone.', { amount: fmtMoney(r.amount), name: r.employee_name }) });
    if (!ok) return;
    try {
      await api.del(`${SALARY}/${r.id}`, { search: { store_id: storeId } });
      toast.success(t('Salary payment deleted'));
      [SALARY, EMPLOYEE].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('Unable to delete'));
    }
  };
  const cfg = salaryListConfig({ onCreate: () => setModal({ payment: null }), onEdit: (r) => setModal({ payment: r }), onDelete: remove, canEdit: can('salaries', 'update'), canDelete: can('salaries', 'delete') });
  return (
    <>
      <ListPage config={cfg} />
      <SalaryPaymentModal open={!!modal} onClose={() => setModal(null)} payment={modal?.payment} />
      {el}
    </>
  );
}
