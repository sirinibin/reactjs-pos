import { Fragment, useMemo, type ReactNode } from 'react';
import { Skeleton, EmptyState } from './Misc';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
export type SortDir = 1 | -1;
export interface SortState { key: string; dir: SortDir }

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  /** Field sent to the API as `sort`; enables sorting when set. */
  sortKey?: string;
  align?: 'start' | 'end' | 'center';
  width?: number | string;
  /** Hide this column when the viewport is at or below the breakpoint. */
  hideBelow?: Breakpoint;
  className?: string;
  footer?: ReactNode;
}

export interface MobileCard {
  title: ReactNode;
  amount?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
}

export interface DataGridProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  sort?: SortState | null;
  onSort?: (s: SortState) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (s: Set<string>) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  mobileCard?: (row: T) => MobileCard;
  showFooter?: boolean;
  groupBy?: (row: T) => string;
  renderGroupHeader?: (group: string, rows: T[]) => ReactNode;
  empty?: ReactNode;
  label: string;
  maxHeight?: string;
}

const hideClass = (b?: Breakpoint) => (b ? `hide-${b === 'sm' ? 'sm' : b === 'md' ? 'md' : b === 'lg' ? 'lg' : 'xl'}` : '');
const alignClass = (a?: Column<unknown>['align']) => (a === 'end' ? 'r' : a === 'center' ? 'c' : '');

