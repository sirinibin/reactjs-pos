import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useList, useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Pill, Tag } from '@/ui/Pill';
import { Banner, EmptyState, ErrorState, Segmented, Skeleton, Tabs, useConfirm } from '@/ui/Misc';
import { KeyValues, ObjectHeader, type Facet } from '@/ui/ObjectPage';
import { Gauge, StackBar } from '@/ui/charts/Charts';
import { PaymentPill, METHOD_LABEL } from '@/framework/doc/status';
import { usePageMeta } from '@/shell/Workspace';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, fmtPercent, fmtRelative } from '@/lib/format';
import { CUSTOMER, DEPOSIT, WITHDRAWAL, deleteCustomerImage, uploadCustomerImage } from './api';
import { ChurnPill, CUSTOMERS_PATH, useCustomerDeleteRestore } from './CustomerList';
import { ImageGallery } from './ImageGallery';
import { RelatedList } from './RelatedList';
import { StatementTab } from './Statement';
import { agingBuckets, avatarClass, creditUsage, daysOld, initials, stat, type Customer, type OpenInvoice } from './logic';
import './customers.css';

export type C360Tab = 'overview' | 'invoices' | 'returns' | 'quotations' | 'payments' | 'ledger' | 'vehicles' | 'details' | 'history';

const SAR = <small>SAR</small>;

export function Customer360Page() {
  const { id } = useParams();
  const q = useRecord<Customer>(CUSTOMER, id);
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="pad stack"><Skeleton width={280} height={24} /><Skeleton height={90} /><Skeleton height={260} /></div>;
  return <Customer360 c={q.data} />;
}

