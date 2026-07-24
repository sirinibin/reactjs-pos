import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { DebounceInput } from "react-debounce-input";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { trimTo2Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";
import { ObjectToSearchQueryParams } from "../utils/queryUtils.js";
import VehicleCreate from "../vehicle/create.js";

const CUST_COLS_T5 = [
    { key: 'code', label: 'Code', w: '12%' },
    { key: 'name', label: 'Name', w: '38%' },
    { key: 'phone', label: 'Phone', w: '20%' },
    { key: 'vat_no', label: 'VAT No.', w: '18%' },
    { key: 'credit_balance', label: 'Balance', w: '12%' },
];


function buildVehicleSnapshot(vehicle) {
    if (!vehicle) return undefined;
    return {
        vehicle_number: vehicle.vehicle_number || "",
        chassis_number: vehicle.chassis_number || "",
        brand: vehicle.brand || "",
        model: vehicle.model || "",
        variant: vehicle.variant || "",
        year: vehicle.year ? parseFloat(vehicle.year) : 0,
        engine_number: vehicle.engine_number || "",
        current_km: vehicle.current_km ? parseFloat(vehicle.current_km) : 0,
        istimara_no: vehicle.istimara_no || "",
    };
}

function vehicleDisplayLabel(vehicle) {
    const modelName = [vehicle?.brand, vehicle?.model, vehicle?.variant].filter(Boolean).join(" ");
    const refNo = vehicle?.vehicle_number || vehicle?.istimara_no || vehicle?.chassis_number;
    return [modelName, refNo].filter(Boolean).join(" — ") || vehicle?.vehicle_number || vehicle?.istimara_no || "—";
}

const pageBg = "#f8fafc";
const borderColor = "#c3c6d7";
const inputStyle = {
    border: `1px solid ${borderColor}`,
    borderRadius: "6px",
    padding: "7px 12px",
    fontSize: "13px",
    fontFamily: '"Inter", sans-serif',
    width: "100%",
    outline: "none",
    color: "#191c1e",
    background: "#fff",
};
const cardStyle = {
    background: "#fff",
    border: `1px solid ${borderColor}`,
    borderRadius: "8px",
    padding: "16px 12px 12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    position: "relative",
};


export function SalesType5Header({
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
    const { t } = useTranslation("common");

    return (
        <Modal.Header style={{ backgroundColor: "#ffffff", borderBottom: `1px solid ${borderColor}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div className="sc-header-title" style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flexShrink: 1 }}>
                <h1 style={{ margin: 0, fontSize: "20px", lineHeight: "28px", fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e", whiteSpace: "nowrap" }}>
                    {isUpdateForm ? `${t("Update Sales")} #${formData.code}` : t("Create New Sales Order (Workshop)")}
                </h1>
                {!isUpdateForm && store?.zatca?.phase === "2" && store?.zatca?.connected && (
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#434655", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        <input type="checkbox" className="form-check-input" id="sales_report_to_zatca" name="report_to_zatca" checked={formData.enable_report_to_zatca} onChange={() => { formData.enable_report_to_zatca = !formData.enable_report_to_zatca; setFormData({ ...formData }); }} style={{ width: "14px", height: "14px", margin: 0 }} />
                        {t("Report to Zatca")}
                    </label>
                )}
            </div>

            <div className="sc-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" disabled={disablePreviousButton} onClick={(e) => { e.preventDefault(); if (isUpdateForm) { openPreviousForm(); } else { openLastForm(); } }} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: disablePreviousButton ? 0.5 : 1 }}>
                    <i className="bi-chevron-double-left" style={{ fontSize: "13px" }}></i> {t("Previous")}
                </button>
                <button type="button" disabled={!isUpdateForm} onClick={(e) => { e.preventDefault(); openNextForm(); }} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                    {t("Next")} <i className="bi-chevron-double-right" style={{ fontSize: "13px" }}></i>
                </button>
                <button type="button" disabled={!isUpdateForm} onClick={(e) => { e.preventDefault(); openCreateForm(); }} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                    <i className="bi bi-plus" style={{ fontSize: "14px" }}></i> {t("Create New")}
                </button>
                <button type="button" disabled={!isUpdateForm} onClick={openPrint} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                    <i className="bi bi-printer" style={{ fontSize: "14px" }}></i> {t("Print")}
                </button>
                <button type="button" disabled={!isUpdateForm} onClick={openPreview} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                    <i className="bi bi-file-earmark-pdf" style={{ fontSize: "14px" }}></i> {t("Print A4")}
                </button>
                <button type="button" onClick={(e) => { e.preventDefault(); handleCreate(e); }} style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#004ac6", color: "#ffffff", border: "none", padding: "6px 16px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer", minWidth: "70px", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                    {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : <><i className="bi bi-check2" style={{ fontSize: "14px" }}></i> {isUpdateForm ? t("Update") : t("Create")}</>}
                </button>
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" style={{ marginLeft: "4px" }}></button>
            </div>
        </Modal.Header>
    );
}

export function SalesType5Body({
    formData, setFormData,
    errors, setErrors,
    selectedProducts, setSelectedProducts,
    selectedCustomers, setSelectedCustomers,
    isZatcaReported,
    store,
    openCustomerSearchResult, setOpenCustomerSearchResult,
    openProductSearchResult, setOpenProductSearchResult,
    customerOptions, setCustomerOptions,
    productOptions, setProductOptions,
    timerRef,
    customerSearchRef,
    productSearchRef,
    inputRefs,
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
    addNewPayment,
    removePayment,
    validatePaymentAmounts,
    CalCulateLineTotals,
    reCalculate,
    checkErrors,
    checkWarnings,
    isProductAdded,
    sendWhatsAppMessage,
    dateLocale,
    openUpdateProductForm,
    discount, setDiscount,
    setDiscountWithVAT,
    shipping, setShipping,
    totalPaymentAmount,
    balanceAmount,
    paymentStatus,
    isSubmitting,
    isUpdateForm,
    handleClose,
    fetchAndSetCustomer,
}) {
    const { t } = useTranslation("common");
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isVehicleLoading, setIsVehicleLoading] = useState(false);
    const paymentRowsRef = useRef(null);
    const vehicleCreateRef = useRef(null);
    const storeId = localStorage.getItem("store_id");
    const activeCustomer = selectedCustomers[0];
    const customerStore = activeCustomer?.stores?.[storeId] || {};
    const activeProducts = useMemo(() => (selectedProducts || []).filter((product) => !product.deleted), [selectedProducts]);
    const paymentRows = (formData.payments_input || []).filter((payment) => !payment.deleted);
    const canUseType5 = !!store?.settings?.enable_automobile_module;

    function removeDepositPayments() {
        if (!formData.payments_input) return;
        const hadDeposit = formData.payments_input.some((payment) => payment.reference_type === "customer_deposit" && !payment.deleted);
        if (!hadDeposit) return;
        formData.payments_input = formData.payments_input.filter((payment) => payment.reference_type !== "customer_deposit");
        const firstMain = formData.payments_input.find((payment) => !payment.reference_type && !payment.deleted);
        if (firstMain && formData.net_total > 0) {
            firstMain.amount = parseFloat(trimTo2Decimals(formData.net_total));
        }
    }

    function queueRecalculate(index) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (index !== undefined && index !== null) {
                CalCulateLineTotals(index);
                checkWarnings(index);
                checkErrors(index);
            }
            reCalculate(index);
        }, 120);
    }

    function setVehicleSelection(vehicle) {
        formData.vehicle_id = vehicle?.id || "";
        formData.vehicle_snapshot = buildVehicleSnapshot(vehicle);
        setSelectedVehicle(vehicle || null);
        setFormData({ ...formData });
    }

    useEffect(() => {
        if (!canUseType5) return;
        const customerId = formData.customer_id;
        let cancelled = false;

        if (!customerId) {
            setVehicleOptions([]);
            setSelectedVehicle(null);
            if (formData.vehicle_id || formData.vehicle_snapshot) {
                formData.vehicle_id = "";
                formData.vehicle_snapshot = undefined;
                setFormData({ ...formData });
            }
            return undefined;
        }

        const searchParams = {
            "search[customer_id]": customerId,
            limit: 1000,
            select: "id,customer_id,customer_name,vehicle_number,brand,model,variant,year,engine_number,istimara_no,chassis_number,current_km",
        };
        if (storeId) {
            searchParams.store_id = storeId;
        }
        const queryParams = ObjectToSearchQueryParams(searchParams);

        setIsVehicleLoading(true);
        fetch(`/v1/vehicle?${queryParams}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        })
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson ? await response.json() : {};
                if (!response.ok) return Promise.reject(data?.errors);
                return data?.result || [];
            })
            .then((vehicles) => {
                if (cancelled) return;
                setVehicleOptions(vehicles);
                const matchedVehicle = vehicles.find((vehicle) => vehicle.id === formData.vehicle_id);
                if (matchedVehicle) {
                    setSelectedVehicle(matchedVehicle);
                } else if (formData.vehicle_id && formData.vehicle_snapshot) {
                    setSelectedVehicle({ id: formData.vehicle_id, ...formData.vehicle_snapshot });
                } else {
                    setSelectedVehicle(null);
                }
                setIsVehicleLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setVehicleOptions([]);
                setSelectedVehicle(formData.vehicle_id && formData.vehicle_snapshot ? { id: formData.vehicle_id, ...formData.vehicle_snapshot } : null);
                setIsVehicleLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // formData is a mutable ref-like object (see codebase convention); only react to
        // customer/store changes, not every formData mutation, to avoid refetch loops.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canUseType5, formData.customer_id, setFormData, storeId]);

    function reloadVehicles(selectId) {
        if (!formData.customer_id) return;
        const searchParams = {
            "search[customer_id]": formData.customer_id,
            limit: 1000,
            select: "id,customer_id,customer_name,vehicle_number,brand,model,variant,year,engine_number,istimara_no,chassis_number,current_km",
        };
        if (storeId) searchParams.store_id = storeId;
        fetch(`/v1/vehicle?${ObjectToSearchQueryParams(searchParams)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        })
            .then(async (res) => {
                const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : {};
                return data?.result || [];
            })
            .then((vehicles) => {
                setVehicleOptions(vehicles);
                if (selectId) {
                    const v = vehicles.find((x) => x.id === selectId);
                    if (v) setVehicleSelection(v);
                }
            })
            .catch(() => {});
    }

    const vehiclePlaceholder = !formData.customer_id
        ? t("Select a customer first")
        : isVehicleLoading
            ? t("Loading vehicles...")
            : vehicleOptions.length === 0
                ? t("No vehicles found for this customer")
                : t("Select Vehicle");

    const paymentBadge = useMemo(() => {
        if (paymentStatus === "paid") return { bg: "#dcfce7", color: "#166534", label: t("Paid") };
        if (paymentStatus === "paid_partially") return { bg: "#fef3c7", color: "#b45309", label: t("Partial") };
        return { bg: "#fee2e2", color: "#b91c1c", label: t("Unpaid") };
    }, [paymentStatus, t]);

    const taxableAmount = useMemo(() => {
        if (formData.total_after_discount !== undefined && formData.total_after_discount !== null) {
            return parseFloat(formData.total_after_discount) || 0;
        }
        return (parseFloat(formData.total) || 0) - (parseFloat(discount) || 0) + (parseFloat(shipping) || 0);
    }, [discount, formData.total, formData.total_after_discount, shipping]);

    return (
        <>
        <form className="main-height overflow-hidden w-full" onSubmit={(e) => { e.preventDefault(); handleCreate(e); }} style={{ background: pageBg }}>
            <div className="h-100 d-flex flex-column flex-lg-row gap-3 p-3" style={{ overflow: "hidden" }}>

                {/* ── LEFT SCROLLABLE PANEL ── */}
                <div className="flex-grow-1" style={{ minWidth: 0, overflowY: "auto", paddingRight: "4px", paddingTop: "10px" }}>

                    {/* Customer & Vehicle card */}
                    <div style={{ ...cardStyle, marginBottom: "9px" }}>
                        <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Customer & Vehicle")}</span>

                        {/* 3-input row: Customer (narrow) | Vehicle | Date */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "end", marginBottom: "12px" }}>
                            {/* 1. Customer (narrow input box, wide dropdown) */}
                            <div style={{ flex: "0 0 auto" }}>
                                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Customer")}</label>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    <div style={{ width: "195px", minWidth: 0, borderRadius: "4px", outline: (errors.customer_id || errors.blocked) ? "2px solid #dc3545" : "none" }}>
                                        <Typeahead
                                            id="customer_id_type5"
                                            positionFixed
                                            filterBy={() => true}
                                            labelKey="search_label"
                                            isLoading={false}
                                            emptyLabel=""
                                            clearButton={false}
                                            open={openCustomerSearchResult}
                                            onChange={(selectedItems) => {
                                                delete errors.customer_id;
                                                delete errors.blocked;
                                                setErrors({ ...errors });
                                                if (selectedItems.length === 0) {
                                                    formData.customer_id = "";
                                                    formData.customer_name = "";
                                                    formData.customerName = "";
                                                    removeDepositPayments();
                                                    setSelectedCustomers([]);
                                                    setVehicleOptions([]);
                                                    setVehicleSelection(null);
                                                    setOpenCustomerSearchResult(false);
                                                    return;
                                                }
                                                const selectedCustomer = selectedItems[0];
                                                const prevCustomerId = formData.customer_id;
                                                formData.customer_id = selectedCustomer.id;
                                                formData.customer_name = selectedCustomer.name || "";
                                                formData.customerName = selectedCustomer.name || "";
                                                if (selectedCustomer.use_remarks_in_sales && selectedCustomer.remarks) {
                                                    formData.remarks = selectedCustomer.remarks;
                                                }
                                                if (selectedCustomer.phone && !formData.phone) {
                                                    formData.phone = selectedCustomer.phone;
                                                }
                                                if (prevCustomerId && prevCustomerId !== selectedCustomer.id) {
                                                    removeDepositPayments();
                                                    setVehicleOptions([]);
                                                    setVehicleSelection(null);
                                                }
                                                setFormData({ ...formData });
                                                setSelectedCustomers(selectedItems);
                                                fetchAndSetCustomer?.(selectedCustomer.id, selectedCustomer);
                                                setOpenCustomerSearchResult(false);
                                                if (store?.settings?.block_sales_after_pending_count > 0) {
                                                    const pendingCount = (selectedCustomer?.stores?.[storeId]?.sales_not_paid_count || 0) + (selectedCustomer?.stores?.[storeId]?.sales_paid_partially_count || 0);
                                                    if (pendingCount >= store.settings.block_sales_after_pending_count) {
                                                        errors.blocked = `Customer has ${pendingCount} unpaid sale(s). New sales are blocked until existing sales are paid.`;
                                                    }
                                                    setErrors({ ...errors });
                                                }
                                            }}
                                            options={customerOptions}
                                            placeholder={t("Search...")}
                                            selected={selectedCustomers}
                                            highlightOnlyResult={true}
                                            ref={customerSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") {
                                                    delete errors.customer_id;
                                                    formData.customer_id = "";
                                                    formData.customer_name = "";
                                                    formData.customerName = "";
                                                    removeDepositPayments();
                                                    setSelectedCustomers([]);
                                                    setVehicleOptions([]);
                                                    setVehicleSelection(null);
                                                    setCustomerOptions([]);
                                                    setOpenCustomerSearchResult(false);
                                                    customerSearchRef.current?.clear();
                                                }
                                            }}
                                            onInputChange={(searchTerm) => {
                                                formData.customerName = searchTerm;
                                                formData.customer_name = searchTerm;
                                                if (!searchTerm) {
                                                    formData.customer_id = "";
                                                    setSelectedCustomers([]);
                                                    setVehicleOptions([]);
                                                    setVehicleSelection(null);
                                                }
                                                setFormData({ ...formData });
                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                timerRef.current = setTimeout(() => { suggestCustomers(searchTerm); }, 350);
                                            }}
                                            renderMenu={(results, menuProps, state) => {
                                                const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                                return (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: "95vw", maxWidth: "95vw", minWidth: "300px", zIndex: 9999, padding: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                                                        <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, pointerEvents: "none" }}>
                                                            <div style={{ display: "flex", padding: "5px 10px", background: "#f8f9fa", borderBottom: "2px solid #e2e8f0", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                                {CUST_COLS_T5.map(col => (
                                                                    <div key={col.key} style={{ width: col.w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(col.label)}</div>
                                                                ))}
                                                            </div>
                                                        </MenuItem>
                                                        {results.map((option, idx) => {
                                                            const isActive = state.activeIndex === idx || results.length === 1;
                                                            return (
                                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div style={{ display: "flex", padding: "6px 10px", background: isActive ? "#e8f0fe" : (idx % 2 === 0 ? "#fff" : "#f8fafc"), alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                                                                        {CUST_COLS_T5.map(col => (
                                                                            <div key={col.key} style={{ width: col.w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: isActive ? "#191c1e" : "#374151", fontWeight: (isActive && col.key === "name") ? 700 : 400 }}>
                                                                                {col.key === "code" && (option.code ? highlightWords(option.code, searchWords, isActive) : "–")}
                                                                                {col.key === "name" && highlightWords(option.name + (option.name_in_arabic ? ` - ${option.name_in_arabic}` : ""), searchWords, isActive)}
                                                                                {col.key === "phone" && (option.phone ? highlightWords(option.phone, searchWords, isActive) : "–")}
                                                                                {col.key === "vat_no" && (option.vat_no ? highlightWords(option.vat_no, searchWords, isActive) : "–")}
                                                                                {col.key === "credit_balance" && (
                                                                                    <span style={{ fontWeight: 600, color: (option.credit_balance || 0) > 0 ? "#dc2626" : "#16a34a" }}>
                                                                                        {option.credit_balance != null ? option.credit_balance : "–"}
                                                                                    </span>
                                                                                )}
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
                                    <Button variant="outline-secondary" className="btn btn-outline-secondary btn-sm" type="button" onClick={openCustomerCreateForm} title={t("New Customer")}><i className="bi bi-plus-lg"></i></Button>
                                    <Button variant="primary" className="btn btn-primary btn-sm" type="button" onClick={openCustomers} title={t("Customer List")}><i className="bi bi-list"></i></Button>
                                    {formData.customer_id && (
                                        <Button variant="light" className="btn btn-light btn-sm border" type="button" onClick={() => openCustomerUpdateForm(formData.customer_id)} title={t("Edit Customer")}><i className="bi bi-pencil"></i></Button>
                                    )}
                                </div>
                                {errors.customer_id && <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{t(errors.customer_id)}</div>}
                                {errors.blocked && <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{errors.blocked}</div>}
                            </div>

                            {/* 2. Vehicle */}
                            <div style={{ flex: "0 0 auto" }}>
                                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Vehicle")}</label>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: "195px", fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5", border: `1px solid ${borderColor}` }}
                                        disabled={!formData.customer_id || isVehicleLoading}
                                        value={formData.vehicle_id || ""}
                                        onChange={(e) => {
                                            const vehicle = vehicleOptions.find((item) => item.id === e.target.value);
                                            setVehicleSelection(vehicle || null);
                                        }}
                                    >
                                        <option value="">{vehiclePlaceholder}</option>
                                        {vehicleOptions.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>{vehicleDisplayLabel(vehicle)}</option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        type="button"
                                        disabled={!formData.customer_id}
                                        title={t("Add Vehicle")}
                                        onClick={() => vehicleCreateRef.current?.open(undefined, formData.customer_id, { name: formData.customer_name, name_in_arabic: activeCustomer?.name_in_arabic })}
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                    </Button>
                                    {selectedVehicle && (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            type="button"
                                            title={t("Edit Vehicle")}
                                            onClick={() => vehicleCreateRef.current?.open(selectedVehicle.id, formData.customer_id, { name: formData.customer_name, name_in_arabic: activeCustomer?.name_in_arabic })}
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* 3. Date */}
                            <div style={{ flex: "0 0 180px" }}>
                                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Date")}</label>
                                <DatePicker
                                    id="date_str_type5"
                                    selected={formData.date_str ? new Date(formData.date_str) : null}
                                    value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                    className={`form-control form-control-sm${errors.date_str ? " is-invalid" : ""}`}
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    locale={dateLocale}
                                    showTimeSelect
                                    timeIntervals="1"
                                    onChange={(value) => {
                                        formData.date_str = value;
                                        setFormData({ ...formData });
                                    }}
                                />
                                {errors.date_str && <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{t(errors.date_str)}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Products & Services card */}
                    <div style={cardStyle}>
                        <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Products & Services")}</span>
                        <div className="d-flex gap-2 flex-wrap" style={{ marginBottom: "12px" }}>
                            <Button variant="outline-secondary" className="btn btn-outline-secondary btn-sm" type="button" onClick={openProductCreateForm}><i className="bi bi-box-seam me-1"></i>{t("New Product")}</Button>
                            <Button variant="outline-secondary" className="btn btn-outline-secondary btn-sm" type="button" onClick={openServiceCreateForm}><i className="bi bi-tools me-1"></i>{t("New Service")}</Button>
                            <Button variant="primary" className="btn btn-primary btn-sm" type="button" onClick={openProducts}><i className="bi bi-list me-1"></i>{t("Products")}</Button>
                            <Button variant="light" className="btn btn-light btn-sm border" type="button" onClick={openServices}><i className="bi bi-list me-1"></i>{t("Services")}</Button>
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                            <div style={{ position: "relative", width: "48px", flexShrink: 0 }}>
                                <DebounceInput
                                    element="input"
                                    minLength={3}
                                    debounceTimeout={300}
                                    placeholder=""
                                    title={t("Barcode")}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            getProductByBarCode(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                    style={{ ...inputStyle, width: "48px", padding: "7px 8px", textAlign: "center", height: "39px" }}
                                />
                                <i className="bi bi-upc-scan" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", color: "#6b7280", pointerEvents: "none" }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Typeahead
                                    id="type5_product_search"
                                    filterBy={() => true}
                                    labelKey="search_label"
                                    isLoading={false}
                                    emptyLabel=""
                                    clearButton={false}
                                    open={openProductSearchResult}
                                    ref={productSearchRef}
                                    onChange={(selectedItems) => {
                                        if (!selectedItems.length) return;
                                        const option = selectedItems[0];
                                        if (isProductAdded(option.id)) {
                                            removeProduct(option);
                                        } else {
                                            addProduct(option);
                                        }
                                        setOpenProductSearchResult(true);
                                        setTimeout(() => productSearchRef.current?.focus(), 30);
                                    }}
                                    options={productOptions}
                                    placeholder={t("Search product by name / code / barcode")}
                                    highlightOnlyResult={false}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setProductOptions([]);
                                            setOpenProductSearchResult(false);
                                            productSearchRef.current?.clear();
                                        }
                                    }}
                                    onInputChange={(searchTerm) => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => { suggestProducts(searchTerm); }, 350);
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                        const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                        return (
                                            <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: "min(96vw, 480px)", zIndex: 9999, padding: 0 }}>
                                                <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, margin: 0, pointerEvents: "auto" }}>
                                                    <div style={{ display: "flex", alignItems: "center", background: "#0f172a", padding: "7px 10px", gap: 6 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", flex: 1 }}>{t("Select Products / Services")}</span>
                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenProductSearchResult(false); productSearchRef.current?.clear(); setProductOptions([]); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓ {t("Done")}</button>
                                                    </div>
                                                </MenuItem>
                                                {results.map((option, idx) => {
                                                    const productStore = option.product_stores?.[storeId] || {};
                                                    const checked = !!isProductAdded(option.id);
                                                    return (
                                                        <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                            <div onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (checked) {
                                                                    removeProduct(option);
                                                                } else {
                                                                    addProduct(option);
                                                                }
                                                            }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: checked ? "#e8f0fe" : idx % 2 === 0 ? "#fff" : "#f8fafc", cursor: "pointer", borderBottom: "1px solid #e5e7eb" }}>
                                                                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? "#004ac6" : "#94a3b8"}`, background: checked ? "#004ac6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                    {checked && <i className="bi bi-check" style={{ color: "#fff", fontSize: 12 }}></i>}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontWeight: checked ? 700 : 500, fontSize: "13px", color: "#191c1e" }}>{highlightWords(option.name, searchWords, checked)}</div>
                                                                    {option.name_in_arabic && <div style={{ fontSize: "11px", color: "#6b7280" }}>{option.name_in_arabic}</div>}
                                                                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>{[option.item_code, option.is_service ? t("Service") : t("Product")].filter(Boolean).join(" • ")}</div>
                                                                </div>
                                                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#004ac6" }}>{productStore.retail_unit_price_with_vat ?? option.unit_price_with_vat ?? "—"}</div>
                                                                    <div style={{ fontSize: "10px", color: "#6b7280" }}>{t("Stock")}: {productStore.stock ?? "—"}</div>
                                                                </div>
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

                        <div className="table-responsive">
                            <table className="table table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: "220px", padding: "3px 6px" }}>{t("Item")}</th>
                                        <th style={{ width: "90px", padding: "3px 6px" }}>{t("P. U.Price")}</th>
                                        <th style={{ width: "80px", padding: "3px 6px" }}>{t("Qty")}</th>
                                        <th style={{ width: "90px", padding: "3px 6px" }}>{t("U.Price ex. VAT")}</th>
                                        <th style={{ width: "90px", padding: "3px 6px" }}>{t("U.Price with VAT")}</th>
                                        <th style={{ width: "110px", padding: "3px 6px" }}>{t("Line Total")}</th>
                                        <th style={{ width: "50px", padding: "3px 6px" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-5">
                                                <i className="bi bi-box-seam d-block mb-2" style={{ fontSize: "28px" }}></i>
                                                {t("Search and add products or services to continue")}
                                            </td>
                                        </tr>
                                    )}
                                    {activeProducts.map((product, index) => {
                                        const liveIndex = selectedProducts.indexOf(product);
                                        const lineTotal = trimTo2Decimals((parseFloat(product.quantity) || 0) * ((parseFloat(product.unit_price_with_vat) || 0) - (parseFloat(product.unit_discount_with_vat) || 0)));
                                        return (
                                            <tr key={`${product.product_id || product.id || product.code}-${index}`}>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, color: "#191c1e" }}>{product.name}</div>
                                                            {product.name_in_arabic && <div style={{ fontSize: "12px", color: "#6b7280" }}>{product.name_in_arabic}</div>}
                                                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{[product.code, product.unit, product.is_service ? t("Service") : t("Product")].filter(Boolean).join(" • ")}</div>
                                                        </div>
                                                        {openUpdateProductForm && (product.product_id || product.id) && (
                                                            <button type="button" onClick={() => openUpdateProductForm(product.product_id || product.id, product.is_service)}
                                                                style={{ background: "none", border: "none", padding: "2px 4px", cursor: "pointer", color: "#6b7280", flexShrink: 0 }}
                                                                title={t("Edit product")}>
                                                                <i className="bi bi-pencil" style={{ fontSize: "11px" }}></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "3px 6px", fontSize: "13px", color: "#374151", whiteSpace: "nowrap" }}>
                                                    <NumberFormat value={trimTo2Decimals(parseFloat(product.purchase_unit_price) || 0)} displayType="text" thousandSeparator renderText={(v) => v} />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="form-control form-control-sm"
                                                        value={product.quantity}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[liveIndex]) inputRefs.current[liveIndex] = {};
                                                            inputRefs.current[liveIndex][`sales_type5_product_quantity_${liveIndex}`] = el;
                                                        }}
                                                        onChange={(e) => {
                                                            selectedProducts[liveIndex].quantity = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                                                            setSelectedProducts([...selectedProducts]);
                                                            queueRecalculate(liveIndex);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="form-control form-control-sm"
                                                        style={{ width: "90px" }}
                                                        value={product.unit_price}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[liveIndex]) inputRefs.current[liveIndex] = {};
                                                            inputRefs.current[liveIndex][`sales_type5_product_price_ex_${liveIndex}`] = el;
                                                        }}
                                                        onChange={(e) => {
                                                            const value = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                                                            selectedProducts[liveIndex].unit_price = value;
                                                            const vatMultiplier = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                            selectedProducts[liveIndex].unit_price_with_vat = value === "" ? "" : trimTo2Decimals((parseFloat(value) || 0) * vatMultiplier);
                                                            setSelectedProducts([...selectedProducts]);
                                                            queueRecalculate(liveIndex);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="form-control form-control-sm"
                                                        style={{ width: "90px" }}
                                                        value={product.unit_price_with_vat}
                                                        ref={(el) => {
                                                            if (!inputRefs.current[liveIndex]) inputRefs.current[liveIndex] = {};
                                                            inputRefs.current[liveIndex][`sales_type5_product_price_${liveIndex}`] = el;
                                                        }}
                                                        onChange={(e) => {
                                                            const value = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                                                            selectedProducts[liveIndex].unit_price_with_vat = value;
                                                            const vatMultiplier = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                            selectedProducts[liveIndex].unit_price = value === "" ? "" : trimTo2Decimals((parseFloat(value) || 0) / vatMultiplier);
                                                            setSelectedProducts([...selectedProducts]);
                                                            queueRecalculate(liveIndex);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: "3px 6px", fontWeight: 700, color: "#0f172a" }}>
                                                    <NumberFormat value={lineTotal} displayType="text" thousandSeparator renderText={(value) => value} />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <button type="button" className="btn btn-link text-danger p-0" disabled={isZatcaReported} onClick={() => removeProduct(product)}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── PAYMENTS TABLE — bottom of left panel ── */}
                    <div style={{ position: "relative", border: `1px solid ${borderColor}`, borderRadius: "8px", padding: "16px 12px 12px", marginTop: "12px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Payments")}</span>
                        <div className="table-responsive">
                            <table className="table table-sm align-middle mb-0" style={{ fontSize: "12px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: "3px 6px", minWidth: "140px", whiteSpace: "nowrap" }}>{t("Date")}</th>
                                        <th style={{ padding: "3px 6px", width: "100px" }}>{t("Amount")}</th>
                                        <th style={{ padding: "3px 6px", width: "140px" }}>{t("Method")}</th>
                                        <th style={{ padding: "3px 6px" }}>{t("Description")}</th>
                                        <th style={{ padding: "3px 6px", width: "36px" }}></th>
                                    </tr>
                                </thead>
                                <tbody ref={paymentRowsRef}>
                                    {paymentRows.map((payment, index) => {
                                        const paymentIndex = formData.payments_input.indexOf(payment);
                                        return (
                                            <tr key={`payment-${paymentIndex}`}>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <DatePicker
                                                        selected={payment.date_str ? new Date(payment.date_str) : null}
                                                        onChange={(value) => {
                                                            formData.payments_input[paymentIndex].date_str = value;
                                                            setFormData({ ...formData });
                                                        }}
                                                        className="form-control form-control-sm"
                                                        dateFormat="d MMM yy h:mm aa"
                                                        showTimeSelect
                                                        timeIntervals={1}
                                                        placeholderText={t("Date")}
                                                    />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="form-control form-control-sm text-end"
                                                        value={payment.amount || ""}
                                                        placeholder={t("Amount")}
                                                        disabled={payment.reference_type === "customer_deposit" && isZatcaReported}
                                                        onChange={(e) => {
                                                            delete errors[`payment_method_${paymentIndex}`];
                                                            formData.payments_input[paymentIndex].amount = e.target.value ? parseFloat(e.target.value) : e.target.value;
                                                            setErrors({ ...errors });
                                                            setFormData({ ...formData });
                                                            validatePaymentAmounts();
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <select
                                                        className={`form-select form-select-sm${errors[`payment_method_${paymentIndex}`] ? " is-invalid" : ""}`}
                                                        style={{ fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5", border: `1px solid ${borderColor}` }}
                                                        value={payment.method || ""}
                                                        disabled={payment.reference_type === "customer_deposit" && isZatcaReported}
                                                        onChange={(e) => {
                                                            delete errors[`payment_method_${paymentIndex}`];
                                                            formData.payments_input[paymentIndex].method = e.target.value;
                                                            setErrors({ ...errors });
                                                            setFormData({ ...formData });
                                                        }}
                                                    >
                                                        <option value="">{t("Method")}</option>
                                                        <option value="cash">{t("Cash")}</option>
                                                        <option value="mada">Mada</option>
                                                        <option value="debit_card">{t("Debit Card")}</option>
                                                        <option value="credit_card">{t("Credit Card")}</option>
                                                        <option value="bank_transfer">{t("Bank Transfer")}</option>
                                                        <option value="bank_cheque">{t("Cheque")}</option>
                                                        <option value="credit">{t("On Account")}</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={payment.description || ""}
                                                        placeholder={t("Description")}
                                                        onChange={(e) => {
                                                            formData.payments_input[paymentIndex].description = e.target.value;
                                                            setFormData({ ...formData });
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: "3px 6px" }}>
                                                    {payment.reference_type === "customer_deposit" && isZatcaReported ? (
                                                        <i className="bi bi-lock text-muted" title={t("Cannot remove: invoice already reported to ZATCA")}></i>
                                                    ) : (
                                                        <button type="button" className="btn btn-link text-danger p-0" onClick={() => removePayment(paymentIndex)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} style={{ padding: "6px 6px 2px", borderTop: "2px solid #e5e7eb" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                                        {t("Total")}:&nbsp;
                                                        <strong style={{ color: "#191c1e" }}>
                                                            <NumberFormat value={trimTo2Decimals(totalPaymentAmount || 0)} displayType="text" thousandSeparator renderText={(value) => value} />
                                                        </strong>
                                                    </span>
                                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                                        {t("Balance")}:&nbsp;
                                                        <strong style={{ color: parseFloat(balanceAmount) > 0.01 ? "#b91c1c" : "#166534" }}>
                                                            <NumberFormat value={trimTo2Decimals(balanceAmount || 0)} displayType="text" thousandSeparator renderText={(value) => value} />
                                                        </strong>
                                                    </span>
                                                    <span style={{ background: paymentBadge.bg, color: paymentBadge.color, borderRadius: "999px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                                                        {paymentBadge.label}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => {
                                                        addNewPayment();
                                                        setTimeout(() => paymentRowsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
                                                    }}
                                                >
                                                    + {t("Add Payment")}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        {errors.payments && <div style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>{t(errors.payments)}</div>}
                    </div>
                </div>

                {/* ── ASIDE (320px) ── */}
                <aside style={{ width: "100%", maxWidth: "320px", flexShrink: 0, overflowY: "auto" }}>

                    {/* Customer & Vehicle info card */}
                    {activeCustomer && (
                        <div style={{ background: "rgba(0,74,198,0.04)", border: "1px solid #c7d7f5", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                                <i className="bi bi-person-circle" style={{ color: "#004ac6", fontSize: 16 }}></i>
                                {activeCustomer.code && (
                                    <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{activeCustomer.code}</span>
                                )}
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#191c1e" }}>{activeCustomer.name}</span>
                            </div>
                            {activeCustomer.name_in_arabic && (
                                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{activeCustomer.name_in_arabic}</div>
                            )}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#374151", marginBottom: 5 }}>
                                {activeCustomer.phone && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <i className="bi bi-telephone" style={{ color: "#6b7280", fontSize: 11 }}></i>{activeCustomer.phone}
                                    </span>
                                )}
                                {activeCustomer.phone2 && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <i className="bi bi-telephone" style={{ color: "#6b7280", fontSize: 11 }}></i>{activeCustomer.phone2}
                                    </span>
                                )}
                                {activeCustomer.vat_no && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <i className="bi bi-receipt" style={{ color: "#6b7280", fontSize: 11 }}></i>
                                        <span style={{ color: "#6b7280" }}>VAT:</span>
                                        <strong>{activeCustomer.vat_no}</strong>
                                    </span>
                                )}
                            </div>
                            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                    <i className="bi bi-wallet2" style={{ color: "#004ac6", fontSize: 12 }}></i>
                                    <span style={{ fontSize: 12, color: "#6b7280" }}>{t("Balance")}:</span>
                                    <strong style={{ fontSize: 14, color: (parseFloat(customerStore.credit_balance ?? activeCustomer.credit_balance) || 0) > 0 ? "#dc2626" : "#16a34a" }}>
                                        {parseFloat(customerStore.credit_balance ?? activeCustomer.credit_balance ?? 0).toFixed(2)}
                                    </strong>
                                </span>
                                {parseFloat(customerStore.credit_limit ?? activeCustomer.credit_limit) > 0 && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        <i className="bi bi-shield-check" style={{ color: "#6b7280", fontSize: 12 }}></i>
                                        <span style={{ fontSize: 12, color: "#6b7280" }}>{t("Limit")}:</span>
                                        <strong style={{ fontSize: 13, color: "#374151" }}>{parseFloat(customerStore.credit_limit ?? activeCustomer.credit_limit).toFixed(2)}</strong>
                                    </span>
                                )}
                            </div>
                            {selectedVehicle && (
                                <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,135,90,0.05)", border: "1px solid #b3e0cc", borderRadius: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <i className="bi bi-car-front" style={{ color: "#00875a", fontSize: 14 }}></i>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#191c1e", letterSpacing: "0.04em" }}>
                                            {selectedVehicle.vehicle_number || [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(" ") || "—"}
                                        </span>
                                        {selectedVehicle.vehicle_number && (selectedVehicle.brand || selectedVehicle.model) && (
                                            <span style={{ fontSize: 12, color: "#5e6c84" }}>{selectedVehicle.brand} {selectedVehicle.model}</span>
                                        )}
                                    </div>
                                    {selectedVehicle.year && (
                                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t("Year")}: <strong>{selectedVehicle.year}</strong></div>
                                    )}
                                    {selectedVehicle.current_km && (
                                        <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, background: "#f0faf5", border: "1px solid #b3e0cc", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                                            <i className="bi bi-speedometer2" style={{ color: "#00875a", fontSize: 11 }}></i>
                                            <strong>{parseFloat(selectedVehicle.current_km).toLocaleString()}</strong> km
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bill Summary card */}
                    <div style={cardStyle}>
                        <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Bill Summary")}</span>

                        <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
                            <div>
                                <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("Discount (excl. VAT)")}</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-control form-control-sm"
                                    value={discount || ""}
                                    onChange={(e) => {
                                        const value = e.target.value ? parseFloat(e.target.value) : "";
                                        setDiscount(value);
                                        setDiscountWithVAT(value !== "" ? parseFloat((value * (1 + ((parseFloat(formData.vat_percent) || 0) / 100))).toFixed(2)) : "");
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => reCalculate(), 150);
                                    }}
                                />
                            </div>
                            <div>
                                <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("Shipping / Handling")}</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-control form-control-sm"
                                    value={shipping || ""}
                                    onChange={(e) => {
                                        const value = e.target.value ? parseFloat(e.target.value) : 0;
                                        setShipping(value);
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => reCalculate(), 150);
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "grid", gap: "8px" }}>
                            {[
                                { label: t("Subtotal"), value: formData.total || 0 },
                                { label: t("Discount"), value: discount || 0, negative: true },
                                { label: t("Taxable Amount"), value: taxableAmount },
                                { label: `${t("VAT")} (${formData.vat_percent || 0}%)`, value: formData.vat_price || 0 },
                                { label: t("Shipping / Handling"), value: shipping || 0 },
                            ].map((row) => (
                                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "13px" }}>
                                    <span style={{ color: "#6b7280" }}>{row.label}</span>
                                    <span style={{ fontWeight: 600, color: row.negative ? "#b91c1c" : "#191c1e" }}>
                                        {row.negative ? "−" : ""}
                                        <NumberFormat value={trimTo2Decimals(row.value || 0)} displayType="text" thousandSeparator renderText={(value) => value} />
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "10px", paddingTop: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                                <span style={{ fontSize: "14px", fontWeight: 700, color: "#191c1e" }}>{t("Net Total")}</span>
                                <span style={{ fontSize: "22px", fontWeight: 800, color: "#004ac6", lineHeight: 1 }}>
                                    <NumberFormat value={trimTo2Decimals(formData.net_total || 0)} displayType="text" thousandSeparator renderText={(value) => value} />
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px", fontSize: "13px" }}>
                                <span style={{ color: "#6b7280" }}>{t("Total Payments")}</span>
                                <span style={{ fontWeight: 600, color: "#191c1e" }}><NumberFormat value={trimTo2Decimals(totalPaymentAmount || 0)} displayType="text" thousandSeparator renderText={(value) => value} /></span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "13px" }}>
                                <span style={{ color: "#6b7280" }}>{t("Balance")}</span>
                                <span style={{ fontWeight: 700, color: parseFloat(balanceAmount) > 0.01 ? "#b91c1c" : "#166534" }}><NumberFormat value={trimTo2Decimals(balanceAmount || 0)} displayType="text" thousandSeparator renderText={(value) => value} /></span>
                            </div>
                            <div style={{ marginTop: "9px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>{t("Payment Status")}</span>
                                <span style={{ background: paymentBadge.bg, color: paymentBadge.color, borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>{paymentBadge.label}</span>
                            </div>
                        </div>

                        <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
                            <button type="submit" disabled={isSubmitting} style={{ background: "#004ac6", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 14px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                                {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : (isUpdateForm ? t("Update Sale") : t("Create Sale"))}
                            </button>
                            <button type="button" onClick={handleClose} style={{ background: "#fff", color: "#475569", border: `1px solid ${borderColor}`, borderRadius: "6px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                                {t("Close")}
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </form>
        <VehicleCreate
            ref={vehicleCreateRef}
            refreshList={() => {}}
            openDetailsView={(newId) => reloadVehicles(newId)}
        />
        </>
    );
}
