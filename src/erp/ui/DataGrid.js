import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cx, IconButton } from './Button';
import { EmptyState, Menu } from './Display';
import { Select } from './Form';

function alignClass(col) {
    if (col.align === 'num') return 'is-num';
    if (col.align === 'center') return 'is-center';
    return undefined;
}

/**
 * Server-driven data grid.
 *
 * columns: [{ key, label, render(row), sortKey, align: 'num'|'center', width, filter: () => node }]
 * sort:    { key, dir: 'asc'|'desc' }  (key matches a column's sortKey)
 * rowActions(row) returns Menu items; rendered in a trailing actions column.
 */
export function DataGrid({
    columns,
    rows,
    rowKey = 'id',
    loading,
    sort,
    onSortChange,
    onRowClick,
    rowActions,
    rowClassName,
    showFilters,
    emptyTitle = 'No records found',
    emptyMessage,
    emptyAction,
    footer,
    caption,
    skeletonRows = 8,
    maxHeight,
}) {
    const hasFilters = showFilters && columns.some(c => c.filter);
    const colCount = columns.length + (rowActions ? 1 : 0);

    function toggleSort(col) {
        if (!col.sortKey || !onSortChange) return;
        if (sort && sort.key === col.sortKey) {
            onSortChange({ key: col.sortKey, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
        } else {
            onSortChange({ key: col.sortKey, dir: col.defaultSortDir || 'asc' });
        }
    }

    return (
        <div className="erp-grid-wrap" style={maxHeight ? { maxHeight } : undefined}>
            <table className="erp-grid">
                {caption && <caption className="erp-visually-hidden">{caption}</caption>}
                <thead>
                    <tr>
                        {columns.map(col => {
                            const sorted = sort && col.sortKey && sort.key === col.sortKey;
                            const SortIcon = sorted ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                            return (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={cx(alignClass(col), col.sortKey && onSortChange && 'is-sortable', sorted && 'is-sorted')}
                                    style={col.width ? { width: col.width } : undefined}
                                    aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                                    onClick={() => toggleSort(col)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(col); } }}
                                    tabIndex={col.sortKey && onSortChange ? 0 : undefined}
                                >
                                    <span className="erp-grid__sort">
                                        {col.label}
                                        {col.sortKey && onSortChange && <SortIcon size={12} aria-hidden="true" />}
                                    </span>
                                </th>
                            );
                        })}
                        {rowActions && <th scope="col" className="erp-grid__actions"><span className="erp-visually-hidden">Actions</span></th>}
                    </tr>
                    {hasFilters && (
                        <tr className="erp-grid__filters">
                            {columns.map(col => <th key={col.key}>{col.filter ? col.filter() : null}</th>)}
                            {rowActions && <th />}
                        </tr>
                    )}
                </thead>
                <tbody>
                    {loading && (!rows || rows.length === 0) ? (
                        Array.from({ length: skeletonRows }).map((_, i) => (
                            <tr key={'sk' + i} aria-hidden="true">
                                {Array.from({ length: colCount }).map((__, j) => <td key={j}><span className="erp-skeleton" /></td>)}
                            </tr>
                        ))
                    ) : !rows || rows.length === 0 ? (
                        <tr>
                            <td colSpan={colCount} style={{ whiteSpace: 'normal' }}>
                                <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, idx) => {
                            const key = typeof rowKey === 'function' ? rowKey(row, idx) : row[rowKey] || idx;
                            return (
                                <tr
                                    key={key}
                                    className={cx(onRowClick && 'is-clickable', rowClassName && rowClassName(row))}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    style={loading ? { opacity: 0.6 } : undefined}
                                >
                                    {columns.map(col => (
                                        <td key={col.key} className={alignClass(col)} title={col.title ? col.title(row) : undefined}>
                                            {col.render ? col.render(row, idx) : row[col.key]}
                                        </td>
                                    ))}
                                    {rowActions && (
                                        <td className="erp-grid__actions" onClick={e => e.stopPropagation()}>
                                            <Menu
                                                trigger={<IconButton icon={MoreHorizontal} size="sm" label="Row actions" />}
                                                items={rowActions(row)}
                                            />
                                        </td>
                                    )}
                                </tr>
                            );
                        })
                    )}
                </tbody>
                {footer && rows && rows.length > 0 && <tfoot>{footer}</tfoot>}
            </table>
        </div>
    );
}

/** Builds the compact list of page numbers with ellipses, e.g. [1,'…',4,5,6,'…',20]. */
export function pageWindow(page, totalPages, span = 1) {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages]);
    for (let p = page - span; p <= page + span; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push('…' + i);
        out.push(p);
    });
    return out;
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 20, 50, 100, 200, 500], label = 'records' }) {
    const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);
    return (
        <div className="erp-pager">
            <div className="erp-pager__size">
                <span>Rows per page</span>
                <Select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={e => onPageSizeChange && onPageSizeChange(parseInt(e.target.value, 10))}
                    options={pageSizes.map(s => ({ value: s, label: String(s) }))}
                />
                <span className="erp-num" aria-live="polite">{from}–{to} of {total} {label}</span>
            </div>
            <nav className="erp-pager__controls" aria-label="Pagination">
                <button type="button" className="erp-pager__page" aria-label="First page" disabled={page <= 1} onClick={() => onPageChange(1)}><ChevronsLeft size={14} /></button>
                <button type="button" className="erp-pager__page" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14} /></button>
                {pageWindow(page, totalPages).map(p => typeof p === 'string' ? (
                    <span key={p} className="erp-muted" aria-hidden="true">…</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        className={cx('erp-pager__page', p === page && 'is-current')}
                        aria-current={p === page ? 'page' : undefined}
                        aria-label={'Page ' + p}
                        onClick={() => onPageChange(p)}
                    >{p}</button>
                ))}
                <button type="button" className="erp-pager__page" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight size={14} /></button>
                <button type="button" className="erp-pager__page" aria-label="Last page" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}><ChevronsRight size={14} /></button>
            </nav>
        </div>
    );
}
