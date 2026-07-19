/**
 * VAN Store Sales Form (Type 4)
 * Mobile-first design for Saudi Van Sales / مبيعات الفان
 */
import React, { useState, useRef } from "react";
import { Spinner, Dropdown } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { DebounceInput } from "react-debounce-input";
import { useTranslation } from "react-i18next";
import { trimTo2Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
    teal:    "#006d5b",
    tealDk:  "#004d40",
    tealLt:  "#e0f2f1",
    amber:   "#f59e0b",
    amberLt: "#fef3c7",
    border:  "#b2dfdb",
    borderN: "#e2e8f0",
    text:    "#1a2e2b",
    muted:   "#607d74",
    danger:  "#dc2626",
    green:   "#16a34a",
    white:   "#ffffff",
    bg:      "#f8fffe",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const pill = (bg, color, text) => (
    <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{text}</span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════════════════════
export function SalesVanStoreHeader({
    formData, setFormData,
    isUpdateForm,
    store,
    formType, setFormType,
    disablePreviousButton,
    isSubmitting,
    dnNotifications,
    openPreviousForm, openLastForm, openNextForm, openCreateForm,
    openPrint, openPreview,
    handleCreate, handleClose,
    openSalesFromDnInForm, dismissDnNotification,
}) {
    const { t } = useTranslation("common");

    const navBtn = (disabled, onClick, children) => (
        <button type="button" disabled={disabled} onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: 3,
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff", borderRadius: 5, padding: "5px 9px",
                fontSize: 12, fontWeight: 500, cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1, whiteSpace: "nowrap", flexShrink: 0,
            }}>
            {children}
        </button>
    );

    return (
        <div style={{
            background: `linear-gradient(135deg, ${C.tealDk} 0%, ${C.teal} 100%)`,
            height: 56, padding: "0 12px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            boxShadow: "0 2px 8px rgba(0,77,64,0.4)", flexShrink: 0,
        }}>
            {/* Left — title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Hanken Grotesk', sans-serif" }}>
                        {isUpdateForm ? t("Update") + " #" + formData.code : t("VAN Store Sales")}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal, sans-serif" }}>مبيعات الفان</div>
                </div>
                {!isUpdateForm && store?.zatca?.phase === "2" && store?.zatca?.connected && (
                    <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}>
                        <input type="checkbox" className="form-check-input"
                            checked={formData.enable_report_to_zatca}
                            onChange={() => { formData.enable_report_to_zatca = !formData.enable_report_to_zatca; setFormData({ ...formData }); }}
                            style={{ width: 13, height: 13, margin: 0 }}
                        />
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>ZATCA</span>
                    </label>
                )}
            </div>

            {/* Right — actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                {navBtn(disablePreviousButton, e => { e.preventDefault(); isUpdateForm ? openPreviousForm() : openLastForm(); },
                    <><i className="bi bi-chevron-left" style={{ fontSize: 11 }} /><span className="d-none d-sm-inline">{t("Prev")}</span></>
                )}
                {navBtn(!isUpdateForm, e => { e.preventDefault(); openNextForm(); },
                    <><span className="d-none d-sm-inline">{t("Next")}</span><i className="bi bi-chevron-right" style={{ fontSize: 11 }} /></>
                )}
                {navBtn(!isUpdateForm, e => { e.preventDefault(); openCreateForm(); },
                    <><i className="bi bi-plus" style={{ fontSize: 13 }} /><span className="d-none d-sm-inline">{t("New")}</span></>
                )}

                <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />

                {/* icon-only buttons */}
                {[
                    { icon: "bi-printer", disabled: !isUpdateForm, fn: openPrint, tip: t("Print") },
                    { icon: "bi-file-earmark-pdf", disabled: !isUpdateForm, fn: openPreview, tip: t("Print A4") },
                ].map(b => (
                    <button key={b.icon} type="button" disabled={b.disabled} onClick={b.fn} title={b.tip}
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 5, padding: "5px 7px", cursor: b.disabled ? "default" : "pointer", opacity: b.disabled ? 0.4 : 1, flexShrink: 0 }}>
                        <i className={`bi ${b.icon}`} style={{ fontSize: 14 }} />
                    </button>
                ))}

                {/* DN bell */}
                {store.settings?.enable_notification && (
                    <Dropdown style={{ display: "inline-flex" }}>
                        <Dropdown.Toggle as="span" style={{ cursor: "pointer", position: "relative", display: "inline-flex", padding: "5px 7px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 5 }} id="van-dn-bell">
                            <i className="bi bi-bell" style={{ color: "#fff", fontSize: 14 }} />
                            {dnNotifications.length > 0 && (
                                <span style={{ position: "absolute", top: 0, right: 0, background: C.amber, color: C.tealDk, borderRadius: "50%", fontSize: 8, fontWeight: 800, minWidth: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{dnNotifications.length}</span>
                            )}
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="end" style={{ minWidth: 280, maxHeight: 340, overflowY: "auto" }}>
                            {dnNotifications.length === 0
                                ? <Dropdown.ItemText className="text-muted small">{t("No pending reminders")}</Dropdown.ItemText>
                                : dnNotifications.map(n => (
                                    <div key={n.id} style={{ display: "flex", padding: "8px 12px", borderBottom: "1px solid #f0f0f0", gap: 6 }}>
                                        <div style={{ flex: 1, cursor: "pointer", fontSize: 12 }} onClick={() => openSalesFromDnInForm(n)}>
                                            <i className="bi bi-file-earmark-text text-primary me-1" />DN <strong>{n.code}</strong>
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); dismissDnNotification(n.id, true); }}
                                            style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 15 }}>&times;</button>
                                    </div>
                                ))
                            }
                        </Dropdown.Menu>
                    </Dropdown>
                )}

                {/* Form type switcher */}
                {store.settings?.enable_sales_page_selection && (
                    <select value={formType} onChange={e => setFormType(e.target.value)}
                        style={{ fontSize: 11, padding: "4px 6px", height: 30, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 4, maxWidth: 100 }}>
                        <option value="type4" style={{ color: "#000" }}>VAN (Type 4)</option>
                        <option value="type3" style={{ color: "#000" }}>Type 3</option>
                        <option value="type2" style={{ color: "#000" }}>Type 2</option>
                        <option value="type1" style={{ color: "#000" }}>Type 1</option>
                    </select>
                )}

                {/* Create/Update primary button */}
                <button type="button" onClick={e => { e.preventDefault(); handleCreate(e); }}
                    style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: C.amber, color: C.tealDk,
                        border: "none", borderRadius: 6, padding: "6px 14px",
                        fontSize: 13, fontWeight: 800, cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(245,158,11,0.4)", flexShrink: 0,
                    }}>
                    {isSubmitting
                        ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />
                        : <><i className="bi bi-check2" style={{ fontSize: 14 }} /><span className="d-none d-sm-inline">{isUpdateForm ? t("Update") : t("Create")}</span></>
                    }
                </button>

                <button type="button" className="btn-close btn-close-white" onClick={handleClose} style={{ opacity: 0.75, flexShrink: 0 }} />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BODY
