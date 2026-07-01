import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ServiceCreate from "./create.js";
import ServiceView from "./view.js";
import { Button, Spinner, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { confirm } from 'react-bootstrap-confirmation';
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { highlightWords } from "../utils/search.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const columnStyle = {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    paddingRight: "8px",
};

function ServiceIndex(props) {
    const [serviceList, setServiceList]         = useState([]);
    let [pageSize, setPageSize]                 = useState(() => parseInt(localStorage.getItem("service_pageSize") || "10"));
    let [page, setPage]                         = useState(1);
    const [totalPages, setTotalPages]           = useState(0);
    const [totalItems, setTotalItems]           = useState(0);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset]                   = useState(0);
    const [isListLoading, setIsListLoading]     = useState(false);
    const [isRefreshing, setIsRefreshing]       = useState(false);
    let   [showDeleted,  setShowDeleted]        = useState(false);

    let [sortField, setSortField] = useState("created_at");
    let [sortDir,   setSortDir]   = useState("-");

    const searchParams  = useRef({ is_service: "1" });
    const createFormRef = useRef();
    const viewRef       = useRef();
    const timerRef      = useRef();
    const latestReqRef  = useRef(0);
    const mainSearchRef = useRef();

    // ── Main search bar state ──
    const [serviceOptions,   setServiceOptions]   = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [openSearchResult, setOpenSearchResult] = useState(false);

    // ── Search dropdown column config ──
    const defaultSearchServiceColumns = useMemo(() => [
        { key: "name",          label: "Name",         fieldName: "name",                  width: 30, visible: true  },
        { key: "category",      label: "Category",     fieldName: "service_category_name", width: 20, visible: true  },
        { key: "unit",          label: "Unit",         fieldName: "unit",                  width: 12, visible: true  },
        { key: "retail_price",  label: "Retail Price", fieldName: "retail_price",          width: 13, visible: true  },
        { key: "duration",      label: "Duration",     fieldName: "duration_minutes",      width: 10, visible: true  },
        { key: "delivery_mode", label: "Delivery",     fieldName: "delivery_mode",         width: 15, visible: true  },
    ], []);

    const [searchServiceColumns, setSearchServiceColumns] = useState(defaultSearchServiceColumns);
    const [showSearchSettings, setShowSearchSettings]     = useState(false);

    const visibleCols  = searchServiceColumns.filter(c => c.visible);
    const totalColWidth = visibleCols.reduce((s, c) => s + c.width, 0);
    const getColWidth   = (col) => `${(col.width / totalColWidth) * 100}%`;

    // Load saved column config
    useEffect(() => {
        const saved = localStorage.getItem("service_search_settings");
        if (saved) {
            try { setSearchServiceColumns(JSON.parse(saved)); } catch (_) {}
        }
    }, []);

    function toggleSearchColumn(idx) {
        const updated = [...searchServiceColumns];
        updated[idx].visible = !updated[idx].visible;
        setSearchServiceColumns(updated);
        localStorage.setItem("service_search_settings", JSON.stringify(updated));
    }

    function onDragEndSearch(result) {
        if (!result.destination) return;
        const reordered = Array.from(searchServiceColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSearchServiceColumns(reordered);
        localStorage.setItem("service_search_settings", JSON.stringify(reordered));
    }

    function restoreSearchDefaults() {
        const cloned = defaultSearchServiceColumns.map(c => ({ ...c }));
        setSearchServiceColumns(cloned);
        localStorage.setItem("service_search_settings", JSON.stringify(cloned));
    }

    // ── Category filter typeahead ──
    const [categoryOptions,    setCategoryOptions]    = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const categorySearchRef = useRef();

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(key => `search[${key}]=` + encodeURIComponent(object[key]))
            .join("&");
    }

    useEffect(() => { list(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Helpers ──

    function searchByFieldValue(field, value) {
        searchParams.current[field] = value;
        page = 1; setPage(1);
        list();
    }

    function sort(field) {
        if (sortField === field) {
            sortDir = sortDir === "-" ? "" : "-";
            setSortDir(sortDir);
        } else {
            sortField = field; setSortField(field);
            sortDir   = "-";   setSortDir("-");
        }
        list();
    }

    // ── Main search bar autocomplete ──

    const suggestServices = useCallback(async (searchTerm) => {
        const reqId = Date.now();
        latestReqRef.current = reqId;
        setServiceOptions([]);
        if (!searchTerm) { setOpenSearchResult(false); return; }

        const storeId = localStorage.getItem("store_id") || "";
        const qs = ObjectToSearchQueryParams({ search_text: searchTerm, store_id: storeId, is_service: "1" });
        const select = `select=id,name,part_number,unit,service_category_name,duration_minutes,delivery_mode,product_stores.${storeId}.retail_unit_price`;
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };

        const res  = await fetch(`/v1/product?${select}&${qs}&limit=50&sort=-created_at`, { headers });
        const data = await res.json();
        if (latestReqRef.current !== reqId) return;

        const results = (data.result || []).map(s => ({
            ...s,
            search_label: [s.name, s.part_number].filter(Boolean).join(" · "),
        }));
        if (results.length === 0) { setOpenSearchResult(false); return; }
        setServiceOptions(results);
        setOpenSearchResult(true);
    }, []);

    // ── Category suggestions ──

    async function suggestServiceCategories(searchTerm) {
        if (!searchTerm) return;
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        const q = ObjectToSearchQueryParams({ name: searchTerm, store_id: localStorage.getItem("store_id") || "" });
        const r = await fetch(`/v1/service-category?select=id,name&${q}`, { method: "GET", headers });
        const data = await r.json();
        setCategoryOptions(data.result || []);
    }

    // ── List ──

    async function list() {
        setIsListLoading(true);
        const storeId = localStorage.getItem("store_id") || "";
        searchParams.current["store_id"]   = storeId;
        searchParams.current["is_service"] = "1";
        const queryParams = ObjectToSearchQueryParams(searchParams.current);
        const sortParam   = `sort=${sortDir}${sortField}&page=${page}&limit=${pageSize}`;
        const headers     = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        try {
            const r    = await fetch(`/v1/product?${queryParams}&${sortParam}`, { method: "GET", headers });
            const data = await r.json();
            if (r.ok) {
                setServiceList(data.result || []);
                const pageCount = Math.ceil((data.total_count || 0) / pageSize);
                setTotalPages(pageCount);
                setTotalItems(data.total_count || 0);
                setCurrentPageItemsCount((data.result || []).length);
                setOffset((page - 1) * pageSize);
            }
        } catch (e) { console.error("Service list error:", e); }
        setIsListLoading(false);
        setIsRefreshing(false);
    }

    // ── Delete / Restore ──

    async function handleDelete(id) {
        if (!await confirm("Delete this service? It can be restored later from the Deleted view.")) return;
        const storeId = localStorage.getItem("store_id");
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        await fetch(`/v1/product/${id}?search[store_id]=${storeId}`, { method: "DELETE", headers });
        list();
    }

    async function handleRestore(id) {
        if (!await confirm("Restore this service?")) return;
        const storeId = localStorage.getItem("store_id");
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        await fetch(`/v1/product/restore/${id}?search[store_id]=${storeId}`, { method: "POST", headers });
        list();
    }

    // deletedFilter: "" = active only (default), "1" = deleted only, "2" = all
    let [deletedFilter, setDeletedFilterState] = useState("");

    function setDeletedFilter(value) {
        deletedFilter = value;
        setDeletedFilterState(value);
        showDeleted = value === "1";
        setShowDeleted(showDeleted);
        if (value === "") {
            delete searchParams.current["deleted"];
        } else {
            searchParams.current["deleted"] = value; // "1" or "2"
        }
        page = 1; setPage(1);
        list();
    }


    // ── Misc ──

    function deliveryModeLabel(mode) {
        const map = { in_store: "In Store", remote: "Remote", at_customer_location: "At Customer" };
        return map[mode] || "—";
    }

    const UNIT_CODE_LABELS = { C62: "Each / Per Visit", HUR: "Hour", DAY: "Day", WEE: "Week", MON: "Month", ANN: "Year" };
    const LEGACY_UNIT_MAP  = { hour: "HUR", day: "DAY", month: "MON", session: "C62", package: "C62", visit: "C62" };

    function unitDisplay(unit) {
        const code  = LEGACY_UNIT_MAP[unit] ?? (unit || "C62");
        const label = UNIT_CODE_LABELS[code] || code;
        return { code, label };
    }

    function SortTh({ field, label, align }) {
        const icon = sortField === field
            ? <i className={`bi bi-sort-alpha-${sortDir === "-" ? "up-alt" : "up"} ms-1`}></i>
            : null;
        return (
            <th style={align === "right" ? { textAlign: "right" } : {}}>
                <b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort(field)}>
                    {label}{icon}
                </b>
            </th>
        );
    }

    // ── Render ──
    return (
        <>
            {/* Search column settings modal */}
            <Modal show={showSearchSettings} onHide={() => setShowSearchSettings(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-gear-fill" style={{ fontSize: "1.2rem", marginRight: "4px" }} />
                        Service Search Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <h6 className="mb-2">Customize Columns</h6>
                    <DragDropContext onDragEnd={onDragEndSearch}>
                        <Droppable droppableId="svc-search-cols">
                            {(provided) => (
                                <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
                                    {searchServiceColumns.map((col, idx) => (
                                        <Draggable key={col.key} draggableId={col.key} index={idx}>
                                            {(prov) => (
                                                <li
                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                    ref={prov.innerRef}
                                                    {...prov.draggableProps}
                                                    {...prov.dragHandleProps}
                                                >
                                                    <div>
                                                        <input
                                                            style={{ width: "20px", height: "20px" }}
                                                            type="checkbox"
                                                            className="form-check-input me-2"
                                                            checked={col.visible}
                                                            onChange={() => toggleSearchColumn(idx)}
                                                        />
                                                        {col.label}
                                                    </div>
                                                    <span style={{ cursor: "grab" }}>☰</span>
                                                </li>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </ul>
                            )}
                        </Droppable>
                    </DragDropContext>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSearchSettings(false)}>Close</Button>
                    <Button variant="primary" onClick={restoreSearchDefaults}>Restore to Default</Button>
                </Modal.Footer>
            </Modal>

            <ServiceCreate ref={createFormRef} showToastMessage={props.showToastMessage} refreshList={list} />
            <ServiceView ref={viewRef} showToastMessage={props.showToastMessage} />

            <div className="row mb-1">
                <div className="col d-flex align-items-center gap-2">
                    <h1 className="h3 mb-0">Services</h1>
                </div>
                <div className="col-auto">
                    <Button variant="primary" onClick={() => createFormRef.current?.open()}>
                        <i className="bi bi-plus-lg"></i> Create
                    </Button>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body p-2">

                            {/* Toolbar */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                <Button variant="primary" onClick={() => { setIsRefreshing(true); list(); }} disabled={isRefreshing}>
                                    {isRefreshing
                                        ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />
                                        : <i className="fa fa-refresh"></i>}
                                </Button>
                                {totalItems > 0 && <>
                                    <label className="form-label mb-0">Size:&nbsp;</label>
                                    <select
                                        value={pageSize}
                                        className="form-control"
                                        style={{ border: "solid 1px silver", width: "60px" }}
                                        onChange={(e) => {
                                            pageSize = parseInt(e.target.value);
                                            setPageSize(pageSize);
                                            localStorage.setItem("service_pageSize", pageSize);
                                            page = 1; setPage(1); list();
                                        }}
                                    >
                                        {[5,10,20,40,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </>}
                            </div>

                            {/* ── Main search bar ── */}
                            <div className="row mb-2">
                                <div className="col-md-12">
                                    <Typeahead
                                        id="service_main_search"
                                        ref={mainSearchRef}
                                        filterBy={() => true}
                                        size="lg"
                                        labelKey="search_label"
                                        emptyLabel="No services found"
                                        clearButton={true}
                                        open={openSearchResult}
                                        multiple
                                        placeholder="Name · Item Code · Category"
                                        highlightOnlyResult={true}
                                        ignoreDiacritics={true}
                                        selected={selectedServices}
                                        options={serviceOptions}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") setOpenSearchResult(false);
                                        }}
                                        onChange={(items) => {
                                            setSelectedServices(items);
                                            const ids = items.map(s => s.id).join(",");
                                            searchParams.current["product_id"] = ids;
                                            page = 1; setPage(1); list();
                                            setOpenSearchResult(false);
                                        }}
                                        onInputChange={(term) => {
                                            const reqId = Date.now();
                                            latestReqRef.current = reqId;
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => {
                                                if (latestReqRef.current !== reqId) return;
                                                suggestServices(term);
                                            }, 350);
                                        }}
                                        renderMenu={(results, menuProps, state) => {
                                            const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                            return (
                                                <Menu {...menuProps}>
                                                    {/* Sticky header */}
                                                    <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, margin: 0 }}>
                                                        <div style={{
                                                            background: "#f8f9fa",
                                                            zIndex: 2,
                                                            display: "flex",
                                                            fontWeight: "bold",
                                                            padding: "4px 8px",
                                                            borderBottom: "1px solid #ddd",
                                                            pointerEvents: "auto",
                                                            position: "relative",
                                                        }}>
                                                            {visibleCols.map(col => (
                                                                <div key={col.key} style={{ width: getColWidth(col) }}>{col.label}</div>
                                                            ))}
                                                            {/* Settings gear */}
                                                            <div
                                                                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                                                                onClick={(e) => { e.stopPropagation(); setShowSearchSettings(true); }}
                                                            >
                                                                <i className="bi bi-gear-fill" />
                                                            </div>
                                                        </div>
                                                    </MenuItem>

                                                    {/* Rows */}
                                                    {results.map((svc, idx) => {
                                                        const storeId = localStorage.getItem("store_id");
                                                        const ps = svc.product_stores?.[storeId] || {};
                                                        const isActive = state.activeIndex === idx || results.length === 1;
                                                        return (
                                                            <MenuItem option={svc} position={idx} key={svc.id} style={{ padding: 0 }}>
                                                                <div style={{ display: "flex", padding: "4px 8px" }}>
                                                                    {visibleCols.map(col => (
                                                                        <div key={col.key} style={{ ...columnStyle, width: getColWidth(col) }}>
                                                                            {col.key === "name" && (
                                                                                <>
                                                                                    {highlightWords(svc.name, searchWords, isActive)}
                                                                                    {svc.part_number && (
                                                                                        <span style={{ color: "#888", fontSize: "0.8em", marginLeft: 6 }}>
                                                                                            {highlightWords(svc.part_number, searchWords, isActive)}
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {col.key === "category"      && highlightWords(svc.service_category_name || "—", searchWords, isActive)}
                                                                            {col.key === "unit"          && (() => { const { code, label } = unitDisplay(svc.unit); return <span>{label} <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#004ac6" }}>({code})</span></span>; })()}
                                                                            {col.key === "retail_price"  && (ps.retail_unit_price != null ? ps.retail_unit_price.toFixed(2) : "—")}
                                                                            {col.key === "duration"      && (svc.duration_minutes ? `${svc.duration_minutes} min` : "—")}
                                                                            {col.key === "delivery_mode" && deliveryModeLabel(svc.delivery_mode)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Menu>
                                            );
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Pagination + info */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                <div className="w-100" style={{ overflowX: "auto" }}>
                                    {totalPages > 1 && (
                                        <ReactPaginate
                                            breakLabel="..."
                                            nextLabel="next >"
                                            previousLabel="< prev"
                                            pageCount={totalPages}
                                            marginPagesDisplayed={1}
                                            pageRangeDisplayed={3}
                                            onPageChange={({ selected }) => { page = selected + 1; setPage(page); list(); }}
                                            className="pagination flex-wrap mb-0"
                                            pageClassName="page-item"
                                            pageLinkClassName="page-link"
                                            previousClassName="page-item"
                                            previousLinkClassName="page-link"
                                            nextClassName="page-item"
                                            nextLinkClassName="page-link"
                                            activeClassName="active"
                                            forcePage={page - 1}
                                            renderOnZeroPageCount={null}
                                        />
                                    )}
                                </div>
                                {totalItems > 0 && (
                                    <span className="text-muted small">
                                        showing {offset + 1}–{offset + currentPageItemsCount} of {totalItems}
                                        &nbsp;|&nbsp;page {page} of {totalPages}
                                    </span>
                                )}
                                <button
                                    className="btn btn-sm btn-outline-secondary ms-auto"
                                    title="Table Settings"
                                    onClick={() => setShowSearchSettings(true)}
                                >
                                    <i className="bi bi-gear-fill" style={{ fontSize: "1.2rem" }} />
                                </button>
                            </div>

                            {/* Table */}
                            <div className="table-responsive" style={{ position: "relative", overflowX: "auto", overflowY: "auto", minHeight: "200px" }}>
                                {isListLoading && (
                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.5)" }}>
                                        <Spinner animation="grow" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                                    </div>
                                )}
                                <table className="table table-striped table-sm table-bordered">
                                    <thead>
                                        <tr className="text-center">
                                            <th>#</th>
                                            <SortTh field="name"                  label="Name" />
                                            <SortTh field="service_category_name" label="Category" />
                                            <SortTh field="unit"                  label="Unit" />
                                            <SortTh field="duration_minutes"      label="Duration" />
                                            <SortTh field="delivery_mode"         label="Delivery" />
                                            <th>Booking</th>
                                            <SortTh field="retail_unit_price" label="Retail Price" align="right" />
                                            <th>Deleted</th>
                                            <th>Actions</th>
                                        </tr>
                                        {/* Filter row */}
                                        <tr>
                                            <th></th>
                                            <th>
                                                <input type="text" className="form-control form-control-sm" placeholder="Search name..."
                                                    onChange={(e) => {
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        const v = e.target.value;
                                                        timerRef.current = setTimeout(() => searchByFieldValue("search_text", v), 350);
                                                    }}
                                                />
                                            </th>
                                            <th>
                                                <Typeahead
                                                    id="svc_category_filter"
                                                    labelKey="name"
                                                    size="sm"
                                                    multiple
                                                    clearButton
                                                    options={categoryOptions}
                                                    selected={selectedCategories}
                                                    placeholder="Category..."
                                                    highlightOnlyResult={true}
                                                    ref={categorySearchRef}
                                                    onInputChange={(term) => {
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => suggestServiceCategories(term), 300);
                                                    }}
                                                    onChange={(items) => {
                                                        setSelectedCategories(items);
                                                        searchParams.current["service_category_id"] = items.map(i => i.id).join(",");
                                                        page = 1; setPage(1); list();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") { setCategoryOptions([]); categorySearchRef.current?.clear(); }
                                                    }}
                                                />
                                            </th>
                                            <th>
                                                <input type="text" className="form-control form-control-sm" placeholder="Unit..."
                                                    onChange={(e) => {
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        const v = e.target.value;
                                                        timerRef.current = setTimeout(() => searchByFieldValue("unit", v), 350);
                                                    }}
                                                />
                                            </th>
                                            <th>
                                                <input type="number" className="form-control form-control-sm" placeholder="Min..."
                                                    onChange={(e) => {
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        const v = e.target.value;
                                                        timerRef.current = setTimeout(() => searchByFieldValue("duration_minutes", v), 350);
                                                    }}
                                                />
                                            </th>
                                            <th>
                                                <select className="form-select form-select-sm"
                                                    onChange={(e) => searchByFieldValue("delivery_mode", e.target.value)}>
                                                    <option value="">All</option>
                                                    <option value="in_store">In Store</option>
                                                    <option value="remote">Remote</option>
                                                    <option value="at_customer_location">At Customer</option>
                                                </select>
                                            </th>
                                            <th>
                                                <select className="form-select form-select-sm"
                                                    onChange={(e) => searchByFieldValue("booking_required", e.target.value)}>
                                                    <option value="">All</option>
                                                    <option value="1">Required</option>
                                                    <option value="0">Not Required</option>
                                                </select>
                                            </th>
                                            <th>
                                                <input type="text" className="form-control form-control-sm" placeholder="&gt;100 or 50..."
                                                    onChange={(e) => {
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        const v = e.target.value;
                                                        timerRef.current = setTimeout(() => searchByFieldValue("retail_unit_price", v), 350);
                                                    }}
                                                />
                                            </th>
                                            <th>
                                                <select className="form-select form-select-sm"
                                                    value={deletedFilter}
                                                    onChange={(e) => setDeletedFilter(e.target.value)}>
                                                    <option value="">Active</option>
                                                    <option value="1">Yes</option>
                                                    <option value="2">All</option>
                                                </select>
                                            </th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!isListLoading && serviceList.length === 0 && (
                                            <tr><td colSpan={10} className="text-center py-4 text-muted">
                                                No services found
                                            </td></tr>
                                        )}
                                        {serviceList.map((svc, i) => {
                                            const storeId = localStorage.getItem("store_id");
                                            const ps = svc.product_stores?.[storeId] || {};
                                            const isDeleted = !!svc.deleted;
                                            return (
                                                <tr key={svc.id}
                                                    style={{ cursor: isDeleted ? "default" : "pointer", background: isDeleted ? "#fff5f5" : undefined, opacity: isDeleted ? 0.75 : 1 }}
                                                    onDoubleClick={() => { if (!isDeleted) createFormRef.current?.open(svc.id); }}>
                                                    <td>{offset + i + 1}</td>
                                                    <td>
                                                        <OverflowTooltip value={svc.name || ""} maxWidth={200} style={isDeleted ? { textDecoration: "line-through", color: "#999" } : {}} />
                                                        {svc.part_number && <div style={{ fontSize: "11px", color: "#737686" }}>{svc.part_number}</div>}
                                                        {isDeleted && svc.deleted_at && (
                                                            <div style={{ fontSize: "10.5px", color: "#ba1a1a", marginTop: "2px" }}>
                                                                <i className="bi bi-clock me-1"></i>
                                                                {new Date(svc.deleted_at).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>{svc.service_category_name || "—"}</td>
                                                    <td>
                                                        {(() => {
                                                            const { code, label } = unitDisplay(svc.unit);
                                                            return (
                                                                <>
                                                                    <div style={{ fontSize: "12px" }}>{label}</div>
                                                                    <div style={{ fontSize: "10.5px", fontWeight: 700, fontFamily: "monospace", color: "#004ac6" }}>({code})</div>
                                                                </>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td>{svc.duration_minutes ? `${svc.duration_minutes} min` : "—"}</td>
                                                    <td>{deliveryModeLabel(svc.delivery_mode)}</td>
                                                    <td className="text-center">
                                                        {svc.booking_required
                                                            ? <span className="badge bg-info text-dark">Required</span>
                                                            : <span style={{ color: "#aaa" }}>—</span>}
                                                    </td>
                                                    <td style={{ textAlign: "right" }}>
                                                        {ps.retail_unit_price != null ? ps.retail_unit_price.toFixed(2) : "—"}
                                                    </td>
                                                    <td className="text-center">
                                                        {isDeleted
                                                            ? <span className="badge bg-danger">YES</span>
                                                            : <span className="badge bg-success">NO</span>}
                                                    </td>
                                                    <td>
                                                        {isDeleted ? (
                                                            <button className="btn btn-sm btn-outline-success"
                                                                onClick={(e) => { e.stopPropagation(); handleRestore(svc.id); }}
                                                                title="Restore service">
                                                                <i className="bi bi-arrow-counterclockwise"></i> Restore
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button className="btn btn-sm btn-outline-secondary me-1"
                                                                    onClick={(e) => { e.stopPropagation(); viewRef.current?.open(svc.id); }}
                                                                    title="View">
                                                                    <i className="bi bi-eye"></i>
                                                                </button>
                                                                <button className="btn btn-sm btn-outline-primary me-1"
                                                                    onClick={(e) => { e.stopPropagation(); createFormRef.current?.open(svc.id); }}>
                                                                    <i className="bi bi-pencil"></i>
                                                                </button>
                                                                <button className="btn btn-sm btn-outline-danger"
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(svc.id); }}>
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ServiceIndex;
