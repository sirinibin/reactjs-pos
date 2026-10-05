import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStoreId } from '@/auth/AuthContext';
import { papi } from '../api';
import type { ContactThread, RFQ } from '../types';

export const RFQ_KEY = 'procurement-rfq';
export const RFQ_PATH = '/procurement/rfq';

export function useRfqList(p: { q: string; status: string; page: number; size: number }) {
  const storeId = useStoreId();
  return useQuery<{ rows: RFQ[]; total: number }>({
    queryKey: [RFQ_KEY, 'list', storeId, p],
    queryFn: ({ signal }) => papi.get<{ items: RFQ[] | null; total_count: number }>('/v1/rfq-received', { store_id: storeId, page: p.page, limit: p.size, search: p.q || undefined, status: p.status === 'all' ? undefined : p.status }, signal)
      .then((r) => ({ rows: r.items || [], total: r.total_count || 0 })),
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
}

export function useRfq(id: string | undefined) {
  const storeId = useStoreId();
  return useQuery({
    queryKey: [RFQ_KEY, 'one', storeId, id],
    queryFn: ({ signal }) => papi.get<RFQ>(`/v1/rfq-received/${id}`, { store_id: storeId }, signal),
    enabled: !!storeId && !!id && id !== 'new',
  });
}

/** WhatsApp threads for a set of phones (unread badges). Never opens threads (that would mark them read). */
export function useThreadsForPhones(phones: string[], type: 'whatsapp' | 'email' = 'whatsapp') {
  const storeId = useStoreId();
  const csv = phones.join(',');
  return useQuery({
    queryKey: ['procurement-threads', storeId, type, csv],
    queryFn: ({ signal }) => papi.get<{ threads: ContactThread[] | null }>('/v1/procurement-message-threads', { store_id: storeId, type, limit: 100, phones: csv }, signal).then((r) => r.threads || []),
    enabled: !!storeId && phones.length > 0,
    staleTime: 15_000,
  });
}

export function useInvalidateRfq() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [RFQ_KEY] });
}
