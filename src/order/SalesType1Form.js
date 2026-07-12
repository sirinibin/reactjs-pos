import React, { useState, useCallback } from "react";
import { Modal, Button } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { DebounceInput } from 'react-debounce-input';
import { Spinner } from "react-bootstrap";
import { Dropdown } from 'react-bootstrap';
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { trimTo8Decimals } from "../utils/numberUtils";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { highlightWords } from "../utils/search.js";
import { useTranslation } from 'react-i18next';
import ResizableTableCell from '../utils/ResizableTableCell';
import TableSettingsModal from '../utils/TableSettingsModal.js';

function _dnFormatTimeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;
    if (diffMs < 0) return 'just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return diffSec + 's ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    return Math.floor(diffHr / 24) + 'd ago';
}
function _dnFormatDateTime(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
}

const DEFAULT_T1_CUSTOMER_COLS = [
    { key: 'code',           label: 'Code',          width: 10, visible: true },
    { key: 'name',           label: 'Name',          width: 50, visible: true },
    { key: 'phone',          label: 'Phone',         width: 10, visible: true },
    { key: 'vat_no',         label: 'VAT No.',       width: 13, visible: true },
    { key: 'credit_balance', label: 'Credit Balance',width: 10, visible: true },
    { key: 'credit_limit',   label: 'Credit Limit',  width: 7,  visible: true },
];
const T1_CUSTOMER_COLS_KEY = 'sales_t1_customer_search_columns';

