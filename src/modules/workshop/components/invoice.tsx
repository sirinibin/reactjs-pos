import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Modal } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtMoney } from '@/lib/format';
import { prepareInvoiceFromJobs } from '../lib/api';
import { invoiceable } from '../lib/jobCalc';

/** Prefill the sales editor from job cards and open it. */
export function useCreateInvoice() {
  const nav = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { store } = useAuth();
  const [busy, setBusy] = useState(false);
  const run = async (jobIds: string[], customer?: { id: string; name: string } | null) => {
    if (!jobIds.length) return;
    setBusy(true);
    try {
      await prepareInvoiceFromJobs(storeId, jobIds, store?.vat_percent ?? 15, customer);
      nav('/sales/invoices/new?from=workshop');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message || t('Failed to save'));
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

export interface PickJob { id: string; job_number?: string; title?: string; vehicle_number?: string; brand?: string; model?: string; total_with_vat?: number; total?: number; order_id?: string | null }

/** "Select Job Cards for Sales Invoice" dialog (board multi-job flow, spec §2.6). */
export function SelectJobsModal({ open, onClose, jobs, onConfirm, busy }: { open: boolean; onClose: () => void; jobs: PickJob[]; onConfirm: (ids: string[]) => void; busy?: boolean }) {
  const { t } = useTranslation();
  const avail = useMemo(() => invoiceable(jobs), [jobs]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const chosen = avail.filter((j) => sel.has(j.id));
  const net = chosen.reduce((a, j) => a + (Number(j.total_with_vat) || 0), 0);
  const all = avail.length > 0 && chosen.length === avail.length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Modal open={open} onClose={onClose} title={t('Select Job Cards for Sales Invoice')} width={640}
      footer={<>
        <span className="muted" style={{ marginInlineEnd: 'auto' }}>{t('Net Amount')} ({chosen.length} {t(chosen.length === 1 ? 'job' : 'jobs')}): <b className="num" style={{ color: 'var(--text)' }}>{fmtMoney(net)}</b></span>
        <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="primary" icon="receipt" disabled={!chosen.length} loading={busy} onClick={() => onConfirm(chosen.map((j) => j.id))}>{t('Create Sales Invoice')} ({chosen.length})</Button>
      </>}>
      {!jobs.length ? <EmptyState title={t('No jobs visible on this board.')} /> : !avail.length ? <EmptyState title={t('All job cards on this board already have a sales invoice.')} /> : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{t('Select one or more job cards to include.')}</p>
          <div className="ws-tbl-wrap">
            <table className="ws-pick-table">
              <thead><tr>
                <th style={{ width: 34 }}><input type="checkbox" className="chk" aria-label={t('Select all')} checked={all} onChange={() => setSel(all ? new Set() : new Set(avail.map((j) => j.id)))} /></th>
                <th>{t('Job')}</th><th>{t('Vehicle')}</th><th className="r">{t('Amount')}</th>
              </tr></thead>
              <tbody>{avail.map((j) => (
                <tr key={j.id} onClick={() => toggle(j.id)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="chk" aria-label={`${t('Select')} ${j.job_number || j.title}`} checked={sel.has(j.id)} onChange={() => toggle(j.id)} /></td>
                  <td><b className="mono">{j.job_number || j.title}</b> <span className="muted">{j.job_number ? j.title : ''}</span></td>
                  <td>{[j.vehicle_number, j.brand, j.model].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="r num">{fmtMoney(j.total_with_vat)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
