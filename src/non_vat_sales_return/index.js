import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import QuotationType3Form from "../quotation/QuotationType3Form.js";
import QuotationView from "../quotation/view.js";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Modal, Spinner } from "react-bootstrap";
import Amount from "../utils/amount.js";
import { WebSocketContext } from "../utils/WebSocketContext.js";
import OrderPreview from "../order/preview.js";
import { useTranslation } from "react-i18next";
import PaginationControls from "../utils/PaginationControls.js";

const API_BASE = "/v1/non-vat-sales-return";
const SALES_API = "/v1/non-vat-sales";

// ─── Sale selection modal ──────────────────────────────────────────────────────

function NonVatSaleSelectModal({ show, onHide, onSelect, storeId, headers, t }) {
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchCode, setSearchCode] = useState("");
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;
    const debounceRef = useRef(null);

    useEffect(() => {
        if (show) fetchSales();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, page]);

    useEffect(() => {
        if (!show) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setPage(1); fetchSales(); }, 350);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchCode]);

    useEffect(() => {
        if (!show) return;
        setPage(1);
        fetchSales();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCustomers]);

    function buildParams() {
        const params = [
            `search[store_id]=${storeId}`,
            `limit=${pageSize}`,
            `page=${page}`,
            `sort=-_id`,
            `select=id,code,date,customer_name,net_total,payment_status,return_count`,
        ];
        if (searchCode) params.push(`search[code]=${encodeURIComponent(searchCode)}`);
        if (selectedCustomers[0]?.id) params.push(`search[customer_id]=${selectedCustomers[0].id}`);
        return params.join("&");
    }

    async function fetchSales() {
        setIsLoading(true);
        try {
            const r = await fetch(`${SALES_API}?${buildParams()}`, { headers }).then(r => r.json());
            if (r.status) {
                setList((r.result || []).filter(s => !(s.return_count > 0)));
                setTotalItems(r.total_count || 0);
                setTotalPages(Math.ceil((r.total_count || 0) / pageSize));
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }

    async function fetchCustomers(q) {
        if (!q) return;
        const r = await fetch(`/v1/customer?search[store_id]=${storeId}&search[name]=${encodeURIComponent(q)}&limit=20&select=id,name,code`, { headers })
            .then(r => r.json()).catch(() => ({}));
        setCustomerOptions((r.result || []).map(c => ({ id: c.id, label: `${c.code || ""} ${c.name}`.trim() })));
    }

    function handleClear() {
        setSearchCode("");
        setSelectedCustomers([]);
        setPage(1);
        setTimeout(fetchSales, 0);
    }

    return (
        <Modal show={show} size="xl" onHide={onHide} scrollable animation={false}>
            <Modal.Header closeButton>
                <Modal.Title>{t("Select Non VAT Sale")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row g-2 mb-3">
                    <div className="col-md-3">
                        <input
                            className="form-control form-control-sm"
                            placeholder={t("Code")}
                            value={searchCode}
                            onChange={e => setSearchCode(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <Typeahead
                            id="nvs-select-customer"
                            options={customerOptions}
                            selected={selectedCustomers}
                            onInputChange={fetchCustomers}
                            onChange={setSelectedCustomers}
                            placeholder={t("Customer")}
                            size="sm"
                            clearButton
                        />
                    </div>
                    <div className="col-auto">
                        <Button size="sm" variant="outline-secondary" onClick={handleClear}>{t("Clear")}</Button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>{t("Code")}</th>
                                <th>{t("Date")}</th>
                                <th>{t("Customer")}</th>
                                <th className="text-end">{t("Total")}</th>
                                <th>{t("Payment")}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr><td colSpan={7} className="text-center py-4"><Spinner animation="border" size="sm" /></td></tr>
                            )}
                            {!isLoading && list.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-4 text-muted">{t("No records found")}</td></tr>
                            )}
                            {list.map((item, idx) => (
                                <tr key={item.id}>
                                    <td>{(page - 1) * pageSize + idx + 1}</td>
                                    <td><strong>{item.code}</strong></td>
                                    <td>{item.date ? format(new Date(item.date), "dd/MM/yyyy") : ""}</td>
                                    <td>{item.customer_name}</td>
                                    <td className="text-end"><Amount amount={item.net_total} /></td>
                                    <td>
                                        <span className={`badge bg-${item.payment_status === "paid" ? "success" : item.payment_status === "partial" ? "warning" : "danger"}`}>
                                            {item.payment_status || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <Button size="sm" variant="primary" onClick={() => onSelect(item)}>
                                            {t("Select")}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setPage}
                />
            </Modal.Body>
        </Modal>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

function NonVATSalesReturnIndex(props) {
    const { t } = useTranslation("common");
    const { lastMessage } = useContext(WebSocketContext);

    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [netTotal, setNetTotal] = useState(0);

    const [searchCode, setSearchCode] = useState("");
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [showDateRange, setShowDateRange] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedFromDate, setSelectedFromDate] = useState(new Date());
    const [selectedToDate, setSelectedToDate] = useState(new Date());
    const [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    const [showOrderPreview, setShowOrderPreview] = useState(false);
    const [showSelectSale, setShowSelectSale] = useState(false);
    const [showSalesView, setShowSalesView] = useState(false);

    const PreviewRef = useRef();
    const SalesViewRef = useRef();
    const FormRef = useRef();
    const timerRef = useRef();

    const storeId = localStorage.getItem("store_id");
    const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") }), []);

    const effectiveCustomers = props.pendingView ? (props.selectedCustomers || []) : selectedCustomers;

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        if (lastMessage?.type === "non_vat_sales_return_refresh") fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage]);

    useEffect(() => {
        if (props.pendingView) fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.selectedCustomers]);

    function buildQueryParams() {
        const params = [`search[store_id]=${storeId}`, `limit=${pageSize}`, `page=${page}`, `sort=-_id`, `search[stats]=1`];
        if (searchCode) params.push(`search[code]=${encodeURIComponent(searchCode)}`);
        if (effectiveCustomers[0]?.id) params.push(`search[customer_id]=${effectiveCustomers[0].id}`);
        if (props.selectedPaymentStatusList?.length > 0) {
            params.push(`search[payment_status]=${props.selectedPaymentStatusList.map(s => s.id).join(",")}`);
        }
        if (!showDateRange && dateValue) params.push(`search[date_str]=${dateValue}`);
        if (showDateRange && fromDateValue) params.push(`search[from_date]=${fromDateValue}`);
        if (showDateRange && toDateValue) params.push(`search[to_date]=${toDateValue}`);
        params.push(`select=id,code,date,customer_name,net_total,payment_status,created_by_name`);
        return params.join("&");
    }

    async function fetchList() {
        setIsLoading(true);
        try {
            const r = await fetch(`${API_BASE}?${buildQueryParams()}`, { headers }).then(r => r.json());
            if (r.status) {
                setList(r.result || []);
                setTotalItems(r.total_count || 0);
                setTotalPages(Math.ceil((r.total_count || 0) / pageSize));
                setNetTotal(r.meta?.net_total || 0);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }

    function handleRefreshList() {
        fetchList();
        if (props.handleUpdated) props.handleUpdated();
    }

    async function fetchCustomers(q) {
        if (!q) return;
        const r = await fetch(`/v1/customer?search[store_id]=${storeId}&search[name]=${encodeURIComponent(q)}&limit=20&select=id,name,code`, { headers }).then(r => r.json()).catch(() => ({}));
        setCustomerOptions((r.result || []).map(c => ({ id: c.id, label: `${c.code || ""} ${c.name}`.trim() })));
    }

    // Step 1: Open sale selection modal
    function openSelectSaleModal() {
        setShowSelectSale(true);
    }

    // Step 2 → 3: User selected a sale — fetch full details and open the return form
    async function handleSelectedSale(sale) {
        setShowSelectSale(false);
        const r = await fetch(`${SALES_API}/${sale.id}?search[store_id]=${storeId}`, { headers })
            .then(r => r.json()).catch(() => ({}));
        const fullSale = r?.result;
        if (!fullSale) return;

        const prefill = {
            non_vat_sales_id: fullSale.id,
            customer_id: fullSale.customer_id || null,
            customer_name: fullSale.customer_name || "",
            customer: fullSale.customer_id ? { id: fullSale.customer_id, name: fullSale.customer_name } : null,
            vat_percent: fullSale.vat_percent,
            exclude_service_tax: fullSale.exclude_service_tax || false,
            exclude_product_tax: fullSale.exclude_product_tax || false,
            discount: fullSale.discount || 0,
            discount_with_vat: fullSale.discount_with_vat || 0,
            shipping_handling_fees: fullSale.shipping_handling_fees || 0,
            products: (fullSale.products || []).map(p => ({
                product_id: p.product_id || null,
                item_code: p.item_code || "",
                name: p.name || "",
                quantity: p.quantity || 1,
                unit_price: p.unit_price || 0,
                unit_price_with_vat: p.unit_price_with_vat || 0,
                purchase_unit_price: p.purchase_unit_price || 0,
                purchase_unit_price_with_vat: p.purchase_unit_price_with_vat || 0,
                unit_discount: p.unit_discount || 0,
                unit_discount_with_vat: p.unit_discount_with_vat || 0,
                unit: p.unit || "",
                is_service: p.is_service || false,
                selected: true,
            })),
        };

        timerRef.current = setTimeout(() => {
            FormRef.current?.open(null, prefill);
        }, 50);
    }

    function openEdit(item) {
        FormRef.current?.open(item.id, null);
    }

    const openSalesView = useCallback((item) => {
        setShowSalesView(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            SalesViewRef.current?.open(item.id);
        }, 50);
    }, []);

    const openPreview = useCallback((item) => {
        const doOpen = (fullItem) => {
            setShowOrderPreview(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                PreviewRef.current?.open({ ...fullItem, hideVAT: true }, undefined, "non_vat_sales_return");
            }, 100);
        };
        if (item.store) {
            doOpen(item);
        } else {
            fetch(`${API_BASE}/${item.id}?search[store_id]=${storeId}`, { headers })
                .then(r => r.json()).then(r => { if (r.result) doOpen(r.result); });
        }
    }, [storeId, headers]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        fetchList();
    }

    return (
        <div className="container-fluid">
            {!props.pendingView && <div className="row mb-3 align-items-center">
                <div className="col">
                    <h4 className="mb-0">{t("Non VAT Sales Returns")}</h4>
                </div>
                <div className="col-auto">
                    <Button variant="primary" size="sm" onClick={openSelectSaleModal}>
                        <i className="bi bi-plus-lg me-1" />{t("Create Non VAT Sales Return")}
                    </Button>
                </div>
            </div>}

            {/* Stats */}
            <div className="row mb-3">
                <div className="col-md-3">
                    <div className="card shadow-sm">
                        <div className="card-body py-2 px-3">
                            <div className="small text-muted">{t("Total")}</div>
                            <div className="fw-bold fs-6"><Amount amount={netTotal} /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="row g-2 mb-3">
                <div className="col-md-2">
                    <input className="form-control form-control-sm" placeholder={t("Code")} value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                </div>
                {!props.pendingView && <div className="col-md-3">
                    <Typeahead
                        id="nvsr-customer-search"
                        options={customerOptions}
                        selected={selectedCustomers}
                        onInputChange={fetchCustomers}
                        onChange={setSelectedCustomers}
                        placeholder={t("Customer")}
                        size="sm"
                        clearButton
                    />
                </div>}
                <div className="col-md-2">
                    <div className="input-group input-group-sm">
                        <DatePicker
                            selected={selectedDate}
                            onChange={d => { setSelectedDate(d); setDateValue(d ? format(d, "MM/dd/yyyy") : ""); }}
                            className="form-control form-control-sm"
                            placeholderText={t("Date")}
                            dateFormat="MM/dd/yyyy"
                        />
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowDateRange(!showDateRange)}>
                            {showDateRange ? t("Date") : t("Range")}
                        </button>
                    </div>
                </div>
                {showDateRange && (
                    <>
                        <div className="col-md-2">
                            <DatePicker selected={selectedFromDate} onChange={d => { setSelectedFromDate(d); setFromDateValue(d ? format(d, "MM/dd/yyyy") : ""); }} className="form-control form-control-sm" placeholderText={t("From")} dateFormat="MM/dd/yyyy" />
                        </div>
                        <div className="col-md-2">
                            <DatePicker selected={selectedToDate} onChange={d => { setSelectedToDate(d); setToDateValue(d ? format(d, "MM/dd/yyyy") : ""); }} className="form-control form-control-sm" placeholderText={t("To")} dateFormat="MM/dd/yyyy" />
                        </div>
                    </>
                )}
                <div className="col-auto">
                    <Button type="submit" size="sm" variant="outline-primary">{t("Search")}</Button>
                    <Button size="sm" variant="outline-secondary" className="ms-1" onClick={() => { setSearchCode(""); setSelectedCustomers([]); setDateValue(""); setFromDateValue(""); setToDateValue(""); setPage(1); setTimeout(fetchList, 0); }}>{t("Clear")}</Button>
                </div>
            </form>

            {/* Table */}
            <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>{t("Code")}</th>
                            <th>{t("Date")}</th>
                            <th>{t("Customer")}</th>
                            <th className="text-end">{t("Total")}</th>
                            <th>{t("Payment")}</th>
                            <th>{t("Actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={7} className="text-center py-4"><Spinner animation="border" size="sm" /></td></tr>
                        )}
                        {!isLoading && list.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-4 text-muted">{t("No records found")}</td></tr>
                        )}
                        {list.map((item, idx) => (
                            <tr key={item.id}>
                                <td>{(page - 1) * pageSize + idx + 1}</td>
                                <td><strong>{item.code}</strong></td>
                                <td>{item.date ? format(new Date(item.date), "dd/MM/yyyy") : ""}</td>
                                <td>{item.customer_name}</td>
                                <td className="text-end"><Amount amount={item.net_total} /></td>
                                <td>
                                    <span className={`badge bg-${item.payment_status === "paid" ? "success" : item.payment_status === "partial" ? "warning" : "danger"}`}>
                                        {item.payment_status || "—"}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => openSalesView(item)} title={t("View")}><i className="bi bi-eye" /></button>
                                    <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => openPreview(item)} title={t("Print A4")}><i className="bi bi-printer" /></button>
                                    <button className="btn btn-outline-primary btn-sm me-1" onClick={() => openEdit(item)} title={t("Edit")}><i className="bi bi-pencil" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <PaginationControls
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
            />

            {/* Step 2: Select Non VAT Sale modal */}
            <NonVatSaleSelectModal
                show={showSelectSale}
                onHide={() => setShowSelectSale(false)}
                onSelect={handleSelectedSale}
                storeId={storeId}
                headers={headers}
                t={t}
            />

            {/* Step 3 & 4: Create Non VAT Sales Return form */}
            <QuotationType3Form
                ref={FormRef}
                apiBase={API_BASE}
                showToastMessage={props.showToastMessage}
                refreshList={handleRefreshList}
                openDetailsView={(id) => {
                    setShowSalesView(true);
                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        SalesViewRef.current?.open(id);
                    }, 50);
                }}
            />

            {/* Preview */}
            {showOrderPreview && (
                <OrderPreview
                    ref={PreviewRef}
                    onHide={() => setShowOrderPreview(false)}
                />
            )}

            {/* Details View */}
            {showSalesView && (
                <QuotationView
                    ref={SalesViewRef}
                    apiBase={API_BASE}
                    onHide={() => setShowSalesView(false)}
                />
            )}
        </div>
    );
}

export default NonVATSalesReturnIndex;
