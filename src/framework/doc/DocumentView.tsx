import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Banner, ErrorState, Skeleton, Tabs } from '@/ui/Misc';
import { KeyValues, ObjectBody, ObjectHeader, SidePanel, Stepper, DocFlow, type Facet, type FlowNode } from '@/ui/ObjectPage';
import type { IconName } from '@/ui/Icon';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { usePageMeta } from '@/shell/Workspace';
import { lineTotal, lineTotalWithVat } from './calc';
import { METHOD_LABEL } from './status';

export interface ViewConfig {
  icon: IconName;
  crumbs: { label: string; to?: string }[];
  partyLabel: string;
  partyName: (d: any) => string;
  partyLink?: (d: any) => string | undefined;
  hideVat?: boolean;
  /** Quantities only (e.g. delivery notes without price details). */
  hidePrices?: (d: any) => boolean;
  showPayments?: boolean;
  steps?: (d: any) => { steps: string[]; current: number } | null;
  flow?: (d: any) => FlowNode[];
  pills?: (d: any) => ReactNode;
  facets?: (d: any) => Facet[];
  actions?: (d: any) => ReactNode;
  banner?: (d: any) => ReactNode;
  extraTabs?: { id: string; label: string; render: (d: any) => ReactNode }[];
  sideExtra?: (d: any) => { title: string; body: ReactNode }[];
}