export function SalesType1Header({
    formData, setFormData,
    isUpdateForm,
    store,
    formType, setFormType,
    disablePreviousButton,
    isSubmitting,
    dnNotifications,
    openPreviousForm,
    openLastForm,
    openNextForm,
    openCreateForm,
    openPrint,
    openPreview,
    handleCreate,
    handleClose,
    openSalesFromDnInForm,
    dismissDnNotification,
}) {
    const { t } = useTranslation('common');
    return (
                    <Modal.Header>
                        <Modal.Title>
                            {isUpdateForm ? t("Update Sales") + " #" + formData.code : t("Create New Sales Order")}
                        </Modal.Title>
                        {!isUpdateForm && store?.zatca?.phase === "2" && store?.zatca?.connected && <div style={{ marginLeft: "20px" }}>
                            <input type="checkbox" className="form-check-input" id="sales_report_to_zatca" name="report_to_zatca" checked={formData.enable_report_to_zatca} onChange={(e) => {
                                formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
                                setFormData({ ...formData });
                            }} style={{ width: "16px", height: "16px", verticalAlign: "middle", marginRight: "6px" }} /> {t("Report to Zatca")} <br />
                        </div>}
                        <div className="col align-self-end text-end">
                            <Button variant="primary" className="btn btn-primary" disabled={disablePreviousButton} onClick={(e) => { e.preventDefault(); if (isUpdateForm) { openPreviousForm(); } else { openLastForm(); } }}>
                                <i className="bi-chevron-double-left"></i> {t('Previous')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button disabled={!isUpdateForm} variant="primary" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openNextForm(); }}>
                                {t('Next')} <i className="bi-chevron-double-right"></i>
                            </Button>
                            &nbsp;&nbsp;
                            <Button disabled={!isUpdateForm} variant="primary" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openCreateForm(); }}>
                                <i className="bi bi-plus"></i> {t('Create New')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button variant="secondary" disabled={!isUpdateForm} onClick={openPrint}>
                                <i className="bi bi-printer"></i> {t('Print')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button variant="primary" disabled={!isUpdateForm} onClick={openPreview}>
                                <i className="bi bi-printer"></i> {t('Print A4 Invoice')}
                            </Button>
                            &nbsp;&nbsp;
                            <Button variant="primary" style={{ minWidth: "80px" }} onClick={(e) => { e.preventDefault(); handleCreate(e); }}>
                                {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : ""}
                                {isUpdateForm && !isSubmitting ? t('Update') : !isSubmitting ? t('Create') : ""}
                            </Button>
                            &nbsp;&nbsp;
                            {store.settings?.enable_sales_page_selection === true && (
                                <><select value={formType} onChange={(e) => setFormType(e.target.value)} className="form-select form-select-sm d-inline-block" style={{ width: "auto", fontSize: "11px", padding: "2px 24px 2px 6px", height: "26px", lineHeight: "1.2" }}>
                                    <option value="type3">{t("Type 3")} (Compact)</option>
                                    <option value="type2">{t("Type 2")} (New)</option>
                                    <option value="type1">{t("Type 1")} (Classic)</option>
                                </select>&nbsp;&nbsp;</>
                            )}
                            {store.settings?.enable_notification === true && (
                                <Dropdown style={{ display: "inline-block", verticalAlign: "middle" }}>
                                    <Dropdown.Toggle as="span" style={{ cursor: "pointer", position: "relative", display: "inline-block", padding: "0 6px" }} id="dn-bell-t1">
                                        <i className="bi bi-bell fs-6"></i>
                                        {dnNotifications.length > 0 && (
                                            <span style={{ position: "absolute", top: "-4px", right: "1px", background: "red", color: "white", borderRadius: "50%", fontSize: "10px", fontWeight: "bold", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>
                                                {dnNotifications.length}
                                            </span>
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu align="end" style={{ minWidth: "320px", maxHeight: "400px", overflowY: "auto" }}>
                                        {dnNotifications.length === 0 ? (
                                            <Dropdown.ItemText className="text-muted small">No pending reminders</Dropdown.ItemText>
                                        ) : (
                                            dnNotifications.map(notif => (
                                                <div key={notif.id} style={{ display: "flex", alignItems: "flex-start", padding: "8px 14px", borderBottom: "1px solid #f0f0f0", gap: "6px" }}>
                                                    <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => openSalesFromDnInForm(notif)}>
                                                        <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                                                            <i className="bi bi-file-earmark-text text-primary me-2"></i>
                                                            Create Sales for DN <strong>{notif.code}</strong>
                                                        </div>
                                                        {notif.arrived_at && (
                                                            <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                                                                {_dnFormatDateTime(notif.arrived_at)}
                                                                <span style={{ marginLeft: "6px", fontWeight: 600, color: "#555" }}>· {_dnFormatTimeAgo(notif.arrived_at)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); dismissDnNotification(notif.id, true); }} title="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "16px", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>&times;</button>
                                                </div>
                                            ))
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            )}
                            &nbsp;&nbsp;
                            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
                        </div>
                    </Modal.Header>
    );
}

export function SalesType1Body({
    formData, setFormData,
    errors, setErrors,
    warnings,
    selectedProducts, setSelectedProducts,
    selectedCustomers, setSelectedCustomers,
    isZatcaReported,
    store,
    warehouseList,
    openCustomerSearchResult, setOpenCustomerSearchResult,
    openProductSearchResult, setOpenProductSearchResult,
    customerOptions, setCustomerOptions,
    productOptions, setProductOptions,
    showSelectedProductsSettings, setShowSelectedProductsSettings,
    showProductSearchSettings, setShowProductSearchSettings,
    showBillSummarySettings, setShowBillSummarySettings,
    billSummaryOrder, setBillSummaryOrder,
    billSummaryVisible, setBillSummaryVisible,
    billSummaryDragRef,
    _billSummaryFieldLabels,
    _defaultBillSummaryOrder,
    reorderBillSummaryT1,
    updateBillSummaryVisible,
    timerRef,
    customerSearchRef,
    productSearchRef,
    inputRefs,
    latestRequestRef,
    onChangeTriggeredRef,
    discountRef,
    discountWithVATRef,
    cashDiscountRef,
    commissionRef,
    handleCreate,
    suggestCustomers,
    suggestProducts,
    getProductByBarCode,
    addProduct,
    removeProduct,
    openCustomerCreateForm,
    openCustomerUpdateForm,
    openCustomerPending,
    openCustomers,
    openProducts,
    openServices,
    openProductCreateForm,
    openServiceCreateForm,
    openUpdateProductForm,
    openProductDetails,
    openProductImages,
    openLinkedProducts,
    openSalesHistory,
    openPurchaseHistory,
    openSalesReturnHistory,
    openPurchaseReturnHistory,
    openQuotationHistory,
    openDeliveryNoteHistory,
    openProductHistory,
    openQuotationSalesHistory,
    openQuotationSalesReturnHistory,
    openQuotations,
    openDeliveryNotes,
    openReferenceUpdateForm,
    addNewPayment,
    removePayment,
    validatePaymentAmounts,
    getColumnWidth,
    getShortcut,
    RunKeyActions,
    CalCulateLineTotals,
    reCalculate,
    reCalculateRef,
    checkErrors,
    checkWarnings,
    checkWarning,
    isProductAdded,
    sendWhatsAppMessage,
    dateLocale,
    columnStyle,
    searchProductsColumns,
    selectedProductsColumns,
    shipping, setShipping,
    discount, setDiscount,
    discountWithVAT, setDiscountWithVAT,
    discountPercent, setDiscountPercent,
    discountPercentWithVAT, setDiscountPercentWithVAT,
    roundingAmount, setRoundingAmount,
    cashDiscount, setCashDiscount,
    commission, setCommission,
    totalPaymentAmount,
    balanceAmount,
    paymentStatus,
    isSubmitting,
    isUpdateForm,
    handleClose,
    renderTotalWithoutVATTooltip,
    renderTotalWithVATTooltip,
    renderShippingTooltip,
    renderDiscountWithoutVATTooltip,
    renderDiscountWithVATTooltip,
    renderTooltip,
    renderVATTooltip,
    renderNetTotalBeforeRoundingTooltip,
    renderNetTotalTooltip,
    fetchAndSetCustomer,
    startPsColResize,
}) {
    const { t } = useTranslation('common');
    const [showCustomerSearchSettings, setShowCustomerSearchSettings] = useState(false);
    const [customerSearchColumns, setCustomerSearchColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(T1_CUSTOMER_COLS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const keyMap = {};
                parsed.forEach(c => { keyMap[c.key] = c; });
                return DEFAULT_T1_CUSTOMER_COLS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
            }
        } catch {}
        return DEFAULT_T1_CUSTOMER_COLS.map(c => ({ ...c }));
    });
    function handleToggleCustomerCol(index) {
        const updated = customerSearchColumns.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
        setCustomerSearchColumns(updated);
        localStorage.setItem(T1_CUSTOMER_COLS_KEY, JSON.stringify(updated));
    }
    function handleCustomerColDragEnd(result) {
        if (!result.destination) return;
        const reordered = Array.from(customerSearchColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setCustomerSearchColumns(reordered);
        localStorage.setItem(T1_CUSTOMER_COLS_KEY, JSON.stringify(reordered));
    }
    function restoreCustomerColDefaults() {
        const cloned = DEFAULT_T1_CUSTOMER_COLS.map(c => ({ ...c }));
        setCustomerSearchColumns(cloned);
        localStorage.setItem(T1_CUSTOMER_COLS_KEY, JSON.stringify(cloned));
    }
    const startCustomerColResize = useCallback((e, colKey) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        let currentCols = null;
        setCustomerSearchColumns(prev => { currentCols = prev; return prev; });
        setTimeout(() => {
            const cols = currentCols || DEFAULT_T1_CUSTOMER_COLS;
            const col = cols.find(c => c.key === colKey);
            if (!col) return;
            const startWidth = col.width;
            const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
            const pxPerUnit = (window.innerWidth * 0.95) / totalW;
            function onMouseMove(ev) {
                const newWidth = Math.max(3, startWidth + (ev.clientX - startX) / pxPerUnit);
                setCustomerSearchColumns(prev => {
                    const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                    localStorage.setItem(T1_CUSTOMER_COLS_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
        }, 0);
    }, []);
    return (
        <>
                        <form className="row g-3 needs-validation" onSubmit={e => { e.preventDefault(); handleCreate(e); }} >
                            <div className="col-12">
                                <div className="entity-header-grid" style={{ gap: '10px', alignItems: 'start' }}>

                                    {/* LEFT: all form fields stacked */}
                                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                                        {/* Customer search row */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                <label className="form-label mb-0">{t('Customer')}</label>
                                                {formData.customer_id && (
                                                    <Button className="btn btn-default btn-sm" onClick={() => openCustomerUpdateForm(formData.customer_id)}>
                                                        <i className="bi bi-pencil"></i>
                                                    </Button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                    <Typeahead
                                                        id="customer_id"
                                                        filterBy={() => true}
                                                        labelKey="search_label"
                                                        isLoading={false}
                                                        emptyLabel=""
                                                        clearButton={false}
                                                        open={openCustomerSearchResult}
                                                        onChange={(selectedItems) => {
                                                            delete errors.customer_id;
                                                            setErrors(errors);
                                                            if (selectedItems.length === 0) {
                                                                delete errors.customer_id;
                                                                delete errors.blocked;
                                                                formData.customer_id = "";
                                                                formData.customer_name = "";
                                                                formData.customerName = "";
                                                                setFormData({ ...formData });
                                                                setSelectedCustomers([]);
                                                                setOpenCustomerSearchResult(false);
                                                                return;
                                                            }
                                                            formData.customer_id = selectedItems[0].id;
                                                            if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                                                                formData.remarks = selectedItems[0].remarks;
                                                            }
                                                            if (selectedItems[0].phone && !formData.phone) {
                                                                formData.phone = selectedItems[0].phone;
                                                            }
                                                            setFormData({ ...formData });
                                                            setSelectedCustomers(selectedItems);
                                                            fetchAndSetCustomer(selectedItems[0].id, selectedItems[0]);
                                                            setOpenCustomerSearchResult(false);
                                                            if (store?.settings?.block_sales_after_pending_count > 0) {
                                                                const storeId = localStorage.getItem("store_id");
                                                                const cs = selectedItems[0]?.stores?.[storeId];
                                                                const pendingCount = (cs?.sales_not_paid_count || 0) + (cs?.sales_paid_partially_count || 0);
                                                                if (pendingCount >= store.settings.block_sales_after_pending_count) {
                                                                    errors.blocked = `Customer has ${pendingCount} unpaid sale(s). New sales are blocked until existing sales are paid.`;
                                                                } else {
                                                                    delete errors.blocked;
                                                                }
                                                                setErrors({ ...errors });
                                                            }
                                                        }}
                                                        options={customerOptions}
                                                        placeholder={t('Customer Name / Mob / VAT # / ID')}
                                                        selected={selectedCustomers}
                                                        highlightOnlyResult={true}
                                                        ref={customerSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                delete errors.customer_id;
                                                                formData.customer_id = "";
                                                                formData.customer_name = "";
                                                                formData.customerName = "";
                                                                setFormData({ ...formData });
                                                                setSelectedCustomers([]);
                                                                setCustomerOptions([]);
                                                                setOpenCustomerSearchResult(false);
                                                                customerSearchRef.current?.clear();
                                                            }
                                                        }}
                                                        onInputChange={(searchTerm, e) => {
                                                            if (searchTerm) {
                                                                formData.customerName = searchTerm;
                                                                formData.customer_name = searchTerm;
                                                                setFormData({ ...formData });
                                                            }
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => { suggestCustomers(searchTerm); }, 350);
                                                        }}
                                                        renderMenu={(results, menuProps, state) => {
                                                            const searchWords = state.text.toLowerCase().split(' ').filter(Boolean);
                                                            const visCols = customerSearchColumns.filter(c => c.visible);
                                                            const totW = visCols.reduce((s, c) => s + c.width, 0);
                                                            const cw = (col) => `${(col.width / totW) * 100}%`;
                                                            const resizeHandle = (colKey) => (
                                                                <div onMouseDown={e => startCustomerColResize(e, colKey)}
                                                                    style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '5px', cursor: 'col-resize', zIndex: 2 }} />
                                                            );
                                                            return (
                                                                <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
                                                                    <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                                        <div style={{ display: 'flex', fontWeight: 700, color: '#374151', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', pointerEvents: 'auto', position: 'relative' }}>
                                                                            {visCols.map(col => (
                                                                                <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>
                                                                                    {col.key === 'code' && t('Code')}
                                                                                    {col.key === 'name' && t('Name')}
                                                                                    {col.key === 'phone' && t('Phone')}
                                                                                    {col.key === 'vat_no' && t('VAT No.')}
                                                                                    {col.key === 'credit_balance' && t('Credit Balance')}
                                                                                    {col.key === 'credit_limit' && t('Credit Limit')}
                                                                                    {resizeHandle(col.key)}
                                                                                </div>
                                                                            ))}
                                                                            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                                                                onClick={e => { e.stopPropagation(); setShowCustomerSearchSettings(true); }}>
                                                                                <i className="bi bi-gear-fill" style={{ fontSize: '13px', color: '#6b7280' }} />
                                                                            </div>
                                                                        </div>
                                                                    </MenuItem>
                                                                    {results.map((option, idx) => {
                                                                        const isActive = state.activeIndex === idx || results.length === 1;
                                                                        const rowBg = isActive ? '#e8f0fe' : 'transparent';
                                                                        return (
                                                                            <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                                <div style={{ display: 'flex', padding: '5px 8px', alignItems: 'center', background: rowBg }}>
                                                                                    {visCols.map(col => (
                                                                                        <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                            {col.key === 'code' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.code, searchWords, isActive)}</span>}
                                                                                            {col.key === 'name' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.name + (option.name_in_arabic ? ' - ' + option.name_in_arabic : ''), searchWords, isActive)}</span>}
                                                                                            {col.key === 'phone' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.phone || '–', searchWords, isActive)}</span>}
                                                                                            {col.key === 'vat_no' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.vat_no || '–', searchWords, isActive)}</span>}
                                                                                            {col.key === 'credit_balance' && (
                                                                                                <button type="button" onClick={e => { e.stopPropagation(); openCustomerPending(option); }}
                                                                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: option.credit_balance > 0 ? '#dc2626' : option.credit_balance < 0 ? '#2563eb' : (isActive ? '#191c1e' : '#374151'), fontWeight: isActive ? 600 : 400 }}>
                                                                                                    {option.credit_balance != null ? option.credit_balance : '–'}
                                                                                                </button>
                                                                                            )}
                                                                                            {col.key === 'credit_limit' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{option.credit_limit || '–'}</span>}
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
                                                <Button className="btn btn-primary btn-sm" onClick={openCustomers}><i className="bi bi-list"></i></Button>
                                                <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-sm" type="button"><i className="bi bi-plus-lg"></i> {t('New')}</Button>
                                            </div>
                                            {errors.customer_id && <div style={{ color: "red", fontSize: '12px', marginTop: '2px' }}>{t(errors.customer_id)}</div>}
                                            {errors.blocked && <div style={{ color: "red", fontSize: '12px', marginTop: '2px' }}>{errors.blocked}</div>}
                                        </div>

                                        {/* 2×3 grid: Date | Phone+WA | VAT  /  Barcode | Address | Remarks */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '231px 1fr 1fr', gap: '8px 65px', alignItems: 'start', maxWidth: '80%', marginTop: '10px' }}>

                                            {/* R1C1: Date */}
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Date') + " *"}</label>
                                                <DatePicker
                                                    id="date_str"
                                                    selected={formData.date_str ? new Date(formData.date_str) : null}
                                                    value={formData.date_str ? format(
                                                        new Date(formData.date_str),
                                                        "MMMM d, yyyy h:mm aa",
                                                        { locale: dateLocale }
                                                    ) : null}
                                                    className="form-control"
                                                    dateFormat="MMMM d, yyyy h:mm aa"
                                                    locale={dateLocale}
                                                    showTimeSelect
                                                    timeIntervals="1"
                                                    onChange={(value) => {
                                                        formData.date_str = value;
                                                        setFormData({ ...formData });
                                                    }}
                                                />
                                                {errors.date_str && <div style={{ color: "red" }}>{t(errors.date_str)}</div>}
                                            </div>

                                            {/* R1C2: Phone + WhatsApp */}
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Phone') + "( 05.. / +966..)"}</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        id="sales_phone"
                                                        name="sales_phone"
                                                        value={formData.phone ? formData.phone : ""}
                                                        type='string'
                                                        onChange={(e) => {
                                                            delete errors["phone"];
                                                            setErrors({ ...errors });
                                                            formData.phone = e.target.value;
                                                            setFormData({ ...formData });
                                                        }}
                                                        className="form-control"
                                                        placeholder={t('Phone')}
                                                    />
                                                    <Button className="btn btn-success btn-sm" onClick={sendWhatsAppMessage} style={{ flexShrink: 0 }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                                        </svg>
                                                    </Button>
                                                </div>
                                                {errors.phone && <div style={{ color: "red" }}>{t(errors.phone)}</div>}
                                            </div>

                                            {/* R1C3: VAT NO. */}
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('VAT NO.(15 digits)')}</label>
                                                <input
                                                    id="sales_vat_no"
                                                    name="sales_vat_no"
                                                    value={formData.vat_no ? formData.vat_no : ""}
                                                    type='string'
                                                    onChange={(e) => {
                                                        delete errors["vat_no"];
                                                        setErrors({ ...errors });
                                                        formData.vat_no = e.target.value;
                                                        setFormData({ ...formData });
                                                    }}
                                                    className="form-control"
                                                    placeholder={t('VAT NO.')}
                                                />
                                                {errors.vat_no && <div style={{ color: "red" }}>{t(errors.vat_no)}</div>}
                                            </div>

                                            {/* R2C1: Barcode Scan */}
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Product Barcode Scan')}</label>
                                                <DebounceInput
                                                    minLength={3}
                                                    debounceTimeout={100}
                                                    placeholder={t('Scan Barcode')}
                                                    className="form-control barcode"
                                                    value={formData.barcode}
                                                    onChange={event => getProductByBarCode(event.target.value)} />
                                                {errors.bar_code && <div style={{ color: "red" }}>{t(errors.bar_code)}</div>}
                                            </div>

                                            {/* R2C2: Address */}
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Address')}</label>
                                                <textarea
                                                    value={formData.address}
                                                    onChange={(e) => {
                                                        delete errors["address"];
                                                        setErrors({ ...errors });
                                                        formData.address = e.target.value;
                                                        setFormData({ ...formData });
                                                    }}
                                                    className="form-control"
                                                    id="address"
                                                    placeholder={t('Address')}
                                                    style={{ width: '100%' }}
                                                />
                                                {errors.address && <div style={{ color: "red" }}>{t(errors.address)}</div>}
                                            </div>

                                            {/* R2C3: Remarks */}
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{t('Remarks')}</label>
                                                <textarea
                                                    value={formData.remarks}
                                                    onChange={(e) => {
                                                        formData.remarks = e.target.value;
                                                        setFormData({ ...formData });
                                                    }}
                                                    className="form-control"
                                                    id="remarks"
                                                    placeholder={t('Remarks')}
                                                    style={{ width: '100%' }}
                                                />
                                                {errors.remarks && <div style={{ color: "red" }}>{t(errors.remarks)}</div>}
                                            </div>

                                        </div>
                                    </div>{/* end LEFT */}

                                    {/* RIGHT: always-reserved 350px column — content shown when customer selected */}
                                    <div style={{ alignSelf: 'stretch' }}>
                                    {selectedCustomers.length > 0 && formData.customer_id && (() => {
                                        const c = selectedCustomers[0];
                                        const storeId = localStorage.getItem("store_id");
                                        const cs = c?.stores?.[storeId];
                                        return (
                                            <div style={{ height: '100%' }}>
                                                <div style={{ padding: '10px 16px', background: 'rgba(0,74,198,0.04)', border: '1px solid #c7d7f5', borderRadius: '8px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                                                    {/* Row 1: code + name + arabic name */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        {c.code && <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>{c.code}</span>}
                                                        <span className="entity-detail-name" style={{ fontWeight: 700, fontSize: '15px', color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }} title={c.name}>{c.name}</span>
                                                        {c.name_in_arabic && <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>{c.name_in_arabic}</span>}
                                                    </div>
                                                    {/* Row 2: phone(s) + VAT */}
                                                    {(c.phone || c.phone2 || c.vat_no) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                            {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{c.phone}</span>}
                                                            {c.phone2 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}><i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: '12px' }} />{c.phone2}</span>}
                                                            {c.vat_no && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#374151' }}><i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: '12px' }} /><span style={{ color: '#6b7280' }}>VAT:</span><strong>{c.vat_no}</strong></span>}
                                                        </div>
                                                    )}
                                                    {/* Row 3: credit balance + limit */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '2px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }} onClick={() => openCustomerPending(selectedCustomers[0])} title={t("Click to view pendings")}>
                                                            <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: '13px' }} />
                                                            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{t("Cr.Balance")}:</span>
                                                            <strong style={{ fontSize: '17px', fontWeight: 700, color: (c.credit_balance ?? cs?.credit_balance ?? 0) > 0 ? '#dc2626' : '#16a34a', letterSpacing: '-0.5px' }}><Amount amount={trimTo2Decimals(c.credit_balance ?? cs?.credit_balance ?? 0)} /></strong>
                                                            <i className="bi bi-box-arrow-up-right" style={{ color: '#004ac6', fontSize: '10px' }} />
                                                        </span>
                                                        {(c.credit_limit > 0) && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                                <i className="bi bi-shield-check" style={{ color: '#6b7280', fontSize: '13px' }} />
                                                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{t("Limit")}:</span>
                                                                <strong style={{ fontSize: '15px', fontWeight: 700, color: '#374151' }}><Amount amount={trimTo2Decimals(c.credit_limit)} /></strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    </div>

                                </div>
                            </div>
                            <div className="col-12" >
                                <label className="form-label">{t('Product Search') + "*"}</label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: '0 0 calc(100% - 360px)', minWidth: 0 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                <Typeahead
                                    id="product_id"
                                    filterBy={() => true}
                                    size="lg"
                                    ref={productSearchRef}
                                    labelKey="search_label"
                                    inputProps={{ className: '' }}
                                    emptyLabel=""
                                    clearButton={false}
                                    open={openProductSearchResult}
                                    isLoading={false}
                                    disabled={isZatcaReported}
                                    isInvalid={!!errors.product_id}
                                    onChange={(selectedItems) => {
                                        if (onChangeTriggeredRef.current) return;
                                        onChangeTriggeredRef.current = true;

                                        // Reset after short delay
                                        setTimeout(() => {
                                            onChangeTriggeredRef.current = false;
                                        }, 300);


                                        if (selectedItems.length === 0) {
                                            errors["product_id"] = "Invalid Product selected";
                                            setErrors(errors);
                                            return;
                                        }
                                        delete errors["product_id"];
                                        setErrors({ ...errors });

                                        addProduct(selectedItems[0]);
                                        productSearchRef.current?.clear();
                                        setOpenProductSearchResult(false);

                                        timerRef.current = setTimeout(() => {
                                            inputRefs.current[(selectedProducts.length - 1)][`sales_product_quantity_${selectedProducts.length - 1}`]?.select();
                                        }, 100);
                                    }}
                                    options={productOptions}
                                    placeholder={t('Part No. | Name | Name in Arabic | Brand | Country')}
                                    highlightOnlyResult={true}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setProductOptions([]);
                                            setOpenProductSearchResult(false);
                                            productSearchRef.current?.clear();
                                        }

                                        timerRef.current = setTimeout(() => {
                                            productSearchRef.current?.focus();
                                        }, 100);
                                    }}
                                    onInputChange={(searchTerm, e) => {
                                        const requestId = Date.now();
                                        latestRequestRef.current = requestId;

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                            if (latestRequestRef.current !== requestId) return;

                                            suggestProducts(searchTerm);
                                        }, 350);
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                        const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                        return (
                                            <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
                                                {/* Header */}
                                                <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                    <div style={{
                                                        background: '#f8f9fa',
                                                        zIndex: 2,
                                                        display: 'flex',
                                                        fontWeight: 'bold',
                                                        padding: '4px 8px',
                                                        border: "solid 0px",
                                                        borderBottom: '1px solid #ddd',
                                                        pointerEvents: "auto" // <-- allow click here
                                                    }}>
                                                        {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                            const rh = <div onMouseDown={e => startPsColResize(e, col.key)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize', zIndex: 2 }} />;
                                                            return (<React.Fragment key={col.key}>
                                                                {col.key === "select" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{rh}</div>}
                                                                {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Part Number")}{rh}</div>}
                                                                {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Name")}{rh}</div>}
                                                                {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("S.Unit Price")}{rh}</div>}
                                                                {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Stock")}{rh}</div>}
                                                                {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Photos")}{rh}</div>}
                                                                {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Brand")}{rh}</div>}
                                                                {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("P.Unit Price")}{rh}</div>}
                                                                {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Country")}{rh}</div>}
                                                                {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{t("Rack")}{rh}</div>}
                                                            </React.Fragment>)
                                                        })}
                                                        {/* Settings icon on right */}
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                right: "8px",
                                                                top: "50%",
                                                                transform: "translateY(-50%)",
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowProductSearchSettings(true);
                                                            }}
                                                        >
                                                            <i className="bi bi-gear-fill" />
                                                        </div>
                                                    </div>
                                                </MenuItem>

                                                {/* Rows */}
                                                {results.map((option, index) => {

                                                    const onlyOneResult = results.length === 1;
                                                    const isActive = state.activeIndex === index || onlyOneResult;

                                                    let checked = isProductAdded(option.id);
                                                    return (
                                                        <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                                    return (<React.Fragment key={col.key}>
                                                                        {col.key === "select" &&
                                                                            <div
                                                                                className="form-check"
                                                                                style={{ ...columnStyle, width: getColumnWidth(col) }}
                                                                                onClick={e => {
                                                                                    e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                    checked = !checked;

                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        if (checked) {
                                                                                            addProduct(option);
                                                                                        } else {
                                                                                            removeProduct(option);
                                                                                        }
                                                                                    }, 100);

                                                                                }}
                                                                            >
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    value={checked}
                                                                                    checked={checked}
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                    }}
                                                                                    onChange={e => {
                                                                                        e.preventDefault();      // Prevent default selection behavior
                                                                                        e.stopPropagation();

                                                                                        checked = !checked;

                                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            if (checked) {
                                                                                                addProduct(option);
                                                                                            } else {
                                                                                                removeProduct(option);
                                                                                            }
                                                                                        }, 100);
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        }
                                                                        {col.key === "part_number" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(
                                                                                    option.prefix_part_number
                                                                                        ? `${option.prefix_part_number}-${option.part_number}`
                                                                                        : option.part_number,
                                                                                    searchWords,
                                                                                    isActive
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "name" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(
                                                                                    option.name_in_arabic
                                                                                        ? `${option.name} - ${option.name_in_arabic}`
                                                                                        : option.name,
                                                                                    searchWords,
                                                                                    isActive
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "unit_price" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (
                                                                                    <>
                                                                                        <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+
                                                                                    </>
                                                                                )}
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && (
                                                                                    <>
                                                                                        |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} />
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "stock" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {(() => {
                                                                                    const storeId = localStorage.getItem("store_id");
                                                                                    const productStore = option.product_stores?.[storeId];
                                                                                    const totalStock = productStore?.stock ?? 0;
                                                                                    const warehouseStocks = productStore?.warehouse_stocks ?? {};

                                                                                    // Build warehouse stock details string
                                                                                    const warehouseDetails = (() => {
                                                                                        // Always show MS first
                                                                                        let details = [];
                                                                                        if (warehouseStocks["main_store"] !== undefined) {
                                                                                            details.push(`MS: ${warehouseStocks["main_store"]}`);
                                                                                        }
                                                                                        Object.entries(warehouseStocks)
                                                                                            .filter(([key]) => key !== "main_store")
                                                                                            .forEach(([key, value]) => {
                                                                                                details.push(`${key.replace(/^w/, "WH").toUpperCase()}: ${value}`);
                                                                                            });
                                                                                        return details.join(", ");
                                                                                    })();

                                                                                    // Final display string
                                                                                    return (
                                                                                        <span>
                                                                                            {totalStock}
                                                                                            {warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ""}
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        }
                                                                        {col.key === "photos" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                <button
                                                                                    type="button"
                                                                                    className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openProductImages(option.id);
                                                                                    }}
                                                                                >
                                                                                    <i className="bi bi-images" aria-hidden="true" />
                                                                                </button>
                                                                            </div>
                                                                        }
                                                                        {col.key === "brand" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(option.brand_name, searchWords, isActive)}
                                                                            </div>
                                                                        }
                                                                        {col.key === "purchase_price" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && (
                                                                                    <>
                                                                                        <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+
                                                                                    </>
                                                                                )}
                                                                                {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && (
                                                                                    <>
                                                                                        |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} />
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        }
                                                                        {col.key === "country" &&
                                                                            <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                {highlightWords(option.country_name, searchWords, isActive)}
                                                                            </div>
                                                                        }
                                                                        {col.key === "rack" && (() => {
                                                                            if (store?.settings?.enable_warehouse_module) {
                                                                                const storeId = localStorage.getItem("store_id");
                                                                                const wRacks = option.product_stores?.[storeId]?.warehouse_racks;
                                                                                const parts = [];
                                                                                if (wRacks?.main_store) parts.push(`MS:${wRacks.main_store}`);
                                                                                if (wRacks) Object.entries(wRacks).filter(([k]) => k !== "main_store").forEach(([k, v]) => { if (v) parts.push(`${k}:${v}`); });
                                                                                const rackText = parts.join(" | ") || option.rack || "";
                                                                                return <div style={{ ...columnStyle, width: getColumnWidth(col), whiteSpace: 'normal', overflow: 'visible' }} title={rackText}>{rackText}</div>;
                                                                            }
                                                                            return <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.rack, searchWords, isActive)}</div>;
                                                                        })()}
                                                                    </React.Fragment>)
                                                                })}
                                                            </div>
                                                        </MenuItem>
                                                    );
                                                })}
                                            </Menu>
                                        );
                                    }}
                                />

                                </div>
                                {/* List first, then New */}
                                {store?.settings?.enable_services && store?.settings?.enable_products ? (
                                    <Dropdown>
                                        <Dropdown.Toggle bsPrefix="btn btn-primary btn-sm" type="button">
                                            <i className="bi bi-list"></i>
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={openProducts}>{t('Products')}</Dropdown.Item>
                                            <Dropdown.Item onClick={openServices}>{t('Services')}</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                ) : (
                                    <Button className="btn btn-primary btn-sm" onClick={openProducts}>
                                        <i className="bi bi-list"></i>
                                    </Button>
                                )}
                                {store?.settings?.enable_services && store?.settings?.enable_products ? (
                                    <Dropdown>
                                        <Dropdown.Toggle bsPrefix="btn btn-outline-secondary btn-primary btn-sm" type="button">
                                            <i className="bi bi-plus-lg"></i> {t('New')}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={openProductCreateForm}>{t('Product')}</Dropdown.Item>
                                            <Dropdown.Item onClick={openServiceCreateForm}>{t('Service')}</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                ) : (
                                    <Button hide={true.toString()} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button"><i className="bi bi-plus-lg"></i> {t('New')}</Button>
                                )}
                                </div>
                                <Dropdown>
                                    <Dropdown.Toggle variant="success" size="sm" id="dropdown-basic">
                                        <i className="bi bi-download"></i> {t('Import')}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Item onClick={() => { openQuotations(); }}>
                                            <i className="bi bi-file-earmark-text"></i>&nbsp;{t('From Quotations')}
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => { openDeliveryNotes(); }}>
                                            <i className="bi bi-file-earmark-text"></i>&nbsp;{t('From Delivery Notes')}
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                                </div>
                                {errors.product_id ? (
                                    <div style={{ color: "red" }}>
                                        {t(errors.product_id)}
                                    </div>
                                ) : ""}
                            </div>

                            <div style={{ position: "relative", marginTop: "32px" }}>
                                <span
                                    onClick={() => setShowSelectedProductsSettings(!showSelectedProductsSettings)}
                                    title={t("Table Settings")}
                                    style={{ position: "absolute", top: "-9px", right: "24px", zIndex: 10, cursor: "pointer", fontSize: "0.75rem", color: "#6b7280", userSelect: "none", background: "#fff", paddingLeft: "4px", paddingRight: "4px" }}
                                >
                                    <i className="bi bi-gear-fill" />
                                </span>
                            <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "520px", overflowY: "scroll" }}>


                                <table className="table table-striped table-sm table-bordered">
                                    <thead>
                                        <tr className="text-center">
                                            {selectedProductsColumns.filter(c => c.visible).map(col => {
                                                if (col.key === 'delete') return <th key={col.key}></th>;
                                                if (col.key === 'si_no') return <th key={col.key}>{t('SI No.')}</th>;
                                                if (col.key === 'part_number') return <th key={col.key}>{t('Part No.')}</th>;
                                                if (col.key === 'name') return <th key={col.key} style={{ minWidth: window.innerWidth > 1920 ? "375px" : "250px" }}>{t('Name')}</th>;
                                                if (col.key === 'info') return <th key={col.key}>{t('Info')}</th>;
                                                if (col.key === 'purchase_unit_price') return <th key={col.key}>{t('Purchase Unit Price(without VAT)')}</th>;
                                                if (col.key === 'stock') return <th key={col.key}>{t('Stock')}</th>;
                                                if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? <th key={col.key}>{t('Remove Stock From')}</th> : null;
                                                if (col.key === 'qty') return <th key={col.key} style={{ minWidth: "80px", maxWidth: "80px" }}>{t('Qty')}</th>;
                                                if (col.key === 'unit_price') return <th key={col.key}>{t('Unit Price(without VAT)')}</th>;
                                                if (col.key === 'unit_price_with_vat') return <th key={col.key}>{t('Unit Price(with VAT)')}</th>;
                                                if (col.key === 'unit_discount') return <th key={col.key}>{t('Unit Disc.(without VAT)')}</th>;
                                                if (col.key === 'unit_discount_with_vat') return <th key={col.key}>{t('Unit Disc.(with VAT)')}</th>;
                                                if (col.key === 'unit_discount_percent') return <th key={col.key}>{t('Unit Disc. %(with VAT)')}</th>;
                                                if (col.key === 'price') return <th key={col.key}>{t('Price(without VAT)')}</th>;
                                                if (col.key === 'price_with_vat') return <th key={col.key}>{t('Price(with VAT)')}</th>;
                                                return null;
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedProducts.map((product, index) => {
                                            // Find all indexes with the same product_id
                                            const duplicateIndexes = selectedProducts
                                                .map((p, i) => p.product_id === product.product_id ? i : -1)
                                                .filter(i => i !== -1);
                                            const duplicateCount = duplicateIndexes.length;
                                            return (
                                                <tr
                                                    className="text-center fixed-row "
                                                    key={index}>
                                                    {selectedProductsColumns.filter(c => c.visible).map(col => {
                                                        if (col.key === 'delete') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                                                            <div
                                                                style={{ color: "red", cursor: isZatcaReported ? "not-allowed" : "pointer", opacity: isZatcaReported ? 0.4 : 1, pointerEvents: isZatcaReported ? "none" : undefined }}
                                                                onClick={() => {
                                                                    if (!isZatcaReported) removeProduct(product);
                                                                }}
                                                            >
                                                                <i className="bi bi-trash"> </i>
                                                            </div>
                                                        </td>);
                                                        if (col.key === 'si_no') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            {index + 1}

                                                        </td>);
                                                        if (col.key === 'part_number') return (<ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <input type="text" id={`sales_product_part_number${index}`}
                                                                    name={`sales_product_part_number${index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={selectedProducts[index].part_number}
                                                                    className={`form-control text-start ${errors["part_number_" + index] ? 'is-invalid' : ''} ${warnings["part_number_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);
                                                                    }}
                                                                    placeholder={t("Part No.")} onChange={(e) => {
                                                                        delete errors["part_number_" + index];
                                                                        setErrors({ ...errors });
                                                                        if (!e.target.value) {
                                                                            selectedProducts[index].part_number = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            return;
                                                                        }
                                                                        selectedProducts[index].part_number = e.target.value;
                                                                        setSelectedProducts([...selectedProducts]);
                                                                    }} />
                                                                {(errors[`part_number_${index}`] || warnings[`part_number_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`part_number_${index}`] || warnings[`part_number_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </ResizableTableCell>);
                                                        if (col.key === 'name') return (<ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                                                        >
                                                            <div className="input-group" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                <input type="text" id={`${"sales_product_name" + index}`}
                                                                    name={`${"sales_product_name" + index}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={product.name}
                                                                    className={`form-control text-start ${errors["name_" + index] ? 'is-invalid' : ''} ${warnings["name_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);
                                                                    }}
                                                                    placeholder="Name" onChange={(e) => {
                                                                        delete errors["name_" + index];
                                                                        setErrors({ ...errors });

                                                                        if (!e.target.value) {
                                                                            selectedProducts[index].name = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            console.log("errors:", errors);
                                                                            return;
                                                                        }

                                                                        selectedProducts[index].name = e.target.value;
                                                                        setSelectedProducts([...selectedProducts]);
                                                                    }} />

                                                                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', position: 'relative' }}>
                                                                    <div
                                                                        style={{ color: "blue", cursor: "pointer", marginLeft: "2px" }}
                                                                        onClick={() => {
                                                                            openUpdateProductForm(product.product_id, product.is_service);
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-pencil"> </i>
                                                                    </div>

                                                                    <div
                                                                        style={{ color: "blue", cursor: "pointer", marginLeft: "8px" }}
                                                                        onClick={() => {
                                                                            openProductDetails(product.product_id, product.is_service);
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-eye"> </i>
                                                                    </div>

                                                                    {duplicateCount > 1 && (
                                                                        <OverlayTrigger
                                                                            placement="top"
                                                                            overlay={
                                                                                <Tooltip id={`duplicate-tooltip-input-${index}`}>
                                                                                    {`${duplicateCount - 1} Duplicate${(duplicateCount - 1) > 1 ? 's' : ''}`}
                                                                                </Tooltip>
                                                                            }
                                                                        >
                                                                            <span style={{
                                                                                position: 'absolute',
                                                                                top: '50%',
                                                                                right: '48px',
                                                                                transform: 'translateY(-50%)',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                width: '22px',
                                                                                height: '22px',
                                                                                borderRadius: '50%',
                                                                                background: '#ffc107',
                                                                                color: '#212529',
                                                                                fontWeight: 'bold',
                                                                                fontSize: '0.7rem',
                                                                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                                                                cursor: 'pointer',
                                                                                border: '2px solid #fff',
                                                                                zIndex: 2
                                                                            }}>
                                                                                {duplicateCount - 1}
                                                                            </span>
                                                                        </OverlayTrigger>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {(errors[`name_${index}`] || warnings[`name_${index}`]) && (
                                                                <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`name_${index}`] || warnings[`name_${index}`] || ''}</Tooltip>}>
                                                                    <i
                                                                        className={`bi bi-exclamation-circle-fill ${errors[`name_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                        style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                    ></i>
                                                                </OverlayTrigger>
                                                            )}
                                                        </ResizableTableCell>);
                                                        if (col.key === 'info') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div style={{ zIndex: "9999 !important", position: "absolute !important" }}>
                                                            <Dropdown drop="top">
                                                                <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                                                                    <i className="bi bi-info"></i>
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                                                    <Dropdown.Item onClick={() => openLinkedProducts(product)}>
                                                                        <i className="bi bi-link"></i>&nbsp;
                                                                        {t("Linked Products")} ({getShortcut('linkedProducts')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openProductHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("History")} ({getShortcut('productHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openSalesHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Sales History")} ({getShortcut('salesHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openSalesReturnHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Sales Return History")} ({getShortcut('salesReturnHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openPurchaseHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Purchase History")} ({getShortcut('purchaseHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Purchase Return History")} ({getShortcut('purchaseReturnHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Delivery Note History")} ({getShortcut('deliveryNoteHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openQuotationHistory(product, "quotation")}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Quotation History")} ({getShortcut('quotationHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Qtn. Sales History")} ({getShortcut('quotationSalesHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Qtn. Sales Return History")} ({getShortcut('quotationSalesReturnHistory')})
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item onClick={() => openProductImages(product.product_id)}>
                                                                        <i className="bi bi-clock-history"></i>&nbsp;
                                                                        {t("Images")} ({getShortcut('images')})
                                                                    </Dropdown.Item>
                                                                </Dropdown.Menu>

                                                            </Dropdown>
                                                            </div>

                                                        </td>);

                                                        if (col.key === 'purchase_unit_price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="input-group">
                                                                <input
                                                                    type="number"
                                                                    id={`sales_product_purchase_unit_price_${index}`}
                                                                    name={`sales_product_purchase_unit_price_${index}`}
                                                                    className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={product.purchase_unit_price}
                                                                    placeholder={t("Purchase Unit Price")}
                                                                    ref={(el) => {
                                                                        if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                        inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`] = el;
                                                                    }}
                                                                    onFocus={() => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`]?.select();
                                                                        }, 20);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        RunKeyActions(e, product);
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (e.key === "Backspace") {
                                                                            selectedProducts[index].purchase_unit_price = "";
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        } else if (e.key === "ArrowLeft") {
                                                                            if ((index + 1) === selectedProducts.length) {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    productSearchRef.current?.focus();
                                                                                }, 100);
                                                                            } else {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[(index + 1)][`${"sales_unit_discount_with_vat_" + (index + 1)}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);

                                                                        if (parseFloat(e.target.value) === 0) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkErrors(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (!e.target.value) {
                                                                            selectedProducts[index].purchase_unit_price = e.target.value;
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            timerRef.current = setTimeout(() => {
                                                                                checkWarnings(index);
                                                                                checkErrors(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                            return;
                                                                        }

                                                                        if (e.target.value) {
                                                                            selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                                            setSelectedProducts([...selectedProducts]);
                                                                        }

                                                                        checkErrors(index);
                                                                    }}
                                                                />

                                                                {(errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`purchase_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);

                                                        if (col.key === 'stock') return (<td
                                                            style={{
                                                                verticalAlign: 'middle',
                                                                padding: '0.25rem',
                                                                whiteSpace: 'nowrap',
                                                                width: 'auto',
                                                                position: 'relative',
                                                            }}
                                                        >
                                                            <OverlayTrigger
                                                                placement="top"
                                                                overlay={
                                                                    <Tooltip id={`stock-tooltip-${index}`}>
                                                                        {(() => {
                                                                            const warehouseStocks = selectedProducts[index].warehouse_stocks || {};
                                                                            const orderedEntries = [];
                                                                            if (warehouseStocks.hasOwnProperty("main_store")) {
                                                                                orderedEntries.push(["main_store", warehouseStocks["main_store"]]);
                                                                            }
                                                                            Object.entries(warehouseStocks).forEach(([key, value]) => {
                                                                                if (key !== "main_store") {
                                                                                    orderedEntries.push([key, value]);
                                                                                }
                                                                            });
                                                                            const details = orderedEntries
                                                                                .map(([key, value]) => {
                                                                                    let name = key === "main_store" ? t("Main Store") : key.replace(/^wh/, "WH").toUpperCase();
                                                                                    return `${name}: ${value}`;
                                                                                })
                                                                                .join(", ");
                                                                            return details ? `(${details})` : "(" + t("Main Store") + ": " + selectedProducts[index].stock + ")";
                                                                        })()}
                                                                    </Tooltip>
                                                                }
                                                            >
                                                                <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                                                                    {selectedProducts[index].stock}
                                                                </span>
                                                            </OverlayTrigger>
                                                        </td>);
                                                        if (col.key === 'warehouse') return store.settings?.enable_warehouse_module ? (<td style={{
                                                            verticalAlign: 'middle',
                                                            padding: '0.25rem',
                                                            whiteSpace: 'nowrap',
                                                            width: 'auto',
                                                            position: 'relative',
                                                        }} >
                                                            <select
                                                                id={`sales_product_warehouse_${index}`}
                                                                name={`sales_product_warehouse_${index}`}
                                                                className="form-control"
                                                                value={selectedProducts[index].warehouse_id || "main_store"}
                                                                onChange={(e) => {
                                                                    const selectedValue = e.target.value;

                                                                    if (selectedValue === "main_store") {
                                                                        selectedProducts[index].warehouse_id = null;
                                                                        selectedProducts[index].warehouse_code = "";
                                                                    } else {
                                                                        const selectedWarehouse = warehouseList.find(w => w.id === selectedValue);
                                                                        if (selectedWarehouse) {
                                                                            selectedProducts[index].warehouse_id = selectedWarehouse.id;
                                                                            selectedProducts[index].warehouse_code = selectedWarehouse.code;
                                                                        }
                                                                    }



                                                                    setSelectedProducts([...selectedProducts]);
                                                                    checkWarning(index, selectedProducts[index]);
                                                                }}
                                                            >
                                                                <option value="main_store">{t("Main Store")}</option>
                                                                {warehouseList.map((warehouse) => (
                                                                    <option key={warehouse.id} value={warehouse.id}>
                                                                        {warehouse.name} ({warehouse.code})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {errors[`warehouse_${index}`] && (
                                                                <div style={{ color: "red" }}>
                                                                    {t(errors[`warehouse_${index}`])}
                                                                </div>
                                                            )}
                                                        </td>) : null;
                                                        if (col.key === 'qty') return (<td style={{
                                                            verticalAlign: 'middle',
                                                            padding: '0.25rem',
                                                            whiteSpace: 'nowrap',
                                                            width: 'auto',
                                                            position: 'relative',
                                                        }} >
                                                            <div className="d-flex align-items-center" style={{}}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto' }}>
                                                                    <input type="number"
                                                                        style={{ minWidth: "70px", maxWidth: "100px" }}
                                                                        id={`${"sales_product_quantity_" + index}`}
                                                                        name={`${"sales_product_quantity" + index}`}
                                                                        className={`form-control text-end ${errors["quantity_" + index] ? 'is-invalid' : warnings["quantity_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        value={product.quantity}
                                                                        placeholder="Quantity"
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_quantity_" + index}`] = el;
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_quantity_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);
                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (e.key === "Backspace") {
                                                                                selectedProducts[index].quantity = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkWarning(index, selectedProducts[index]);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_purchase_unit_price_" + index}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].quantity = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkWarning(index, selectedProducts[index]);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].quantity = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
                                                                                    checkWarning(index, selectedProducts[index]);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            product.quantity = parseFloat(e.target.value);
                                                                            selectedProducts[index].quantity = parseFloat(e.target.value);
                                                                            timerRef.current = setTimeout(() => {
                                                                                CalCulateLineTotals(index);
                                                                                checkErrors(index);
                                                                                checkWarning(index, selectedProducts[index]);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        }} />
                                                                    <span className="input-group-text text-nowrap">
                                                                        {selectedProducts[index].unit ? selectedProducts[index].unit[0]?.toUpperCase() : 'P'}
                                                                    </span>
                                                                </div>
                                                                <div style={{ width: '20px', flexShrink: 0 }}>
                                                                    {(errors[`quantity_${index}`] || warnings[`quantity_${index}`]) && (
                                                                        <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`quantity_${index}`] || warnings[`quantity_${index}`] || ''}</Tooltip>}>
                                                                            <i
                                                                                className={`bi bi-exclamation-circle-fill ${errors[`quantity_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                                style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                            ></i>
                                                                        </OverlayTrigger>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>);

                                                        if (col.key === 'unit_price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_product_unit_price_" + index}`}
                                                                        name={`${"sales_product_unit_price_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        value={selectedProducts[index].unit_price}
                                                                        className={`form-control text-end ${errors["unit_price_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        placeholder="Unit Price(without VAT)"
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_unit_price_" + index}`] = el;
                                                                        }}

                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_unit_price_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}

                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (e.key === "Backspace") {
                                                                                selectedProducts[index].unit_price_with_vat = "";
                                                                                selectedProducts[index].unit_price = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_quantity_" + index}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }}

                                                                        onChange={(e) => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].unit_price = e.target.value;
                                                                                selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    //  checkWarnings(index);
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].unit_price = e.target.value;
                                                                                selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    //checkWarnings(index);
                                                                                    CalCulateLineTotals(index);
                                                                                    checkErrors(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                                errors["unit_price_" + index] = t("Max decimal points allowed is 8");
                                                                                setErrors({ ...errors });
                                                                            }

                                                                            selectedProducts[index].unit_price = parseFloat(e.target.value);
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            timerRef.current = setTimeout(() => {
                                                                                selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                                checkErrors(index);
                                                                            }, 100);
                                                                        }} />

                                                                </div>
                                                                {(errors[`unit_price_${index}`] || warnings[`unit_price_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_price_${index}`] || warnings[`unit_price_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        if (col.key === 'unit_price_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_product_unit_price_with_vat_" + index}`}
                                                                        name={`${"sales_product_unit_price_with_vat_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        value={selectedProducts[index].unit_price_with_vat}
                                                                        className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`] = el;
                                                                        }}
                                                                        placeholder={t("Unit Price(with VAT)")}

                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}

                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (e.key === "Backspace") {
                                                                                selectedProducts[index].unit_price_with_vat = "";
                                                                                selectedProducts[index].unit_price = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                    checkErrors(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_unit_price_" + index}`]?.select();
                                                                                }, 50);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            delete errors["unit_price_with_vat_" + index];

                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            setErrors({ ...errors });
                                                                            if (!e.target.value) {
                                                                                // errors["unit_price_with_vat_" + index] = "";
                                                                                selectedProducts[index].unit_price_with_vat = "";
                                                                                selectedProducts[index].unit_price = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                setErrors({ ...errors });
                                                                                console.log("errors:", errors);
                                                                                // Set new debounce timer
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                    checkErrors(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (e.target.value === 0) {
                                                                                errors["unit_price_with_vat_" + index] = t("Unit Price should be > 0");
                                                                                selectedProducts[index].unit_price_with_vat = 0;
                                                                                selectedProducts[index].unit_price = 0;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                setErrors({ ...errors });
                                                                                console.log("errors:", errors);
                                                                                // Set new debounce timer
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                    checkErrors(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                                errors["unit_price_with_vat_" + index] = t("Max decimal points allowed is 8");
                                                                                setErrors({ ...errors });
                                                                            }


                                                                            selectedProducts[index].unit_price_with_vat = parseFloat(e.target.value);


                                                                            setSelectedProducts([...selectedProducts]);
                                                                            // Set new debounce timer
                                                                            timerRef.current = setTimeout(() => {
                                                                                selectedProducts[index].unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat / (1 + (formData.vat_percent / 100))))
                                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                                checkErrors(index);
                                                                            }, 100);
                                                                        }} />
                                                                </div>
                                                                {(errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        if (col.key === 'unit_discount') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_unit_discount_" + index}`}
                                                                        name={`${"sales_unit_discount_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        className={`form-control text-end ${errors["unit_discount_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        value={selectedProducts[index].unit_discount}
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_unit_discount_" + index}`] = el;
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_unit_discount_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            delete errors["unit_discount_" + index];
                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                                                                setFormData({ ...formData });

                                                                                setErrors({ ...errors });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (parseFloat(e.target.value) < 0) {
                                                                                selectedProducts[index].unit_discount = 0.00;
                                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                setFormData({ ...formData });
                                                                                errors["unit_discount_" + index] = t("Unit discount should be greater than or equal 0");
                                                                                setErrors({ ...errors });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].unit_discount = "";
                                                                                selectedProducts[index].unit_discount_with_vat = "";
                                                                                selectedProducts[index].unit_discount_percent = "";
                                                                                selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                                // errors["discount_" + index] = "Invalid Discount";
                                                                                setFormData({ ...formData });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                //setErrors({...errors});
                                                                                return;
                                                                            }

                                                                            delete errors["unit_discount_" + index];
                                                                            delete errors["unit_discount_percent_" + index];
                                                                            setErrors({ ...errors });

                                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                                errors["unit_discount_" + index] = t("Max decimal points allowed is 8");
                                                                                setErrors({ ...errors });
                                                                            }

                                                                            selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => {
                                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        }} />
                                                                </div>
                                                                {(errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        /*} ref={(el) => inputRefs.current[index] = el}
                                                            onFocus={() => inputRefs.current[index]?.select()}*/
                                                        if (col.key === 'unit_discount_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_unit_discount_with_vat_" + index}`}
                                                                        name={`${"sales_unit_discount_with_vat_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        className={`form-control text-end ${errors["unit_discount_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        value={selectedProducts[index].unit_discount_with_vat}
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_unit_discount_with_vat_" + index}`] = el;
                                                                        }}
                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_unit_discount_with_vat_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (e.key === "Enter") {
                                                                                if ((index + 1) === selectedProducts.length) {
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        productSearchRef.current?.focus();
                                                                                    }, 100);
                                                                                } else {
                                                                                    if (index === 0) {
                                                                                        console.log("moviing to discount")
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            // discountRef.current?.focus();
                                                                                            productSearchRef.current?.focus();
                                                                                        }, 100);
                                                                                    } else {
                                                                                        console.log("moviing to next line")
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            inputRefs.current[index - 1][`${"sales_product_quantity_" + (index - 1)}`]?.select();
                                                                                        }, 100);
                                                                                    }

                                                                                }
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                e.preventDefault();
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_unit_discount_" + index}`]?.focus();
                                                                                }, 100);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount = 0.00;
                                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                setFormData({ ...formData });
                                                                                delete errors["unit_discount_with_vat" + index];
                                                                                setErrors({ ...errors });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (parseFloat(e.target.value) < 0) {
                                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                                selectedProducts[index].unit_discount = 0.00;
                                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                setFormData({ ...formData });
                                                                                errors["unit_discount_" + index] = t("Unit discount should be greater than or equal to zero");
                                                                                setErrors({ ...errors });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].unit_discount_with_vat = "";
                                                                                selectedProducts[index].unit_discount = "";
                                                                                selectedProducts[index].unit_discount_percent = "";
                                                                                selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                                // errors["discount_" + index] = "Invalid Discount";
                                                                                setFormData({ ...formData });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                //setErrors({ ...errors });
                                                                                return;
                                                                            }

                                                                            delete errors["unit_discount_with_vat_" + index];
                                                                            delete errors["unit_discount_percent_" + index];
                                                                            setErrors({ ...errors });

                                                                            if (/^\d*\.?\d{0,8}$/.test(parseFloat(e.target.value)) === false) {
                                                                                errors["unit_discount_with_vat_" + index] = t("Max decimal points allowed is 8");
                                                                                setErrors({ ...errors });
                                                                            }

                                                                            selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input


                                                                            setFormData({ ...formData });
                                                                            timerRef.current = setTimeout(() => {

                                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        }} />
                                                                </div>
                                                                {(errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        /*<td>
                                                    <div className="input-group mb-3">
                                                        <input type="number" 
                                                        id={`${"sales_unit_discount_percent" + index}`}
                                                         disabled={false} name={`${"sales_unit_discount_percent" + index}`} 
                                                         onWheel={(e) => e.target.blur()} className="form-control text-end" 
                                                         value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
    
                                                            if (parseFloat(e.target.value) === 0) {
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount = 0.00;
                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_percent_" + index] = "";
                                                                setErrors({ ...errors });
                                                                timerRef.current = setTimeout(() => {
                                                                    reCalculate(index);
                                                                }, 300);
                                                                return;
                                                            }
    
                                                            if (parseFloat(e.target.value) < 0) {
                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                selectedProducts[index].unit_discount = 0.00;
                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                setFormData({ ...formData });
                                                                errors["unit_discount_percent_" + index] = "Unit discount % should be >= 0";
                                                                setErrors({ ...errors });
                                                                timerRef.current = setTimeout(() => {
                                                                    reCalculate(index);
                                                                }, 300);
                                                                return;
                                                            }
    
                                                            if (!e.target.value) {
                                                                selectedProducts[index].unit_discount_percent = "";
                                                                selectedProducts[index].unit_discount_with_vat = "";
                                                                selectedProducts[index].unit_discount = "";
                                                                selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                                                setFormData({ ...formData });
                                                                timerRef.current = setTimeout(() => {
                                                                    reCalculate(index);
                                                                }, 300);
                                                                //setErrors({ ...errors });
                                                                return;
                                                            }
    
                                                            errors["unit_discount_percent_" + index] = "";
                                                            errors["unit_discount_" + index] = "";
                                                            setErrors({ ...errors });
    
                                                            selectedProducts[index].unit_discount_percent = parseFloat(e.target.value); //input
    
    
                                                            setFormData({ ...formData });
    
                                                            timerRef.current = setTimeout(() => {
                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                                                selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
    
                                                                reCalculate(index);
                                                            }, 300);
                                                        }} />
                                                    </div>
                                                    {errors["unit_discount_percent_" + index] && (
                                                        <div style={{ color: "red" }}>
                                                            {errors["unit_discount_percent_" + index]}
                                                        </div>
                                                    )}
                                                </td>*/
                                                        if (col.key === 'unit_discount_percent') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_unit_discount_percent_with_vat_" + index}`}
                                                                        disabled={true}
                                                                        name={`${"sales_unit_discount_percent_with_vat_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        className={`form-control text-end ${errors["unit_discount_percent_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_percent_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        value={selectedProducts[index].unit_discount_percent_with_vat}
                                                                        onChange={(e) => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);

                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount = 0.00;
                                                                                setFormData({ ...formData });
                                                                                delete errors["unit_discount_percent_" + index];
                                                                                setErrors({ ...errors });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index)
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (parseFloat(e.target.value) < 0) {
                                                                                selectedProducts[index].unit_discount_percent = 0.00;
                                                                                selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount_with_vat = 0.00;
                                                                                selectedProducts[index].unit_discount = 0.00;
                                                                                setFormData({ ...formData });
                                                                                errors["unit_discount_percent_" + index] = t("Unit discount % should be greater than or equal to zero");
                                                                                setErrors({ ...errors });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].unit_discount_percent = "";
                                                                                selectedProducts[index].unit_discount_percent_with_vat = "";
                                                                                selectedProducts[index].unit_discount_with_vat = "";
                                                                                selectedProducts[index].unit_discount = "";
                                                                                //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                                                                setFormData({ ...formData });
                                                                                timerRef.current = setTimeout(() => {
                                                                                    CalCulateLineTotals(index);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                //setErrors({ ...errors });
                                                                                return;
                                                                            }

                                                                            delete errors["unit_discount_percent_" + index];
                                                                            delete errors["unit_discount_" + index];
                                                                            setErrors({ ...errors });

                                                                            /*
                                                                            if (/^\d*\.?\d{0, 2}$/.test(parseFloat(e.target.value)) === false) {
                                                                        errors["unit_discount_percent_" + index] = "Max. decimal points allowed is 2";
                                                                    setErrors({...errors});
                                                                            }*/

                                                                            selectedProducts[index].unit_discount_percent_with_vat = parseFloat(e.target.value); //input


                                                                            //selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                                                            setFormData({ ...formData });

                                                                            timerRef.current = setTimeout(() => {
                                                                                selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat * (selectedProducts[index].unit_discount_percent_with_vat / 100)))
                                                                                selectedProducts[index].unit_discount = parseFloat(trimTo8Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                                                                selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                CalCulateLineTotals(index);
                                                                                reCalculate(index);
                                                                            }, 100);
                                                                        }} />{""}
                                                                </div>
                                                                {(errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        if (col.key === 'price') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_product_line_total_" + index}`}
                                                                        name={`${"sales_product_line_total_" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        value={parseFloat(trimTo2Decimals(((selectedProducts[index].unit_price || 0) - (selectedProducts[index].unit_discount || 0)) * (selectedProducts[index].quantity || 0))) || ""}
                                                                        className={`form-control text-end ${errors["line_total_" + index] ? 'is-invalid' : ''} ${warnings["line_total_" + index] ? 'border-warning text-warning' : ''}`}
                                                                        placeholder="Line total"
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_line_total_" + index}`] = el;
                                                                        }}

                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_line_total_" + index}`]?.select();
                                                                            }, 20);
                                                                        }}

                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (e.key === "Backspace") {
                                                                                delete errors["line_total_" + index];
                                                                                selectedProducts[index].unit_price_with_vat = "";
                                                                                selectedProducts[index].unit_price = "";
                                                                                selectedProducts[index].line_total = "";
                                                                                selectedProducts[index].line_total_with_vat = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    checkErrors(index);
                                                                                    CalCulateLineTotals(index, true);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_unit_discount_with_vat_" + index}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }}

                                                                        onChange={(e) => {
                                                                            delete errors["line_total_" + index];
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].unit_price = e.target.value;
                                                                                selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                                selectedProducts[index].line_total = e.target.value;
                                                                                selectedProducts[index].line_total_with_vat = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    //  checkWarnings(index);
                                                                                    checkErrors(index);
                                                                                    CalCulateLineTotals(index, true);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].unit_price = e.target.value;
                                                                                selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                                selectedProducts[index].line_total = e.target.value;
                                                                                selectedProducts[index].line_total_with_vat = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    //checkWarnings(index);
                                                                                    checkErrors(index);
                                                                                    CalCulateLineTotals(index, true);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                                errors["line_total_" + index] = t("Max decimal points allowed is 2");
                                                                                setErrors({ ...errors });
                                                                            }

                                                                            selectedProducts[index].line_total = parseFloat(e.target.value);
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            timerRef.current = setTimeout(() => {
                                                                                if (selectedProducts[index].quantity > 0) {
                                                                                    selectedProducts[index].unit_price = parseFloat(trimTo8Decimals((selectedProducts[index].line_total / selectedProducts[index].quantity) + selectedProducts[index].unit_discount));

                                                                                    selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                }
                                                                                CalCulateLineTotals(index, true);
                                                                                reCalculate(index);
                                                                                checkErrors(index);
                                                                            }, 100);
                                                                        }} />

                                                                </div>
                                                                {(errors[`line_total_${index}`] || warnings[`line_total_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`line_total_${index}`] || warnings[`line_total_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`line_total_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        if (col.key === 'price_with_vat') return (<td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                                <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                                    <input type="number"
                                                                        id={`${"sales_product_line_total_with_vat" + index}`}
                                                                        name={`${"sales_product_line_total_with_vat" + index}`}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={isZatcaReported}
                                                                        value={parseFloat(trimTo2Decimals(((selectedProducts[index].unit_price_with_vat || 0) - (selectedProducts[index].unit_discount_with_vat || 0)) * (selectedProducts[index].quantity || 0))) || ""}
                                                                        className={`form-control text-end ${errors["line_total_with_vat" + index] ? 'is-invalid' : ''} ${warnings["line_total_with_vat" + index] ? 'border-warning text-warning' : ''}`}
                                                                        placeholder="Line total with VAT"
                                                                        ref={(el) => {
                                                                            if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                                            inputRefs.current[index][`${"sales_product_line_total_with_vat" + index}`] = el;
                                                                        }}

                                                                        onFocus={() => {
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            timerRef.current = setTimeout(() => {
                                                                                inputRefs.current[index][`${"sales_product_line_total_with_vat" + index}`]?.select();
                                                                            }, 20);
                                                                        }}

                                                                        onKeyDown={(e) => {
                                                                            RunKeyActions(e, product);

                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (e.key === "Backspace") {
                                                                                delete errors["line_total_with_vat_" + index];
                                                                                selectedProducts[index].unit_price_with_vat = "";
                                                                                selectedProducts[index].unit_price = "";
                                                                                selectedProducts[index].line_total = "";
                                                                                selectedProducts[index].line_total_with_vat = "";
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    checkErrors(index);
                                                                                    CalCulateLineTotals(index, false, true);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                            } else if (e.key === "ArrowLeft") {
                                                                                timerRef.current = setTimeout(() => {
                                                                                    inputRefs.current[index][`${"sales_product_line_total_" + index}`]?.select();
                                                                                }, 100);
                                                                            }
                                                                        }}

                                                                        onChange={(e) => {
                                                                            delete errors["line_total_with_vat_" + index];
                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                            if (parseFloat(e.target.value) === 0) {
                                                                                selectedProducts[index].unit_price = e.target.value;
                                                                                selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                                selectedProducts[index].line_total = e.target.value;
                                                                                selectedProducts[index].line_total_with_vat = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    //  checkWarnings(index);
                                                                                    checkErrors(index);
                                                                                    CalCulateLineTotals(index, false, true);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }

                                                                            if (!e.target.value) {
                                                                                selectedProducts[index].unit_price = e.target.value;
                                                                                selectedProducts[index].unit_price_with_vat = e.target.value;
                                                                                selectedProducts[index].line_total = e.target.value;
                                                                                selectedProducts[index].line_total_with_vat = e.target.value;
                                                                                setSelectedProducts([...selectedProducts]);
                                                                                timerRef.current = setTimeout(() => {
                                                                                    //checkWarnings(index);
                                                                                    checkErrors(index);
                                                                                    CalCulateLineTotals(index, false, true);
                                                                                    reCalculate(index);
                                                                                }, 100);
                                                                                return;
                                                                            }


                                                                            if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                                errors["line_total_with_vat_" + index] = t("Max decimal points allowed is 2");
                                                                                setErrors({ ...errors });
                                                                            }

                                                                            selectedProducts[index].line_total_with_vat = parseFloat(e.target.value);
                                                                            setSelectedProducts([...selectedProducts]);

                                                                            timerRef.current = setTimeout(() => {
                                                                                if (selectedProducts[index].quantity > 0) {
                                                                                    selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals((selectedProducts[index].line_total_with_vat / selectedProducts[index].quantity) + selectedProducts[index].unit_discount_with_vat));
                                                                                    selectedProducts[index].unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat / (1 + (formData.vat_percent / 100))))

                                                                                    // selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                                                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                                                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo8Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                                                                }
                                                                                reCalculate(index);
                                                                                CalCulateLineTotals(index, false, true);
                                                                                checkErrors(index);
                                                                            }, 100);
                                                                        }} />

                                                                </div>
                                                                {(errors[`line_total_with_vat_${index}`] || warnings[`line_total_with_vat_${index}`]) && (
                                                                    <OverlayTrigger placement="top" overlay={<Tooltip>{errors[`line_total_with_vat_${index}`] || warnings[`line_total_with_vat_${index}`] || ''}</Tooltip>}>
                                                                        <i
                                                                            className={`bi bi-exclamation-circle-fill ${errors[`line_total_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                                                            style={{ fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                        ></i>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </div>
                                                        </td>);
                                                        return null;
                                                    })}
                                                </tr>);
                                        }).reverse()}
                                    </tbody>
                                </table>
                            </div>
                            </div>
                            <div style={{ position: "relative", marginTop: "8px" }}>
                                <span
                                    onClick={() => setShowBillSummarySettings(v => !v)}
                                    title={t("Customize Bill Summary")}
                                    style={{ position: "absolute", top: "-9px", right: "24px", zIndex: 10, cursor: "pointer", fontSize: "0.75rem", color: "#6b7280", userSelect: "none", background: "#fff", paddingLeft: "4px", paddingRight: "4px" }}
                                >
                                    <i className="bi bi-gear-fill" />
                                </span>
                                {/* Settings centered overlay panel */}
                                {showBillSummarySettings && (
                                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1060, background: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", padding: "16px", width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong style={{ fontSize: "13px" }}>{t("Customize Bill Summary")}</strong>
                                            <button type="button" className="btn-close" style={{ fontSize: "10px" }} onClick={() => setShowBillSummarySettings(false)}></button>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>{t("Toggle visibility or reorder fields")}</div>
                                        {billSummaryOrder.map((key, idx) => (
                                            <div
                                                key={key}
                                                className="d-flex align-items-center gap-2 mb-1"
                                                style={{ padding: "3px 0", borderBottom: "1px solid #f5f5f5", cursor: "grab" }}
                                                draggable
                                                onDragStart={() => { billSummaryDragRef.current = idx; }}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={() => { reorderBillSummaryT1(billSummaryDragRef.current, idx); billSummaryDragRef.current = null; }}
                                            >
                                                <span style={{ color: "#bbb", fontSize: "15px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input m-0"
                                                    checked={!!billSummaryVisible[key]}
                                                    onChange={e => updateBillSummaryVisible(key, e.target.checked)}
                                                    style={{ width: "14px", height: "14px", flexShrink: 0 }}
                                                />
                                                <span style={{ flex: 1, fontSize: "12px" }}>{t(_billSummaryFieldLabels[key])}</span>
                                            </div>
                                        ))}
                                        <button type="button" className="btn btn-sm btn-outline-secondary mt-2 w-100" style={{ fontSize: "11px" }} onClick={() => {
                                            setBillSummaryOrder(_defaultBillSummaryOrder);
                                            setBillSummaryVisible(Object.fromEntries(_defaultBillSummaryOrder.map(k => [k, true])));
                                            localStorage.removeItem('bill_summary_visible_t1');
                                            localStorage.removeItem('bill_summary_order_t1');
                                        }}>{t("Reset to Default")}</button>
                                    </div>
                                )}
                                <div className="table-responsive">
                                    <table className="table table-striped table-sm table-bordered">
                                        <tbody>
                                            {billSummaryOrder.filter(key => billSummaryVisible[key]).map(key => {
                                                switch (key) {
                                                    case 'total_without_vat': return (
                                                        <tr key="total_without_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Total(without VAT)")}
                                                                <OverlayTrigger placement="left" overlay={renderTotalWithoutVATTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end" style={{ width: "200px" }}>
                                                                <NumberFormat value={trimTo2Decimals(formData.total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'total_with_vat': return (
                                                        <tr key="total_with_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Total(with VAT)")}
                                                                <OverlayTrigger placement="left" overlay={renderTotalWithVATTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end" style={{ width: "200px" }}>
                                                                <NumberFormat value={trimTo2Decimals(formData.total_with_vat)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'shipping': return (
                                                        <tr key="shipping">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Shipping & Handling Fees")}
                                                                <OverlayTrigger placement="left" overlay={renderShippingTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_shipping_fees" name="sales_shipping_fees" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "150px" }} className="form-control form-control-sm" value={shipping} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    delete errors["shipping_handling_fees"];
                                                                    setErrors({ ...errors });
                                                                    if (parseFloat(e.target.value) === 0) { shipping = 0; setShipping(shipping); delete errors["shipping_handling_fees"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (parseFloat(e.target.value) < 0) { shipping = 0.00; setShipping(shipping); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (!e.target.value) { shipping = ""; setShipping(shipping); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["shipping_handling_fees"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                                                    shipping = parseFloat(e.target.value); setShipping(shipping);
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />
                                                                {errors.shipping_handling_fees && <div style={{ color: "red" }}>{errors.shipping_handling_fees}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'discount_without_vat': return (
                                                        <tr key="discount_without_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Discount(without VAT)")} <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="form-control form-control-sm d-inline-block" value={discountPercent} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); errors["discount_percent"] = ""; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    delete errors["discount_percent"]; delete errors["discount"]; setErrors({ ...errors });
                                                                    discountPercent = parseFloat(e.target.value); setDiscountPercent(discountPercent);
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />{"%"}
                                                                <OverlayTrigger placement="left" overlay={renderDiscountWithoutVATTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                                {errors.discount_percent && <div style={{ color: "red" }}>{errors.discount_percent}</div>}
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_discount" name="sales_discount" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "150px" }} className="form-control form-control-sm" value={discount} ref={discountRef}
                                                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { discountRef.current?.select(); }, 20); }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) { discount = 0; setDiscount(discount); discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); discountPercentWithVAT = 0; setDiscountPercent(discountPercentWithVAT); delete errors["discount"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        if (parseFloat(e.target.value) < 0) { discount = 0; setDiscount(discount); discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercent = 0; setDiscountPercent(discountPercent); discountPercentWithVAT = 0; setDiscountPercent(discountPercentWithVAT); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        if (!e.target.value) { discount = ""; setDiscount(discount); discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercent = ""; setDiscountPercent(discountPercent); discountPercentWithVAT = ""; setDiscountPercent(discountPercentWithVAT); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        delete errors["discount"]; delete errors["discount_percent"]; setErrors({ ...errors });
                                                                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["discount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                                                        discount = parseFloat(e.target.value); setDiscount(discount);
                                                                        timerRef.current = setTimeout(() => { discountWithVAT = parseFloat(trimTo2Decimals(discount * (1 + (formData.vat_percent / 100)))); setDiscountWithVAT(discountWithVAT); reCalculate(); }, 100);
                                                                    }} />
                                                                {errors.discount && <div style={{ color: "red" }}>{errors.discount}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'discount_with_vat': return (
                                                        <tr key="discount_with_vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Discount(with VAT)")} <input type="number" id="discount_percent_with_vat" name="discount_percent_with_vat" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="form-control form-control-sm d-inline-block" value={discountPercentWithVAT} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (parseFloat(e.target.value) === 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); delete errors["discount_percent_with_vat"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (parseFloat(e.target.value) < 0) { discountWithVAT = 0; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = 0; setDiscountPercentWithVAT(discountPercentWithVAT); discount = 0; setDiscount(discount); discountPercent = 0; setDiscountPercent(discountPercent); errors["discount_percent_with_vat"] = t("Discount percent should be greater than or equal to zero"); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    if (!e.target.value) { discountWithVAT = ""; setDiscountWithVAT(discountWithVAT); discountPercentWithVAT = ""; setDiscountPercentWithVAT(discountPercentWithVAT); discount = ""; setDiscount(discount); discountPercent = ""; setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                    delete errors["discount_percent_with_vat"]; delete errors["discount_with_vat"]; setErrors({ ...errors });
                                                                    discountPercentWithVAT = parseFloat(e.target.value); setDiscountPercentWithVAT(discountPercentWithVAT);
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />{"%"}
                                                                <OverlayTrigger placement="left" overlay={renderDiscountWithVATTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                                {errors.discount_percent_with_vat && <div style={{ color: "red" }}>{errors.discount_percent_with_vat}</div>}
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_discount_with_vat" name="sales_discount_with_vat" onWheel={(e) => e.target.blur()} disabled={isZatcaReported} style={{ width: "150px" }} className="form-control form-control-sm" value={discountWithVAT} ref={discountWithVATRef}
                                                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { discountWithVATRef.current?.select(); }, 20); }}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (parseFloat(e.target.value) === 0) { discount = 0; discountWithVAT = 0; discountPercent = 0; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discount); delete errors["discount_with_vat"]; setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        if (parseFloat(e.target.value) < 0) { discount = 0.00; discountWithVAT = 0.00; discountPercent = 0.00; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        if (!e.target.value) { discount = ""; discountWithVAT = ""; discountPercent = ""; setDiscount(discount); setDiscountWithVAT(discount); setDiscountPercent(discountPercent); setErrors({ ...errors }); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        delete errors["discount_with_vat"]; delete errors["discount_percent_with_vat"]; setErrors({ ...errors });
                                                                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { errors["discount_with_vat"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); }
                                                                        discountWithVAT = parseFloat(e.target.value); setDiscountWithVAT(discountWithVAT);
                                                                        timerRef.current = setTimeout(() => { discount = parseFloat(trimTo2Decimals(discountWithVAT / (1 + (formData.vat_percent / 100)))); setDiscount(discount); reCalculate(); }, 100);
                                                                    }} />
                                                                {errors.discount_with_vat && <div style={{ color: "red" }}>{errors.discount_with_vat}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'taxable_amount': return (
                                                        <tr key="taxable_amount">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Total Taxable Amount(without VAT)")}
                                                                <OverlayTrigger placement="left" overlay={renderTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <td className="text-end" style={{ width: "200px" }}>
                                                                <NumberFormat value={trimTo2Decimals(formData.total + shipping - discount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'vat': return (
                                                        <tr key="vat">
                                                            <th colSpan="8" className="text-end">
                                                                {t("VAT")} <input type="number" id="sales_vat_percent" name="sales_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="form-control form-control-sm d-inline-block text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
                                                                    console.log("Inside onchange vat percent");
                                                                    if (parseFloat(e.target.value) === 0) { formData.vat_percent = parseFloat(e.target.value); setFormData({ ...formData }); delete errors["vat_percent"]; setErrors({ ...errors }); reCalculate(); return; }
                                                                    if (parseFloat(e.target.value) < 0) { formData.vat_percent = parseFloat(e.target.value); formData.vat_price = 0.00; setFormData({ ...formData }); errors["vat_percent"] = t("VAT percent should be greater than or equal to zero"); setErrors({ ...errors }); reCalculate(); return; }
                                                                    if (!e.target.value) { formData.vat_percent = ""; formData.vat_price = 0.00; errors["vat_percent"] = t("Invalid vat percent"); setFormData({ ...formData }); setErrors({ ...errors }); return; }
                                                                    delete errors["vat_percent"]; setErrors({ ...errors });
                                                                    formData.vat_percent = e.target.value; reCalculate(); setFormData({ ...formData });
                                                                }} />{"%"}
                                                                <OverlayTrigger placement="left" overlay={renderVATTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                                {errors.vat_percent && <div style={{ color: "red" }}>{errors.vat_percent}</div>}
                                                            </th>
                                                            <td className="text-end">
                                                                <NumberFormat value={trimTo2Decimals(formData.vat_price)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'net_before_rounding': return (
                                                        <tr key="net_before_rounding">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Net Total(with VAT) Before Rounding")}
                                                                <OverlayTrigger placement="left" overlay={renderNetTotalBeforeRoundingTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <th className="text-end">
                                                                <NumberFormat value={trimTo2Decimals(formData.net_total - roundingAmount)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </th>
                                                        </tr>
                                                    );
                                                    case 'rounding_amount': return (
                                                        <tr key="rounding_amount">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Rounding Amount")}
                                                                [<input type="checkbox" id="sales_auto_rounding_amount" name="sales_auto_rounding_amount" className="form-check-input" style={{ width: "14px", height: "14px", verticalAlign: "middle" }} value={formData.auto_rounding_amount} checked={formData.auto_rounding_amount} onChange={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    setErrors({ ...errors });
                                                                    formData.auto_rounding_amount = !formData.auto_rounding_amount;
                                                                    setFormData({ ...formData });
                                                                    timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                }} />{" " + t("Auto Calculate") + "]"}
                                                            </th>
                                                            <td className="text-end">
                                                                <input type="number" id="sales_rounding_amount" name="sales_rounding_amount" disabled={formData.auto_rounding_amount} onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="form-control form-control-sm" value={roundingAmount}
                                                                    onChange={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        delete errors["rounding_amount"]; setErrors({ ...errors });
                                                                        if (!e.target.value) { roundingAmount = ""; setRoundingAmount(roundingAmount); timerRef.current = setTimeout(() => { reCalculate(); }, 100); return; }
                                                                        if (e.target.value) { if (/^-?\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) { roundingAmount = parseFloat(e.target.value); errors["rounding_amount"] = t("Max. decimal points allowed is 2"); setErrors({ ...errors }); return; } }
                                                                        roundingAmount = parseFloat(e.target.value); setRoundingAmount(roundingAmount);
                                                                        delete errors["rounding_amount"]; setErrors({ ...errors });
                                                                        timerRef.current = setTimeout(() => { reCalculate(); }, 100);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        if (e.key === "Backspace") { delete errors["rounding_amount"]; setErrors({ ...errors }); roundingAmount = ""; setRoundingAmount(""); timerRef.current = setTimeout(() => { reCalculate(); }, 100); }
                                                                    }}
                                                                />
                                                                {errors.rounding_amount && <div style={{ color: "red" }}>{errors.rounding_amount}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                    case 'net_total': return (
                                                        <tr key="net_total">
                                                            <th colSpan="8" className="text-end">
                                                                {t("Net Total(with VAT)")}
                                                                <OverlayTrigger placement="left" overlay={renderNetTotalTooltip()}>
                                                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                                                </OverlayTrigger>
                                                            </th>
                                                            <th className="text-end">
                                                                <NumberFormat value={trimTo2Decimals(formData.net_total)} displayType={"text"} thousandSeparator={true} suffix={" "} renderText={(value, props) => value} />
                                                            </th>
                                                        </tr>
                                                    );
                                                    default: return null;
                                                }
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {/*
                        <div className="col-md-6">
                            <label className="form-label">
                                Delivered By Signature(Optional)
                            </label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="delivered_by_signature_id"
                                 
                                    labelKey="name"
                                    isLoading={isDeliveredBySignaturesLoading}
                                    isInvalid={errors.delivered_by_signature_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.delivered_by_signature_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.delivered_by_signature_id =
                                                "Invalid Signature Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedDeliveredBySignatures([]);
                                            return;
                                        }
                                        formData.delivered_by_signature_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedDeliveredBySignatures(selectedItems);
                                    }}
                                    options={}
                                    placeholder="Select Signature"
                                    selected={selectedDeliveredBySignatures}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestSignatures(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openSignatureCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.delivered_by_signature_id ? (
                                    <div style={{ color: "red" }}>
                                      
                                        {errors.delivered_by_signature_id}
                                    </div>
                                ) : ""}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Signature Date(Optional)</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="signature_date_str"
                                    value={formData.signature_date_str}
                                    selected={selectedDate}
                                    className="form-control"
                                    dateFormat="MMM dd yyyy"
                                    locale={dateLocale}
                                    onChange={(value) => {
                                        formData.signature_date_str = format(new Date(value), "MMM dd yyyy");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.signature_date_str && (
                                    <div style={{ color: "red" }}>
                                       
                                        {errors.signature_date_str}
                                    </div>
                                )}
                            </div>
                        </div>
                                */}
                            <div className="col-md-12" style={{ maxWidth: "90%" }}>
                                <label className="form-label">{t("Payments Received")}</label>

                                <div className="table-responsive">
                                    <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                                        {t("Create New Payment")}
                                    </Button>
                                    <table className="table table-striped table-sm table-bordered" style={{ width: "100%" }}>
                                        {formData.payments_input && formData.payments_input?.length > 0 &&
                                            <thead>
                                                <tr>
                                                    <th>{t("Date")}</th>
                                                    <th>{t("Amount")}</th>
                                                    <th>{t("Payment Method")}</th>
                                                    <th>{t("Description")}</th>
                                                    <th>{t("Reference")}</th>
                                                    <th>{t("Action")}</th>
                                                </tr>
                                            </thead>}
                                        <tbody>
                                            {formData.payments_input &&
                                                formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                                                    <tr key={key}>
                                                        <td style={{ minWidth: "80px" }}>

                                                            <DatePicker
                                                                id="payment_date_str"
                                                                selected={formData.payments_input[key].date_str ? new Date(formData.payments_input[key].date_str) : null}
                                                                value={formData.payments_input[key].date_str ? format(
                                                                    new Date(formData.payments_input[key].date_str),
                                                                    "MMMM d, yyyy h:mm aa",
                                                                    { locale: dateLocale }
                                                                ) : null}
                                                                className="form-control"
                                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                                locale={dateLocale}
                                                                showTimeSelect
                                                                timeIntervals="1"
                                                                onChange={(value) => {
                                                                    console.log("Value", value);
                                                                    formData.payments_input[key].date_str = value;
                                                                    setFormData({ ...formData });
                                                                }}
                                                            />
                                                            {errors["payment_date_" + key] && (
                                                                <div style={{ color: "red" }}>

                                                                    {t(errors["payment_date_" + key])}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ position: 'relative', minWidth: "96px" }}>
                                                            <input type='number' id={`${"sales_payment_amount" + key}`} name={`${"sales_payment_amount" + key}`} value={formData.payments_input[key].amount} className="form-control "
                                                                onChange={(e) => {
                                                                    delete errors["payment_amount_" + key];
                                                                    setErrors({ ...errors });

                                                                    if (!e.target.value) {
                                                                        formData.payments_input[key].amount = e.target.value;
                                                                        setFormData({ ...formData });
                                                                        validatePaymentAmounts();
                                                                        return;
                                                                    }

                                                                    formData.payments_input[key].amount = parseFloat(e.target.value);

                                                                    validatePaymentAmounts();
                                                                    setFormData({ ...formData });
                                                                    console.log(formData);
                                                                }}
                                                            />
                                                            {errors["payment_amount_" + key] && (
                                                                <div style={{ position: 'absolute', top: '100%', left: 0, color: 'red', whiteSpace: 'nowrap', zIndex: 10, fontSize: '11px', background: '#fff', padding: '1px 2px' }}>
                                                                    <i className="bi bi-x-lg"> </i>{t(errors["payment_amount_" + key])}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ position: 'relative', minWidth: "80px" }}>
                                                            <select value={formData.payments_input[key].method} className="form-control "
                                                                onChange={(e) => {
                                                                    // errors["payment_method"] = [];
                                                                    delete errors["payment_method_" + key];
                                                                    setErrors({ ...errors });

                                                                    if (!e.target.value) {
                                                                        errors["payment_method_" + key] = t("Payment method is required");
                                                                        setErrors({ ...errors });

                                                                        formData.payments_input[key].method = "";
                                                                        setFormData({ ...formData });
                                                                        return;
                                                                    }

                                                                    // errors["payment_method"] = "";
                                                                    //setErrors({ ...errors });

                                                                    formData.payments_input[key].method = e.target.value;
                                                                    setFormData({ ...formData });
                                                                    console.log(formData);
                                                                }}
                                                            >
                                                                <option value="">{t("Select")}</option>
                                                                <option value="cash">{t("Cash")}</option>
                                                                <option value="debit_card">{t("Debit Card")}</option>
                                                                <option value="credit_card">{t("Credit Card")}</option>
                                                                <option value="bank_card">{t("Bank Card")}</option>
                                                                <option value="bank_transfer">{t("Bank Transfer")}</option>
                                                                <option value="bank_cheque">{t("Bank Cheque")}</option>
                                                                <option value="sales_return">{t("Sales Return")}</option>
                                                                <option value="purchase">{t("Purchase")}</option>
                                                            </select>
                                                            {errors["payment_method_" + key] && (
                                                                <div style={{ color: "red", position: 'absolute', left: 0, top: '100%', whiteSpace: 'nowrap', zIndex: 100, backgroundColor: '#fff', fontSize: '12px', padding: '2px 4px' }}>
                                                                    {t(errors["payment_method_" + key])}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ minWidth: "347px" }}>
                                                            <input type='text' value={formData.payments_input[key].description || ""} className="form-control"
                                                                onChange={(e) => { formData.payments_input[key].description = e.target.value; setFormData({ ...formData }); }}
                                                                placeholder={t("Description")}
                                                            />
                                                        </td>
                                                        <td style={{ minWidth: "240px" }}>
                                                            {formData.payments_input[key] && (
                                                                <span
                                                                    style={{ cursor: "pointer", color: "blue" }}
                                                                    onClick={() => openReferenceUpdateForm(formData.payments_input[key].reference_id, formData.payments_input[key].reference_type)}
                                                                >
                                                                    {formData.payments_input[key].reference_code}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ width: "80px", textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removePayment(key)} className="btn btn-danger btn-sm">
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            <tr>
                                                <td className="text-end">
                                                    <b>{t("Total")}</b>
                                                </td>
                                                <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                                                    {errors["total_payment"] && (
                                                        <div style={{ color: "red" }}>
                                                            {t(errors["total_payment"])}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <b style={{ marginLeft: "12px", alignSelf: "end" }}>{t("Balance")}: {trimTo2Decimals(balanceAmount)}</b>
                                                    {errors["customer_credit_limit"] && (
                                                        <div style={{ color: "red" }}>
                                                            {t(errors["customer_credit_limit"])}
                                                        </div>
                                                    )}
                                                </td>
                                                <td colSpan={3}>
                                                    <b>{t("Payment status")}: </b>
                                                    {paymentStatus === "paid" ?
                                                        <span className="badge bg-success">
                                                            {t("Paid")}
                                                        </span> : ""}
                                                    {paymentStatus === "paid_partially" ?
                                                        <span className="badge bg-warning">
                                                            {t("Paid Partially")}
                                                        </span> : ""}
                                                    {paymentStatus === "not_paid" ?
                                                        <span className="badge bg-danger">
                                                            {t("Not Paid")}
                                                        </span> : ""}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                </div>
                            </div>


                            <div className="row">
                                <div className="col-md-2">
                                    <label className="form-label">{t("Commission")}</label>
                                    <input
                                        type='number'
                                        ref={commissionRef}
                                        id="sales_commission"
                                        name="sales_commission"
                                        value={commission}
                                        className="form-control"
                                        onChange={(e) => {
                                            delete errors["commission"];
                                            delete errors["commission_payment_method"];
                                            setErrors({ ...errors });
                                            if (!e.target.value) {
                                                commission = e.target.value;
                                                setCommission(commission);
                                                setErrors({ ...errors });
                                                return;
                                            }

                                            commission = parseFloat(e.target.value);
                                            setCommission(commission);

                                            if (commission > 0 && commission >= formData.net_total) {
                                                errors["commission"] = t("Commission should not be greater than or equal to Net Total: ") + formData.net_total?.toString();
                                                setErrors({ ...errors });
                                                return;
                                            }

                                            if (commission > 0 && !formData.commission_payment_method) {
                                                errors["commission_payment_method"] = t("Payment method is required");
                                                setErrors({ ...errors });
                                                return;
                                            }


                                            console.log(formData);
                                        }}

                                        onKeyDown={(e) => {
                                            if (timerRef.current) clearTimeout(timerRef.current);

                                            if (e.key === "Backspace") {
                                                commission = "";
                                                setCommission(commission);
                                                delete errors["commission"];
                                                delete errors["commission_payment_method"];
                                                setErrors({ ...errors });
                                                return;
                                            }
                                        }}
                                        onFocus={() => {
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => {
                                                commissionRef.current?.select();
                                            }, 20);
                                        }}
                                    />
                                    {errors.commission && (
                                        <div style={{ color: "red" }}>
                                            {t(errors.commission)}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">{t("C. Payment Method")}</label>
                                    <select value={formData.commission_payment_method} className="form-control "
                                        onChange={(e) => {
                                            // errors["payment_method"] = [];
                                            delete errors["commission_payment_method"];
                                            setErrors({ ...errors });

                                            if (!e.target.value && commission > 0) {
                                                errors["commission_payment_method"] = t("Payment method is required");
                                                setErrors({ ...errors });

                                                formData.commission_payment_method = "";
                                                setFormData({ ...formData });
                                                return;
                                            }

                                            // errors["payment_method"] = "";
                                            //setErrors({ ...errors });

                                            formData.commission_payment_method = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                    >
                                        <option value="">{t("Select")}</option>
                                        <option value="cash">{t("Cash")}</option>
                                        <option value="debit_card">{t("Debit Card")}</option>
                                        <option value="credit_card">{t("Credit Card")}</option>
                                        <option value="bank_card">{t("Bank Card")}</option>
                                        <option value="bank_transfer">{t("Bank Transfer")}</option>
                                        <option value="bank_cheque">{t("Bank Cheque")}</option>
                                    </select>
                                    {errors["commission_payment_method"] && (
                                        <div style={{ color: "red" }}>
                                            {t(errors["commission_payment_method"])}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">{t("Cash discount")}</label>
                                    <input
                                        type='number'
                                        ref={cashDiscountRef}
                                        id="sales_cash_discount"
                                        name="sales_cash_discount"
                                        value={cashDiscount}
                                        className="form-control"
                                        onChange={(e) => {
                                            delete errors["cash_discount"]; setErrors({ ...errors });
                                            if (!e.target.value) { cashDiscount = e.target.value; setCashDiscount(cashDiscount); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculateRef.current(); }, 100); return; }
                                            cashDiscount = parseFloat(e.target.value); setCashDiscount(cashDiscount);
                                            if (cashDiscount > 0 && cashDiscount >= formData.net_total) { errors["cash_discount"] = t("Cash discount should not be greater than or equal to Net Total: ") + formData.net_total?.toString(); setErrors({ ...errors }); return; }
                                            if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { reCalculateRef.current(); }, 100);
                                        }}
                                        onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Backspace") { cashDiscount = ""; setCashDiscount(cashDiscount); timerRef.current = setTimeout(() => { reCalculateRef.current(); }, 100); return; } }}
                                        onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { cashDiscountRef.current?.select(); }, 20); }}
                                    />
                                    {errors.cash_discount && (
                                        <div style={{ color: "red" }}>
                                            {errors.cash_discount}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Modal.Footer>
                                <Button variant="secondary" onClick={handleClose}>
                                    {t("Close")}
                                </Button>
                                <Button
                                    variant="primary"
                                    style={{ minWidth: "80px" }}
                                    onClick={(e) => {
                                        e.preventDefault();

                                        handleCreate(e);
                                    }}>
                                    {isSubmitting ?
                                        <Spinner
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden={true}
                                        />

                                        : ""
                                    }
                                    {isUpdateForm && !isSubmitting ? t("Update") : !isSubmitting ? t("Create") : ""}

                                </Button>
                            </Modal.Footer>
                        </form >
                        <TableSettingsModal
                            show={showCustomerSearchSettings}
                            onHide={() => setShowCustomerSearchSettings(false)}
                            title={t('Customer Search Settings')}
                            columns={customerSearchColumns}
                            onToggleColumn={handleToggleCustomerCol}
                            onDragEnd={handleCustomerColDragEnd}
                            onRestoreDefaults={restoreCustomerColDefaults}
                        />
        </>
    );
}
