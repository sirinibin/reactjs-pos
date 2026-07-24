import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import RepairJobCreate from "./create.js";
import RepairJobView from "./view.js";
import RepairJobKanban from "./kanban.js";
import RepairJobCardView, { loadKanbanLists, loadCardMap, statusToDefaultListId } from "./card_view.js";

import { format } from "date-fns";
import { Button, Spinner } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import PaginationControls from '../utils/PaginationControls.js';

const STATUS_COLORS = {
    open: { bg: '#e3f2fd', color: '#1565c0' },
    in_progress: { bg: '#fff3e0', color: '#e65100' },
    completed: { bg: '#e8f5e9', color: '#2e7d32' },
    delivered: { bg: '#f3e5f5', color: '#6a1b9a' },
    cancelled: { bg: '#ffebee', color: '#c62828' },
};

function RepairJobIndex(props) {
    const { t } = useTranslation('common');

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

    function list() {
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let Select = "select=id,job_number,title,date,vehicle_id,vehicle_number,brand,model,km,technician_name,labour_charge,parts_total,total,status,estimated_delivery,created_at";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

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
                `/v1/repair-job?select=id,job_number,title,date,vehicle_id,vehicle_number,brand,model,km,technician_name,labour_charge,parts_total,total,status,estimated_delivery,created_at&${qp}limit=1000&sort=-created_at`,
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
        if (listId) {
            fetchAllJobsForKanbanFilter(listId);
        }
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
    const CreateFormRef = useRef();
    const kanbanRef = useRef();
    const cardViewRef = useRef();
    const pendingListId = useRef(null);

    const [viewMode, setViewMode] = useState(() => window.location.hash === '#kanban' ? 'board' : 'table');

    function switchView(mode) {
        window.location.hash = mode === 'board' ? 'kanban' : '';
        setViewMode(mode);
    }

    function openUpdateForm(id) { CreateFormRef.current.open(id); }
    function openDetailsView(id) { DetailsViewRef.current.open(id); }
    function openCreateForm() { CreateFormRef.current.open(); }


    function handleJobCreated(jobId) {
        if (pendingListId.current && jobId) {
            const map = loadCardMap();
            map[jobId] = pendingListId.current;
            localStorage.setItem('repair_job_kanban_card_map', JSON.stringify(map));
            pendingListId.current = null;
        }
        if (kanbanRef.current) kanbanRef.current.refresh();
    }

    function handleKanbanListsChange(updatedLists) {
        setKanbanLists(updatedLists);
        // If current filter list was deleted, clear filter
        if (selectedKanbanListId && !updatedLists.find(l => l.id === selectedKanbanListId)) {
            setSelectedKanbanListId('');
        }
    }

    function handleCardViewListChange(jobId, listId) {
        // Re-fetch filtered list if active
        if (selectedKanbanListId) fetchAllJobsForKanbanFilter(selectedKanbanListId);
        if (kanbanRef.current) kanbanRef.current.refresh();
    }

    function fmtCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    function StatusBadge({ status }) {
        const colors = STATUS_COLORS[status] || STATUS_COLORS.open;
        return (
            <span style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                background: colors.bg, color: colors.color, textTransform: 'uppercase',
            }}>
                {t(status === 'in_progress' ? 'In Progress' : status)}
            </span>
        );
    }

    const displayJobs = selectedKanbanListId ? allJobsForFilter : jobList;
    const isLoading = isListLoading || isFilterLoading;

    return (
        <>
            <RepairJobCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} onCreated={handleJobCreated} />
            <RepairJobView ref={DetailsViewRef} openUpdateForm={openUpdateForm} />
            <RepairJobCardView
                ref={cardViewRef}
                onFullEdit={openUpdateForm}
                onKanbanListChange={handleCardViewListChange}
                onJobUpdated={() => { if (kanbanRef.current) kanbanRef.current.refresh(); }}
                showToastMessage={props.showToastMessage}
            />

            {viewMode === 'board' && (
                <RepairJobKanban
                    ref={kanbanRef}
                    onOpenCard={(id) => { if (cardViewRef.current) cardViewRef.current.open(id); }}
                    onCreate={openCreateForm}
                    onClose={() => {
                        setKanbanLists(loadKanbanLists());
                        switchView('table');
                    }}
                    onListsChange={handleKanbanListsChange}
                    showToastMessage={props.showToastMessage}
                />
            )}

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col"><h1 className="h3">{t('Repair Jobs')}</h1></div>
                    <div className="col text-end" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <Button
                            variant={viewMode === 'board' ? 'secondary' : 'outline-secondary'}
                            className="mb-1"
                            onClick={() => switchView(viewMode === 'board' ? 'table' : 'board')}
                            title={t('Board / Kanban View')}
                        >
                            <i className="bi bi-kanban"></i>
                        </Button>
                        <Button variant="primary" className="btn btn-primary mb-1" onClick={openCreateForm}>
                            <i className="bi bi-plus-lg"></i> {t('Create')}
                        </Button>
                    </div>
                </div>

                <div className="row">
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
                                    <Button onClick={() => { setIsRefreshInProcess(true); list(); }} variant="primary" disabled={isRefreshInProcess}>
                                        {isRefreshInProcess ? (
                                            <Spinner as="span" animation="border" size="sm" />
                                        ) : (
                                            <i className="fa fa-refresh"></i>
                                        )}
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
                                                <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("job_number")}>{t('Job #')}</b></th>
                                                <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("date")}>{t('Date')}</b></th>
                                                <th><b>{t('Vehicle')}</b></th>
                                                <th><b>{t('KM')}</b></th>
                                                <th><b>{t('Technician')}</b></th>
                                                <th><b>{t('Labour')}</b></th>
                                                <th><b>{t('Parts')}</b></th>
                                                <th><b>{t('Total')}</b></th>
                                                <th><b>{t('Status')}</b></th>
                                                <th><b>{t('Est. Delivery')}</b></th>
                                                <th>{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <thead>
                                            <tr className="text-center">
                                                <th><input type="text" onChange={(e) => searchByFieldValue("search", e.target.value)} className="form-control" placeholder={t('Search')} /></th>
                                                <th></th><th></th><th></th><th></th><th></th><th></th><th></th>
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
                                                <th></th><th></th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {displayJobs && displayJobs.map((job) => (
                                                <tr key={job.id}>
                                                    <td style={{ whiteSpace: "nowrap", textAlign: 'left' }}>
                                                        <div style={{ fontWeight: 600 }}>{job.job_number}</div>
                                                        {job.title && <small className="text-muted">{job.title}</small>}
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>{job.date ? format(new Date(job.date), "MMM dd yyyy") : "-"}</td>
                                                    <td style={{ whiteSpace: "nowrap", textAlign: "left" }}>
                                                        <div>{job.vehicle_number || "-"}</div>
                                                        <small className="text-muted">{job.brand} {job.model}</small>
                                                    </td>
                                                    <td>{job.km ? parseFloat(job.km).toLocaleString() : '-'}</td>
                                                    <td>{job.technician_name || '-'}</td>
                                                    <td>{fmtCurrency(job.labour_charge)}</td>
                                                    <td>{fmtCurrency(job.parts_total)}</td>
                                                    <td style={{ fontWeight: 600 }}>{fmtCurrency(job.total)}</td>
                                                    <td><StatusBadge status={job.status} /></td>
                                                    <td style={{ whiteSpace: "nowrap" }}>{job.estimated_delivery ? format(new Date(job.estimated_delivery), "MMM dd yyyy") : "-"}</td>
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