// ═══════════════════════════════════════════════════════════════════════════════
export function SalesVanStoreBody({
    formData, setFormData,
    errors, setErrors,
    warnings,
    selectedProducts, setSelectedProducts,
    selectedCustomers, setSelectedCustomers,
    isZatcaReported,
    store,
    openCustomerSearchResult, setOpenCustomerSearchResult,
    openProductSearchResult, setOpenProductSearchResult,
    customerOptions, setCustomerOptions,
    productOptions, setProductOptions,
    handleCreate,
    suggestCustomers, suggestProducts,
    getProductByBarCode,
    addProduct, removeProduct, isProductAdded,
    openCustomerCreateForm, openCustomerUpdateForm, openCustomers,
    addNewPayment, removePayment, validatePaymentAmounts,
    discount, setDiscount,
    discountWithVAT, setDiscountWithVAT,
    shipping,
    totalPaymentAmount,
    balanceAmount,
    paymentStatus,
    isSubmitting, isUpdateForm, handleClose,
    timerRef,
    customerSearchRef, productSearchRef,
    inputRefs,
    CalCulateLineTotals, reCalculate,
    checkErrors, checkWarnings,
    sendWhatsAppMessage,
    dateLocale,
}) {
    const { t } = useTranslation("common");

    // Inline discount state for order-level discount
    const [showDiscount, setShowDiscount] = useState(false);

    const barcodeRef = useRef(null);
    const scrollBodyRef = useRef(null);
    const paymentRowsRef = useRef(null);
    const storeId = localStorage.getItem("store_id");

    // ── Customer helpers ──────────────────────────────────────────────────────
    const cust = selectedCustomers[0];
    const custStore = cust?.stores?.[storeId];
    const creditBalance = custStore?.credit_balance ?? null;
    const creditLimit = cust?.credit_limit ?? null;
    const overCredit = creditLimit && creditBalance && creditBalance >= creditLimit;

    // ── Payment status ────────────────────────────────────────────────────────
    const payColor = paymentStatus === "paid" ? C.green : paymentStatus === "paid_partially" ? "#d97706" : C.danger;
    const payBg = paymentStatus === "paid" ? "#dcfce7" : paymentStatus === "paid_partially" ? C.amberLt : "#fee2e2";
    const payLabel = paymentStatus === "paid" ? t("Paid") : paymentStatus === "paid_partially" ? t("Partial") : t("Unpaid");

    // ── Product helpers ───────────────────────────────────────────────────────
    function handleQtyChange(index, value) {
        if (timerRef.current) clearTimeout(timerRef.current);
        selectedProducts[index].quantity = value === "" ? "" : Math.max(0, parseFloat(value) || 0);
        setSelectedProducts([...selectedProducts]);
        timerRef.current = setTimeout(() => { CalCulateLineTotals(index); reCalculate(index); }, 120);
    }

    function stepQty(index, delta) {
        const current = parseFloat(selectedProducts[index].quantity) || 0;
        const next = Math.max(0, current + delta);
        selectedProducts[index].quantity = next;
        setSelectedProducts([...selectedProducts]);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { CalCulateLineTotals(index); reCalculate(index); }, 120);
    }

    function lineTotal(p) {
        const qty = parseFloat(p.quantity) || 0;
        const price = parseFloat(p.unit_price_with_vat) || 0;
        const disc = parseFloat(p.unit_discount_with_vat) || 0;
        return trimTo2Decimals(qty * (price - disc));
    }

    // ── Input style ───────────────────────────────────────────────────────────
    const field = (extra) => ({
        fontSize: 14, height: 44, padding: "0 12px",
        border: `1px solid ${C.borderN}`, borderRadius: 8,
        outline: "none", width: "100%", boxSizing: "border-box",
        background: "#fff", color: C.text,
        ...extra,
    });

    const sectionHead = (icon, title, arabic) => (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 15, color: C.teal }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: "'Hanken Grotesk', sans-serif" }}>{title}</span>
            <span style={{ fontSize: 11, color: C.teal, fontFamily: "Tajawal, sans-serif", fontWeight: 700, marginLeft: "auto" }}>{arabic}</span>
        </div>
    );

    const hasProducts = selectedProducts && selectedProducts.filter(p => !p.deleted).length > 0;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <form onSubmit={e => { e.preventDefault(); handleCreate(e); }}
            style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: C.bg }}>

            {/* ── SCROLLABLE CONTENT ─────────────────────────────────────── */}
            <div ref={scrollBodyRef} style={{ flex: 1, overflowY: "auto", padding: "10px 12px 4px" }}>

                {/* ═══ DATE ══════════════════════════════════════════════════ */}
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.borderN}`, padding: "8px 12px", marginBottom: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <i className="bi bi-calendar3" style={{ color: C.teal, fontSize: 16, flexShrink: 0 }} />
                    <div style={{ flex: "1 1 200px" }}>
                        <DatePicker
                            selected={formData.date_str ? new Date(formData.date_str) : null}
                            value={formData.date_str ? format(new Date(formData.date_str), "dd MMM yyyy h:mm aa", { locale: dateLocale }) : null}
                            className="form-control"
                            dateFormat="dd MMM yyyy h:mm aa"
                            locale={dateLocale}
                            showTimeSelect
                            timeIntervals="1"
                            onChange={v => { formData.date_str = v; setFormData({ ...formData }); }}
                        />
                    </div>
                </div>

                {/* ═══ CUSTOMER ══════════════════════════════════════════════ */}
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.borderN}`, padding: "12px", marginBottom: 10 }}>
                    {sectionHead("bi-person-circle", t("Customer"), "العميل")}

                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Typeahead
                                id="van_customer_search"
                                filterBy={() => true}
                                labelKey={opt => opt.name || ""}

                                isLoading={false}
                                emptyLabel=""
                                clearButton={false}
                                open={openCustomerSearchResult}
                                ref={customerSearchRef}
                                onChange={items => {
                                    delete errors.customer_id;
                                    setErrors(errors);
                                    if (!items.length) {
                                        formData.customer_id = ""; formData.customer_name = ""; formData.customerName = "";
                                        setFormData({ ...formData });
                                        setSelectedCustomers([]);
                                        setOpenCustomerSearchResult(false);
                                        return;
                                    }
                                    formData.customer_id = items[0].id;
                                    if (items[0].phone && !formData.phone) formData.phone = items[0].phone;
                                    if (items[0].use_remarks_in_sales && items[0].remarks) formData.remarks = items[0].remarks;
                                    setFormData({ ...formData });
                                    setSelectedCustomers(items);
                                    setOpenCustomerSearchResult(false);
                                    if (store?.settings?.block_sales_after_pending_count > 0) {
                                        const cs = items[0]?.stores?.[storeId];
                                        const pending = (cs?.sales_not_paid_count || 0) + (cs?.sales_paid_partially_count || 0);
                                        if (pending >= store.settings.block_sales_after_pending_count) {
                                            errors.blocked = `${pending} unpaid sale(s) — new sales blocked.`;
                                        } else { delete errors.blocked; }
                                        setErrors({ ...errors });
                                    }
                                }}
                                options={customerOptions}
                                placeholder={t("Search customer by name / phone / VAT")}
                                selected={selectedCustomers}
                                highlightOnlyResult
                                onKeyDown={e => {
                                    if (e.key === "Escape") {
                                        formData.customer_id = ""; formData.customer_name = ""; formData.customerName = "";
                                        setFormData({ ...formData }); setSelectedCustomers([]);
                                        setCustomerOptions([]); setOpenCustomerSearchResult(false);
                                        customerSearchRef.current?.clear();
                                    }
                                }}
                                onInputChange={term => {
                                    formData.customerName = term;
                                    formData.customer_name = term;
                                    if (!term) { formData.customer_id = ""; setSelectedCustomers([]); }
                                    setFormData({ ...formData });
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => suggestCustomers(term), 350);
                                }}
                                renderMenu={(results, menuProps, state) => {
                                    const sw = state.text.toLowerCase().split(" ").filter(Boolean);
                                    return (
                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: "min(90vw, 400px)", zIndex: 9999 }}>
                                            {results.map((opt, idx) => {
                                                const active = state.activeIndex === idx;
                                                return (
                                                    <MenuItem option={opt} position={idx} key={idx} style={{ padding: 0 }}>
                                                        <div style={{ padding: "9px 12px", background: active ? C.tealLt : "transparent", display: "flex", flexDirection: "column", gap: 2 }}>
                                                            <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{highlightWords(opt.name, sw, active)}</span>
                                                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted }}>
                                                                {opt.phone && <span><i className="bi bi-phone me-1" />{opt.phone}</span>}
                                                                {opt.credit_balance != null && (
                                                                    <span style={{ color: opt.credit_balance > 0 ? C.danger : C.green, fontWeight: 600 }}>
                                                                        {t("Bal")}: {opt.credit_balance}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </MenuItem>
                                                );
                                            })}
                                        </Menu>
                                    );
                                }}
                                inputProps={{ style: { height: 44, fontSize: 14, borderRadius: 8, border: `1px solid ${errors.customer_id ? C.danger : C.borderN}` } }}
                            />
                        </div>
                        <button type="button" onClick={openCustomerCreateForm} title={t("New customer")}
                            style={{ height: 44, width: 44, border: `1px solid ${C.borderN}`, background: "#fff", borderRadius: 8, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-person-plus" style={{ fontSize: 16, color: C.teal }} />
                        </button>
                        <button type="button" onClick={openCustomers} title={t("Browse customers")}
                            style={{ height: 44, width: 44, background: C.teal, border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-list" style={{ fontSize: 16, color: "#fff" }} />
                        </button>
                    </div>

                    {/* Blocked / error */}
                    {errors.blocked && (
                        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: C.danger, marginBottom: 6 }}>
                            <i className="bi bi-exclamation-triangle-fill me-1" />{errors.blocked}
                        </div>
                    )}

                    {/* Customer info row */}
                    {cust && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
                            {/* Name badge */}
                            <div style={{ flex: "1 1 180px", background: C.tealLt, borderRadius: 7, padding: "7px 10px" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{cust.name}</div>
                                {cust.name_in_arabic && <div style={{ fontSize: 11, color: C.muted, fontFamily: "Tajawal, sans-serif" }}>{cust.name_in_arabic}</div>}
                                {cust.phone && (
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                        <i className="bi bi-phone" style={{ fontSize: 11 }} />{cust.phone}
                                        <button type="button" onClick={sendWhatsAppMessage} style={{ background: "#25d366", border: "none", borderRadius: 4, padding: "1px 6px", cursor: "pointer", color: "#fff", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 2 }}>
                                            WA
                                        </button>
                                    </div>
                                )}
                                {formData.customer_id && (
                                    <button type="button" onClick={() => openCustomerUpdateForm(formData.customer_id)}
                                        style={{ marginTop: 4, background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 11, padding: 0, display: "flex", alignItems: "center", gap: 3 }}>
                                        <i className="bi bi-pencil" style={{ fontSize: 10 }} />{t("Edit")}
                                    </button>
                                )}
                            </div>
                            {/* Credit info */}
                            <div style={{ flex: "0 0 auto", background: overCredit ? "#fee2e2" : "#f0fdf4", border: `1px solid ${overCredit ? "#fca5a5" : "#86efac"}`, borderRadius: 7, padding: "7px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                                {overCredit && <div style={{ fontSize: 10, fontWeight: 700, color: C.danger }}><i className="bi bi-exclamation-triangle-fill me-1" />{t("OVER CREDIT LIMIT")}</div>}
                                <div style={{ display: "flex", gap: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{t("Credit Limit")}</div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{creditLimit ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{t("Balance")}</div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: creditBalance > 0 ? C.danger : C.green }}>{creditBalance ?? "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ PRODUCT SEARCH ════════════════════════════════════════ */}
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.borderN}`, padding: "12px", marginBottom: 10 }}>
                    {sectionHead("bi-box-seam", t("Products"), "المنتجات")}

                    {/* Search bar row */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        {/* Barcode */}
                        <div style={{ position: "relative", flexShrink: 0, width: 50 }}>
                            <DebounceInput element="input" ref={barcodeRef} minLength={3} debounceTimeout={300}
                                placeholder=""
                                title={t("Barcode")}
                                onChange={e => { if (e.target.value) { getProductByBarCode(e.target.value); e.target.value = ""; } }}
                                style={{ ...field({ width: 50, padding: "0 8px", textAlign: "center" }), borderRadius: 8 }}
                            />
                            <i className="bi bi-upc-scan" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", color: C.muted, fontSize: 16, pointerEvents: "none" }} />
                        </div>

                        {/* Product typeahead — full width */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Typeahead
                                id="van_product_search"
                                filterBy={() => true}
                                labelKey="search_label"
                                isLoading={false}
                                emptyLabel=""
                                clearButton={false}
                                open={openProductSearchResult}
                                ref={productSearchRef}
                                onChange={items => {
                                    // Keyboard-enter selection: toggle add/remove, keep dropdown open
                                    if (!items.length) return;
                                    const opt = items[0];
                                    if (isProductAdded(opt.id)) { removeProduct(opt); } else { addProduct(opt); }
                                    setOpenProductSearchResult(true);
                                    setTimeout(() => productSearchRef.current?.focus(), 30);
                                }}
                                options={productOptions}
                                placeholder={t("Search product by name / code / barcode")}
                                highlightOnlyResult={false}
                                onKeyDown={e => {
                                    if (e.key === "Escape") {
                                        setProductOptions([]);
                                        setOpenProductSearchResult(false);
                                        productSearchRef.current?.clear();
                                    }
                                }}
                                onInputChange={term => {
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => suggestProducts(term), 350);
                                }}
                                renderMenu={(results, menuProps, state) => {
                                    const sw = state.text.toLowerCase().split(" ").filter(Boolean);
                                    return (
                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: "min(96vw, 440px)", zIndex: 9999, padding: 0 }}>
                                            {/* Sticky header with close button */}
                                            <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, margin: 0, pointerEvents: "auto" }}>
                                                <div style={{ display: "flex", alignItems: "center", background: C.tealDk, padding: "7px 10px", gap: 6, pointerEvents: "auto" }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", flex: 1 }}>{t("Select Products")}</span>
                                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal, sans-serif" }}>اختر المنتجات</span>
                                                    <button
                                                        type="button"
                                                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                                        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpenProductSearchResult(false); productSearchRef.current?.clear(); setProductOptions([]); }}
                                                        style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0, pointerEvents: "auto" }}
                                                    >✓ {t("Done")}</button>
                                                </div>
                                                <div style={{ display: "flex", fontSize: 10, fontWeight: 700, color: C.muted, padding: "4px 10px", background: "#f8f9fa", borderBottom: `1px solid ${C.borderN}`, pointerEvents: "auto" }}>
                                                    <span style={{ width: 34 }} />
                                                    <span style={{ flex: 1 }}>{t("Product")}</span>
                                                    <span style={{ width: 95, textAlign: "right" }}>{t("Price (VAT incl.)")}</span>
                                                    <span style={{ width: 44, textAlign: "right" }}>{t("Stock")}</span>
                                                </div>
                                            </MenuItem>

                                            {/* Product rows */}
                                            {results.map((opt, idx) => {
                                                const ps = opt.product_stores?.[storeId] || {};
                                                const price = ps.retail_unit_price_with_vat ?? opt.unit_price_with_vat ?? null;
                                                const priceEx = ps.retail_unit_price ?? opt.unit_price ?? null;
                                                const stock = ps.stock ?? null;
                                                const checked = !!isProductAdded(opt.id);
                                                return (
                                                    <MenuItem option={opt} position={idx} key={idx} style={{ padding: 0 }}>
                                                        <div
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                if (checked) { removeProduct(opt); } else { addProduct(opt); }
                                                            }}
                                                            style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: 8, cursor: "pointer", background: checked ? C.tealLt : idx % 2 === 0 ? "#fff" : "#fafffe", borderBottom: `1px solid ${C.borderN}`, borderLeft: checked ? `3px solid ${C.teal}` : "3px solid transparent" }}
                                                        >
                                                            {/* Checkbox */}
                                                            <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 5, border: `2px solid ${checked ? C.teal : "#ccc"}`, background: checked ? C.teal : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                {checked && <i className="bi bi-check" style={{ color: "#fff", fontSize: 15, lineHeight: 1 }} />}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: checked ? 700 : 500, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    {highlightWords(opt.name, sw, checked)}
                                                                </div>
                                                                {opt.name_in_arabic && (
                                                                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "Tajawal, sans-serif", direction: "rtl" }}>{opt.name_in_arabic}</div>
                                                                )}
                                                                {opt.item_code && (
                                                                    <div style={{ fontSize: 9, color: "#9ca3af", fontFamily: "monospace" }}>{opt.item_code}</div>
                                                                )}
                                                            </div>
                                                            <div style={{ width: 95, textAlign: "right", flexShrink: 0 }}>
                                                                <div style={{ fontWeight: 700, fontSize: 13, color: C.teal }}>
                                                                    {price != null ? `${price}` : "—"}
                                                                </div>
                                                                {priceEx != null && (
                                                                    <div style={{ fontSize: 10, color: C.muted }}>ex: {priceEx}</div>
                                                                )}
                                                            </div>
                                                            <div style={{ width: 44, textAlign: "right", fontSize: 12, fontWeight: 600, color: (stock || 0) > 0 ? C.green : C.danger, flexShrink: 0 }}>
                                                                {stock ?? "—"}
                                                            </div>
                                                        </div>
                                                    </MenuItem>
                                                );
                                            })}
                                        </Menu>
                                    );
                                }}
                                inputProps={{ style: { height: 44, fontSize: 14, borderRadius: 8, border: `1px solid ${C.borderN}` } }}
                            />
                        </div>
                    </div>

                    {/* ── PRODUCT CARDS ── */}
                    {!hasProducts && (
                        <div style={{ textAlign: "center", padding: "24px 16px", color: C.muted }}>
                            <i className="bi bi-box-seam" style={{ fontSize: 32, color: C.border, display: "block", marginBottom: 6 }} />
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{t("No products yet")}</div>
                            <div style={{ fontSize: 11, fontFamily: "Tajawal, sans-serif", marginTop: 2 }}>ابحث أو امسح الباركود لإضافة منتج</div>
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {selectedProducts && selectedProducts.map((product, index) => {
                            if (product.deleted) return null;
                            const total = lineTotal(product);
                            const hasErr = !!errors[`quantity_${index}`] || !!errors[`name_${index}`];
                            return (
                                <div key={index} style={{
                                    border: `1px solid ${hasErr ? "#fca5a5" : C.borderN}`,
                                    borderRadius: 10,
                                    background: hasErr ? "#fef2f2" : "#fff",
                                    overflow: "hidden",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                }}>
                                    {/* Card header — name + remove */}
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 10px 4px" }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, lineHeight: "18px" }}>
                                                <span style={{ display: "inline-block", width: 18, height: 18, background: C.teal, color: "#fff", borderRadius: 4, textAlign: "center", fontSize: 10, fontWeight: 800, lineHeight: "18px", marginRight: 5, flexShrink: 0 }}>{index + 1}</span>
                                                {product.name}
                                            </div>
                                            {product.name_in_arabic && (
                                                <div style={{ fontSize: 11, color: C.muted, fontFamily: "Tajawal, sans-serif", direction: "rtl", marginTop: 1 }}>{product.name_in_arabic}</div>
                                            )}
                                            {product.item_code && (
                                                <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>{product.item_code}</div>
                                            )}
                                        </div>
                                        <button type="button" onClick={() => removeProduct(index)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18, lineHeight: 1, padding: "0 2px", flexShrink: 0, marginLeft: 4 }}>
                                            <i className="bi bi-x" />
                                        </button>
                                    </div>

                                    {/* Card body — qty stepper + price + total */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 8px", borderTop: `1px solid ${C.borderN}`, background: "#fafffe", flexWrap: "wrap" }}>
                                        {/* Qty stepper */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                                            <button type="button" onClick={() => stepQty(index, -1)}
                                                style={{ width: 38, height: 38, background: C.tealLt, border: "none", cursor: "pointer", fontSize: 18, fontWeight: 700, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                            <input
                                                type="number" min="0"
                                                value={product.quantity}
                                                onChange={e => handleQtyChange(index, e.target.value)}
                                                onFocus={e => e.target.select()}
                                                onWheel={e => e.target.blur()}
                                                ref={el => {
                                                    if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                                    inputRefs.current[index][`sales_product_quantity_${index}`] = el;
                                                }}
                                                style={{ width: 52, height: 38, border: "none", textAlign: "center", fontWeight: 700, fontSize: 15, color: C.text, outline: "none", background: "#fff" }}
                                            />
                                            <button type="button" onClick={() => stepQty(index, 1)}
                                                style={{ width: 38, height: 38, background: C.tealLt, border: "none", cursor: "pointer", fontSize: 18, fontWeight: 700, color: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                        </div>

                                        {/* Unit label */}
                                        {product.unit && <span style={{ fontSize: 11, color: C.muted }}>{product.unit}</span>}

                                        {/* Spacer */}
                                        <div style={{ flex: 1 }} />

                                        {/* Price × qty */}
                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            <div style={{ fontSize: 10, color: C.muted }}>
                                                {product.unit_price_with_vat} × {product.quantity}
                                                {parseFloat(product.unit_discount_with_vat) > 0 && (
                                                    <span style={{ color: C.danger, marginLeft: 4 }}>− {product.unit_discount_with_vat}</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>
                                                <NumberFormat value={total} displayType="text" thousandSeparator renderText={v => v} />
                                                <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginLeft: 3 }}>SAR</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Order-level discount (toggle) */}
                    {hasProducts && (
                        <div style={{ marginTop: 8 }}>
                            <button type="button" onClick={() => setShowDiscount(v => !v)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                                <i className={`bi bi-${showDiscount ? "dash-circle" : "plus-circle"}`} /> {t("Order Discount")}
                            </button>
                            {showDiscount && (
                                <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                                    <label style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{t("Discount (excl. VAT)")}</label>
                                    <input type="number" min="0"
                                        value={discount || ""}
                                        onWheel={e => e.target.blur()}
                                        onChange={e => {
                                            const v = e.target.value ? parseFloat(e.target.value) : "";
                                            setDiscount(v);
                                            setDiscountWithVAT(v !== "" ? parseFloat((v * (1 + formData.vat_percent / 100)).toFixed(2)) : "");
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => reCalculate(), 150);
                                        }}
                                        style={{ ...field({ width: 120, height: 36 }) }}
                                        placeholder="0.00"
                                    />
                                    <span style={{ fontSize: 11, color: C.muted }}>SAR</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ PAYMENT ═══════════════════════════════════════════════ */}
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.borderN}`, padding: "12px", marginBottom: 10 }}>
                    {sectionHead("bi-wallet2", t("Payment"), "الدفع")}

                    {/* Hint */}
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <i className="bi bi-hand-index-thumb" style={{ fontSize: 12 }} />
                        <span>{t("Tap to add payment method")}</span>
                        <span style={{ fontFamily: "Tajawal, sans-serif", fontSize: 11 }}>اضغط لإضافة طريقة دفع</span>
                    </div>

                    {/* Quick-add payment method buttons */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {[
                            { key: "cash",          label: t("Cash"),    arabic: "نقداً",    icon: "bi-cash-coin",           color: C.green },
                            { key: "mada",          label: "Mada",       arabic: "مدى",      icon: "bi-credit-card-2-front", color: "#0ea5e9" },
                            { key: "credit",        label: t("Credit"),  arabic: "آجل",      icon: "bi-hourglass-split",     color: "#d97706" },
                            { key: "bank_cheque",   label: t("Cheque"),  arabic: "شيك",      icon: "bi-journal-check",       color: "#7c3aed" },
                        ].map(pm => (
                            <button key={pm.key} type="button"
                                onClick={() => {
                                    addNewPayment();
                                    setTimeout(() => {
                                        if (formData.payments_input?.length > 0) {
                                            const last = formData.payments_input.length - 1;
                                            formData.payments_input[last].method = pm.key;
                                            if (pm.key !== "credit" && pm.key !== "bank_cheque") {
                                                const remaining = parseFloat(balanceAmount) || 0;
                                                if (remaining > 0) formData.payments_input[last].amount = remaining;
                                            }
                                            setFormData({ ...formData });
                                            // Update balanceAmount so handleCreate sends the correct value to the backend
                                            validatePaymentAmounts();
                                        }
                                        // Scroll new payment row into view
                                        setTimeout(() => {
                                            paymentRowsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                        }, 60);
                                    }, 80);
                                }}
                                style={{
                                    flex: "1 1 100px",
                                    border: `2px solid ${pm.color}`,
                                    background: "#fff", color: pm.color,
                                    borderRadius: 8, padding: "8px 6px",
                                    cursor: "pointer", fontWeight: 600, fontSize: 12,
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                                    transition: "all 0.15s",
                                }}>
                                <i className={`bi ${pm.icon}`} style={{ fontSize: 18 }} />
                                <span>{pm.label}</span>
                                <span style={{ fontSize: 10, fontFamily: "Tajawal, sans-serif", opacity: 0.75 }}>{pm.arabic}</span>
                            </button>
                        ))}
                    </div>

                    {/* Payment rows */}
                    {formData.payments_input && formData.payments_input.filter(p => !p.deleted).length > 0 && (
                        <div ref={paymentRowsRef} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                            {formData.payments_input.map((payment, key) => {
                                if (payment.deleted) return null;
                                const methodColors = { cash: C.green, mada: "#0ea5e9", credit: "#d97706", bank_cheque: "#7c3aed" };
                                const mc = methodColors[payment.method] || C.muted;
                                return (
                                    <div key={key} style={{ display: "flex", gap: 6, alignItems: "center", background: "#fafffe", border: `1px solid ${C.borderN}`, borderRadius: 8, padding: "6px 8px" }}>
                                        <div style={{ width: 6, height: 36, background: mc, borderRadius: 3, flexShrink: 0 }} />
                                        <select value={payment.method || ""}
                                            className="form-select form-select-sm"
                                            style={{ flex: "1 1 100px", minWidth: 80, height: 38, fontSize: 13 }}
                                            onChange={e => {
                                                delete errors[`payment_method_${key}`]; setErrors({ ...errors });
                                                formData.payments_input[key].method = e.target.value;
                                                setFormData({ ...formData });
                                            }}>
                                            <option value="">{t("Method")}</option>
                                            <option value="cash">{t("Cash")} (نقداً)</option>
                                            <option value="mada">Mada (مدى)</option>
                                            <option value="debit_card">{t("Debit Card")}</option>
                                            <option value="credit_card">{t("Credit Card")}</option>
                                            <option value="bank_transfer">{t("Bank Transfer")}</option>
                                            <option value="bank_cheque">{t("Cheque")} (شيك)</option>
                                            <option value="credit">{t("On Account")} (آجل)</option>
                                        </select>
                                        <input type="number" min="0"
                                            value={payment.amount || ""}
                                            placeholder={t("Amount")}
                                            onWheel={e => e.target.blur()}
                                            onChange={e => {
                                                delete errors[`payment_method_${key}`]; setErrors({ ...errors });
                                                formData.payments_input[key].amount = e.target.value ? parseFloat(e.target.value) : e.target.value;
                                                setFormData({ ...formData });
                                                validatePaymentAmounts();
                                            }}
                                            style={{ ...field({ width: 110, height: 38, textAlign: "right", flexShrink: 0 }) }}
                                        />
                                        <button type="button" onClick={() => removePayment(key)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 20, flexShrink: 0, padding: "0 2px", lineHeight: 1 }}>
                                            <i className="bi bi-x" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {errors.payments && <div style={{ color: C.danger, fontSize: 11, marginTop: 4 }}>{t(errors.payments)}</div>}
                </div>
            </div>

            {/* ── STICKY FOOTER — Bill Summary + Create button ─────────────── */}
            <div style={{
                borderTop: `2px solid ${C.border}`,
                background: "#fff",
                padding: "10px 12px",
                flexShrink: 0,
                boxShadow: "0 -2px 8px rgba(0,109,91,0.08)",
            }}>
                {/* Summary rows */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                    {[
                        { label: t("Subtotal (excl. VAT)"), arabic: "المجموع", val: formData.total },
                        { label: `${t("VAT")} (${formData.vat_percent}%)`, arabic: "الضريبة", val: formData.vat_price },
                        ...(discount > 0 ? [{ label: t("Discount"), arabic: "الخصم", val: discount, neg: true }] : []),
                    ].map((r, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>
                                {r.label} <span style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 700, fontSize: 10 }}>{r.arabic}</span>
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: r.neg ? C.danger : C.text }}>
                                {r.neg ? "−" : ""}<NumberFormat value={trimTo2Decimals(r.val || 0)} displayType="text" thousandSeparator renderText={v => v} />
                            </span>
                        </div>
                    ))}
                    <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>{t("NET TOTAL")} <span style={{ fontFamily: "Tajawal, sans-serif" }}>الإجمالي</span></span>
                        <span style={{ fontWeight: 800, fontSize: 22, color: C.teal, lineHeight: 1.1 }}>
                            <NumberFormat value={trimTo2Decimals(formData.net_total || 0)} displayType="text" thousandSeparator renderText={v => v} />
                            <span style={{ fontSize: 12, color: C.muted, marginLeft: 3, fontWeight: 600 }}>SAR</span>
                        </span>
                        {formData.payments_input?.filter(p => !p.deleted).length > 0 && (
                            <div style={{ fontSize: 11, color: parseFloat(balanceAmount) > 0.01 ? C.danger : C.green, fontWeight: 600, marginTop: 2 }}>
                                {parseFloat(balanceAmount) > 0.01 ? `${t("Balance")}: ${trimTo2Decimals(balanceAmount)}` : ""}
                                {pill(payBg, payColor, payLabel)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Create / Update button */}
                <button type="button" onClick={e => { e.preventDefault(); handleCreate(e); }}
                    style={{
                        width: "100%", height: 52,
                        background: `linear-gradient(135deg, ${C.tealDk} 0%, ${C.teal} 100%)`,
                        color: "#fff", border: "none", borderRadius: 10,
                        fontSize: 16, fontWeight: 800, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: `0 4px 12px rgba(0,109,91,0.35)`,
                        letterSpacing: "0.01em",
                    }}>
                    {isSubmitting
                        ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />
                        : <>
                            <i className="bi bi-check2-circle" style={{ fontSize: 20 }} />
                            {isUpdateForm ? t("Update Sale") : t("Create Sale")}
                            <span style={{ fontSize: 12, fontFamily: "Tajawal, sans-serif", opacity: 0.85 }}>
                                {isUpdateForm ? "تحديث" : "إنشاء"}
                            </span>
                        </>
                    }
                </button>

                <button type="button" onClick={handleClose}
                    style={{ width: "100%", marginTop: 6, background: "transparent", border: `1px solid ${C.borderN}`, borderRadius: 8, padding: "8px 0", fontSize: 13, color: C.muted, cursor: "pointer" }}>
                    {t("Close")}
                </button>
            </div>
        </form>
    );
}
