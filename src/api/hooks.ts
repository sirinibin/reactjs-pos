import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api, type ApiEnvelope, type Query } from './client';
import { useAuth, useStoreId } from '@/auth/AuthContext';

export interface ListParams {
  search?: Query;
  page?: number;
  limit?: number;
  sort?: string;
  select?: string;
  [k: string]: unknown;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  meta: Record<string, any>;
}

/** Paginated list scoped to the active store (search[store_id] is added automatically). */
export function useList<T = any>(path: string, params: ListParams, opts: { enabled?: boolean; storeScoped?: boolean; refetchInterval?: number } = {}) {
  const storeId = useStoreId();
  const ready = useAuth().status === 'ready';
  const scoped = opts.storeScoped !== false;
  const search = { ...(scoped && storeId ? { store_id: storeId } : {}), ...(params.search || {}) };
  const full = { ...params, search };
  return useQuery<ListResult<T>>({
    queryKey: [path, 'list', full],
    queryFn: async ({ signal }) => {
      const r: ApiEnvelope<T[]> = await api.get<T[]>(path, full as any, signal);
      return { rows: r.result || [], total: r.total_count ?? (r.result?.length || 0), meta: r.meta || {} };
    },
    // Wait for the session (permissions) so we never query modules the user can't read.
    enabled: ready && opts.enabled !== false && (!scoped || !!storeId),
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetchInterval,
  });
}

/** Single record: GET {path}/{id}?search[store_id]=… */
export function useRecord<T = any>(path: string, id: string | undefined, query: Record<string, any> = {}, opts: Partial<UseQueryOptions<T>> = {}) {
  const storeId = useStoreId();
  const ready = useAuth().status === 'ready';
  return useQuery<T>({
    queryKey: [path, 'one', id, storeId, query],
    queryFn: async ({ signal }) => (await api.get<T>(`${path}/${id}`, { ...query, search: { store_id: storeId, ...(query.search || {}) } } as any, signal)).result as T,
    enabled: ready && !!id && id !== 'new' && !!storeId,
    ...opts,
  });
}

/** Create (POST path) or update (PUT path/id) with store_id query + cache invalidation. */
export function useSave<T = any>(path: string, opts: { invalidate?: string[] } = {}) {
  const qc = useQueryClient();
  const storeId = useStoreId();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: Record<string, any> }) => {
      const payload = { store_id: storeId, ...body };
      const q = { search: { store_id: storeId } };
      const r = id ? await api.put<T>(`${path}/${id}`, payload, q) : await api.post<T>(path, payload, q);
      return r.result as T;
    },
    onSuccess: () => {
      [path, ...(opts.invalidate || [])].forEach((p) => qc.invalidateQueries({ queryKey: [p] }));
    },
  });
}

export function useRemove(path: string, opts: { invalidate?: string[] } = {}) {
  const qc = useQueryClient();
  const storeId = useStoreId();
  return useMutation({
    mutationFn: async (id: string) => (await api.del(`${path}/${id}`, { search: { store_id: storeId } })).result,
    onSuccess: () => [path, ...(opts.invalidate || [])].forEach((p) => qc.invalidateQueries({ queryKey: [p] })),
  });
}

/** Typeahead/autocomplete search used by pickers (customers, vendors, products…). */
export async function searchRecords<T = any>(path: string, storeId: string, params: ListParams): Promise<T[]> {
  const r = await api.get<T[]>(path, { ...params, search: { store_id: storeId, ...(params.search || {}) } } as any);
  return r.result || [];
}