export function DataGrid<T>(p: DataGridProps<T>) {
  const { columns, rows, rowKey, loading, sort, onSort, selectable, selected = new Set(), onSelectionChange } = p;
  const keys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const allSel = keys.length > 0 && keys.every((k) => selected.has(k));
  const someSel = !allSel && keys.some((k) => selected.has(k));

  const toggle = (k: string) => {
    const n = new Set(selected);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    onSelectionChange?.(n);
  };
  const toggleAll = () => {
    const n = new Set(selected);
    keys.forEach((k) => (allSel ? n.delete(k) : n.add(k)));
    onSelectionChange?.(n);
  };
  const clickSort = (c: Column<T>) => {
    if (!c.sortKey || !onSort) return;
    onSort({ key: c.sortKey, dir: sort?.key === c.sortKey ? ((sort.dir * -1) as SortDir) : 1 });
  };

  const colCount = columns.length + (selectable ? 1 : 0) + (p.rowActions ? 1 : 0);
  const groups = useMemo(() => {
    if (!p.groupBy) return null;
    const m = new Map<string, T[]>();
    rows.forEach((r) => {
      const g = p.groupBy!(r);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(r);
    });
    return m;
  }, [rows, p.groupBy]);

  const renderRow = (r: T, i: number) => {
    const k = rowKey(r);
    return (
      <tr
        key={k}
        className={selected.has(k) ? 'sel' : undefined}
        onClick={p.onRowClick ? () => p.onRowClick!(r) : undefined}
        onKeyDown={p.onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) p.onRowClick!(r); } : undefined}
        tabIndex={p.onRowClick ? 0 : undefined}
        style={p.onRowClick ? undefined : { cursor: 'default' }}
      >
        {selectable && (
          <td className="pin" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" className="chk" checked={selected.has(k)} onChange={() => toggle(k)} aria-label="Select row" />
          </td>
        )}
        {columns.map((c, ci) => (
          <td key={c.key} className={[alignClass(c.align), hideClass(c.hideBelow), ci === 0 && selectable ? 'pin2' : '', c.className].filter(Boolean).join(' ')}>
            {c.render ? c.render(r, i) : String((r as any)[c.key] ?? '')}
          </td>
        ))}
        {p.rowActions && <td onClick={(e) => e.stopPropagation()} className="r">{p.rowActions(r)}</td>}
      </tr>
    );
  };

  return (
    <>
      <div className={['tw', p.mobileCard ? 'resp' : ''].join(' ')} style={p.maxHeight ? { maxHeight: p.maxHeight } : undefined}>
        <table className="dg" aria-label={p.label} aria-busy={loading || undefined}>
          <thead>
            <tr>
              {selectable && (
                <th className="pin" style={{ width: 40 }}>
                  <input type="checkbox" className="chk" checked={allSel} ref={(el) => { if (el) el.indeterminate = someSel; }} onChange={toggleAll} aria-label="Select all rows" />
                </th>
              )}
              {columns.map((c, ci) => {
                const sorted = sort && c.sortKey && sort.key === c.sortKey;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={[c.sortKey && onSort ? 's' : '', alignClass(c.align), hideClass(c.hideBelow), ci === 0 && selectable ? 'pin2' : ''].filter(Boolean).join(' ')}
                    aria-sort={c.sortKey ? (sorted ? (sort!.dir > 0 ? 'ascending' : 'descending') : 'none') : undefined}
                  >
                    {c.sortKey && onSort ? (
                      <button type="button" className="th-btn" onClick={() => clickSort(c)}>
                        {c.header}
                        <span className="ar" aria-hidden>{sorted ? (sort!.dir > 0 ? '↑' : '↓') : ''}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {p.rowActions && <th style={{ width: 44 }} aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={`sk${i}`} className="skel">
                    {Array.from({ length: colCount }, (_, j) => (
                      <td key={j} className={j - (selectable ? 1 : 0) >= 0 ? hideClass(columns[j - (selectable ? 1 : 0)]?.hideBelow) : 'pin'}>
                        <Skeleton width={j === 0 && selectable ? 14 : 40 + ((i * 7 + j * 37) % 70)} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.length === 0
                ? (
                  <tr>
                    <td colSpan={colCount} style={{ height: 'auto', cursor: 'default' }}>
                      {p.empty || <EmptyState icon="search" title="No records found">Try a different search or clear the filters.</EmptyState>}
                    </td>
                  </tr>
                )
                : groups
                  ? Array.from(groups.entries()).map(([g, gr]) => (
                      <Fragment key={`g-${g}`}>
                        <tr className="grp"><td colSpan={colCount}>{p.renderGroupHeader ? p.renderGroupHeader(g, gr) : g}</td></tr>
                        {gr.map(renderRow)}
                      </Fragment>
                    ))
                  : rows.map(renderRow)}
          </tbody>
          {p.showFooter && !loading && rows.length > 0 && (
            <tfoot>
              <tr>
                {selectable && <td className="pin" />}
                {columns.map((c, ci) => (
                  <td key={c.key} className={[alignClass(c.align), 'num', hideClass(c.hideBelow), ci === 0 && selectable ? 'pin2' : ''].filter(Boolean).join(' ')}>{c.footer}</td>
                ))}
                {p.rowActions && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {p.mobileCard && (
        <div className="mlist" aria-label={p.label}>
          {loading
            ? Array.from({ length: 6 }, (_, i) => <div className="mi" key={i}><Skeleton width="60%" /><Skeleton width="30%" /></div>)
            : rows.length === 0
              ? p.empty || <EmptyState icon="search" title="No records found" />
              : rows.map((r) => {
                  const k = rowKey(r);
                  const m = p.mobileCard!(r);
                  return (
                    <div className="mi" key={k} role={p.onRowClick ? 'button' : undefined} tabIndex={p.onRowClick ? 0 : undefined}
                      onClick={() => p.onRowClick?.(r)} onKeyDown={(e) => e.key === 'Enter' && p.onRowClick?.(r)}>
                      {selectable ? (
                        <input type="checkbox" className="chk" checked={selected.has(k)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(k)} aria-label="Select row" />
                      ) : <span />}
                      <span className="a">{m.title}</span>
                      <span className="b num">{m.amount}</span>
                      {m.subtitle && <span className="c">{m.subtitle}</span>}
                      {m.meta && <span className="d">{m.meta}</span>}
                      {p.rowActions && <span className="e" onClick={(e) => e.stopPropagation()}>{p.rowActions(r)}</span>}
                    </div>
                  );
                })}
        </div>
      )}
    </>
  );
}

export function Pager({ page, pageSize, total, onPage, onPageSize, sizes = [20, 50, 100] }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize?: (n: number) => void; sizes?: number[];
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums: (number | '…')[] = [];
  const push = (n: number | '…') => { if (nums[nums.length - 1] !== n) nums.push(n); };
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) push(i);
    else push('…');
  }
  return (
    <div className="gfoot">
      <span className="num">{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
      {onPageSize && (
        <select className="inp hide-sm" style={{ width: 'auto', height: 30 }} value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page">
          {sizes.map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      )}
      <nav className="pager" aria-label="Pagination">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
        {nums.map((n, i) =>
          n === '…' ? <button key={`e${i}`} type="button" disabled className="hide-sm">…</button>
            : <button key={n} type="button" aria-current={n === page} onClick={() => onPage(n)} className={Math.abs(n - page) > 1 ? 'hide-sm' : undefined}>{n}</button>,
        )}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
      </nav>
    </div>
  );
}
