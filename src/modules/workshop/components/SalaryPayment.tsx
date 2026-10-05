import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Modal } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Field, Input, Textarea } from '@/ui/Field';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Banner } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtMoney, parseNumber } from '@/lib/format';
import { EMPLOYEE, SALARY, searchEmployees, employeeToOption, type Employee } from '../lib/api';
import { fromStoreLocalInput, periodLabel, periodOf, salaryPrefill, toStoreLocalInput } from '../lib/hr';

export interface SalaryPaymentRec { id: string; code?: string; employee_id: string; employee_name?: string; amount: number; payment_method: string; date: string; month?: number; year?: number; description?: string }

/** Pay Salary / Edit Salary Payment dialog (spec §4.3). */
export function SalaryPaymentModal({ open, onClose, employee, payment, onSaved }: {
  open: boolean; onClose: () => void; employee?: Pick<Employee, 'id' | 'name' | 'salary' | 'salary_day' | 'account'> | null; payment?: SalaryPaymentRec | null; onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store } = useAuth();
  const cc = store?.country_code;
  const [emp, setEmp] = useState<PickerOption<Employee> | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const editing = !!payment?.id;

  useEffect(() => {
    if (!open) return;
    setErrs({});
    if (payment) {
      setEmp({ id: payment.employee_id, label: payment.employee_name || '', data: { id: payment.employee_id, name: payment.employee_name || '' } });
      setAmount(String(payment.amount ?? ''));
      setMethod(payment.payment_method || 'cash');
      setDate(toStoreLocalInput(payment.date, cc));
      setDesc(payment.description || '');
    } else {
      setEmp(employee ? { id: employee.id, label: employee.name, data: employee as Employee } : null);
      const pre = salaryPrefill(employee as Employee);
      setAmount(pre ? String(pre) : '');
      setMethod('cash');
      setDate(toStoreLocalInput(new Date(), cc));
      setDesc('');
    }
  }, [open, payment, employee, cc]);

  const pickEmployee = (o: PickerOption<Employee> | null) => {
    setEmp(o);
    if (!editing && o) { const pre = salaryPrefill(o.data); if (pre) setAmount(String(pre)); }
    if (errs.employee_id) setErrs((e) => ({ ...e, employee_id: '' }));
  };

  const period = periodOf(date);
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!emp) e.employee_id = t('Please select an employee');
    if (!(parseNumber(amount) > 0)) e.amount = t('Amount must be greater than 0');
    if (Object.keys(e).length) { setErrs(e); return; }
    const body = {
      store_id: storeId, employee_id: emp!.id, amount: parseNumber(amount), payment_method: method,
      date: fromStoreLocalInput(date, cc) || new Date().toISOString(), month: period.month, year: period.year, description: desc.trim(),
    };
    setSaving(true);
    try {
      if (editing) await api.put(`${SALARY}/${payment!.id}`, body, { search: { store_id: storeId } });
      else await api.post(SALARY, body, { search: { store_id: storeId } });
      toast.success(t(editing ? 'Salary payment updated successfully!' : 'Salary payment recorded successfully!'));
      [SALARY, EMPLOYEE].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onSaved?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrs(err.errors);
      toast.error(t(editing ? 'Failed to update salary payment!' : 'Failed to record salary payment!'));
    } finally {
      setSaving(false);
    }
  };

  const other = Object.entries(errs).filter(([k, m]) => m && !['employee_id', 'amount', 'payment_method', 'date', 'month', 'year'].includes(k));
  const presetEmp = !!employee && !editing;

  return (
    <Modal open={open} onClose={onClose} title={t(editing ? 'Edit Salary Payment' : 'Pay Salary')} width={520}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="primary" icon="cash" loading={saving} onClick={submit}>{editing ? t('Update Payment') : `${t('Pay')} ${fmtMoney(parseNumber(amount))}`}</Button>
      </>}>
      <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {other.length > 0 && <Banner tone="crit">{other.map(([, m]) => m).join(' · ')}</Banner>}
        <Field label={t('Employee')} required error={errs.employee_id}>
          {(fid, d) => presetEmp ? (
            <div className="card pad" style={{ padding: 10 }}>
              <b><bdi>{emp?.label}</bdi></b>
              <div className="muted num" style={{ fontSize: 12 }}>{t('Salary')}: {fmtMoney(employee?.salary)} | {t('Salary Day')}: {employee?.salary_day || '—'}</div>
            </div>
          ) : (
            <AsyncPicker<Employee> id={fid} aria-describedby={d} value={emp} onChange={pickEmployee} clearable eager invalid={!!errs.employee_id} placeholder={t('Search by name...')}
              load={async (q, s) => (await searchEmployees(storeId, q, s, 10)).map((x) => ({ ...employeeToOption(x), right: x.salary ? fmtMoney(x.salary) : '' }))} />
          )}
        </Field>
        <div className="grid-2c">
          <Field label={t('Amount')} required error={errs.amount}>
            {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" data-autofocus={presetEmp || undefined} invalid={!!errs.amount} value={amount} onChange={(e) => { setAmount(e.target.value); if (errs.amount) setErrs((x) => ({ ...x, amount: '' })); }} />}
          </Field>
          <Field label={t('Date')} hint={`${t('Period')}: ${periodLabel(period.month, period.year)}`} error={errs.date}>
            {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>
        <Field label={t('Payment Method')} error={errs.payment_method}>
          {() => (
            <div className="ws-radio" role="radiogroup" aria-label={t('Payment Method')}>
              <label><input type="radio" name="sal-method" value="cash" checked={method === 'cash'} onChange={() => setMethod('cash')} />{t('Cash (from Cash A/c)')}</label>
              <label><input type="radio" name="sal-method" value="bank_transfer" checked={method === 'bank_transfer'} onChange={() => setMethod('bank_transfer')} />{t('Bank Transfer (from Bank A/c)')}</label>
            </div>
          )}
        </Field>
        <Field label={t('Description')}>{(fid) => <Textarea id={fid} rows={2} value={desc} placeholder={t('Optional')} onChange={(e) => setDesc(e.target.value)} />}</Field>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>{t('This payment will create a double-entry ledger: Debit employee liability account, Credit')} {t(method === 'cash' ? 'Cash' : 'Bank')} {t('account.')}</p>
      </form>
    </Modal>
  );
}