export function Customer360({ c }: { c: Customer }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can, setting } = useAuth();
  const [sp, setSp] = useSearchParams();
  const automobile = !!setting('enable_automobile_module');
  const qtn = !!setting('enable_sales_in_quotation');
  const tab = (sp.get('tab') as C360Tab) || 'overview';
  const setTab = (v: C360Tab) => setSp((p) => { const n = new URLSearchParams(p); if (v === 'overview') n.delete('tab'); else n.set('tab', v); return n; }, { replace: true });
  const dr = useCustomerDeleteRestore();
  usePageMeta(c.name, 'users');

  const s = (k: string) => stat(c, storeId, k);
  const credit = creditUsage(c.credit_balance, c.credit_limit);
  const since = c.first_purchase_at || c.created_at;
  const facets: Facet[] = [
    { label: t('Lifetime sales'), value: <>{fmtMoney(s('sales_amount'))} {SAR}</> },
    { label: t('Open balance'), value: <>{fmtMoney(c.credit_balance)} {SAR}</>, tone: credit.over ? 'crit' : (c.credit_balance || 0) > 0 ? 'warn' : undefined },
    { label: t('Invoices'), value: fmtNumber(s('sales_count'), 0) },
    { label: t('Last purchase'), value: c.last_purchase_at ? fmtRelative(c.last_purchase_at) : '—' },
    { label: t('Customer since'), value: since ? new Date(since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—', hideOnMobile: true },
  ];

  const tabs: { id: C360Tab; label: string; count?: number | string; hidden?: boolean }[] = [
    { id: 'overview', label: t('Overview') },
    { id: 'invoices', label: t('Invoices'), count: s('sales_count') || undefined },
    { id: 'returns', label: t('Returns'), count: s('sales_return_count') || undefined },
    { id: 'quotations', label: t('Quotations'), count: s('quotation_count') || undefined },
    { id: 'payments', label: t('Payments') },
    { id: 'ledger', label: t('Ledger') },
    { id: 'vehicles', label: t('Vehicles'), hidden: !automobile },
    { id: 'details', label: t('Contacts & addresses') },
    { id: 'history', label: t('Churn & CLV') },
  ];

  const pills = (
    <>
      {c.deleted ? <Pill tone="crit" icon="trash">{t('Deleted')}</Pill> : <Pill tone="good" icon="check">{t('Active')}</Pill>}
      <Tag>{c.vat_no ? 'B2B' : 'B2C'}</Tag>
      {c.lifetime_value_segment_for_12months && <Tag>{t(c.lifetime_value_segment_for_12months)}</Tag>}
      {credit.over && <Pill tone="crit" icon="alert">{t('Over credit limit')}</Pill>}
    </>
  );
  const subtitle = (
    <>
      {c.name_in_arabic && <><bdi dir="rtl" className="cu-ar">{c.name_in_arabic}</bdi> · </>}
      <span className="mono">{c.code}</span>
      {c.vat_no && <> · VAT <span className="num">{c.vat_no}</span></>}
      {c.registration_number && <> · CR <span className="num">{c.registration_number}</span></>}
    </>
  );
  const actions = c.deleted ? (
    can('customers', 'update') && <Button variant="primary" icon="undo" onClick={() => void dr.restore(c)}>{t('Restore')}</Button>
  ) : (
    <>
      {can('sales', 'create') && <Button variant="primary" icon="plus" onClick={() => nav(`/sales/invoices/new?customer_id=${c.id}`)}>{t('New invoice')}</Button>}
      {can('receivables', 'create') && <Button icon="cash" onClick={() => nav(`/sales/receivables/new?customer_id=${c.id}`)}>{t('Receive payment')}</Button>}
      <Button icon="file" className="hide-sm" onClick={() => setTab('ledger')}>{t('Statement')}</Button>
      {can('customers', 'update') && <Button icon="edit" onClick={() => nav(`${CUSTOMERS_PATH}/${c.id}/edit`)}>{t('Edit')}</Button>}
      {can('customers', 'delete') && <Button icon="trash" variant="ghost" className="hide-sm" onClick={async () => { if (await dr.remove(c)) nav(CUSTOMERS_PATH); }}>{t('Delete')}</Button>}
    </>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Sales'), to: CUSTOMERS_PATH }, { label: t('Customers'), to: CUSTOMERS_PATH }, { label: c.code || c.name }]}
        avatar={<span className={`${avatarClass(c.id)} cu-av`} aria-hidden>{initials(c.name)}</span>}
        title={<bdi>{c.name}</bdi>} pills={pills} subtitle={subtitle} actions={actions} facets={facets}
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} label={t('Sections')} />}
      />
      <div className="pad cu-body">
        {c.deleted && <Banner tone="warn" icon="trash"><b>{t('This customer is deleted.')}</b> {t('It is hidden from lists and pickers. Restore it to sell to this customer again.')}{c.deleted_at && <> · {fmtDateTime(c.deleted_at)}</>}</Banner>}
        {tab === 'overview' && <Overview c={c} onTab={setTab} />}
        {tab === 'invoices' && <InvoicesTab c={c} />}
        {tab === 'returns' && <ReturnsTab c={c} />}
        {tab === 'quotations' && <QuotationsTab c={c} qtn={qtn} />}
        {tab === 'payments' && <PaymentsTab c={c} />}
        {tab === 'ledger' && <StatementTab customer={c} />}
        {tab === 'vehicles' && automobile && <VehiclesTab c={c} />}
        {tab === 'details' && <DetailsTab c={c} />}
        {tab === 'history' && <HistoryTab c={c} />}
      </div>
      {dr.dialog}
    </>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ c, onTab }: { c: Customer; onTab: (t: C360Tab) => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can } = useAuth();
  const open = useList<OpenInvoice>('/v1/order', { search: { customer_id: c.id, payment_status: 'not_paid,paid_partially' }, limit: 200, sort: '-date', select: 'id,code,date,net_total,balance_amount,payment_status' });
  const rows = useMemo(() => open.data?.rows || [], [open.data]);
  const buckets = useMemo(() => agingBuckets(rows), [rows]);
  const openTotal = buckets.reduce((a, b) => a + b.value, 0);
  const credit = creditUsage(c.credit_balance, c.credit_limit);
  const s = (k: string) => stat(c, storeId, k);
  const na = c.national_address || {};
  const address = [na.building_no, na.street_name, na.district_name, na.city_name, na.zipcode].filter(Boolean).join(', ') || c.address;

  return (
    <>
      <div className="c360">
        <Card title={t('Receivables aging')} sub={t('Open invoice balance by days since invoice')}>
          {open.isLoading ? <Skeleton height={40} /> : openTotal > 0 ? <StackBar data={buckets.map((b) => ({ label: t(b.label), value: b.value }))} /> : (
            <div className="cu-zero"><Icon name="checkc" size="s" /> {t('No open invoices — nothing overdue.')}</div>
          )}
        </Card>
        <Card title={t('Credit')}>
          <div className="gauge">
            {credit.limit > 0 ? <Gauge ratio={credit.ratio} label={t('Credit used {{p}}', { p: fmtPercent(credit.ratio * 100, 0) })} /> : <div className="cu-nolimit"><Icon name="info" size="s" /><span>{t('No credit limit')}</span></div>}
            <dl className="kv" style={{ margin: 0, flex: 1 }}>
              <dt>{t('Limit')}</dt><dd className="num">{credit.limit ? fmtMoney(credit.limit) : '—'}</dd>
              <dt>{t('Used')}</dt><dd className="num">{fmtMoney(credit.used)}</dd>
              <dt>{t('Available')}</dt><dd className="num" style={{ color: credit.limit ? (credit.over ? 'var(--crit)' : 'var(--good)') : undefined }}>{credit.limit ? fmtMoney(credit.available) : '—'}</dd>
            </dl>
          </div>
        </Card>
        <Card title={t('Contact')} actions={<button type="button" className="link" onClick={() => onTab('details')}>{t('All details')}</button>}>
          <dl className="kv cu-contact" style={{ margin: 0 }}>
            <dt><Icon name="user" size="s" /></dt><dd>{c.contact_person || <span className="muted">{t('No contact person')}</span>}</dd>
            <dt><Icon name="phone" size="s" /></dt><dd className="num">{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—'}{c.phone2 && <> · <a href={`tel:${c.phone2}`}>{c.phone2}</a></>}</dd>
            <dt><Icon name="mail" size="s" /></dt><dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</dd>
            <dt><Icon name="pin" size="s" /></dt><dd className="cu-wrap">{address || '—'}</dd>
          </dl>
        </Card>
      </div>
      <Card title={<>{t('Open invoices')} {rows.length > 0 && <span className="muted" style={{ fontWeight: 500 }}>· {rows.length}</span>}</>}
        actions={!c.deleted && can('receivables', 'create') && rows.length > 0 ? <Button size="sm" icon="cash" onClick={() => nav(`/sales/receivables/new?customer_id=${c.id}`)}>{t('Receive payment')}</Button> : undefined}
        bodyClass="card-b-tight">
        {open.isError ? <div style={{ padding: 12 }}><ErrorState error={open.error} onRetry={() => open.refetch()} /></div>
          : open.isLoading ? <div style={{ padding: 12 }}><Skeleton height={80} /></div>
            : rows.length === 0 ? <EmptyState icon="checkc" title={t('All invoices are paid.')} />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="dg" aria-label={t('Open invoices')}>
                    <thead><tr><th>{t('Invoice #')}</th><th>{t('Date')}</th><th className="hide-sm">{t('Age')}</th><th className="r hide-sm">{t('Total')}</th><th className="r">{t('Balance')}</th><th>{t('Status')}</th></tr></thead>
                    <tbody>
                      {rows.slice(0, 8).map((r) => {
                        const age = daysOld(r.date);
                        return (
                          <tr key={r.id} tabIndex={0} onClick={() => nav(`/sales/invoices/${r.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/sales/invoices/${r.id}`)}>
                            <td className="code">{r.code}</td>
                            <td className="num">{fmtDate(r.date)}</td>
                            <td className="num hide-sm" style={age > 60 ? { color: 'var(--crit)', fontWeight: 600 } : undefined}>{t('{{n}} days', { n: age })}</td>
                            <td className="r num hide-sm">{fmtMoney(r.net_total)}</td>
                            <td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(r.balance_amount)}</td>
                            <td>{age > 90 ? <Pill tone="crit" icon="alert">{t('Overdue')}</Pill> : <PaymentPill status={r.payment_status} />}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {rows.length > 8 && <div style={{ padding: '8px 12px' }}><button type="button" className="link" onClick={() => onTab('invoices')}>{t('View all {{n}} open invoices', { n: rows.length })}</button></div>}
                </div>
              )}
      </Card>
      <Card title={t('Sales summary')} sub={t('This store, all time')}>
        <div className="cu-stats">
          {[
            ['Sales', s('sales_amount')], ['Paid', s('sales_paid_amount')], ['Unpaid', s('sales_balance_amount')], ['Profit', s('sales_profit')],
            ['Returns', s('sales_return_amount')], ['Quotations', s('quotation_amount')], ['Qtn. invoices', s('quotation_invoice_amount')], ['Delivery notes', s('delivery_note_count')],
          ].map(([l, v]) => (
            <div key={l as string}><span>{t(l as string)}</span><b className="num">{l === 'Delivery notes' ? fmtNumber(v as number, 0) : fmtMoney(v as number)}</b></div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ---------------- Related lists ---------------- */

type Doc = Record<string, any> & { id: string; code: string };
const amt = (v: number, strong = false) => <span className="num" style={strong ? { fontWeight: 600 } : undefined}>{fmtMoney(v)}</span>;

function InvoicesTab({ c }: { c: Customer }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { can } = useAuth();
  const [view, setView] = useState<'all' | 'open'>('all');
  return (
    <RelatedList<Doc>
      title={t('Sales invoices')} endpoint="/v1/order" emptyTitle="No invoices yet"
      search={{ customer_id: c.id, ...(view === 'open' ? { payment_status: 'not_paid,paid_partially' } : {}) }}
      select="id,code,date,net_total,total_payment_received,balance_amount,payment_status,return_amount"
      actions={<><Segmented label={t('Filter')} value={view} onChange={setView} options={[{ value: 'all', label: t('All') }, { value: 'open', label: t('Open') }]} />{!c.deleted && can('sales', 'create') && <Button size="sm" icon="plus" onClick={() => nav(`/sales/invoices/new?customer_id=${c.id}`)}>{t('New invoice')}</Button>}</>}
      summary={(m) => [{ label: 'Sales', value: fmtMoney(m.total_sales) }, { label: 'Paid', value: fmtMoney(m.paid_sales) }, { label: 'Unpaid', value: fmtMoney(m.unpaid_sales), tone: m.unpaid_sales > 0 ? 'crit' : undefined }]}
      detailPath={(r) => `/sales/invoices/${r.id}`}
      columns={[
        { key: 'code', header: t('Invoice #'), className: 'code', render: (r) => r.code },
        { key: 'date', header: t('Date'), render: (r) => <span className="num">{fmtDate(r.date)}</span> },
        { key: 'total', header: t('Total'), align: 'end', render: (r) => amt(r.net_total, true) },
        { key: 'paid', header: t('Paid'), align: 'end', hideBelow: 'md', render: (r) => amt(r.total_payment_received) },
        { key: 'balance', header: t('Balance'), align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
        { key: 'status', header: t('Payment'), render: (r) => <PaymentPill status={r.payment_status} /> },
      ]}
      mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: fmtDate(r.date), meta: <PaymentPill status={r.payment_status} /> })}
    />
  );
}

function ReturnsTab({ c }: { c: Customer }) {
  const { t } = useTranslation();
  return (
    <RelatedList<Doc>
      title={t('Sales returns')} endpoint="/v1/sales-return" emptyTitle="No returns"
      search={{ customer_id: c.id }} select="id,code,date,order_code,net_total,balance_amount,payment_status"
      detailPath={(r) => `/sales/returns/${r.id}`}
      columns={[
        { key: 'code', header: t('Return #'), className: 'code', render: (r) => r.code },
        { key: 'date', header: t('Date'), render: (r) => <span className="num">{fmtDate(r.date)}</span> },
        { key: 'order', header: t('Invoice #'), hideBelow: 'md', render: (r) => <span className="mono">{r.order_code || '—'}</span> },
        { key: 'total', header: t('Total'), align: 'end', render: (r) => amt(r.net_total, true) },
        { key: 'status', header: t('Refund'), render: (r) => <PaymentPill status={r.payment_status} /> },
      ]}
      mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: fmtDate(r.date), meta: <PaymentPill status={r.payment_status} /> })}
    />
  );
}

function QuotationsTab({ c, qtn }: { c: Customer; qtn: boolean }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { can } = useAuth();
  return (
    <RelatedList<Doc>
      title={t('Quotations')} endpoint="/v1/quotation" emptyTitle="No quotations yet"
      search={{ customer_id: c.id }} select="id,code,date,type,net_total,balance_amount,payment_status,order_code"
      actions={!c.deleted && can('quotations', 'create') ? <Button size="sm" icon="plus" onClick={() => nav(`/sales/quotations/new?customer_id=${c.id}`)}>{t('New quotation')}</Button> : undefined}
      detailPath={(r) => `/sales/quotations/${r.id}`}
      columns={[
        { key: 'code', header: t('Quotation #'), className: 'code', render: (r) => r.code },
        { key: 'date', header: t('Date'), render: (r) => <span className="num">{fmtDate(r.date)}</span> },
        { key: 'type', header: t('Type'), render: (r) => (r.type === 'invoice' ? <Tag>{t('Invoice')}</Tag> : <Tag>{t('Quotation')}</Tag>) },
        { key: 'total', header: t('Total'), align: 'end', render: (r) => amt(r.net_total, true) },
        { key: 'status', header: t('Status'), render: (r) => (r.type === 'invoice' && qtn ? <PaymentPill status={r.payment_status} /> : r.order_code ? <Pill tone="good" icon="checkc">{t('Converted')}</Pill> : <Pill tone="neutral">{t('Open')}</Pill>) },
      ]}
      mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: fmtDate(r.date), meta: r.type === 'invoice' ? t('Invoice') : t('Quotation') })}
    />
  );
}

