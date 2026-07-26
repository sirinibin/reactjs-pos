import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RepairJobCreate from "./create.js";
import RepairJobView from "./view.js";
import RepairJobKanban from "./kanban.js";
import RepairJobCardView, { loadKanbanLists, loadCardMap, saveCardMap, statusToDefaultListId } from "./card_view.js";
import QuotationType3Form from "../quotation/QuotationType3Form.js";
import QuotationView from "../quotation/view.js";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import { Button, Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import PaginationControls from '../utils/PaginationControls.js';
import { useTableSettings } from '../utils/useTableSettings.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';

const STATUS_COLORS = {
    open: { bg: '#e3f2fd', color: '#1565c0' },
    in_progress: { bg: '#fff3e0', color: '#e65100' },
    completed: { bg: '#e8f5e9', color: '#2e7d32' },
    delivered: { bg: '#f3e5f5', color: '#6a1b9a' },
    cancelled: { bg: '#ffebee', color: '#c62828' },
    closed: { bg: '#f0f4f8', color: '#455a64' },
};

const DEFAULT_COLUMNS = [
    { key: 'date', label: 'Date', fieldName: 'date', visible: true },
    { key: 'job', label: 'Job', fieldName: 'job', visible: true },
    { key: 'vehicle', label: 'Vehicle', fieldName: 'vehicle', visible: true },
    { key: 'customer', label: 'Customer', fieldName: 'customer', visible: true },
    { key: 'technician', label: 'Technician', fieldName: 'technician', visible: true },
    { key: 'status', label: 'Status', fieldName: 'status', visible: true },
    { key: 'open_closed', label: 'Open/Closed', fieldName: 'open_closed', visible: true },
    { key: 'est_delivery', label: 'Est. Delivery', fieldName: 'est_delivery', visible: true },
    { key: 'km', label: 'KM', fieldName: 'km', visible: false },
    { key: 'labour', label: 'Labour', fieldName: 'labour', visible: false },
    { key: 'parts', label: 'Parts', fieldName: 'parts', visible: false },
    { key: 'total', label: 'Total', fieldName: 'total', visible: false },
    { key: 'actions', label: 'Actions', fieldName: 'actions', visible: true },
];

function RepairJobIndex(props) {
    const { t } = useTranslation('common');
    const history = useHistory();

    const [jobList, setJobList] = useState([]);

    let [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('repair_job_pageSize') || '10'));
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortDir, setSortDir] = useState("-");

    // Kanban list filter
    const [kanbanLists, setKanbanLists] = useState(loadKanbanLists);
    const [selectedKanbanListId, setSelectedKanbanListId] = useState('');
    const [allJobsForFilter, setAllJobsForFilter] = useState([]);
    const [isFilterLoading, setIsFilterLoading] = useState(false);

    // Date filter (single + range toggle)
    const [filterDate, setFilterDate] = useState(null);
    const [filterFromDate, setFilterFromDate] = useState(null);
    const [filterToDate, setFilterToDate] = useState(null);
    const [showDateRange, setShowDateRange] = useState(false);

    // Est. Delivery filter
    const [filterDeliveryDate, setFilterDeliveryDate] = useState(null);
    const [filterDeliveryFromDate, setFilterDeliveryFromDate] = useState(null);
    const [filterDeliveryToDate, setFilterDeliveryToDate] = useState(null);
    const [showDeliveryRange, setShowDeliveryRange] = useState(false);

    // Customer filter
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const customerSearchRef = useRef();
    const timerRef = useRef();

    // Table settings
    const { columns, showSettings, setShowSettings, handleToggleColumn, onDragEnd, restoreDefaults } = useTableSettings({
        storageKey: 'repair_job_table_settings',
        defaultColumns: DEFAULT_COLUMNS,
    });

    useEffect(() => {
        list();
        getStore(localStorage.getItem("store_id"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function getStore(id) {
        try { await fetchStore(id); } catch (error) { }
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;
        page = 1;
        setPage(page);
        list();
    }

    function fmtDateParam(d) {
        if (!d) return undefined;
        return format(new Date(new Date(d).toUTCString()), "MMM dd yyyy");
    }

    function handleDateFilter(single, from, to) {
        if (single !== undefined) {
            searchParams["date"] = single ? fmtDateParam(single) : undefined;
            searchParams["from_date"] = undefined;
            searchParams["to_date"] = undefined;
        } else {
            searchParams["date"] = undefined;
            searchParams["from_date"] = from ? fmtDateParam(from) : undefined;
            searchParams["to_date"] = to ? fmtDateParam(to) : undefined;
        }
        page = 1;
        setPage(page);
        list();
    }

    function handleDeliveryFilter(single, from, to) {
        if (single !== undefined) {
            searchParams["estimated_delivery"] = single ? fmtDateParam(single) : undefined;
            searchParams["estimated_delivery_from"] = undefined;
            searchParams["estimated_delivery_to"] = undefined;
        } else {
            searchParams["estimated_delivery"] = undefined;
            searchParams["estimated_delivery_from"] = from ? fmtDateParam(from) : undefined;
            searchParams["estimated_delivery_to"] = to ? fmtDateParam(to) : undefined;
        }
        page = 1;
        setPage(page);
        list();
    }

    const customCustomerFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";
        const q = normalize(query);
        const qWords = q.split(" ");
        const fields = [option.code, option.vat_no, option.name, option.name_in_arabic, option.phone, option.search_label];
        const searchable = normalize(fields.join(" "));
        return qWords.every((word) => searchable.includes(word));
    }, []);

    async function suggestCustomers(searchTerm) {
        setCustomerOptions([]);
        if (!searchTerm) return;

        const params = { query: searchTerm };
        if (localStorage.getItem("store_id")) params.store_id = localStorage.getItem("store_id");
        let queryString = ObjectToSearchQueryParams(params);
        if (queryString) queryString = "&" + queryString;

        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        const result = await fetch(
            "/v1/customer?select=id,code,name,phone,name_in_arabic,search_label,vat_no" + queryString,
            requestOptions
        );
        const data = await result.json();
        const filtered = (data.result || []).filter((opt) => customCustomerFilter(opt, searchTerm));
        setCustomerOptions(filtered);
    }

    function list() {
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let Select = "select=id,job_number,title,date,customer_id,customer_name,vehicle_id,vehicle_number,brand,model,km,technician_name,labour_charge,parts_total,total,status,estimated_delivery,created_at";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        searchParams["timezone_offset"] = parseFloat(d.getTimezoneOffset() / 60);

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") { queryParams = "&" + queryParams; }

        setIsListLoading(true);
        fetch("/v1/repair-job?" + Select + queryParams + "&sort=" + sortDir + sortField + "&page=" + page + "&limit=" + pageSize, requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setJobList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);
                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }

    async function fetchAllJobsForKanbanFilter(listId) {
        setIsFilterLoading(true);
        const token = localStorage.getItem("access_token");
        const storeId = localStorage.getItem("store_id");
        const qp = storeId ? `search[store_id]=${storeId}&` : '';
        try {
            const res = await fetch(
                `/v1/repair-job?select=id,job_number,title,date,customer_id,customer_name,vehicle_id,vehicle_number,brand,model,km,technician_name,labour_charge,parts_total,total,status,estimated_delivery,created_at&${qp}limit=1000&sort=-created_at`,
                { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: token } }
            );
            const data = await res.json();
            const all = data.result || [];
            const cardMap = loadCardMap();
            const filtered = all.filter(j => (cardMap[j.id] || statusToDefaultListId(j.status)) === listId);
            setAllJobsForFilter(filtered);
        } catch (e) { setAllJobsForFilter([]); }
        setIsFilterLoading(false);
    }

    function onKanbanListFilterChange(listId) {
        setSelectedKanbanListId(listId);
        if (listId) fetchAllJobsForKanbanFilter(listId);
    }

    function sort(field) {
        sortField = field;
        setSortField(sortField);
        sortDir = sortDir === "-" ? "" : "-";
        setSortDir(sortDir);
        list();
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        localStorage.setItem('repair_job_pageSize', size);
        setPageSize(pageSize);
        list();
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list();
    }

    const DetailsViewRef = useRef();
    const quotationViewRef = useRef();
    const CreateFormRef = useRef();
    const kanbanRef = useRef();
    const cardViewRef = useRef();
    const qt3FormRef = useRef();

    const [viewMode, setViewMode] = useState(() => props.defaultMode === 'board' ? 'board' : 'table');

    useEffect(() => {
        if (props.defaultMode === 'board') setViewMode('board');
    }, [props.defaultMode]);

    function switchView(mode) {
        if (mode === 'board') {
            history.push('/dashboard/repair-jobs-board');
        } else {
            history.push('/dashboard/repair-jobs');
        }
        setViewMode(mode);
    }

    function openUpdateForm(id) { CreateFormRef.current.open(id); }
    function openDetailsView(id) { DetailsViewRef.current.open(id); }
    function openCreateForm() { CreateFormRef.current.open(); }
    function openQuotationDetailsView(id) { quotationViewRef.current?.open(id); }

    async function buildJobPrefill(job, type) {
        const storeId = localStorage.getItem('store_id');
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };

        const products = (job.parts || []).map(p => ({
            product_id: p.product_id || null,
            name: p.name || '',
            quantity: parseFloat(p.qty) || 1,
            unit_price: parseFloat(p.unit_price) || 0,
            unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0,
            purchase_unit_price: parseFloat(p.purchase_unit_price) || 0,
            purchase_unit_price_with_vat: parseFloat(p.purchase_unit_price_with_vat) || 0,
            unit_discount: 0, unit_discount_with_vat: 0,
            unit: p.unit || '', is_service: false,
        }));

        const labour = parseFloat(job.labour_charge) || 0;
        if (labour > 0) {
            let labourProductId = null;
            try {
                const r = await fetch(`/v1/product?search[name]=Labour+Charge&search[is_service]=1&search[store_id]=${storeId}&limit=1&select=id,name`, { headers }).then(r => r.json());
                if (r?.result?.[0]) {
                    labourProductId = r.result[0].id;
                } else {
                    const c = await fetch(`/v1/product?search[store_id]=${storeId}`, { method: 'POST', headers, body: JSON.stringify({ name: 'Labour Charge', is_service: true, store_id: storeId }) }).then(r => r.json());
                    labourProductId = c?.result?.id || null;
                }
            } catch (e) { }
            const vatFactor = 1.15;
            products.push({
                product_id: labourProductId,
                name: 'Labour Charge',
                quantity: 1,
                unit_price: parseFloat((labour / vatFactor).toFixed(4)),
                unit_price_with_vat: labour,
                purchase_unit_price: 0,
                purchase_unit_price_with_vat: 0,
                unit_discount: 0, unit_discount_with_vat: 0,
                unit: '', is_service: true,
            });
        }

        return {
            type,
            customer_id: job.customer_id || null,
            customer_name: job.customer_name || '',
            customer: job.customer_id ? { id: job.customer_id, name: job.customer_name } : null,
            vehicle_id: job.vehicle_id || null,
            vehicle_snapshot: job.vehicle_id ? { vehicle_number: job.vehicle_number || '', brand: job.brand || '', model: job.model || '' } : undefined,
            vehicle: job.vehicle_id ? { id: job.vehicle_id, vehicle_number: job.vehicle_number, brand: job.brand, model: job.model } : null,
            km_driven: parseFloat(job.km) || null,
            products,
        };
    }

    async function handleCreateSalesInvoice(job) {
        const prefill = await buildJobPrefill(job, 'invoice');
        qt3FormRef.current?.open(null, prefill);
    }

    async function handleCreateQuotation(job) {
        const prefill = await buildJobPrefill(job, 'quotation');
        qt3FormRef.current?.open(null, prefill);
    }

    async function handleCreateFromJobs(jobsArr, customer, type) {
        if (!jobsArr || jobsArr.length === 0) return;
        const storeId = localStorage.getItem('store_id');
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const products = [];
        let totalLabour = 0;
        let firstJobWithVehicle = null;
        for (const job of jobsArr) {
            if (job.vehicle_id && !firstJobWithVehicle) firstJobWithVehicle = job;
            for (const p of (job.parts || [])) {
                products.push({ product_id: p.product_id || null, name: p.name || '', quantity: parseFloat(p.qty) || 1, unit_price: parseFloat(p.unit_price) || 0, unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0, purchase_unit_price: parseFloat(p.purchase_unit_price) || 0, purchase_unit_price_with_vat: parseFloat(p.purchase_unit_price_with_vat) || 0, unit_discount: 0, unit_discount_with_vat: 0, unit: p.unit || '', is_service: false });
            }
            totalLabour += parseFloat(job.labour_charge) || 0;
        }
        if (totalLabour > 0) {
            let labourProductId = null;
            try {
                const r = await fetch(`/v1/product?search[name]=Labour+Charge&search[is_service]=1&search[store_id]=${storeId}&limit=1&select=id,name`, { headers }).then(r => r.json());
                if (r?.result?.[0]) labourProductId = r.result[0].id;
                else { const c = await fetch(`/v1/product?search[store_id]=${storeId}`, { method: 'POST', headers, body: JSON.stringify({ name: 'Labour Charge', is_service: true, store_id: storeId }) }).then(r => r.json()); labourProductId = c?.result?.id || null; }
            } catch (e) { }
            const vatFactor = 1.15;
            products.push({ product_id: labourProductId, name: 'Labour Charge', quantity: 1, unit_price: parseFloat((totalLabour / vatFactor).toFixed(4)), unit_price_with_vat: totalLabour, purchase_unit_price: 0, purchase_unit_price_with_vat: 0, unit_discount: 0, unit_discount_with_vat: 0, unit: '', is_service: true });
        }
        const prefill = {
            type,
            customer_id: customer?.id || null,
            customer_name: customer?.name || '',
            customer: customer ? { id: customer.id, name: customer.name } : null,
            vehicle_id: firstJobWithVehicle?.vehicle_id || null,
            vehicle_snapshot: firstJobWithVehicle?.vehicle_id ? { vehicle_number: firstJobWithVehicle.vehicle_number || '', brand: firstJobWithVehicle.brand || '', model: firstJobWithVehicle.model || '' } : undefined,
            km_driven: firstJobWithVehicle ? parseFloat(firstJobWithVehicle.km) || null : null,
            products,
        };
        qt3FormRef.current?.open(null, prefill);
    }

    function handleJobCreated(jobId, listId) {
        if (listId && jobId) {
            const map = loadCardMap();
            map[jobId] = listId;
            saveCardMap(map);
        }
        if (kanbanRef.current) kanbanRef.current.refresh();
    }

    function handleKanbanListsChange(updatedLists) {
        setKanbanLists(updatedLists);
        if (selectedKanbanListId && !updatedLists.find(l => l.id === selectedKanbanListId)) {
            setSelectedKanbanListId('');
        }
    }

    function handleCardViewListChange(jobId, listId) {
        if (selectedKanbanListId) fetchAllJobsForKanbanFilter(selectedKanbanListId);
        if (kanbanRef.current) kanbanRef.current.refresh();
    }

    function fmtCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    function StatusBadge({ status }) {
        const list = kanbanLists.find(l => l.id === status);
        if (list) {
            const bg = list.color + '22';
            return (
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: bg, color: list.color }}>
                    {list.name}
                </span>
            );
        }
        const colors = STATUS_COLORS[status] || STATUS_COLORS.open;
        const label = (status || 'open').replace(/_/g, ' ');
        return (
            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: colors.bg, color: colors.color, textTransform: 'capitalize' }}>
                {t(label)}
            </span>
        );
    }

    function OpenClosedBadge({ status }) {
        const isClosed = status === 'closed';
        return (
            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: isClosed ? '#f0f4f8' : '#e3f2fd', color: isClosed ? '#455a64' : '#1565c0', textTransform: 'capitalize' }}>
                {isClosed ? t('Closed') : t('Open')}
            </span>
        );
    }

    const displayJobs = selectedKanbanListId ? allJobsForFilter : jobList;
    const isLoading = isListLoading || isFilterLoading;

    const colVisible = (key) => columns.find(c => c.key === key)?.visible;

    return (
        <>
            <RepairJobCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} onCreated={handleJobCreated} />
            <RepairJobView ref={DetailsViewRef} openUpdateForm={openUpdateForm} />
            <QuotationView ref={quotationViewRef} openUpdateForm={(id) => qt3FormRef.current?.open(id)} />
            <QuotationType3Form ref={qt3FormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openQuotationDetailsView} />
            <RepairJobCardView
                ref={cardViewRef}
                onFullEdit={openUpdateForm}
                onKanbanListChange={handleCardViewListChange}
                onJobUpdated={() => { if (kanbanRef.current) kanbanRef.current.refresh(); }}
                showToastMessage={props.showToastMessage}
                onCreateSalesInvoice={handleCreateSalesInvoice}
                onCreateQuotation={handleCreateQuotation}
            />

            <TableSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                title={t('Repair Jobs Table Settings')}
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onDragEnd={onDragEnd}
                onRestoreDefaults={restoreDefaults}
            />

            {viewMode === 'board' && (
                <RepairJobKanban
                    ref={kanbanRef}
                    onOpenCard={(id) => { if (cardViewRef.current) cardViewRef.current.open(id); }}
                    onCreate={openCreateForm}
                    onClose={props.defaultMode === 'board' ? undefined : () => { setKanbanLists(loadKanbanLists()); switchView('table'); }}
                    onSwitchToTable={props.defaultMode === 'board' ? () => { setKanbanLists(loadKanbanLists()); switchView('table'); } : undefined}
                    onListsChange={handleKanbanListsChange}
                    onCreateSalesInvoice={(jobs, customer) => handleCreateFromJobs(jobs, customer, 'invoice')}
                    onCreateQuotation={(jobs, customer) => handleCreateFromJobs(jobs, customer, 'quotation')}
                    showToastMessage={props.showToastMessage}
                />
            )}

            <div className="container-fluid p-0">
                <div className="row align-items-center mb-2">
                    <div className="col">
                        <h5 style={{ fontWeight: 700, marginBottom: 0, color: "#172b4d" }}>{t('Repair Jobs')}</h5>
                    </div>
                    <div className="col-auto d-flex align-items-center gap-2">
                        <button
                            className={`btn btn-sm${viewMode === 'board' ? ' btn-primary' : ' btn-outline-secondary'}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 13 }}
                            onClick={() => switchView(viewMode === 'board' ? 'table' : 'board')}
                        >
                            <i className="bi bi-kanban"></i> {t('Kanban Board')}
                        </button>
                        <Button variant="primary" className="btn btn-primary btn-sm" onClick={openCreateForm}>
                            <i className="bi bi-plus-lg"></i> {t('Create')}
                        </Button>
                    </div>
                </div>

                {viewMode === 'board' && (
                    <div className="text-muted text-center py-4" style={{ fontSize: 13 }}>
                        <i className="bi bi-kanban me-2"></i>{t('Use the Kanban Board above to manage jobs.')}
                    </div>
                )}
                <div className="row" style={{ display: viewMode === 'board' ? 'none' : undefined }}>
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body p-2">
                                <div className="row">
                                    {!selectedKanbanListId && totalItems === 0 && (
                                        <div className="col"><p className="text-start">{t('No Repair Jobs to display')}</p></div>
                                    )}
                                    {selectedKanbanListId && allJobsForFilter.length === 0 && !isFilterLoading && (
                                        <div className="col"><p className="text-start">{t('No Repair Jobs to display')}</p></div>
                                    )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                    <Button onClick={() => { setIsRefreshInProcess(true); list(); }} variant="primary" disabled={isRefreshInProcess} size="sm">
                                        {isRefreshInProcess ? <Spinner as="span" animation="border" size="sm" /> : <i className="fa fa-refresh"></i>}
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" title={t('Table Settings')} onClick={() => setShowSettings(true)}>
                                        <i className="bi bi-gear"></i>
                                    </Button>
                                    {!selectedKanbanListId && (
                                        <PaginationControls
                                            totalPages={totalPages} page={page} totalItems={totalItems} offset={offset}
                                            currentPageItemsCount={currentPageItemsCount} pageSize={pageSize}
                                            onPageChange={changePage} onPageSizeChange={changePageSize}
                                            pageSizes={[5, 10, 20, 40, 50, 100]}
                                        />
                                    )}
                                    {selectedKanbanListId && (
                                        <span style={{ fontSize: 13, color: '#5e6c84' }}>
                                            {isFilterLoading ? <Spinner as="span" animation="border" size="sm" /> : `${allJobsForFilter.length} job(s)`}
                                        </span>
                                    )}
                                </div>
                                <div className="table-responsive" style={{ position: "relative", overflowX: "auto", overflowY: "auto", minHeight: "200px" }}>
                                    {isLoading && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.5)" }}>
                                            <Spinner animation="grow" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                                        </div>
                                    )}
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                {colVisible('job') && <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("job_number")}>{t('Job')}</b></th>}
                                                {colVisible('date') && <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("date")}>{t('Date')}</b></th>}
                                                {colVisible('vehicle') && <th><b>{t('Vehicle')}</b></th>}
                                                {colVisible('customer') && <th><b>{t('Customer')}</b></th>}
                                                {colVisible('km') && <th><b>{t('KM')}</b></th>}
                                                {colVisible('technician') && <th><b>{t('Technician')}</b></th>}
                                                {colVisible('labour') && <th><b>{t('Labour')}</b></th>}
                                                {colVisible('parts') && <th><b>{t('Parts')}</b></th>}
                                                {colVisible('total') && <th><b>{t('Total')}</b></th>}
                                                {colVisible('status') && <th><b>{t('Status')}</b></th>}
                                                {colVisible('open_closed') && <th><b>{t('Open/Closed')}</b></th>}
                                                {colVisible('est_delivery') && <th><b>{t('Est. Delivery')}</b></th>}
                                                {colVisible('actions') && <th>{t('Actions')}</th>}
                                            </tr>
                                        </thead>
                                        <thead>
                                            <tr className="text-center">
                                                {colVisible('job') && (
                                                    <th><input type="text" onChange={(e) => searchByFieldValue("search", e.target.value)} className="form-control form-control-sm" placeholder={t('Search')} /></th>
                                                )}
                                                {colVisible('date') && (
                                                    <th style={{ minWidth: 140 }}>
                                                        {!showDateRange ? (
                                                            <>
                                                                <DatePicker
                                                                    selected={filterDate}
                                                                    onChange={d => {
                                                                        setFilterDate(d);
                                                                        handleDateFilter(d, undefined, undefined);
                                                                    }}
                                                                    placeholderText={t("Date")}
                                                                    dateFormat="dd/MM/yy"
                                                                    className="form-control form-control-sm"
                                                                    isClearable
                                                                />
                                                                <small style={{ color: '#004ac6', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
                                                                    onClick={() => { setShowDateRange(true); setFilterDate(null); handleDateFilter(null, filterFromDate, filterToDate); }}>
                                                                    {t('Range')}..
                                                                </small>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div style={{ display: "flex", gap: "2px" }}>
                                                                    <DatePicker
                                                                        selected={filterFromDate}
                                                                        onChange={d => { setFilterFromDate(d); handleDateFilter(undefined, d, filterToDate); }}
                                                                        placeholderText={t("From")}
                                                                        dateFormat="dd/MM/yy"
                                                                        className="form-control form-control-sm"
                                                                        isClearable
                                                                    />
                                                                    <DatePicker
                                                                        selected={filterToDate}
                                                                        onChange={d => { setFilterToDate(d); handleDateFilter(undefined, filterFromDate, d); }}
                                                                        placeholderText={t("To")}
                                                                        dateFormat="dd/MM/yy"
                                                                        className="form-control form-control-sm"
                                                                        isClearable
                                                                    />
                                                                </div>
                                                                <small style={{ color: '#004ac6', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
                                                                    onClick={() => { setShowDateRange(false); setFilterFromDate(null); setFilterToDate(null); handleDateFilter(filterDate, undefined, undefined); }}>
                                                                    {t('Single')}..
                                                                </small>
                                                            </>
                                                        )}
                                                    </th>
                                                )}
                                                {colVisible('vehicle') && (
                                                    <th><input type="text" onChange={(e) => searchByFieldValue("vehicle_number", e.target.value)} className="form-control form-control-sm" placeholder={t('Vehicle')} /></th>
                                                )}
                                                {colVisible('customer') && (
                                                    <th style={{ minWidth: 220 }}>
                                                        <Typeahead
                                                            id="repair_customer_filter"
                                                            filterBy={() => true}
                                                            labelKey="search_label"
                                                            onChange={(selectedItems) => {
                                                                setSelectedCustomers(selectedItems);
                                                                if (selectedItems.length > 0) {
                                                                    searchByFieldValue("customer_id", selectedItems[0].id);
                                                                } else {
                                                                    searchByFieldValue("customer_id", "");
                                                                }
                                                            }}
                                                            options={customerOptions}
                                                            placeholder={t('Customer')}
                                                            selected={selectedCustomers}
                                                            highlightOnlyResult={true}
                                                            ref={customerSearchRef}
                                                            onInputChange={(searchTerm) => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => { suggestCustomers(searchTerm); }, 350);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Escape") {
                                                                    setCustomerOptions([]);
                                                                    setSelectedCustomers([]);
                                                                    customerSearchRef.current?.clear();
                                                                    searchByFieldValue("customer_id", "");
                                                                }
                                                            }}
                                                        />
                                                    </th>
                                                )}
                                                {colVisible('km') && <th></th>}
                                                {colVisible('technician') && (
                                                    <th><input type="text" onChange={(e) => searchByFieldValue("technician_name", e.target.value)} className="form-control form-control-sm" placeholder={t('Technician')} /></th>
                                                )}
                                                {colVisible('labour') && <th></th>}
                                                {colVisible('parts') && <th></th>}
                                                {colVisible('total') && <th></th>}
                                                {colVisible('status') && (
                                                    <th>
                                                        <select
                                                            value={selectedKanbanListId}
                                                            onChange={(e) => onKanbanListFilterChange(e.target.value)}
                                                            className="form-control form-control-sm"
                                                        >
                                                            <option value="">{t('All')}</option>
                                                            {kanbanLists.map(l => (
                                                                <option key={l.id} value={l.id}>{l.name}</option>
                                                            ))}
                                                        </select>
                                                    </th>
                                                )}
                                                {colVisible('open_closed') && <th></th>}
                                                {colVisible('est_delivery') && (
                                                    <th style={{ minWidth: 140 }}>
                                                        {!showDeliveryRange ? (
                                                            <>
                                                                <DatePicker
                                                                    selected={filterDeliveryDate}
                                                                    onChange={d => {
                                                                        setFilterDeliveryDate(d);
                                                                        handleDeliveryFilter(d, undefined, undefined);
                                                                    }}
                                                                    placeholderText={t("Est. Delivery")}
                                                                    dateFormat="dd/MM/yy"
                                                                    className="form-control form-control-sm"
                                                                    isClearable
                                                                />
                                                                <small style={{ color: '#004ac6', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
                                                                    onClick={() => { setShowDeliveryRange(true); setFilterDeliveryDate(null); handleDeliveryFilter(null, filterDeliveryFromDate, filterDeliveryToDate); }}>
                                                                    {t('Range')}..
                                                                </small>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div style={{ display: "flex", gap: "2px" }}>
                                                                    <DatePicker
                                                                        selected={filterDeliveryFromDate}
                                                                        onChange={d => { setFilterDeliveryFromDate(d); handleDeliveryFilter(undefined, d, filterDeliveryToDate); }}
                                                                        placeholderText={t("From")}
                                                                        dateFormat="dd/MM/yy"
                                                                        className="form-control form-control-sm"
                                                                        isClearable
                                                                    />
                                                                    <DatePicker
                                                                        selected={filterDeliveryToDate}
                                                                        onChange={d => { setFilterDeliveryToDate(d); handleDeliveryFilter(undefined, filterDeliveryFromDate, d); }}
                                                                        placeholderText={t("To")}
                                                                        dateFormat="dd/MM/yy"
                                                                        className="form-control form-control-sm"
                                                                        isClearable
                                                                    />
                                                                </div>
                                                                <small style={{ color: '#004ac6', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}
                                                                    onClick={() => { setShowDeliveryRange(false); setFilterDeliveryFromDate(null); setFilterDeliveryToDate(null); handleDeliveryFilter(filterDeliveryDate, undefined, undefined); }}>
                                                                    {t('Single')}..
                                                                </small>
                                                            </>
                                                        )}
                                                    </th>
                                                )}
                                                {colVisible('actions') && <th></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {displayJobs && displayJobs.map((job) => (
                                                <tr key={job.id}>
                                                    {colVisible('job') && (
                                                        <td style={{ whiteSpace: "nowrap", textAlign: 'left' }}>
                                                            <div style={{ fontWeight: 600 }}>{job.job_number}</div>
                                                            {job.title && <small className="text-muted">{job.title}</small>}
                                                        </td>
                                                    )}
                                                    {colVisible('date') && (
                                                        <td style={{ whiteSpace: "nowrap" }}>{job.date ? format(new Date(job.date), "MMM dd yyyy") : "-"}</td>
                                                    )}
                                                    {colVisible('vehicle') && (
                                                        <td style={{ whiteSpace: "nowrap", textAlign: "left" }}>
                                                            <div>{job.vehicle_number || "-"}</div>
                                                            <small className="text-muted">{job.brand} {job.model}</small>
                                                        </td>
                                                    )}
                                                    {colVisible('customer') && (
                                                        <td style={{ whiteSpace: "nowrap", textAlign: "left" }}>{job.customer_name || "-"}</td>
                                                    )}
                                                    {colVisible('km') && (
                                                        <td>{job.km ? parseFloat(job.km).toLocaleString() : '-'}</td>
                                                    )}
                                                    {colVisible('technician') && (
                                                        <td>{job.technician_name || '-'}</td>
                                                    )}
                                                    {colVisible('labour') && (
                                                        <td>{fmtCurrency(job.labour_charge)}</td>
                                                    )}
                                                    {colVisible('parts') && (
                                                        <td>{fmtCurrency(job.parts_total)}</td>
                                                    )}
                                                    {colVisible('total') && (
                                                        <td style={{ fontWeight: 600 }}>{fmtCurrency(job.total)}</td>
                                                    )}
                                                    {colVisible('status') && (
                                                        <td><StatusBadge status={job.status} /></td>
                                                    )}
                                                    {colVisible('open_closed') && (
                                                        <td><OpenClosedBadge status={job.status} /></td>
                                                    )}
                                                    {colVisible('est_delivery') && (
                                                        <td style={{ whiteSpace: "nowrap" }}>{job.estimated_delivery ? format(new Date(job.estimated_delivery), "MMM dd yyyy") : "-"}</td>
                                                    )}
                                                    {colVisible('actions') && (
                                                        <td style={{ whiteSpace: "nowrap" }}>
                                                            <Button className="btn btn-light btn-sm me-1" onClick={() => openUpdateForm(job.id)}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>
                                                            <Button className="btn btn-primary btn-sm me-1" onClick={() => openDetailsView(job.id)}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            <Button className="btn btn-outline-secondary btn-sm" title={t('Open Card View')} onClick={() => cardViewRef.current?.open(job.id)}>
                                                                <i className="bi bi-card-text"></i>
                                                            </Button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default RepairJobIndex;
