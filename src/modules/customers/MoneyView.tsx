import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { METHOD_LABEL, ZatcaPill } from '@/framework/doc/status';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Banner, ErrorState, Skeleton } from '@/ui/Misc';
import { KeyValues, ObjectBody, ObjectHeader, SidePanel } from '@/ui/ObjectPage';
import { Tag } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { INVOICE_TYPES, type MoneyKind } from './logic';
import { MONEY, partyName, partyNameAr, partyPath, zatcaEnabled } from './money';
import './customers.css';

type Doc = Record<string, any> & { id: string; code: string };

export function MoneyViewPage({ kind }: { kind: MoneyKind }) {
  const def = MONEY[kind];
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store, can } = useAuth();
  const q = useRecord<Doc>(def.endpoint, id);
  const [reporting, setReporting] = useState(false);
  usePageMeta(q.data?.code, def.icon);
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="pad stack"><Skeleton width={240} height={22} /><Skeleton height={120} /><Skeleton height={200} /></div>;
  const d = q.data;
  const zatcaLive = zatcaEnabled(store, def);
  const reported = !!d.zatca?.reporting_passed;
  const payments: any[] = (d.payments || []).filter((p: any) => !p.deleted);
  const pPath = partyPath(d);
  const methods = (d.payment_methods || []).map((m: string) => t(METHOD_LABEL[m] || m)).join(', ');

  const report = async () => {
    setReporting(true);
    try {
      await api.post(`${def.endpoint}/zatca/report/${d.id}`, {}, { search: { store_id: storeId } });
      toast.success(t('Reported to ZATCA'));
      qc.invalidateQueries({ queryKey: [def.endpoint] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setReporting(false);
    }
  };

  const invoiceLink = (p: any) => {
    const it = INVOICE_TYPES[p.invoice_type];
    if (!p.invoice_id || !it) return <span className="muted">—</span>;
    return <Link className="link mono" to={`${it.path}/${p.invoice_id}`}>{p.invoice_code}</Link>;
  };

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t(def.kind === 'receivable' ? 'Sales' : 'Buying'), to: def.listPath }, { label: t(def.title), to: def.listPath }, { label: d.code }]}
        icon={def.icon}
        title={<span className="mono" style={{ fontSize: 20 }}>{d.code}</span>}
        pills={<><Tag>{t(d.type === 'vendor' ? 'Vendor' : d.type === 'employee' ? 'Employee' : 'Customer')}</Tag>{zatcaLive && <ZatcaPill zatca={d.zatca} />}</>}
        subtitle={<>{t(def.receivedLabel)} {pPath ? <Link className="link" to={pPath}><bdi>{partyName(d) || '—'}</bdi></Link> : <bdi>{partyName(d) || '—'}</bdi>} · {fmtDateTime(d.date)}</>}
        actions={<>
          <Button icon="print" onClick={() => window.open(`${def.listPath}/${d.id}/print`, '_blank', 'noopener')}>{t('Print')}</Button>
          {zatcaLive && !reported && can(def.resource, 'update') && <Button icon="send" loading={reporting} onClick={() => void report()}>{t('Report to ZATCA')}</Button>}
          {can(def.resource, 'update') && !reported && <Button icon="edit" onClick={() => nav(`${def.listPath}/${d.id}/edit`)}>{t('Edit')}</Button>}
          {can(def.resource, 'create') && <Button icon="plus" className="hide-sm" onClick={() => nav(`${def.listPath}/new`)}>{t('New')}</Button>}
        </>}
        facets={[
          { label: t('Net total'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
          { label: t('Total'), value: fmtMoney(d.total) },
          { label: t('Discount'), value: fmtMoney(d.total_discount), hideOnMobile: true },
          { label: t('Payments'), value: payments.length },
          { label: t('Payment methods'), value: methods || '—', hideOnMobile: true },
        ]}
      />
      <ObjectBody side={
        <SidePanel sections={[
          { title: t(d.type === 'vendor' ? 'Vendor' : d.type === 'employee' ? 'Employee' : 'Customer'), body: <KeyValues items={[
            { k: t('Name'), v: <bdi>{partyName(d) || '—'}</bdi> },
            ...(partyNameAr(d) ? [{ k: t('Name (Arabic)'), v: <bdi dir="rtl">{partyNameAr(d)}</bdi> }] : []),
            { k: t('VAT no.'), v: d.customer?.vat_no || d.vendor?.vat_no || '—' },
            { k: t('Phone'), v: d.customer?.phone || d.vendor?.phone || '—' },
            ...(d.customer ? [{ k: t('Credit balance'), v: <span className="num">{fmtMoney(d.customer.credit_balance)}</span> }] : []),
          ]} /> },
          { title: t('Record'), body: <KeyValues items={[{ k: t('Created by'), v: d.created_by_name || '—' }, { k: t('Created at'), v: fmtDateTime(d.created_at) }, { k: t('Updated by'), v: d.updated_by_name || '—' }, { k: t('Updated at'), v: fmtDateTime(d.updated_at) }]} /> },
        ]} />
      }>
        {zatcaLive && !reported && (d.zatca?.reporting_errors?.length || d.zatca?.reporting_failed_count) ? <Banner tone="crit"><b>{t('ZATCA rejected this record.')}</b> {(d.zatca?.reporting_errors || []).join(' · ')}</Banner> : null}
        {reported && <Banner tone="info" icon="shield">{t('Reported to ZATCA — this record is read-only.')}</Banner>}
        <Card title={t('Payments')} bodyClass="card-b-tight">
          <div style={{ overflowX: 'auto' }}>
            <table className="lines" aria-label={t('Payments')}>
              <thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Method')}</th><th>{t('Invoice')}</th><th className="hide-sm">{t('Bank reference')}</th><th className="r hide-sm">{t('Discount')}</th><th className="r">{t('Amount')}</th></tr></thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id || i}>
                    <td className="muted">{i + 1}</td>
                    <td className="num">{fmtDateTime(p.date)}</td>
                    <td>{t(METHOD_LABEL[p.method] || (p.method === 'purchase_fund' ? 'Purchase fund A/c' : p.method))}{p.description && <div className="muted" style={{ fontSize: 12 }}>{p.description}</div>}</td>
                    <td>{invoiceLink(p)}</td>
                    <td className="hide-sm muted">{p.bank_reference || '—'}</td>
                    <td className="r num hide-sm">{p.discount ? fmtMoney(p.discount) : '—'}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 10px 6px' }}>
            <div className="sum" style={{ width: 'min(320px,100%)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Total')}</span><b className="num">{fmtMoney(d.total)}</b></div>
              {!!d.total_discount && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Discount')}</span><b className="num">− {fmtMoney(d.total_discount)}</b></div>}
              <div className="tot"><span>{t('Net total')}</span><b className="num">{fmtMoney(d.net_total)}</b></div>
            </div>
          </div>
        </Card>
        {(d.description || d.remarks || d.bank_reference_no) && (
          <Card title={t('Notes')}>
            <KeyValues items={[
              ...(d.description ? [{ k: t('Description'), v: <span className="cu-wrap">{d.description}</span> }] : []),
              ...(d.bank_reference_no ? [{ k: t('Bank reference'), v: d.bank_reference_no }] : []),
              ...(d.remarks ? [{ k: t('Remarks'), v: <span className="cu-wrap">{d.remarks}</span> }] : []),
            ]} />
          </Card>
        )}
        {d.images?.length > 0 && (
          <Card title={t('Attachments')}>
            <div className="cu-files">{d.images.map((u: string) => <a key={u} className="cu-file" href={u} target="_blank" rel="noreferrer">{u.split('/').pop()}</a>)}</div>
          </Card>
        )}
      </ObjectBody>
    </>
  );
}

export const ReceivableViewPage = () => <MoneyViewPage kind="receivable" />;
export const PayableViewPage = () => <MoneyViewPage kind="payable" />;