function PaymentsTab({ c }: { c: Customer }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { can } = useAuth();
  const [kind, setKind] = useState<'in' | 'out'>('in');
  const endpoint = kind === 'in' ? DEPOSIT : WITHDRAWAL;
  const base = kind === 'in' ? '/sales/receivables' : '/buying/payables';
  const methods = (r: Doc) => (r.payment_methods || []).map((m: string) => t(METHOD_LABEL[m] || m)).join(', ') || '—';
  return (
    <RelatedList<Doc>
      key={kind}
      title={kind === 'in' ? t('Receipts from customer') : t('Payments to customer')} endpoint={endpoint} emptyTitle="No payments recorded."
      search={{ customer_id: c.id, type: 'customer' }} select="id,code,date,net_total,payment_methods,description,zatca"
      summary={(m) => [{ label: 'Total', value: fmtMoney(m.total) }, { label: 'Cash', value: fmtMoney(m.cash) }, { label: 'Bank', value: fmtMoney(m.bank) }]}
      actions={<>
        <Segmented label={t('Direction')} value={kind} onChange={setKind} options={[{ value: 'in', label: t('Received') }, { value: 'out', label: t('Paid out') }]} />
        {!c.deleted && can(kind === 'in' ? 'receivables' : 'payables', 'create') && <Button size="sm" icon="plus" onClick={() => nav(`${base}/new?customer_id=${c.id}`)}>{kind === 'in' ? t('Receive payment') : t('Pay customer')}</Button>}
      </>}
      detailPath={(r) => `${base}/${r.id}`}
      columns={[
        { key: 'code', header: t('ID'), className: 'code', render: (r) => r.code },
        { key: 'date', header: t('Date'), render: (r) => <span className="num">{fmtDate(r.date)}</span> },
        { key: 'methods', header: t('Payment methods'), hideBelow: 'md', render: methods },
        { key: 'desc', header: t('Description'), hideBelow: 'lg', render: (r) => <span className="muted">{r.description || '—'}</span> },
        { key: 'total', header: t('Net total'), align: 'end', render: (r) => amt(r.net_total, true) },
      ]}
      mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: fmtDate(r.date), meta: methods(r) })}
    />
  );
}

