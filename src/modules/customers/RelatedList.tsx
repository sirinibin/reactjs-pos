import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useList } from '@/api/hooks';
import type { Query } from '@/api/client';
import { Card } from '@/ui/Card';
import { DataGrid, Pager, type Column, type MobileCard } from '@/ui/DataGrid';
import { EmptyState, ErrorState } from '@/ui/Misc';

/**
 * Compact, paginated list of records related to one parent (e.g. a customer's invoices).
 * Generic enough to live in the framework one day — see the module report.
 */
export function RelatedList<T extends { id?: string }>({ title, endpoint, search, select, sort = '-date', columns, mobileCard, detailPath, summary, actions, emptyTitle, pageSize = 10, enabled = true }: {
  title: ReactNode; endpoint: string; search: Query; select?: string; sort?: string; columns: Column<T>[]; mobileCard?: (r: T) => MobileCard;
  detailPath?: (r: T) => string | null; summary?: (meta: Record<string, any>, total: number) => { label: string; value: ReactNode; tone?: string }[];
  actions?: ReactNode; emptyTitle: string; pageSize?: number; enabled?: boolean;
}) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const q = useList<T>(endpoint, { search: { ...(summary ? { stats: 1 } : {}), ...search }, page, limit: size, sort, select }, { enabled });
  const rows = q.data?.rows || [];
  const total = q.data?.total || 0;
  const tiles = summary && q.data ? summary(q.data.meta, total) : [];
  return (
    <Card title={title} actions={actions} bodyClass="card-b-tight">
      {tiles.length > 0 && (
        <div className="sum-mini" aria-label={t('Totals')}>
          {tiles.map((s) => <div key={s.label}><span>{t(s.label)}</span><b className="num" style={s.tone ? { color: `var(--${s.tone})` } : undefined}>{s.value}</b></div>)}
        </div>
      )}
      {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
        <DataGrid<T>
          label={typeof title === 'string' ? title : t('Records')}
          columns={columns}
          rows={rows}
          rowKey={(r) => String(r.id)}
          loading={q.isLoading}
          mobileCard={mobileCard}
          onRowClick={detailPath ? (r) => { const p = detailPath(r); if (p) nav(p); } : undefined}
          empty={<EmptyState icon="inbox" title={t(emptyTitle)} />}
        />
      )}
      {total > size || page > 1 ? <Pager page={page} pageSize={size} total={total} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} sizes={[10, 20, 50]} /> : null}
    </Card>
  );
}
