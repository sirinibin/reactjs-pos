import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Columns3, Filter, FilterX, Eye, Pencil, Trash2, RotateCcw } from 'lucide-react';
import {
    PageHeader, Panel, Button, IconButton, DataGrid, Pagination, ConfirmDialog, ColumnChooser, Alert, useToast,
    TextFilter, YesNoFilter, SelectFilter, DateFilter, IdsFilter,
} from '../ui';
import { useServerList } from '../hooks/useServerList';
import { useColumnPrefs } from '../hooks/useColumnPrefs';
import CrudForm from './CrudForm';
import CrudView from './CrudView';

const FILTERS_KEY = 'erp_show_filters';

/** Count of active filters, ignoring keys the page always sends. */
export function activeFilterCount(search) {
    return Object.keys(search).filter(k => search[k] !== '' && search[k] !== undefined).length;
}

/**
 * Generic list → view → create/edit → delete/restore page for master data.
 * See modules/*.config.js for the per-module definitions.
 */
export default function CrudPage({ config }) {
    const { t } = useTranslation('common');
    const toast = useToast();
    const actions = config.actions || {};

    const fetchPage = useCallback(
        ({ search, sort, page, limit, signal }) => config.resource.list({ search, sort, page, limit, signal }),
        [config.resource]
    );
    const list = useServerList({
        fetchPage,
        storageKey: 'erp_' + config.id,
        defaultSort: config.defaultSort,
        defaultPageSize: config.defaultPageSize || 20,
    });

    const [showFilters, setShowFilters] = useState(() => localStorage.getItem(FILTERS_KEY) !== '0');
    const [chooserOpen, setChooserOpen] = useState(false);
    const [formState, setFormState] = useState({ open: false, id: null });
    const [viewState, setViewState] = useState({ open: false, id: null });
    const [confirm, setConfirm] = useState(null); // {kind:'delete'|'restore', row}
    const [busy, setBusy] = useState(false);
    const [filterKey, setFilterKey] = useState(0);

    const rowOffset = (list.page - 1) * list.pageSize;
    const columns = useMemo(() => config.columns.map(col => ({
        ...col,
        render: col.key === 'row_no' ? (r, i) => rowOffset + i + 1 : col.render,
        label: t(col.label),
        filter: col.filter ? () => renderFilter(col.filter, list, t, col.label) : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [config.columns, t, list.search, filterKey, rowOffset]);

    const colPrefs = useColumnPrefs(config.id, columns);
    const labels = useMemo(() => Object.fromEntries(columns.map(c => [c.key, c.label])), [columns]);

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try { localStorage.setItem(FILTERS_KEY, next ? '1' : '0'); } catch (_) { }
    }

    function clearAll() {
        list.clearFilters();
        setFilterKey(k => k + 1); // remounts filter inputs so their text clears too
    }

    async function runConfirm() {
        if (!confirm) return;
        setBusy(true);
        try {
            if (confirm.kind === 'delete') {
                await config.resource.remove(confirm.row.id);
                toast.success(t('Deleted successfully!'));
            } else {
                await config.resource.restore(confirm.row.id);
                toast.success(t('Restored successfully!'));
            }
            setConfirm(null);
            list.reload();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    const rowActions = row => [
        { label: t('View'), icon: Eye, onClick: () => setViewState({ open: true, id: row.id }), hidden: actions.view === false },
        { label: t('Edit'), icon: Pencil, onClick: () => setFormState({ open: true, id: row.id }), hidden: actions.edit === false || row.deleted },
        { separator: true, hidden: actions.delete === false },
        { label: t('Delete'), icon: Trash2, danger: true, onClick: () => setConfirm({ kind: 'delete', row }), hidden: actions.delete === false || row.deleted },
        { label: t('Restore'), icon: RotateCcw, onClick: () => setConfirm({ kind: 'restore', row }), hidden: actions.restore === false || !row.deleted },
    ];

    const nFilters = activeFilterCount(list.search);
    const recordName = confirm ? (confirm.row[config.titleField || 'name'] || '') : '';

    return (
        <div className="erp-page">
            <PageHeader
                title={t(config.title)}
                subtitle={config.subtitle ? t(config.subtitle) : undefined}
                breadcrumbs={config.breadcrumbs ? config.breadcrumbs.map(b => ({ ...b, label: t(b.label) })) : undefined}
                actions={actions.create !== false && (
                    <Button variant="primary" icon={Plus} onClick={() => setFormState({ open: true, id: null })}>
                        {t('Create')}
                    </Button>
                )}
            />
            <Panel flush>
                <div className="erp-toolbar">
                    <span className="erp-muted erp-num" aria-live="polite">
                        {list.loading ? t('Loading…') : `${list.total} ${t(list.total === 1 ? 'record' : 'records')}`}
                    </span>
                    <span className="erp-toolbar__spacer" />
                    {nFilters > 0 && (
                        <Button size="sm" variant="ghost" icon={FilterX} onClick={clearAll}>
                            {t('Clear filters')} ({nFilters})
                        </Button>
                    )}
                    <IconButton icon={Filter} label={showFilters ? t('Hide filters') : t('Show filters')} onClick={toggleFilters} aria-pressed={showFilters} />
                    <IconButton icon={Columns3} label={t('Columns')} onClick={() => setChooserOpen(true)} />
                    <IconButton icon={RefreshCw} label={t('Refresh')} onClick={list.reload} className={list.loading ? 'is-loading' : undefined} />
                </div>
                {list.error && <div style={{ padding: 12 }}><Alert tone="danger">{list.error.message}</Alert></div>}
                <DataGrid
                    key={filterKey}
                    caption={t(config.title)}
                    columns={colPrefs.visibleColumns}
                    rows={list.rows}
                    loading={list.loading}
                    sort={list.sort}
                    onSortChange={list.setSort}
                    showFilters={showFilters}
                    onRowClick={actions.view === false ? undefined : row => setViewState({ open: true, id: row.id })}
                    rowActions={rowActions}
                    rowClassName={row => (row.deleted ? 'is-muted' : undefined)}
                    emptyTitle={t(nFilters ? 'No matching records' : config.emptyTitle || 'Nothing here yet')}
                    emptyMessage={nFilters ? t('Try changing or clearing the filters.') : undefined}
                    emptyAction={!nFilters && actions.create !== false ? (
                        <Button variant="primary" icon={Plus} onClick={() => setFormState({ open: true, id: null })}>{t('Create')}</Button>
                    ) : undefined}
                />
                <Pagination
                    page={list.page}
                    pageSize={list.pageSize}
                    total={list.total}
                    onPageChange={list.setPage}
                    onPageSizeChange={list.setPageSize}
                />
            </Panel>

            <ColumnChooser
                open={chooserOpen}
                onClose={() => setChooserOpen(false)}
                prefs={colPrefs.prefs}
                labels={labels}
                onSave={colPrefs.save}
                onReset={colPrefs.reset}
            />
            <CrudForm
                open={formState.open}
                recordId={formState.id}
                config={config}
                onClose={() => setFormState({ open: false, id: null })}
                onSaved={(saved, wasEdit) => {
                    toast.success(t(wasEdit ? 'Updated successfully!' : 'Created successfully!'));
                    setFormState({ open: false, id: null });
                    list.reload();
                    if (saved && saved.id && actions.view !== false) setViewState({ open: true, id: saved.id });
                }}
            />
            <CrudView
                open={viewState.open}
                recordId={viewState.id}
                config={config}
                onClose={() => setViewState({ open: false, id: null })}
                onEdit={id => { setViewState({ open: false, id: null }); setFormState({ open: true, id }); }}
            />
            <ConfirmDialog
                open={!!confirm}
                title={confirm && confirm.kind === 'delete' ? t('Delete') + ' ' + t(config.singular) : t('Restore') + ' ' + t(config.singular)}
                message={confirm && confirm.kind === 'delete'
                    ? t('Delete') + ` "${recordName}"? ` + t('It can be restored later from the Deleted filter.')
                    : t('Restore') + ` "${recordName}"?`}
                confirmLabel={confirm && confirm.kind === 'delete' ? t('Delete') : t('Restore')}
                danger={confirm && confirm.kind === 'delete'}
                busy={busy}
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
}

function renderFilter(spec, list, t, label) {
    const l = t(label);
    switch (spec.type) {
        case 'text':
            return <TextFilter label={l} placeholder={t('Search')} value={list.search[spec.field] || ''} onChange={v => list.setFilter(spec.field, v)} />;
        case 'yesno':
            return <YesNoFilter label={l} value={list.search[spec.field]} onChange={v => list.setFilter(spec.field, v)} yesLabel={t('YES')} noLabel={t('NO')} anyLabel={t('All')} />;
        case 'deleted':
            return (
                <SelectFilter
                    label={l}
                    value={list.search.deleted}
                    anyLabel={t('NO')}
                    options={[{ value: '1', label: t('YES') }]}
                    onChange={v => list.setFilter('deleted', v)}
                />
            );
        case 'select':
            return <SelectFilter label={l} value={list.search[spec.field]} anyLabel={t('All')} options={spec.options.map(o => ({ value: o.value, label: t(o.label) }))} onChange={v => list.setFilter(spec.field, v)} />;
        case 'date':
            return <DateFilter label={l} field={spec.field} fromField={spec.from} toField={spec.to} onChange={patch => list.setFilters(patch)} />;
        case 'ids':
            return <IdsFilter label={l} placeholder={t('Select')} loadOptions={spec.load} onChange={v => list.setFilter(spec.field, v)} />;
        default:
            return null;
    }
}
