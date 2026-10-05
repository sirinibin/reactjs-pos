import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import type { Totals } from '@/framework/doc/calc';

const KEYS: (keyof Totals)[] = ['total', 'total_with_vat', 'vat_price', 'net_total', 'rounding_amount', 'discount_percent', 'discount_percent_with_vat'];

/**
 * Reconcile local totals with the server's calculate-net-total (debounced, stale replies dropped).
 * Returns the server's figures (or null while typing / on failure) and a syncing flag.
 */
export function useServerTotals(endpoint: string, body: Record<string, any>, storeId: string, enabled: boolean, keepRounding: boolean) {
  const [server, setServer] = useState<Partial<Totals> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const req = useRef(0);
  const key = JSON.stringify(body);
  useEffect(() => {
    setServer(null);
    if (!enabled || !storeId) return;
    const my = ++req.current;
    const h = setTimeout(async () => {
      setSyncing(true);
      try {
        const r = await api.post<any>(endpoint, JSON.parse(key), { search: { store_id: storeId } });
        if (my !== req.current || !r.result) return;
        const x = r.result;
        const out: Partial<Totals> = {};
        for (const k of KEYS) if (typeof x[k] === 'number' && (k !== 'rounding_amount' || keepRounding)) (out as any)[k] = x[k];
        setServer(out);
      } catch {
        if (my === req.current) setServer(null);
      } finally {
        if (my === req.current) setSyncing(false);
      }
    }, 450);
    return () => clearTimeout(h);
  }, [endpoint, key, storeId, enabled, keepRounding]);
  return { server, syncing };
}