function VehiclesTab({ c }: { c: Customer }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { can } = useAuth();
  return (
    <RelatedList<Doc>
      title={t('Vehicles')} endpoint="/v1/vehicle" emptyTitle="No vehicles registered" sort="-created_at"
      search={{ customer_id: c.id }} select="id,vehicle_number,brand,model,year,chassis_number,current_km,color"
      actions={!c.deleted && can('vehicles', 'create') ? <Button size="sm" icon="plus" onClick={() => nav(`/workshop/vehicles/new?customer_id=${c.id}`)}>{t('Add vehicle')}</Button> : undefined}
      detailPath={(r) => `/workshop/vehicles/${r.id}`}
      columns={[
        { key: 'plate', header: t('Plate no.'), className: 'code', render: (r) => r.vehicle_number || '—' },
        { key: 'make', header: t('Vehicle'), render: (r) => [r.brand, r.model, r.year].filter(Boolean).join(' ') || '—' },
        { key: 'vin', header: t('Chassis no.'), hideBelow: 'md', render: (r) => <span className="mono">{r.chassis_number || '—'}</span> },
        { key: 'km', header: t('Odometer'), align: 'end', hideBelow: 'md', render: (r) => <span className="num">{r.current_km ? `${fmtNumber(r.current_km, 0)} km` : '—'}</span> },
        { key: 'color', header: t('Color'), hideBelow: 'lg', render: (r) => r.color || '—' },
      ]}
      mobileCard={(r) => ({ title: <span className="mono">{r.vehicle_number}</span>, subtitle: [r.brand, r.model, r.year].filter(Boolean).join(' '), meta: r.chassis_number })}
    />
  );
}

