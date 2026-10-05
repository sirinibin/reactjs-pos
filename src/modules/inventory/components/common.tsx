import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { useConfirm } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { parseNumber } from '@/lib/format';
import type { Warehouse } from '../lib/transfer';
import '../inventory.css';

export const WAREHOUSE = '/v1/warehouse';

/** Warehouses of the active store (empty when the warehouse module is off) + whether they are known yet. */
export function useWarehousesState(): { warehouses: Warehouse[]; ready: boolean } {
  const storeId = useStoreId();
  const { setting } = useAuth();
  const on = !!setting('enable_warehouse_module');
  const q = useQuery({
    queryKey: [WAREHOUSE, 'all', storeId],
    queryFn: async ({ signal }) => (await api.get<Warehouse[]>(WAREHOUSE, { search: { store_id: storeId }, limit: 200, select: 'id,code,name', sort: 'code' }, signal)).result || [],
    enabled: on && !!storeId,
    staleTime: 60_000,
  });
  return { warehouses: on ? q.data || [] : [], ready: !!storeId && (!on || q.isSuccess || q.isError) };
}

export const useWarehouses = (): Warehouse[] => useWarehousesState().warehouses;

/**
 * Soft delete + restore with confirmation for master data rows.
 * Returns the confirm dialog element and a row-actions renderer.
 */
export function useDeleteRestore<T extends { id?: string; deleted?: boolean }>(opts: {
  endpoint: string; resource: string; label: (r: T) => string; canRestore?: boolean; noun: string; invalidate?: string[]; restoreHint?: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [confirmEl, ask] = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => [opts.endpoint, ...(opts.invalidate || [])].forEach((p) => qc.invalidateQueries({ queryKey: [p] }));

  const remove = async (r: T) => {
    const ok = await ask(t('Delete {{noun}}?', { noun: t(opts.noun) }), {
      danger: true, confirmLabel: t('Delete'),
      body: <p style={{ margin: 0 }}><bdi><b>{opts.label(r)}</b></bdi> — {t(opts.restoreHint || (opts.canRestore ? 'It can be restored later from the Deleted view.' : 'This can’t be undone.'))}</p>,
    });
    if (!ok) return;
    setBusy(r.id!);
    try {
      await api.del(`${opts.endpoint}/${r.id}`, { search: { store_id: storeId } });
      toast.success(t('Deleted'), opts.canRestore ? { label: t('Undo'), onClick: () => restore(r) } : undefined);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const restore = async (r: T) => {
    setBusy(r.id!);
    try {
      await api.post(`${opts.endpoint}/restore/${r.id}`, {}, { search: { store_id: storeId } });
      toast.success(t('Restored'));
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const canDelete = can(opts.resource, 'delete');
  const rowActions = (r: T): ReactNode => {
    if (!canDelete) return null;
    if (r.deleted) return opts.canRestore ? <IconButton icon="undo" label={`${t('Restore')} ${opts.label(r)}`} disabled={busy === r.id} onClick={() => restore(r)} /> : null;
    return <IconButton icon="trash" label={`${t('Delete')} ${opts.label(r)}`} disabled={busy === r.id} onClick={() => remove(r)} />;
  };
  return { confirmEl, rowActions, remove, restore, canDelete };
}

/** Translate at render time (for column headers defined in module-level configs). */
export function Tx({ k, o }: { k: string; o?: Record<string, unknown> }) {
  const { t } = useTranslation();
  return <>{t(k, o)}</>;
}

export const DeletedPill = () => {
  const { t } = useTranslation();
  return <Pill tone="crit" icon="trash">{t('Deleted')}</Pill>;
};

/** Multi-select as chips + an async typeahead. */
export function MultiPicker({ value, onChange, load, placeholder, id, label, onCreate, createLabel, renderChip }: {
  value: { id: string; label: string }[];
  onChange: (v: { id: string; label: string }[]) => void;
  load: (q: string, s: AbortSignal) => Promise<PickerOption[]>;
  placeholder?: string; id?: string; label?: string;
  onCreate?: (q: string) => void; createLabel?: string;
  renderChip?: (o: { id: string; label: string }) => ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="inv-multi">
      {value.length > 0 && (
        <div className="inv-chips">
          {value.map((o) => (
            <span className="inv-chip" key={o.id}>
              {renderChip ? renderChip(o) : <bdi>{o.label}</bdi>}
              <button type="button" aria-label={`${t('Remove')} ${o.label}`} onClick={() => onChange(value.filter((x) => x.id !== o.id))}><Icon name="x" size="xs" /></button>
            </span>
          ))}
        </div>
      )}
      <AsyncPicker id={id} aria-label={label} value={null} resetOnPick eager placeholder={placeholder}
        load={async (q, s) => (await load(q, s)).filter((o) => !value.some((v) => v.id === o.id))}
        onChange={(o) => o && !value.some((v) => v.id === o.id) && onChange([...value, { id: o.id, label: o.label }])}
        onCreate={onCreate} createLabel={createLabel} />
    </div>
  );
}

/** Numeric input that keeps the typed text while focused and reports parsed numbers live. */
export function NumInput({ value, onValue, id, invalid, disabled, label, dp = 4, describedBy, className }: {
  value: number; onValue: (n: number) => void; id?: string; invalid?: boolean; disabled?: boolean; label?: string; dp?: number; describedBy?: string; className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? String(Number((Number(value) || 0).toFixed(dp))) : '');
  return (
    <input id={id} className={['inp', 'num', invalid && 'err', className].filter(Boolean).join(' ')} inputMode="decimal" aria-label={label} aria-invalid={invalid || undefined}
      aria-describedby={describedBy} disabled={disabled} value={shown} placeholder="0"
      onFocus={(e) => { setDraft(shown); e.currentTarget.select(); }}
      onChange={(e) => { setDraft(e.target.value); onValue(parseNumber(e.target.value)); }}
      onBlur={() => setDraft(null)} />
  );
}

/** Store setting shortcut. */
export function useSetting<T = any>(key: string, fallback?: T): T {
  return useAuth().setting<T>(key, fallback);
}

/** Simple picker loaders for categories / brands / service categories. */
export async function loadOptions(endpoint: string, storeId: string, q: string, signal: AbortSignal, field = 'name', labelOf: (r: any) => string = (r) => r.name): Promise<PickerOption[]> {
  const r = await api.get<any[]>(endpoint, { search: { store_id: storeId, [field]: q || undefined }, limit: 50, select: 'id,name,code', sort: 'name' }, signal);
  return (r.result || []).map((x) => ({ id: x.id, label: labelOf(x), sub: x.code || undefined, data: x }));
}
