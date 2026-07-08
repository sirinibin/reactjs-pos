import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PurchaseOrderCreate from "./create.js";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getDateLocale } from "../i18n/dateLocales";
import { Spinner } from "react-bootstrap";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import SuccessModal from '../utils/SuccessModal.js';
import { useTableSettings } from '../utils/useTableSettings.js';
import PaginationControls from '../utils/PaginationControls.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';
import NumberFormat from "react-number-format";
import Preview from '../order/preview.js';

const STATUS_COLORS = {
    draft: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
    sent: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    confirmed: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    partially_received: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    received: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    cancelled: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

const DEFAULT_COLUMNS = [
    { key: 'code',             label: 'Code',              fieldName: 'code',             visible: true },
    { key: 'date',             label: 'Date',              fieldName: 'date',             visible: true },
    { key: 'vendor_name',      label: 'Vendor',            fieldName: 'vendor_name',      visible: true },
    { key: 'status',           label: 'Status',            fieldName: 'status',           visible: true },
    { key: 'net_total',        label: 'Net Total',         fieldName: 'net_total',        visible: true },
    { key: 'total_quantity',   label: 'Qty',               fieldName: 'total_quantity',   visible: true },
    { key: 'expected_date',    label: 'Expected Date',     fieldName: 'expected_date',    visible: true },
    { key: 'created_by_name',  label: 'Created By',        fieldName: 'created_by_name',  visible: true },
    { key: 'created_at',       label: 'Created At',        fieldName: 'created_at',       visible: false },
    { key: 'vendor_invoice_no',label: 'Vendor Invoice No.',fieldName: 'vendor_invoice_no',visible: false },
    { key: 'remarks',          label: 'Remarks',           fieldName: 'remarks',          visible: false },
];

function PurchaseOrderIndex(props) {
    const { t, i18n } = useTranslation('common');
    const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language]);

    const { lastMessage } = useContext(WebSocketContext);
    const timerRef = useRef(null);

    // list
    const [purchaseOrderList, setPurchaseOrderList] = useState([]);
    const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('purchase_order_pageSize') || '10'));
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isListLoading, setIsListLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Stats
    const [totalNetTotal, setTotalNetTotal] = useState(0);
    const [totalVatPrice, setTotalVatPrice] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Sort
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('-');

    function sort(field) {
        setSortField(field);
        setSortOrder(prev => prev === '-' ? '' : '-');
    }

    // Filters
    const [codeSearch, setCodeSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState([]);
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);

    // Date filters
    const [dateValue, setDateValue] = useState('');
    const [fromDateValue, setFromDateValue] = useState('');
    const [toDateValue, setToDateValue] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [showDateRange, setShowDateRange] = useState(false);

    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (e) { }
    }

    const PurchaseOrderCreateRef = useRef();
    const PreviewRef = useRef();
    const [showPreview, setShowPreview] = useState(false);

    function openPreview(po) {
        setShowPreview(true);
        setTimeout(() => { PreviewRef.current?.open(po, undefined, "purchase_order"); }, 100);
    }
    function openWhatsApp(po) {
        setShowPreview(true);
        setTimeout(() => { PreviewRef.current?.open(po, "whatsapp", "whatsapp_purchase_order"); }, 100);
    }

    const statusOptions = [
        { id: 'draft', name: t('Draft') },
        { id: 'sent', name: t('Sent') },
        { id: 'confirmed', name: t('Confirmed') },
        { id: 'partially_received', name: t('Partially Received') },
        { id: 'received', name: t('Received') },
        { id: 'cancelled', name: t('Cancelled') },
    ];

    const { columns, showSettings, setShowSettings, handleToggleColumn, onDragEnd, restoreDefaults } = useTableSettings({ storageKey: 'purchase_order_table_settings', defaultColumns: DEFAULT_COLUMNS });

    // Params builder
    const buildParams = useCallback(() => {
        let params = {
            store_id: localStorage.getItem('store_id'),
            page,
            limit: pageSize,
            sort: sortOrder + sortField,
            search: { stats: '1' },
        };
        if (codeSearch) params.search.code = codeSearch;
        if (statusFilter.length > 0) params.search.status = statusFilter.join(',');
        if (selectedVendors.length > 0) params.search.vendor_id = selectedVendors.map(v => v.id).join(',');
        if (selectedCreatedByUsers.length > 0) params.search.created_by = selectedCreatedByUsers.map(u => u.id).join(',');
        if (dateValue) params.search.date_str = dateValue;
        if (fromDateValue) params.search.from_date = fromDateValue;
        if (toDateValue) params.search.to_date = toDateValue;
        return params;
    }, [page, pageSize, sortField, sortOrder, codeSearch, statusFilter, selectedVendors, selectedCreatedByUsers, dateValue, fromDateValue, toDateValue]);

    const list = useCallback(async () => {
        setIsListLoading(true);
        const params = buildParams();
        let queryParts = [`search[store_id]=${params.store_id}`, `page=${params.page}`, `limit=${params.limit}`, `sort=${params.sort}`];
        const s = params.search || {};
        Object.keys(s).forEach(k => { if (s[k] !== undefined && s[k] !== '') queryParts.push(`search[${k}]=${encodeURIComponent(s[k])}`); });
        const queryString = queryParts.join('&');

        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
        };
        fetch('/v1/purchase-order?' + queryString, requestOptions)
            .then(async r => {
                const data = await r.json();
                setIsListLoading(false);
                if (!r.ok) return;
                setPurchaseOrderList(data.result || []);
                const tc = parseInt(data.total_count || 0);
                setTotalItems(tc);
                setTotalPages(Math.ceil(tc / pageSize));
                setCurrentPageItemsCount((data.result || []).length);
                setOffset((page - 1) * pageSize);
                if (data.meta) {
                    setTotalNetTotal(data.meta.total_purchase_order || 0);
                    setTotalVatPrice(data.meta.vat_price || 0);
                    setTotalDiscount(data.meta.discount || 0);
                    setTotalCount(data.meta.count || 0);
                }
            })
            .catch(() => setIsListLoading(false));
    }, [buildParams, page, pageSize]);

    useEffect(() => {
        getStore(localStorage.getItem('store_id'));
    }, []);

    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, sortField, sortOrder, codeSearch, statusFilter, selectedVendors, selectedCreatedByUsers, dateValue, fromDateValue, toDateValue]);

    useEffect(() => {
        if (lastMessage?.data) {
            try {
                const msg = JSON.parse(lastMessage.data);
                if (msg.type === 'purchase_order_updated') list();
            } catch (e) { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage]);

    function openCreateForm() { PurchaseOrderCreateRef.current.open(); }
    function openEditForm(id) { PurchaseOrderCreateRef.current.open(id); }

    async function handleDelete(id) {
        if (!window.confirm(t('Are you sure you want to delete this Purchase Order?'))) return;
        const requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
        };
        let qp = ObjectToSearchQueryParams({ store_id: localStorage.getItem('store_id') });
        fetch('/v1/purchase-order/' + id + '?' + qp, requestOptions)
            .then(async r => {
                const data = await r.json();
                if (!r.ok) return;
                if (data.status) {
                    setSuccessMessage(t('Purchase Order deleted'));
                    setShowSuccess(true);
                    list();
                }
            });
    }

    function suggestVendors(searchTerm) {
        const requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') } };
        let qp = ObjectToSearchQueryParams({ store_id: localStorage.getItem('store_id'), search: searchTerm, limit: 20 });
        fetch('/v1/vendor?' + qp + '&select=id,name,code', requestOptions)
            .then(async r => { const d = await r.json(); if (r.ok) setVendorOptions(d.result || []); });
    }

    function suggestUsers(searchTerm) {
        const requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') } };
        let qp = ObjectToSearchQueryParams({ store_id: localStorage.getItem('store_id'), search: searchTerm, limit: 20 });
        fetch('/v1/user?' + qp + '&select=id,name', requestOptions)
            .then(async r => { const d = await r.json(); if (r.ok) setUserOptions(d.result || []); });
    }

    function clearFilters() {
        setCodeSearch('');
        setStatusFilter([]);
        setSelectedVendors([]);
        setSelectedCreatedByUsers([]);
        setDateValue(''); setFromDateValue(''); setToDateValue('');
        setPage(1);
    }

    function renderStatusBadge(status) {
        const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
        return (
            <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {statusOptions.find(s => s.id === status)?.name || status}
            </span>
        );
    }


    const orderedColumns = useMemo(() => (columns || DEFAULT_COLUMNS).filter(c => c.visible), [columns]);

    function renderCell(po, col) {
        switch (col.key) {
            case 'code': return <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#004ac6' }}>{po.code}</span>;
            case 'date': return po.date ? format(new Date(po.date), 'dd-MMM-yyyy', { locale: dateLocale }) : '–';
            case 'vendor_name': return <OverflowTooltip value={po.vendor_name || '–'} maxWidth={180} />;
            case 'status': return renderStatusBadge(po.status);
            case 'net_total': return <NumberFormat value={trimTo2Decimals(po.net_total || 0)} displayType="text" thousandSeparator={true} renderText={v => <span style={{ fontWeight: 600 }}>{v}</span>} />;
            case 'total_quantity': return po.total_quantity || 0;
            case 'expected_date': return po.expected_date ? format(new Date(po.expected_date), 'dd-MMM-yyyy', { locale: dateLocale }) : '–';
            case 'created_by_name': return po.created_by_name || '–';
            case 'created_at': return po.created_at ? format(new Date(po.created_at), 'dd-MMM-yyyy HH:mm', { locale: dateLocale }) : '–';
            case 'vendor_invoice_no': return po.vendor_invoice_no || '–';
            case 'remarks': return <OverflowTooltip value={po.remarks || '–'} maxWidth={180} />;
            default: return po[col.key] || '–';
        }
    }

    return (
        <div style={{ padding: '12px 16px' }}>
            <SuccessModal show={showSuccess} message={successMessage} onClose={() => setShowSuccess(false)} />
            <PurchaseOrderCreate ref={PurchaseOrderCreateRef} showToastMessage={props.showToastMessage} onCreated={() => list()} />
            {showPreview && <Preview ref={PreviewRef} showToastMessage={props.showToastMessage} />}

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h5 style={{ margin: 0, fontWeight: 700, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        <i className="bi bi-file-earmark-text" style={{ marginRight: '8px', color: '#004ac6' }}></i>
                        {t('Purchase Orders')}
                    </h5>
                    {totalItems > 0 && <span style={{ background: '#e8edf5', color: '#374151', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>{totalItems}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={clearFilters} style={{ background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="bi bi-x-circle"></i> {t('Clear')}
                    </button>
                    <button onClick={() => setShowSettings(true)} style={{ background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="bi bi-layout-three-columns"></i> {t('Columns')}
                    </button>
                    <button onClick={openCreateForm} style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        <i className="bi bi-plus-lg"></i> {t('New Purchase Order')}
                    </button>
                </div>
            </div>

            {/* Stats summary */}
            <StatsSummary
                title="Purchase Order Summary"
                stats={{
                    "Net Total": totalNetTotal,
                    "VAT": totalVatPrice,
                    "Discount": totalDiscount,
                    "Count": totalCount,
                }}
                filters={{
                    ...(dateValue ? { 'Date': dateValue } : {}),
                    ...(fromDateValue ? { 'From Date': fromDateValue } : {}),
                    ...(toDateValue ? { 'To Date': toDateValue } : {}),
                    ...(statusFilter.length > 0 ? { 'Status': statusFilter.join(', ') } : {}),
                    ...(selectedVendors.length > 0 ? { 'Vendor': selectedVendors.map(v => v.name).join(', ') } : {}),
                    ...(selectedCreatedByUsers.length > 0 ? { 'Created By': selectedCreatedByUsers.map(u => u.name).join(', ') } : {}),
                }}
                storageKey="purchase_order"
            />

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', alignItems: 'flex-end', marginTop: '8px' }}>

                {/* Code search */}
                <div style={{ position: 'relative', minWidth: '160px' }}>
                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Code')}</span>
                    <input type="text" value={codeSearch} onChange={e => { setCodeSearch(e.target.value); setPage(1); }} className="form-control form-control-sm" placeholder="PO-..." style={{ minWidth: '140px' }} />
                </div>

                {/* Status filter */}
                <div style={{ position: 'relative', minWidth: '180px' }}>
                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Status')}</span>
                    <Typeahead id="po_status_filter" multiple labelKey="name" options={statusOptions} selected={statusOptions.filter(s => statusFilter.includes(s.id))}
                        size="sm" placeholder={t('All Statuses')}
                        onChange={sel => { setStatusFilter(sel.map(s => s.id)); setPage(1); }} />
                </div>

                {/* Vendor filter */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Vendor')}</span>
                    <Typeahead id="po_vendor_filter" multiple filterBy={() => true} labelKey="name" options={vendorOptions} selected={selectedVendors}
                        size="sm" placeholder={t('All Vendors')}
                        onChange={sel => { setSelectedVendors(sel); setPage(1); }}
                        onInputChange={term => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestVendors(term), 300); }} />
                </div>

                {/* Date filter */}
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Date')}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <DatePicker selected={dateValue ? selectedDate : null} placeholderText={t('Pick date')} className="form-control form-control-sm" dateFormat="dd-MMM-yyyy" locale={dateLocale}
                            isClearable showMonthDropdown showYearDropdown dropdownMode="select"
                            onChange={val => {
                                if (!val) { setDateValue(''); setFromDateValue(''); setToDateValue(''); setShowDateRange(false); setPage(1); return; }
                                setSelectedDate(val);
                                setDateValue(format(val, 'MMM dd yyyy'));
                                setFromDateValue(''); setToDateValue(''); setShowDateRange(false); setPage(1);
                            }} />
                        <button type="button" title={t('Date Range')} onClick={() => setShowDateRange(!showDateRange)}
                            style={{ background: showDateRange ? '#004ac6' : '#f9fafb', color: showDateRange ? '#fff' : '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer' }}>
                            <i className="bi bi-calendar-range"></i>
                        </button>
                    </div>
                    {showDateRange && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <DatePicker selected={fromDateValue ? selectedFromDate : null} placeholderText={t('From')} className="form-control form-control-sm" dateFormat="dd-MMM-yyyy" locale={dateLocale}
                                isClearable onChange={val => {
                                    if (!val) { setFromDateValue(''); setPage(1); return; }
                                    setSelectedFromDate(val); setFromDateValue(format(val, 'MMM dd yyyy'));
                                    setDateValue(''); setPage(1);
                                }} />
                            <DatePicker selected={toDateValue ? selectedToDate : null} placeholderText={t('To')} className="form-control form-control-sm" dateFormat="dd-MMM-yyyy" locale={dateLocale}
                                isClearable onChange={val => {
                                    if (!val) { setToDateValue(''); setPage(1); return; }
                                    setSelectedToDate(val); setToDateValue(format(val, 'MMM dd yyyy'));
                                    setDateValue(''); setPage(1);
                                }} />
                        </div>
                    )}
                </div>

                {/* Created by */}
                <div style={{ position: 'relative', minWidth: '180px' }}>
                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Created By')}</span>
                    <Typeahead id="po_created_by_filter" multiple filterBy={() => true} labelKey="name" options={userOptions} selected={selectedCreatedByUsers}
                        size="sm" placeholder={t('All Users')}
                        onChange={sel => { setSelectedCreatedByUsers(sel); setPage(1); }}
                        onInputChange={term => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestUsers(term), 300); }} />
                </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="table table-sm table-hover" style={{ marginBottom: 0, fontSize: '13px' }}>
                        <thead style={{ background: '#f8f9fa', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ width: '40px', fontWeight: 700, fontSize: '12px', color: '#374151', padding: '8px 12px' }}>#</th>
                                {orderedColumns.map(col => (
                                    <th key={col.key} style={{ fontWeight: 700, fontSize: '12px', color: '#374151', padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                        <b style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => sort(col.fieldName)}>
                                            {t(col.label)}
                                            {sortField === col.fieldName && sortOrder === '-' && <i className="bi bi-sort-alpha-up-alt ms-1" />}
                                            {sortField === col.fieldName && sortOrder === '' && <i className="bi bi-sort-alpha-up ms-1" />}
                                        </b>
                                    </th>
                                ))}
                                <th style={{ width: '90px', fontWeight: 700, fontSize: '12px', color: '#374151', padding: '8px 10px' }}>{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isListLoading ? (
                                <tr>
                                    <td colSpan={orderedColumns.length + 2} style={{ textAlign: 'center', padding: '32px' }}>
                                        <Spinner animation="border" size="sm" /> <span style={{ marginLeft: '8px', color: '#6b7280' }}>{t('Loading...')}</span>
                                    </td>
                                </tr>
                            ) : purchaseOrderList.length === 0 ? (
                                <tr>
                                    <td colSpan={orderedColumns.length + 2} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontStyle: 'italic' }}>
                                        {t('No purchase orders found.')}
                                    </td>
                                </tr>
                            ) : (
                                purchaseOrderList.map((po, index) => (
                                    <tr key={po.id} style={{ cursor: 'pointer' }} onClick={() => openEditForm(po.id)}>
                                        <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '12px' }}>{offset + index + 1}</td>
                                        {orderedColumns.map(col => (
                                            <td key={col.key} style={{ padding: '8px 10px', verticalAlign: 'middle' }} onClick={e => { if (col.key === 'status') e.stopPropagation(); }}>
                                                {renderCell(po, col)}
                                            </td>
                                        ))}
                                        <td style={{ padding: '8px 10px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button title={t('Edit')} onClick={() => openEditForm(po.id)}
                                                    style={{ background: '#f0f4ff', color: '#004ac6', border: '1px solid #c5d5f5', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <i className="bi bi-pencil" />
                                                </button>
                                                <button title={t('Print / Preview')} onClick={() => openPreview(po)}
                                                    style={{ background: '#f0f4ff', color: '#004ac6', border: '1px solid #c5d5f5', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <i className="bi bi-printer" />
                                                </button>
                                                <button title={t('Share via WhatsApp')} onClick={() => openWhatsApp(po)}
                                                    style={{ background: '#f0fff4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <i className="bi bi-whatsapp" />
                                                </button>
                                                <button title={t('Delete')} onClick={() => handleDelete(po.id)}
                                                    style={{ background: '#fff0f0', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', cursor: 'pointer' }}>
                                                    <i className="bi bi-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <PaginationControls
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={(size) => { setPageSize(size); localStorage.setItem('purchase_order_pageSize', size); setPage(1); }}
                totalItems={totalItems}
                currentPageItemsCount={currentPageItemsCount}
                offset={offset}
            />

            {/* Table settings */}
            <TableSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                title="Purchase Order Columns"
                columns={columns || DEFAULT_COLUMNS}
                onToggleColumn={handleToggleColumn}
                onDragEnd={onDragEnd}
                onRestoreDefaults={restoreDefaults}
            />
        </div>
    );
}

export default PurchaseOrderIndex;
