import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import QuotationType3Form from "../quotation/QuotationType3Form.js";
import RepairJobCardView from "../repair_job/card_view.js";
import CustomerCreate from "../customer/create.js";
import ProductCreate from "../product/create.js";
import ServiceCreate from "../service/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { highlightWords } from "../utils/search.js";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import Amount from "../utils/amount.js";
import { WebSocketContext } from "../utils/WebSocketContext.js";
import OrderPreview from "../order/preview.js";
import QuotationView from "../quotation/view.js";
import { useTranslation } from "react-i18next";
import PaginationControls from "../utils/PaginationControls.js";

const API_BASE = "/v1/non-vat-sales";

function NonVATSalesIndex(props) {
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
    const [showReturnPreview, setShowReturnPreview] = useState(false);
    const [showSalesView, setShowSalesView] = useState(false);
    const PreviewRef = useRef();
    const ReturnPreviewRef = useRef();
    const SalesViewRef = useRef();
    const FormRef = useRef();
    const ReturnFormRef = useRef();
    const jobCardViewRef = useRef();
    const CustomerCreateRef = useRef();
    const ProductCreateRef = useRef();
    const ServiceCreateRef = useRef();
    const timerRef = useRef();
    const searchTimerRef = useRef();
    const customerSearchContainerRef = useRef();

    const storeId = localStorage.getItem("store_id");
    const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") }), []);

    const effectiveCustomers = props.pendingView ? (props.selectedCustomers || []) : selectedCustomers;

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        if (lastMessage?.type === "non_vat_sales_refresh") fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage]);

    useEffect(() => {
        if (props.pendingView) fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.selectedCustomers]);

    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            if (page !== 1) setPage(1);
            else fetchList();
        }, 400);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchCode, selectedCustomers, dateValue, fromDateValue, toDateValue]);

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
        params.push(`select=id,code,date,customer_name,net_total,payment_status,return_amount,created_by_name`);
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
        const r = await fetch(`/v1/customer?search[store_id]=${storeId}&search[name]=${encodeURIComponent(q)}&limit=50&select=id,code,name,phone,vat_no,name_in_arabic`, { headers }).then(r => r.json()).catch(() => ({}));
        setCustomerOptions(r.result || []);
    }

    function openCreate() {
        FormRef.current?.open(null, null);
    }

    function openEdit(item) {
        FormRef.current?.open(item.id, null);
    }

    async function openReturnForm(item) {
        const r = await fetch(`${API_BASE}/${item.id}?search[store_id]=${storeId}`, { headers }).then(r => r.json()).catch(() => ({}));
        const sale = r?.result;
        if (!sale) return;
        const prefill = {
            non_vat_sales_id: sale.id,
            customer_id: sale.customer_id || null,
            customer_name: sale.customer_name || '',
            customer: sale.customer_id ? { id: sale.customer_id, name: sale.customer_name } : null,
            exclude_service_tax: sale.exclude_service_tax !== undefined ? sale.exclude_service_tax : true,
            exclude_product_tax: sale.exclude_product_tax !== undefined ? sale.exclude_product_tax : false,
            products: (sale.products || []).map(p => ({
                product_id: p.product_id || null,
                item_code: p.item_code || '',
                name: p.name || '',
                quantity: p.quantity || 1,
                unit_price: p.unit_price || 0,
                unit_price_with_vat: p.unit_price_with_vat || 0,
                purchase_unit_price: p.purchase_unit_price || 0,
                purchase_unit_price_with_vat: p.purchase_unit_price_with_vat || 0,
                unit_discount: p.unit_discount || 0,
                unit_discount_with_vat: p.unit_discount_with_vat || 0,
                unit: p.unit || '',
                is_service: p.is_service || false,
            })),
        };
        ReturnFormRef.current?.open(null, prefill);
    }

    const openPreview = useCallback((item) => {
        const doOpen = (fullItem) => {
            setShowOrderPreview(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                PreviewRef.current?.open({ ...fullItem, hideVAT: true, type: 'non_vat_invoice' }, undefined, "non_vat_invoice");
            }, 100);
        };
        if (item.store) {
            doOpen(item);
        } else {
            fetch(`${API_BASE}/${item.id}?search[store_id]=${storeId}`, { headers })
                .then(r => r.json()).then(r => { if (r.result) doOpen(r.result); });
        }
    }, [storeId, headers]);

    function openUpdateProductForm(id, isService) {
        if (isService) { ServiceCreateRef.current?.open(id); }
        else { ProductCreateRef.current?.open(id); }
    }

    const openSalesView = useCallback((item) => {
        setShowSalesView(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            SalesViewRef.current?.open(item.id);
        }, 50);
    }, []);

    return (
        <div className="container-fluid">
            {!props.pendingView && <div className="row mb-3 align-items-center">
                <div className="col">
                    <h4 className="mb-0">{t("Non VAT Sales")}</h4>
                </div>
                <div className="col-auto">
                    <Button variant="primary" size="sm" onClick={openCreate}>
                        <i className="bi bi-plus-lg me-1" />{t("Create")}
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
            <div className="row g-2 mb-3">
                <div className="col-md-2">
                    <input className="form-control form-control-sm" placeholder={t("Code")} value={searchCode} onChange={e => setSearchCode(e.target.value)} />
                </div>
                {!props.pendingView && <div className="col-md-3" ref={customerSearchContainerRef}>
                    <Typeahead
                        id="nvs-customer-search"
                        options={customerOptions}
                        selected={selectedCustomers}
                        labelKey={opt => `${opt.code || ""} ${opt.name || ""}`.trim()}
                        filterBy={() => true}
                        onInputChange={fetchCustomers}
                        onChange={setSelectedCustomers}
                        placeholder={t("Customer")}
                        size="sm"
                        clearButton
                        renderMenu={(results, menuProps, state) => {
                            if (!results.length) return <></>;
                            const inputEl = customerSearchContainerRef.current?.querySelector("input");
                            const containerBottom = inputEl
                                ? inputEl.getBoundingClientRect().bottom
                                : (customerSearchContainerRef.current?.getBoundingClientRect().bottom || 0);
                            const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                            const cols = [
                                { key: "code",  label: t("Code"),   w: "15%" },
                                { key: "name",  label: t("Name"),   w: "45%" },
                                { key: "phone", label: t("Phone"),  w: "20%" },
                                { key: "vat_no",label: t("VAT No."),w: "20%" },
                            ];
                            return (
                                <Menu {...menuProps} style={{ ...(menuProps.style || {}), position: "fixed", top: containerBottom, left: "50%", transform: "translateX(-50%)", width: "70vw", maxWidth: "70vw", minWidth: "300px", zIndex: 9999 }}>
                                    <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, margin: 0 }}>
                                        <div style={{ display: "flex", fontWeight: 700, color: "#374151", padding: "4px 8px", background: "#f8f9fa", borderBottom: "1px solid #e2e8f0" }}>
                                            {cols.map(c => <div key={c.key} style={{ width: c.w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</div>)}
                                        </div>
                                    </MenuItem>
                                    {results.map((opt, idx) => {
                                        const isActive = state.activeIndex === idx || results.length === 1;
                                        return (
                                            <MenuItem option={opt} position={idx} key={opt.id || idx} style={{ padding: 0 }}>
                                                <div style={{ display: "flex", padding: "5px 8px", alignItems: "center", background: isActive ? "#e8f0fe" : "transparent" }}>
                                                    {cols.map(c => (
                                                        <div key={c.key} style={{ width: c.w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? "#191c1e" : "#374151", fontWeight: isActive ? 600 : 400 }}>
                                                            {c.key === "name"
                                                                ? highlightWords(`${opt.name || ""}${opt.name_in_arabic ? " - " + opt.name_in_arabic : ""}`, searchWords, isActive)
                                                                : highlightWords(opt[c.key] || "–", searchWords, isActive)
                                                            }
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
                    <Button size="sm" variant="outline-secondary" onClick={() => { setSearchCode(""); setSelectedCustomers([]); setDateValue(""); setFromDateValue(""); setToDateValue(""); setSelectedDate(null); setSelectedFromDate(null); setSelectedToDate(null); }}>{t("Clear")}</Button>
                </div>
            </div>

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
                                    <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => openPreview(item)} title={t("Preview A4")}><i className="bi bi-printer" /></button>
                                    <button className="btn btn-outline-primary btn-sm me-1" onClick={() => openEdit(item)} title={t("Edit")}><i className="bi bi-pencil" /></button>
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => openReturnForm(item)} title={t("Create Return")}><i className="bi bi-arrow-return-left" /></button>
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

            {/* Form Modal */}
            <QuotationType3Form
                ref={FormRef}
                apiBase={API_BASE}
                showToastMessage={props.showToastMessage}
                refreshList={handleRefreshList}
                openDetailsView={(id) => openPreview({ id })}
                openJobCard={(jobId) => jobCardViewRef.current?.open(jobId, 1200)}
                openUpdateProductForm={openUpdateProductForm}
            />

            {/* Return Form Modal */}
            <QuotationType3Form
                ref={ReturnFormRef}
                apiBase="/v1/non-vat-sales-return"
                showToastMessage={props.showToastMessage}
                refreshList={handleRefreshList}
                openDetailsView={(id) => {
                    setShowReturnPreview(true);
                    setTimeout(() => {
                        fetch(`/v1/non-vat-sales-return/${id}?search[store_id]=${storeId}`, { headers })
                            .then(r => r.json()).then(r => {
                                if (r.result) ReturnPreviewRef.current?.open({ ...r.result, hideVAT: true }, undefined, "non_vat_sales_return");
                            });
                    }, 100);
                }}
                openUpdateProductForm={openUpdateProductForm}
            />

            {/* Preview */}
            {showOrderPreview && (
                <OrderPreview
                    ref={PreviewRef}
                    onHide={() => setShowOrderPreview(false)}
                />
            )}

            {/* Return Preview */}
            {showReturnPreview && (
                <OrderPreview
                    ref={ReturnPreviewRef}
                    onHide={() => setShowReturnPreview(false)}
                />
            )}

            {/* Sales View Modal */}
            {showSalesView && (
                <QuotationView
                    ref={SalesViewRef}
                    apiBase={API_BASE}
                    onHide={() => setShowSalesView(false)}
                />
            )}

            <CustomerCreate ref={CustomerCreateRef} refreshList={() => {}} />
            <ProductCreate ref={ProductCreateRef} refreshList={() => {}} showToastMessage={props.showToastMessage} />
            <ServiceCreate ref={ServiceCreateRef} refreshList={() => {}} showToastMessage={props.showToastMessage} />
            <RepairJobCardView
                ref={jobCardViewRef}
                showToastMessage={props.showToastMessage}
                onCreateSalesInvoice={() => {}}
                onCreateQuotation={() => {}}
                onCreateNonVatInvoice={() => {}}
                onOpenNonVatInvoice={(id) => FormRef.current?.open(id, null)}
            />
        </div>
    );
}

export default NonVATSalesIndex;
