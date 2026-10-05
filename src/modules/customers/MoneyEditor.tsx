import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { searchParties, partyToOption, type Party } from '@/framework/doc/lookups';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner, ErrorState, Segmented, Skeleton, useConfirm } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtMoney } from '@/lib/format';
import { CUSTOMER, fileToBase64, invoiceToOption, searchEmployees, searchOpenInvoices, type InvoiceHit } from './api';
import {
  blankMoneyForm, blankPaymentRow, canSwitchType, errPrefix, linkableInvoiceTypes, methodsFor, moneyFormToBody, moneyToForm, moneyTotals, partyField, payErrKey, validateMoney,
  type MoneyForm, type MoneyKind, type MoneyPayment, type PartyType,
} from './logic';
import { MONEY, zatcaEnabled } from './money';
import './customers.css';

type Doc = Record<string, any> & { id: string; code: string };

export function MoneyEditorPage({ kind }: { kind: MoneyKind }) {
  const { id } = useParams();
  const def = MONEY[kind];
  const q = useRecord<Doc>(def.endpoint, id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <MoneyEditor key={id || 'new'} kind={kind} existing={id ? q.data : undefined} />;
}
export const ReceivableEditorPage = () => <MoneyEditorPage kind="receivable" />;
export const PayableEditorPage = () => <MoneyEditorPage kind="payable" />;

export function MoneyEditor({ kind, existing }: { kind: MoneyKind; existing?: Doc }) {
  const def = MONEY[kind];
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [sp] = useSearchParams();
  const { store, can, setting } = useAuth();
  const id = existing?.id;
  const [f, setF] = useState<MoneyForm>(() => (existing ? moneyToForm(existing) : blankMoneyForm()));
  const [partyData, setPartyData] = useState<Party | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [linkRow, setLinkRow] = useState<number | null>(null);
  const [newFiles, setNewFiles] = useState<string[]>([]);
  const [dlg, ask] = useConfirm();
  const zatcaLive = zatcaEnabled(store, def);
  const locked = !!existing?.zatca?.reporting_passed;
  const employees = !!setting('enable_employee_module');
  const linkTypes = linkableInvoiceTypes(kind, f.type, store?.settings || {});
  const title = id ? `${t('Edit')} ${existing?.code}` : t(def.newLabel);
  usePageMeta(title, def.icon);

  // Prefill the customer from ?customer_id= (Customer 360 "Receive payment").
  const prefillId = sp.get('customer_id');
  useEffect(() => {
    if (id || !prefillId || !storeId) return;
    let alive = true;
    api.get<Party>(`${CUSTOMER}/${prefillId}`, { search: { store_id: storeId } }).then((r) => {
      if (!alive || !r.result) return;
      setPartyData(r.result);
      setF((x) => ({ ...x, type: 'customer', party: { id: r.result!.id, name: r.result!.name }, remarks: x.remarks || r.result!.remarks || '' }));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [id, prefillId, storeId]);

  const update = (patch: Partial<MoneyForm>) => { setF((x) => ({ ...x, ...patch })); setDirty(true); };
  const clearErr = (...keys: string[]) => setErrors((e) => { if (!keys.some((k) => e[k])) return e; const n = { ...e }; keys.forEach((k) => delete n[k]); return n; });
  const setPay = (i: number, patch: Partial<MoneyPayment>) => {
    setF((x) => ({ ...x, payments: x.payments.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
    setDirty(true);
    const field = (k: string) => (k === 'date' || k === 'discount' || k === 'method' ? k : k.startsWith('invoice') ? 'invoice' : 'amount');
    clearErr(...Object.keys(patch).map((k) => payErrKey(kind, field(k), i)));
  };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const totals = moneyTotals(f.payments);

  const save = useCallback(async () => {
    if (locked) return;
    const e = validateMoney(f, kind);
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const body = { store_id: storeId, ...moneyFormToBody(f, { isNew: !id }) };
      const r = id ? await api.put<Doc>(`${def.endpoint}/${id}`, body, { search: { store_id: storeId } }) : await api.post<Doc>(def.endpoint, body, { search: { store_id: storeId } });
      setDirty(false);
      [def.endpoint, CUSTOMER, '/v1/order', '/v1/quotation', '/v1/sales-return', '/v1/purchase', '/v1/purchase-return', '/v1/posting'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(id ? t('Saved') : t('{{code}} created', { code: r.result?.code || t(def.singular) }));
      const newId = r.result?.id || id;
      if (newId) nav(`${def.listPath}/${newId}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.errors); toast.error(err.message); }
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [f, kind, id, storeId, def, qc, toast, t, nav, locked]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [save]);

  const switchType = (next: PartyType) => {
    if (!canSwitchType(f, next)) { setErrors((e) => ({ ...e, type: t('Remove the linked invoices before changing the type.') })); return; }
    clearErr('type', 'customer_id', 'vendor_id', 'employee_id');
    setPartyData(null);
    update({ type: next, party: null });
  };

  const loadParties = async (q: string, s: AbortSignal): Promise<PickerOption<any>[]> => {
    if (f.type === 'employee') return (await searchEmployees(storeId, q, s)).map((e) => ({ id: e.id, label: e.name, sub: [e.code, e.mob1].filter(Boolean).join(' · '), data: e }));
    return (await searchParties(f.type, storeId, q, s)).map(partyToOption);
  };
  const onParty = (o: PickerOption<any> | null) => {
    clearErr(partyField(f.type));
    setPartyData(o?.data || null);
    if (o && f.party && o.id !== f.party.id && f.payments.some((p) => p.invoice_id)) {
      // Linked invoices belong to the previous party — unlink them.
      update({ party: { id: o.id, name: o.label }, payments: f.payments.map((p) => ({ ...p, invoice_id: '', invoice_code: '', invoice_type: '', invoice_balance: undefined })) });
      toast.info(t('Invoice links were removed because the party changed.'));
      return;
    }
    update({ party: o ? { id: o.id, name: o.label } : null, remarks: f.remarks || o?.data?.remarks || '' });
  };

  const addRow = () => update({ payments: [...f.payments, blankPaymentRow(f.date)] });
  const removeRow = (i: number) => update({ payments: f.payments.filter((_, j) => j !== i) });
  const unlink = async (i: number) => {
    if (!(await ask(t('Remove this invoice from the payment?'), { confirmLabel: t('Remove') }))) return;
    setPay(i, { invoice_id: '', invoice_code: '', invoice_type: '', invoice_balance: undefined });
  };
  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files || []);
    const b64 = await Promise.all(list.map(fileToBase64));
    setNewFiles((x) => [...x, ...list.map((l) => l.name)]);
    update({ images_content: [...f.images_content, ...b64] });
  };

  const canSave = can(def.resource, id ? 'update' : 'create') && !locked;
  const err = (k: string) => (errors[k] ? t(errors[k]) : undefined);
  const pfx = errPrefix(kind);
  const handled = (k: string) => k.startsWith(pfx) || ['customer_id', 'vendor_id', 'employee_id', 'date_str', 'type', 'description', 'remarks', 'bank_reference_no'].includes(k);
  const otherErrors = Object.entries(errors).filter(([k, m]) => m && !handled(k));
  const partyValue: PickerOption<any> | null = f.party ? { id: f.party.id, label: f.party.name, data: partyData } : null;
  const partyLabel = f.type === 'vendor' ? 'Vendor' : f.type === 'employee' ? 'Employee' : 'Customer';
  const balance = partyData?.credit_balance;

  const actions = (
    <>
      <Button variant="ghost" onClick={() => nav(id ? `${def.listPath}/${id}` : def.listPath)}>{t('Cancel')}</Button>
      <Button variant="primary" icon="check" loading={saving} disabled={!canSave} onClick={() => void save()}>
        {t(id ? 'Save changes' : 'Save')} <kbd className="hide-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd>
      </Button>
    </>
  );

  return (
    <>
      <ObjectHeader crumbs={[{ label: t(def.kind === 'receivable' ? 'Sales' : 'Buying'), to: def.listPath }, { label: t(def.title), to: def.listPath }, { label: id ? existing?.code || '' : t('New') }]}
        icon={def.icon} title={title} actions={actions} />
      <ObjectBody side={
        <aside className="stack" style={{ position: 'sticky', top: 16 }}>
          <div className="card">
            <div className="card-h"><h3>{t('Summary')}</h3></div>
            <div className="card-b">
              <dl className="kv" style={{ margin: 0 }}>
                <dt>{t('Total')}</dt><dd className="num">{fmtMoney(totals.total)}</dd>
                <dt>{t('Discount')}</dt><dd className="num">{fmtMoney(totals.discount)}</dd>
                <dt><b>{t('Net total')}</b></dt><dd className="num" style={{ fontSize: 16 }}>{fmtMoney(totals.net)}</dd>
              </dl>
            </div>
          </div>
          {zatcaLive && !id && (
            <Banner tone="info" icon="shield">
              <label className="checkline"><input type="checkbox" className="chk" checked={f.enable_report_to_zatca} onChange={(e) => update({ enable_report_to_zatca: e.target.checked })} /><span>{t(def.zatcaCheckbox)}</span></label>
            </Banner>
          )}
        </aside>
      }>
        {locked && <Banner tone="warn" icon="lock">{t('This record was reported to ZATCA and can’t be edited.')}</Banner>}
        {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => t(m)).join(' · ')}</Banner>}
        <Card title={t('Details')}>
          <div className="fgrid">
            <div className="field span2">
              <label>{t('Type')}</label>
              <Segmented label={t('Type')} value={f.type} onChange={switchType}
                options={[{ value: 'customer' as PartyType, label: t('Customer') }, { value: 'vendor' as PartyType, label: t('Vendor') }, ...(employees ? [{ value: 'employee' as PartyType, label: t('Employee') }] : [])]} />
              {errors.type && <div className="errmsg" role="alert">{errors.type}</div>}
            </div>
            <Field label={t(partyLabel)} required error={err(partyField(f.type))} className="span2" hint={balance !== undefined && balance !== null ? <>{t('Current balance')}: <b className="num">{fmtMoney(balance)}</b></> : undefined}>
              {(fid, d) => (
                <AsyncPicker key={f.type} id={fid} aria-describedby={d} value={partyValue} onChange={onParty} load={loadParties} eager clearable invalid={!!errors[partyField(f.type)]}
                  placeholder={t('Search by name, phone, VAT no., code…')} disabled={locked} />
              )}
            </Field>
            <Field label={t('Date')} required error={err('date_str')}>
              {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={f.date} invalid={!!errors.date_str} onChange={(e) => { update({ date: e.target.value }); clearErr('date_str'); }} disabled={locked} />}
            </Field>
            <Field label={t('Bank reference')}>{(fid) => <Input id={fid} value={f.bank_reference_no} onChange={(e) => update({ bank_reference_no: e.target.value })} disabled={locked} />}</Field>
            <Field label={t('Description')} className="span2" error={err('description')}>{(fid) => <Input id={fid} value={f.description} onChange={(e) => update({ description: e.target.value })} disabled={locked} />}</Field>
            <Field label={t('Remarks')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={f.remarks} onChange={(e) => update({ remarks: e.target.value })} disabled={locked} />}</Field>
          </div>
        </Card>
        <Card title={<>{t('Payments')} <span className="muted" style={{ fontWeight: 500 }}>· {f.payments.length}</span></>} bodyClass="card-b-tight"
          actions={!locked ? <Button size="sm" icon="plus" onClick={addRow}>{t('Add payment')}</Button> : undefined}>
          {errors.payments && <div style={{ padding: '8px 12px' }}><Banner tone="crit">{t(errors.payments)}</Banner></div>}
          <div className="cu-pays" role="table" aria-label={t('Payments')}>
            {f.payments.map((p, i) => (
              <div className="cu-pay" role="row" key={p.id || i} aria-label={`${t('Payment')} ${i + 1}`}>
                <span className="cu-pay-n muted num">{i + 1}</span>
                <Field label={t('Date')} required error={err(payErrKey(kind, 'date', i))}>
                  {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" value={p.date} invalid={!!errors[payErrKey(kind, 'date', i)]} onChange={(e) => setPay(i, { date: e.target.value })} disabled={locked} />}
                </Field>
                <Field label={t('Amount')} required error={err(payErrKey(kind, 'amount', i))}>
                  {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" placeholder="0.00" value={p.amount} invalid={!!errors[payErrKey(kind, 'amount', i)]} onChange={(e) => setPay(i, { amount: e.target.value })} disabled={locked} />}
                </Field>
                <Field label={t('Discount')} error={err(payErrKey(kind, 'discount', i))}>
                  {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" placeholder="0.00" value={p.discount} invalid={!!errors[payErrKey(kind, 'discount', i)]} onChange={(e) => setPay(i, { discount: e.target.value })} disabled={locked} />}
                </Field>
                <Field label={t('Method')} required error={err(payErrKey(kind, 'method', i))}>
                  {(fid, d) => <Select id={fid} aria-describedby={d} value={p.method} invalid={!!errors[payErrKey(kind, 'method', i)]} onChange={(e) => setPay(i, { method: e.target.value })} options={methodsFor(kind).map((m) => ({ ...m, label: t(m.label) }))} placeholder={t('Select')} disabled={locked} />}
                </Field>
                <Field label={t('Invoice')} error={err(payErrKey(kind, 'invoice', i))}>
                  {() => p.invoice_id ? (
                    <span className="cu-link-chip"><span className="mono">{p.invoice_code}</span>{!locked && <IconButton icon="x" label={t('Remove invoice link')} onClick={() => void unlink(i)} />}</span>
                  ) : linkTypes.length ? (
                    <Button size="sm" variant="ghost" icon="paper" disabled={locked || !f.party} title={!f.party ? t('Select the party first') : undefined} onClick={() => setLinkRow(i)}>{t('Link invoice')}</Button>
                  ) : <span className="muted">—</span>}
                </Field>
                <Field label={t('Bank reference')}>{(fid) => <Input id={fid} value={p.bank_reference} onChange={(e) => setPay(i, { bank_reference: e.target.value })} disabled={locked} />}</Field>
                <Field label={t('Note')}>{(fid) => <Input id={fid} value={p.description} onChange={(e) => setPay(i, { description: e.target.value })} disabled={locked} />}</Field>
                {!locked && f.payments.length > 1 ? <IconButton icon="trash" label={t('Remove payment')} className="cu-pay-x" onClick={() => removeRow(i)} /> : <span />}
              </div>
            ))}
          </div>
        </Card>
        <Card title={t('Attachments')}>
          <div className="cu-files">
            {f.images.map((u) => (
              <span className="cu-file" key={u}><a href={u} target="_blank" rel="noreferrer">{u.split('/').pop()}</a>{!locked && <IconButton icon="x" label={t('Remove attachment')} onClick={() => update({ images: f.images.filter((x) => x !== u) })} />}</span>
            ))}
            {newFiles.map((n, i) => (
              <span className="cu-file new" key={`${n}-${i}`}>{n}<IconButton icon="x" label={t('Remove attachment')} onClick={() => { setNewFiles((x) => x.filter((_, j) => j !== i)); update({ images_content: f.images_content.filter((_, j) => j !== i) }); }} /></span>
            ))}
            {!locked && (
              <label className="btn sm gh">
                <input type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} aria-label={t('Add attachment')} />
                {t('Add attachment')}
              </label>
            )}
            {!f.images.length && !newFiles.length && locked && <span className="muted">{t('No attachments')}</span>}
          </div>
        </Card>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Net total')}</span><b className="num">{fmtMoney(totals.net)}</b></div>
        <Button variant="primary" icon="check" onClick={() => void save()} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
      {linkRow !== null && f.party && (
        <InvoiceLinkDialog kind={kind} type={f.type} partyId={f.party.id} storeId={storeId} settings={store?.settings || {}}
          exclude={f.payments.filter((_, j) => j !== linkRow).map((p) => p.invoice_id).filter(Boolean)}
          onClose={() => setLinkRow(null)}
          onPick={(inv, invType) => {
            setPay(linkRow, { invoice_id: inv.id, invoice_code: inv.code, invoice_type: invType, invoice_balance: inv.balance_amount || 0, amount: String(inv.balance_amount || 0) });
            setLinkRow(null);
          }} />
      )}
      {dlg}
    </>
  );
}

function InvoiceLinkDialog({ kind, type, partyId, storeId, settings, exclude, onClose, onPick }: {
  kind: MoneyKind; type: PartyType; partyId: string; storeId: string; settings: Record<string, any>; exclude: string[]; onClose: () => void; onPick: (inv: InvoiceHit, invoiceType: string) => void;
}) {
  const { t } = useTranslation();
  const types = linkableInvoiceTypes(kind, type, settings);
  const [sel, setSel] = useState(types[0]?.type || '');
  const def = types.find((x) => x.type === sel) || types[0];
  if (!def) return null;
  return (
    <Modal open onClose={onClose} title={t('Link an invoice')} width={520}>
      <div className="stack" style={{ gap: 12 }}>
        {types.length > 1 && <Segmented label={t('Invoice type')} value={sel} onChange={setSel} options={types.map((x) => ({ value: x.type, label: t(x.label) }))} />}
        <p className="muted" style={{ margin: 0 }}>{t('Only unpaid and partially paid documents of this party are listed. The amount is set to the open balance.')}</p>
        <AsyncPicker<InvoiceHit> key={def.type} value={null} eager autoFocus aria-label={t('Search invoice #')} placeholder={t('Search invoice #')}
          load={async (q, s) => (await searchOpenInvoices(def, storeId, partyId, q, s)).filter((i) => !exclude.includes(i.id)).map(invoiceToOption)}
          onChange={(o) => o && onPick(o.data, def.type)} />
      </div>
    </Modal>
  );
}
