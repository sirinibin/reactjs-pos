import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useList, type ListParams } from '@/api/hooks';
import { api, type Query } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { DataGrid, Pager, type Column, type MobileCard, type SortState } from '@/ui/DataGrid';
import { ErrorState, Tabs } from '@/ui/Misc';
import { SearchInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import type { IconName } from '@/ui/Icon';
import { usePageMeta } from '@/shell/Workspace';
import { downloadText, toCsv } from '@/lib/exportCsv';
import { FilterChip, filtersToSearch, type FilterDef } from './filters';
import { useDebounced, useListState } from './useListState';

export interface ListView { id: string; label: string; search?: Query; count?: (meta: Record<string, any>) => number | undefined }
export interface SummaryTile { label: string; value: ReactNode; tone?: 'good' | 'warn' | 'crit' }
export interface ExportColumn<T> { header: string; value: (row: T) => string | number | null | undefined }

export interface ListConfig<T> {
  title: string;
  subtitle?: string;
  icon: IconName;
  endpoint: string;
  /** RBAC resource — gates the New button and bulk actions. */
  resource?: string;
  select?: string;
  defaultSort?: SortState;
  /** search key for the free-text box, or a mapper for multi-field search. */
  searchKey?: string | ((q: string) => Query);
  searchPlaceholder?: string;
  views?: ListView[];
  filters?: FilterDef[];
  baseSearch?: Query;
  columns: Column<T>[];
  mobileCard?: (row: T) => MobileCard;
  rowKey?: (row: T) => string;
  detailPath?: (row: T) => string;
  onRowClick?: (row: T) => void;
  createLabel?: string;
  createPath?: string;
  onCreate?: () => void;
  headerActions?: ReactNode;
  selectable?: boolean;
  bulkActions?: (rows: T[], clear: () => void) => ReactNode;
  rowActions?: (row: T) => ReactNode;
  summary?: (meta: Record<string, any>, total: number) => SummaryTile[];
  exportColumns?: ExportColumn<T>[];
  exportName?: string;
  showFooter?: boolean;
  empty?: ReactNode;
  storeScoped?: boolean;
  groupBy?: (row: T) => string;
  refetchInterval?: number;
}

export function ListPage<T extends { id?: string }>({ config: c }: { config: ListConfig<T> }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  usePageMeta(t(c.title), c.icon);
  const { state, update, sortParam } = useListState({ sort: c.defaultSort });
  const [qDraft, setQDraft] = useState(state.q);
  const dq = useDebounced(qDraft, 300);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    if (dq !== state.q) update({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const view = c.views?.find((v) => v.id === state.view) || c.views?.[0];
  const textSearch: Query = !state.q ? {} : typeof c.searchKey === 'function' ? c.searchKey(state.q) : { [c.searchKey || 'query']: state.q };
  const search: Query = { ...(c.summary ? { stats: 1 } : {}), ...(c.baseSearch || {}), ...(view?.search || {}), ...filtersToSearch(c.filters || [], state.filters), ...textSearch };
  const params: ListParams = { search, page: state.page, limit: state.size, sort: sortParam, select: c.select };
  const q = useList<T>(c.endpoint, params, { storeScoped: c.storeScoped, refetchInterval: c.refetchInterval });
  const rows = useMemo(() => q.data?.rows || [], [q.data]);
  const total = q.data?.total || 0;
  const meta = q.data?.meta || {};
  const rowKey = useMemo(() => c.rowKey || ((r: T) => String((r as any).id)), [c.rowKey]);
  const selRows = useMemo(() => rows.filter((r) => selected.has(rowKey(r))), [rows, selected, rowKey]);

  const canCreate = can(c.resource, 'create');
  const onCreate = c.onCreate || (c.createPath ? () => nav(c.createPath!) : undefined);
  const activeFilters = Object.keys(state.filters).length + (state.q ? 1 : 0);

  const doExport = async () => {
    if (!c.exportColumns) return;
    setExporting(true);
    try {
      const all: T[] = [];
      const pageSize = 500;
      for (let page = 1; page <= 40; page++) {
        const r = await api.get<T[]>(c.endpoint, { ...params, page, limit: pageSize, search: { store_id: c.storeScoped === false ? undefined : storeId, ...search } } as any);
        all.push(...(r.result || []));
        if (!r.result || r.result.length < pageSize) break;
      }
      const csv = toCsv(c.exportColumns.map((x) => t(x.header)), all.map((r) => c.exportColumns!.map((x) => x.value(r))));
      downloadText(`${c.exportName || c.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(t('Exported {{n}} rows', { n: all.length }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const tiles = c.summary ? c.summary(meta, total) : [];

  return (
    <section className="pad">
      <div className="ph">
        <div>
          <h1>{t(c.title)}</h1>
          {c.subtitle && <p>{t(c.subtitle)}</p>}
        </div>
        <div className="acts">
          {c.headerActions}
          {c.exportColumns && <Button icon="download" onClick={doExport} loading={exporting}>{t('Export')}</Button>}
          {onCreate && canCreate && <Button variant="primary" icon="plus" onClick={onCreate}>{t(c.createLabel || 'New')}</Button>}
        </div>
      </div>
      <div className="card">
        {c.views && c.views.length > 1 && (
          <Tabs className="vtabs" label={t('Saved views')} value={view!.id} onChange={(v) => update({ view: v })}
            tabs={c.views.map((v) => ({ id: v.id, label: t(v.label), count: v.count ? v.count(meta)?.toLocaleString() : undefined }))} />
        )}
        <div className="gridbar">
          <SearchInput value={qDraft} onChange={setQDraft} placeholder={t(c.searchPlaceholder || 'Search…')} aria-label={t('Search')} />
          {c.filters?.map((f) => (
            <FilterChip key={f.id} def={f} value={state.filters[f.id]} onChange={(v) => update({ filters: { ...state.filters, [f.id]: v } })} />
          ))}
          {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={() => { setQDraft(''); update({ q: '', filters: {} }); }}>{t('Clear filters')}</Button>}
          <span className="spacer" />
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => q.refetch()} />
        </div>
        {tiles.length > 0 && (
          <div className="sum-mini" aria-label={t('Totals')}>
            {tiles.map((s) => (
              <div key={s.label}><span>{t(s.label)}</span><b className="num" style={s.tone ? { color: `var(--${s.tone})` } : undefined}>{s.value}</b></div>
            ))}
          </div>
        )}
        {c.bulkActions && selRows.length > 0 && (
          <div className="bulk on">
            <span>{selRows.length} {t('selected')}</span><span className="spacer" />
            {c.bulkActions(selRows, () => setSelected(new Set()))}
            <IconButton icon="x" label={t('Clear selection')} onClick={() => setSelected(new Set())} style={{ color: '#fff' }} />
          </div>
        )}
        {q.isError ? (
          <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>
        ) : (
          <DataGrid<T>
            label={t(c.title)}
            columns={c.columns}
            rows={rows}
            rowKey={rowKey}
            loading={q.isPending}
            sort={state.sort}
            onSort={(s) => update({ sort: s })}
            selectable={c.selectable ?? !!c.bulkActions}
            selected={selected}
            onSelectionChange={setSelected}
            onRowClick={c.onRowClick || (c.detailPath ? (r) => nav(c.detailPath!(r)) : undefined)}
            rowActions={c.rowActions}
            mobileCard={c.mobileCard}
            showFooter={c.showFooter}
            groupBy={c.groupBy}
            empty={c.empty}
          />
        )}
        <Pager page={state.page} pageSize={state.size} total={total} onPage={(p) => update({ page: p }, false)} onPageSize={(n) => update({ size: n })} />
      </div>
    </section>
  );
}