/* ---------------- Details ---------------- */

function DetailsTab({ c }: { c: Customer }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [busy, setBusy] = useState(false);
  const [dlg, ask] = useConfirm();
  const na = c.national_address || {};
  const editable = !c.deleted && can('customers', 'update');
  const add = async (files: File[]) => {
    setBusy(true);
    try {
      for (const f of files) await uploadCustomerImage(c.id, storeId, f);
      toast.success(t('Photo uploaded'));
      qc.invalidateQueries({ queryKey: [CUSTOMER] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (url: string) => {
    if (!(await ask(t('Remove this photo?'), { danger: true, confirmLabel: t('Remove') }))) return;
    try { await deleteCustomerImage(c.id, storeId, url); toast.success(t('Photo removed')); qc.invalidateQueries({ queryKey: [CUSTOMER] }); } catch (e) { toast.error((e as Error).message); }
  };
  const v = (x: unknown) => (x ? String(x) : '—');
  return (
    <>
      <div className="grid-2c">
        <Card title={t('Contact')}>
          <KeyValues items={[
            { k: t('Contact person'), v: v(c.contact_person) }, { k: t('Phone'), v: <span className="num">{v(c.phone)}</span> }, { k: t('Phone 2'), v: <span className="num">{v(c.phone2)}</span> },
            { k: t('Email'), v: v(c.email) }, { k: t('Country'), v: v(c.country_name || c.country_code) }, { k: t('VAT no.'), v: <span className="num">{v(c.vat_no)}</span> },
            { k: t('C.R. no.'), v: <span className="num">{v(c.registration_number)}</span> },
          ]} />
        </Card>
        <Card title={t('National address')}>
          <KeyValues items={[
            { k: t('Building no.'), v: <span className="num">{v(na.building_no)}</span> }, { k: t('Street'), v: <>{v(na.street_name)}{na.street_name_arabic && <> · <bdi dir="rtl">{na.street_name_arabic}</bdi></>}</> },
            { k: t('District'), v: <>{v(na.district_name)}{na.district_name_arabic && <> · <bdi dir="rtl">{na.district_name_arabic}</bdi></>}</> }, { k: t('Unit no.'), v: v(na.unit_no) },
            { k: t('City'), v: <>{v(na.city_name)}{na.city_name_arabic && <> · <bdi dir="rtl">{na.city_name_arabic}</bdi></>}</> }, { k: t('Postal code'), v: <span className="num">{v(na.zipcode)}</span> },
            { k: t('Additional no.'), v: <span className="num">{v(na.additional_no)}</span> }, { k: t('Short address'), v: v(na.short_code) },
          ]} />
        </Card>
        <Card title={t('Credit & opening balance')}>
          <KeyValues items={[
            { k: t('Credit limit'), v: <span className="num">{c.credit_limit ? fmtMoney(c.credit_limit) : '—'}</span> }, { k: t('Credit balance'), v: <span className="num">{fmtMoney(c.credit_balance)}</span> },
            { k: t('Opening balance'), v: c.opening_balance ? <span className="num">{fmtMoney(c.opening_balance)} · {t(c.opening_balance_type === 'payable' ? 'Store owes customer' : 'Customer owes store')}</span> : '—' },
            { k: t('As of'), v: fmtDateTime(c.opening_balance_date) }, { k: t('Posted to ledger'), v: c.opening_balance ? (c.opening_balance_posted ? t('Yes') : t('No')) : '—' },
          ]} />
        </Card>
        <Card title={t('Record')}>
          <KeyValues items={[
            { k: t('Created by'), v: v(c.created_by_name) }, { k: t('Created at'), v: fmtDateTime(c.created_at) }, { k: t('Updated by'), v: v(c.updated_by_name) }, { k: t('Updated at'), v: fmtDateTime(c.updated_at) },
            ...(c.remarks ? [{ k: t('Remarks'), v: <span className="cu-wrap">{c.remarks}{c.use_remarks_in_sales ? ` (${t('used in sales')})` : ''}</span> }] : []),
          ]} />
        </Card>
      </div>
      <Card title={t('Customer photos')}>
        <ImageGallery saved={c.images || []} busy={busy} readOnly={!editable} onAdd={editable ? (f) => void add(f) : undefined} onRemoveSaved={editable ? (u) => void remove(u) : undefined} />
      </Card>
      {dlg}
    </>
  );
}

/* ---------------- Churn & CLV history ---------------- */

function HistoryTab({ c }: { c: Customer }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const q = useQuery({
    queryKey: [CUSTOMER, 'history', c.id, storeId],
    queryFn: async ({ signal }) => (await api.get<{ churn_history: any[]; clv_history: any[] }>(`${CUSTOMER}/${c.id}/history`, { search: { store_id: storeId } }, signal)).result,
  });
  const [view, setView] = useState<'churn' | 'clv'>('churn');
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const churn = q.data?.churn_history || [];
  const clv = q.data?.clv_history || [];
  return (
    <Card title={t('Churn & CLV history')} sub={t('Latest 100 snapshots, newest first')} bodyClass="card-b-tight"
      actions={<Segmented label={t('History')} value={view} onChange={setView} options={[{ value: 'churn', label: t('Churn risk') }, { value: 'clv', label: t('CLV') }]} />}>
      {q.isLoading ? <div style={{ padding: 12 }}><Skeleton height={80} /></div> : (view === 'churn' ? churn : clv).length === 0 ? <EmptyState icon="chart" title={t('No history yet.')} /> : (
        <div style={{ overflowX: 'auto' }}>
          {view === 'churn' ? (
            <table className="dg" aria-label={t('Churn risk')}>
              <thead><tr><th>{t('Date')}</th><th>{t('Risk tier')}</th><th className="r">{t('Churn %')}</th><th className="r hide-sm">{t('Total spend')}</th><th className="r hide-sm">{t('Days since last buy')}</th><th className="hide-md">{t('Reason')}</th></tr></thead>
              <tbody>{churn.map((h, i) => (
                <tr key={h.id || i} style={{ cursor: 'default' }}><td className="num">{fmtDate(h.date)}</td><td><ChurnPill tier={h.risk_tier} /></td><td className="r num">{fmtPercent(h.churn_percent, 0)}</td><td className="r num hide-sm">{fmtMoney(h.total_spend)}</td><td className="r num hide-sm">{h.days_since_last_buy ?? '—'}</td><td className="muted hide-md">{h.risk_tier_reason || '—'}</td></tr>
              ))}</tbody>
            </table>
          ) : (
            <table className="dg" aria-label={t('CLV')}>
              <thead><tr><th>{t('Date')}</th><th>{t('CLV segment')}</th><th className="r">{t('Predicted CLV (12m)')}</th><th className="r hide-sm">{t('Avg. order')}</th><th className="r hide-sm">{t('Orders')}</th><th className="r hide-md">{t('Spend')}</th></tr></thead>
              <tbody>{clv.map((h, i) => (
                <tr key={h.id || i} style={{ cursor: 'default' }}><td className="num">{fmtDate(h.date)}</td><td>{h.lifetime_value_segment_for_12months ? <Tag>{t(h.lifetime_value_segment_for_12months)}</Tag> : '—'}</td><td className="r num">{fmtMoney(h.predicted_clv_amount_12months)}</td><td className="r num hide-sm">{fmtMoney(h.predicted_avg_order_amount)}</td><td className="r num hide-sm">{h.history_orders_count ?? '—'}</td><td className="r num hide-md">{fmtMoney(h.history_spend_amount)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </Card>
  );
}