export function DocumentView({ doc, loading, error, refetch, config: c }: { doc: any; loading: boolean; error: unknown; refetch: () => void; config: ViewConfig }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState('overview');
  usePageMeta(doc?.code, c.icon);
  if (error) return <div className="pad"><ErrorState error={error} onRetry={refetch} /></div>;
  if (loading || !doc) return <div className="pad stack"><Skeleton width={240} height={22} /><Skeleton height={120} /><Skeleton height={240} /></div>;

  const payments = (doc.payments || []).filter((p: any) => !p.deleted);
  const noPrices = !!c.hidePrices?.(doc);
  const step = c.steps?.(doc);
  const flow = c.flow?.(doc);
  const tabs = [
    { id: 'overview', label: t('Overview') },
    { id: 'lines', label: t('Lines'), count: doc.products?.length || 0 },
    ...(c.showPayments ? [{ id: 'payments', label: t('Payments'), count: payments.length }] : []),
    ...(c.extraTabs || []).map((x) => ({ id: x.id, label: t(x.label) })),
  ];

  const lines = (
    <Card title={t('Lines')} bodyClass="card-b-tight">
      <div style={{ overflowX: 'auto' }}>
        <table className="lines">
          <thead><tr><th>#</th><th>{t('Item')}</th><th className="r">{t('Qty')}</th>{!noPrices && <><th className="r">{t('Unit price')}</th><th className="r hide-sm">{t('Disc.')}</th>{!c.hideVat && <th className="r hide-sm">{t('VAT')}</th>}<th className="r">{t('Amount')}</th></>}</tr></thead>
          <tbody>
            {(doc.products || []).map((p: any, i: number) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td className="pn"><b>{p.name}</b><span>{p.part_number && <span className="mono">{p.part_number}</span>}{p.quantity_returned ? ` · ${p.quantity_returned} ${t('returned')}` : ''}</span></td>
                <td className="r num">{p.quantity} {p.unit}</td>
                {!noPrices && <>
                <td className="r num">{fmtMoney(p.unit_price)}</td>
                <td className="r num hide-sm">{p.unit_discount ? fmtMoney(p.unit_discount) : '—'}</td>
                {!c.hideVat && <td className="r num hide-sm">{fmtMoney(lineTotalWithVat(p) - lineTotal(p))}</td>}
                <td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(c.hideVat ? lineTotal(p) : lineTotalWithVat(p))}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!noPrices && <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 10px 6px' }}>
        <div className="sum" style={{ width: 'min(320px,100%)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Subtotal')}</span><b className="num">{fmtMoney(doc.total)}</b></div>
          {!!doc.shipping_handling_fees && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Shipping & handling')}</span><b className="num">{fmtMoney(doc.shipping_handling_fees)}</b></div>}
          {!!doc.discount && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Discount')}</span><b className="num">− {fmtMoney(doc.discount)}</b></div>}
          {!c.hideVat && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('VAT')} {doc.vat_percent}%</span><b className="num">{fmtMoney(doc.vat_price)}</b></div>}
          {!!doc.rounding_amount && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Rounding')}</span><b className="num">{fmtMoney(doc.rounding_amount)}</b></div>}
          <div className="tot"><span>{t('Total')}</span><b className="num">{fmtMoney(doc.net_total)}</b></div>
          {!!doc.cash_discount && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Cash discount')}</span><b className="num">− {fmtMoney(doc.cash_discount)}</b></div>}
        </div>
      </div>}
    </Card>
  );

  const paymentsCard = (
    <Card title={t('Payments')} bodyClass="card-b-tight">
      {payments.length === 0 ? <div className="muted" style={{ padding: 12 }}>{t('No payments recorded.')}</div> : (
        <table className="lines">
          <thead><tr><th>{t('Date')}</th><th>{t('Method')}</th><th>{t('Reference')}</th><th className="r">{t('Amount')}</th></tr></thead>
          <tbody>
            {payments.map((p: any, i: number) => (
              <tr key={p.id || i}><td className="num">{fmtDateTime(p.date)}</td><td>{t(METHOD_LABEL[p.method] || p.method)}</td><td className="muted">{p.reference_code || p.description || '—'}</td><td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(p.amount)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );

  const extra = c.extraTabs?.find((x) => x.id === tab);
  const partyLink = c.partyLink?.(doc);

  return (
    <>
      <ObjectHeader
        crumbs={[...c.crumbs.map((x) => ({ ...x, label: t(x.label) })), { label: doc.code }]}
        icon={c.icon}
        title={<span className="mono" style={{ fontSize: 20 }}>{doc.code}</span>}
        pills={c.pills?.(doc)}
        subtitle={<>{partyLink ? <a className="link" onClick={(e) => { e.preventDefault(); nav(partyLink); }} href={partyLink}>{c.partyName(doc) || '—'}</a> : c.partyName(doc) || '—'} · {fmtDateTime(doc.date)}</>}
        actions={c.actions?.(doc)}
        facets={c.facets?.(doc)}
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} label={t('Sections')} />}
      />
      <ObjectBody
        side={
          <SidePanel sections={[
            { title: t(c.partyLabel), body: <KeyValues items={[{ k: t('Name'), v: c.partyName(doc) || '—' }, { k: t('VAT no.'), v: doc.vat_no || '—' }, { k: t('Phone'), v: doc.phone || '—' }]} /> },
            ...(c.sideExtra?.(doc) || []),
            { title: t('Record'), body: <KeyValues items={[{ k: t('Created by'), v: doc.created_by_name || '—' }, { k: t('Created at'), v: fmtDateTime(doc.created_at) }, { k: t('Updated by'), v: doc.updated_by_name || '—' }, { k: t('Updated at'), v: fmtDateTime(doc.updated_at) }]} /> },
          ]} />
        }
      >
        {c.banner?.(doc)}
        {tab === 'overview' && (
          <>
            {step && <Card title={t('Status')}><Stepper steps={step.steps.map((s) => t(s))} current={step.current} /></Card>}
            {flow && flow.length > 0 && <Card title={t('Document flow')} sub={t('Everything linked to this document')}><DocFlow nodes={flow} /></Card>}
            {lines}
            {doc.remarks && <Card title={t('Remarks')}><div style={{ whiteSpace: 'pre-wrap' }}>{doc.remarks}</div></Card>}
          </>
        )}
        {tab === 'lines' && lines}
        {tab === 'payments' && paymentsCard}
        {extra && extra.render(doc)}
      </ObjectBody>
    </>
  );
}

export function ActionButton(props: Parameters<typeof Button>[0]) {
  return <Button {...props} />;
}
export { Banner };
