import { Pill } from '@/ui/Pill';
import { t } from '@/i18n';

export function PaymentPill({ status }: { status?: string }) {
  if (status === 'paid') return <Pill tone="good" icon="checkc">{t('Paid')}</Pill>;
  if (status === 'paid_partially') return <Pill tone="warn" icon="clock">{t('Partially paid')}</Pill>;
  if (status === 'not_paid') return <Pill tone="crit" icon="alert">{t('Unpaid')}</Pill>;
  return <Pill tone="neutral">{status ? t(status) : '—'}</Pill>;
}

/** ZATCA reporting state from the legacy counters: a fresh doc has compliance_passed=false but no failures. */
export function zatcaState(z?: Record<string, any> | null): 'reported' | 'compliance_failed' | 'reporting_failed' | 'not_reported' {
  if (!z) return 'not_reported';
  if (z.reporting_passed) return 'reported';
  if (!z.compliance_passed && Number(z.compliance_check_failed_count) > 0) return 'compliance_failed';
  if (Number(z.reporting_failed_count) > 0) return 'reporting_failed';
  return 'not_reported';
}

/** ZATCA reporting badge (sales.md §1.3 ZATCA cell). */
export function ZatcaPill({ zatca }: { zatca?: Record<string, any> }) {
  switch (zatcaState(zatca)) {
    case 'reported': return <Pill tone="good" icon="shield">{t('Reported')}</Pill>;
    case 'compliance_failed': return <Pill tone="crit" icon="xc">{t('Compliance failed')}</Pill>;
    case 'reporting_failed': return <Pill tone="crit" icon="xc">{t('Reporting failed')}</Pill>;
    default: return <Pill tone="neutral" icon="clock">{t('Not reported')}</Pill>;
  }
}

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'paid_partially', label: 'Partially paid' },
  { value: 'not_paid', label: 'Unpaid' },
];

export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', debit_card: 'Debit card', credit_card: 'Credit card', bank_card: 'Bank card', bank_transfer: 'Bank transfer', bank_cheque: 'Bank cheque',
  customer_account: 'Customer account', sales_return: 'Sales return', purchase: 'Purchase', vendor_account: 'Vendor account', purchase_return: 'Purchase return',
};
