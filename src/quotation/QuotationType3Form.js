import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { trimTo2Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";
import { ObjectToSearchQueryParams } from "../utils/queryUtils.js";
import VehicleCreate from "../vehicle/create.js";

const pageBg = "#f8fafc";
const borderColor = "#c3c6d7";
const cardStyle = { background: "#fff", border: `1px solid ${borderColor}`, borderRadius: "8px", padding: "16px 12px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", position: "relative" };

const CUST_COLS = [
    { key: 'code', label: 'Code', w: '12%' }, { key: 'name', label: 'Name', w: '38%' },
    { key: 'phone', label: 'Phone', w: '20%' }, { key: 'vat_no', label: 'VAT No.', w: '18%' },
    { key: 'credit_balance', label: 'Balance', w: '12%' },
];

function buildVehicleSnapshot(v) {
    if (!v) return undefined;
    return { vehicle_number: v.vehicle_number || "", chassis_number: v.chassis_number || "", brand: v.brand || "", model: v.model || "", variant: v.variant || "", year: v.year ? parseFloat(v.year) : 0, engine_number: v.engine_number || "", current_km: v.current_km ? parseFloat(v.current_km) : 0, istimara_no: v.istimara_no || "" };
}

function vehicleLabel(v) {
    const mn = [v?.brand, v?.model, v?.variant].filter(Boolean).join(" ");
    const ref = v?.vehicle_number || v?.istimara_no || v?.chassis_number;
    return [mn, ref].filter(Boolean).join(" — ") || v?.vehicle_number || "—";
}

function makePayment() { return { date_str: new Date().toISOString(), amount: 0, method: "", deleted: false }; }
function makeFormData() {
    return { type: "quotation", status: "created", price_type: "retail", vat_percent: 15, discount: 0, discount_percent: 0, discount_with_vat: 0, discount_percent_with_vat: 0, shipping_handling_fees: 0, cash_discount: 0, rounding_amount: 0, auto_rounding_amount: true, total: 0, total_with_vat: 0, vat_price: 0, net_total: 0, balance_amount: 0, delivery_days: 7, validity_days: 2, date_str: new Date().toISOString(), payments_input: [makePayment()], products: [] };
}

const QuotationType3Form = forwardRef((props, ref) => {
    const { t } = useTranslation("common");
    const [show, setShow] = useState(false);
    const [isUpdateForm, setIsUpdateForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(makeFormData());
    const [errors, setErrors] = useState({});
    const [toastErrors, setToastErrors] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [productOptions, setProductOptions] = useState([]);
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isVehicleLoading, setIsVehicleLoading] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [shipping, setShipping] = useState(0);
    const customerSearchRef = useRef();
    const productSearchRef = useRef();
    const vehicleCreateRef = useRef();
    const paymentRowsRef = useRef();
    const timerRef = useRef();
    const storeId = localStorage.getItem("store_id");
    const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") }), []);

    useImperativeHandle(ref, () => ({
        open(id, prefill) {
            const fd = makeFormData();
            fd.store_id = storeId;
            fd.store_name = localStorage.getItem("store_name") || "";
            if (prefill) {
                if (prefill.type) fd.type = prefill.type;
                if (prefill.customer_id) { fd.customer_id = prefill.customer_id; fd.customer_name = prefill.customer_name || ""; }
                if (prefill.vehicle_id) { fd.vehicle_id = prefill.vehicle_id; fd.vehicle_snapshot = prefill.vehicle_snapshot || undefined; }
                if (prefill.km_driven != null) fd.km_driven = prefill.km_driven;
            }
            setFormData({ ...fd });
            setSelectedProducts(prefill?.products || []);
            setSelectedCustomers(prefill?.customer ? [prefill.customer] : []);
            setVehicleOptions([]);
            setSelectedVehicle(prefill?.vehicle || null);
            setDiscount(0);
            setShipping(0);
            setErrors({});
            setToastErrors([]);
            setIsUpdateForm(false);
            if (id) {
                loadRecord(id);
                setIsUpdateForm(true);
            } else if (prefill?.products?.length) {
                setTimeout(() => reCalculate(prefill.products), 200);
            }
            setShow(true);
        },
    }));

    function handleClose() { setShow(false); }

    async function loadRecord(id) {
        try {
            const r = await fetch(`/v1/quotation/${id}?search[store_id]=${storeId}`, { headers }).then(r => r.json());
            if (!r.result) return;
            const q = r.result;
            const fd = { ...q, store_id: storeId };
            if (!fd.payments_input?.length) fd.payments_input = [makePayment()];
            setFormData(fd);
            setDiscount(q.discount || 0);
            setShipping(q.shipping_handling_fees || 0);
            if (q.products) setSelectedProducts(q.products.map(p => ({ ...p, product_id: p.product_id || p.id })));
            if (q.customer_id) setSelectedCustomers([{ id: q.customer_id, name: q.customer_name }]);
            if (q.vehicle_id) setSelectedVehicle({ id: q.vehicle_id, ...q.vehicle_snapshot });
        } catch (e) { console.error(e); }
    }

    // Load vehicles when customer changes
    useEffect(() => {
        const customerId = formData.customer_id;
        if (!customerId) { setVehicleOptions([]); setSelectedVehicle(null); return; }
        setIsVehicleLoading(true);
        const qs = ObjectToSearchQueryParams({ "search[customer_id]": customerId, store_id: storeId, limit: 1000, select: "id,customer_id,vehicle_number,brand,model,variant,year,engine_number,istimara_no,chassis_number,current_km" });
        fetch(`/v1/vehicle?${qs}`, { headers })
            .then(r => r.json()).then(data => {
                const list = data?.result || [];
                setVehicleOptions(list);
                if (formData.vehicle_id) {
                    const m = list.find(v => v.id === formData.vehicle_id);
                    if (m) setSelectedVehicle(m);
                }
            }).catch(() => {}).finally(() => setIsVehicleLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.customer_id]);

    function setVehicleSelection(v) {
        formData.vehicle_id = v?.id || null;
        formData.vehicle_snapshot = buildVehicleSnapshot(v);
        setSelectedVehicle(v || null);
        setFormData({ ...formData });
    }

    function reloadVehicles(selectId) {
        if (!formData.customer_id) return;
        const qs = ObjectToSearchQueryParams({ "search[customer_id]": formData.customer_id, store_id: storeId, limit: 1000, select: "id,customer_id,vehicle_number,brand,model,variant,year,engine_number,istimara_no,chassis_number,current_km" });
        fetch(`/v1/vehicle?${qs}`, { headers }).then(r => r.json()).then(data => {
            const list = data?.result || [];
            setVehicleOptions(list);
            if (selectId) { const v = list.find(x => x.id === selectId); if (v) setVehicleSelection(v); }
        }).catch(() => {});
    }

    function suggestCustomers(term) {
        if (!term || term.length < 2) { setCustomerOptions([]); return; }
        const qs = ObjectToSearchQueryParams({ name: term, store_id: storeId, limit: 20, select: "id,code,name,name_in_arabic,phone,vat_no,credit_balance,credit_limit,stores,use_remarks_in_sales,remarks" });
        fetch(`/v1/customer?${qs}`, { headers }).then(r => r.json()).then(data => {
            const list = data?.result || [];
            setCustomerOptions(list);
        }).catch(() => {});
    }

    function suggestProducts(term) {
        if (!term || term.length < 2) { setProductOptions([]); return; }
        const sel = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,is_service,product_stores.${storeId}.purchase_unit_price,product_stores.${storeId}.purchase_unit_price_with_vat,product_stores.${storeId}.retail_unit_price,product_stores.${storeId}.retail_unit_price_with_vat,product_stores.${storeId}.stock`;
        const qs = ObjectToSearchQueryParams({ name: term, store_id: storeId, limit: 30 }) + "&" + sel;
        fetch(`/v1/product?${qs}`, { headers }).then(r => r.json()).then(data => {
            const list = data?.result || [];
            setProductOptions(list);
        }).catch(() => {});
    }

    function isProductAdded(id) { return selectedProducts.find(p => !p.deleted && (p.product_id === id || p.id === id)); }

    function addProduct(option) {
        const ps = option.product_stores?.[storeId] || {};
        const newProd = { product_id: option.id, part_number: option.part_number || option.item_code || "", name: option.name, quantity: 1, unit_price: parseFloat(ps.retail_unit_price) || 0, unit_price_with_vat: parseFloat(ps.retail_unit_price_with_vat) || 0, purchase_unit_price: parseFloat(ps.purchase_unit_price) || 0, purchase_unit_price_with_vat: parseFloat(ps.purchase_unit_price_with_vat) || 0, unit_discount: 0, unit_discount_with_vat: 0, unit_discount_percent: 0, unit_discount_percent_with_vat: 0, unit: option.unit || "", is_service: option.is_service };
        const updated = [newProd, ...selectedProducts];
        setSelectedProducts(updated);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => reCalculate(updated), 150);
    }

    function removeProduct(product) {
        const updated = selectedProducts.filter(p => p !== product);
        setSelectedProducts(updated);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => reCalculate(updated), 150);
    }

    const reCalculate = useCallback(async (prods) => {
        const products = prods || selectedProducts;
        const disc = discount || 0;
        const ship = shipping || 0;
        const body = { ...formData, products: products.filter(p => !p.deleted).map(p => ({ product_id: p.product_id || p.id, quantity: parseFloat(p.quantity) || 0, unit_price: parseFloat(p.unit_price) || 0, unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0, unit_discount: parseFloat(p.unit_discount) || 0, unit_discount_with_vat: parseFloat(p.unit_discount_with_vat) || 0 })), discount: disc, shipping_handling_fees: ship };
        try {
            const r = await fetch("/v1/quotation/calculate-net-total", { method: "POST", headers, body: JSON.stringify(body) }).then(r => r.json());
            if (r?.result) {
                setFormData(prev => ({ ...prev, ...r.result, products: prev.products }));
            }
        } catch (e) { console.error(e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, selectedProducts, discount, shipping, headers]);

    async function handleCreate(e) {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        let haveErrors = false;
        const errs = {};
        if (!formData.customer_id) { errs.customer_id = "Customer is required"; haveErrors = true; }
        if (!formData.date_str) { errs.date_str = "Date is required"; haveErrors = true; }
        if (selectedProducts.filter(p => !p.deleted).length === 0) { errs.products = "Add at least one product"; haveErrors = true; }
        if (formData.type === 'invoice') {
            const paymentMethods = (formData.payments_input || []).filter(p => !p.deleted);
            paymentMethods.forEach((p, i) => { if (!p.method) { errs[`payment_method_${i}`] = "Method is required"; haveErrors = true; } });
        }
        if (haveErrors) {
            setErrors({ ...errs });
            setToastErrors(Object.values(errs));
            setTimeout(() => setToastErrors([]), 5000);
            return;
        }

        if (!formData.vehicle_id) formData.vehicle_id = null;
        formData.store_id = storeId;
        formData.discount = discount || 0;
        formData.shipping_handling_fees = shipping || 0;
        formData.products = selectedProducts.filter(p => !p.deleted).map(p => ({
            product_id: p.product_id || p.id, part_number: p.part_number || "", name: p.name, quantity: parseFloat(p.quantity) || 0,
            unit_price: parseFloat(p.unit_price) || 0, unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0,
            purchase_unit_price: parseFloat(p.purchase_unit_price) || 0, purchase_unit_price_with_vat: parseFloat(p.purchase_unit_price_with_vat) || 0,
            unit_discount: parseFloat(p.unit_discount) || 0, unit_discount_with_vat: parseFloat(p.unit_discount_with_vat) || 0,
            unit_discount_percent: parseFloat(p.unit_discount_percent) || 0, unit_discount_percent_with_vat: parseFloat(p.unit_discount_percent_with_vat) || 0,
            unit: p.unit || "", warehouse_id: p.warehouse_id || null, warehouse_code: p.warehouse_code || null,
        }));
        if (formData.type !== 'invoice') {
            formData.payment_status = "";
            formData.payments_input = [];
        }

        const endpoint = formData.id ? `/v1/quotation/${formData.id}` : "/v1/quotation";
        const method = formData.id ? "PUT" : "POST";
        setIsSubmitting(true);
        try {
            const r = await fetch(`${endpoint}?search[store_id]=${storeId}`, { method, headers, body: JSON.stringify(formData) }).then(r => r.json());
            if (r.status === false) { setErrors(r.errors || {}); return; }
            setErrors({});
            if (props.showToastMessage) props.showToastMessage(formData.id ? t("Quotation updated successfully!") : t("Quotation created successfully!"), "success");
            if (props.refreshList) props.refreshList();
            if (!formData.id && r.result?.id) {
                setFormData(prev => ({ ...prev, id: r.result.id, code: r.result.code }));
                setIsUpdateForm(true);
                if (props.openDetailsView) props.openDetailsView(r.result.id);
            }
            // Update vehicle km from latest
            if (formData.vehicle_id) updateVehicleKm(formData.vehicle_id);
        } catch (err) {
            console.error(err);
            if (props.showToastMessage) props.showToastMessage(t("Failed to save quotation"), "danger");
        } finally { setIsSubmitting(false); }
    }

    async function updateVehicleKm(vehicleId) {
        const qs = `search[vehicle_id]=${vehicleId}&search[store_id]=${storeId}&limit=1&sort=-date_str&select=id,km_driven,date_str`;
        const [orderData, quotData] = await Promise.all([
            fetch(`/v1/order?${qs}`, { headers }).then(r => r.json()).catch(() => ({})),
            fetch(`/v1/quotation?${qs}`, { headers }).then(r => r.json()).catch(() => ({})),
        ]);
        const latest = [orderData?.result?.[0], quotData?.result?.[0]]
            .filter(r => r?.km_driven != null && r.km_driven !== '')
            .sort((a, b) => new Date(b.date_str) - new Date(a.date_str))[0];
        if (latest) {
            await fetch(`/v1/vehicle/${vehicleId}?search[store_id]=${storeId}`, { method: 'PUT', headers, body: JSON.stringify({ current_km: parseFloat(latest.km_driven) }) }).catch(() => {});
        }
    }

    const activeProducts = useMemo(() => selectedProducts.filter(p => !p.deleted), [selectedProducts]);
    const paymentRows = (formData.payments_input || []).filter(p => !p.deleted);
    const isInvoice = formData.type === 'invoice';

    const paymentBadge = useMemo(() => {
        const status = formData.payment_status;
        if (status === "paid") return { bg: "#dcfce7", color: "#166534", label: t("Paid") };
        if (status === "not_paid") return { bg: "#fee2e2", color: "#b91c1c", label: t("Unpaid") };
        if (status === "paid_partially") return { bg: "#fef9c3", color: "#a16207", label: t("Partial") };
        return { bg: "#f0f2f4", color: "#54647a", label: t("Pending") };
    }, [formData.payment_status, t]);

    const totalPaymentAmount = useMemo(() => (formData.payments_input || []).filter(p => !p.deleted).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0), [formData.payments_input]);
    const balanceAmount = trimTo2Decimals((parseFloat(formData.net_total) || 0) - totalPaymentAmount);

    const vehiclePlaceholder = !formData.customer_id ? t("Select customer first") : isVehicleLoading ? t("Loading...") : vehicleOptions.length === 0 ? t("No vehicles found") : t("Select vehicle");

    return (
        <>
        <style>{`.qt3-modal-wrap { z-index: 1070 !important; }`}</style>
        <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="qt3-modal" className="qt3-modal-wrap">
            <Modal.Header style={{ backgroundColor: "#fff", borderBottom: `1px solid ${borderColor}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e" }}>
                    {isUpdateForm ? `${t("Update")} #${formData.code}` : (isInvoice ? t("Create Invoice (Workshop)") : t("Create Quotation (Workshop)"))}
                </h1>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" onClick={(e) => handleCreate(e)} style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#004ac6", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : <><i className="bi bi-check2"></i> {isUpdateForm ? t("Update") : (isInvoice ? t("Create Invoice") : t("Create Quotation"))}</>}
                    </button>
                    <button type="button" className="btn-close" onClick={handleClose}></button>
                </div>
            </Modal.Header>

            <Modal.Body style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1 }}>
                {toastErrors.length > 0 && (
                    <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 99999, background: "#dc2626", color: "#fff", borderRadius: "8px", padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)", minWidth: "220px", maxWidth: "340px", fontSize: "13px", fontWeight: 500 }}>
                        <div style={{ fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}><i className="bi bi-exclamation-triangle-fill"></i> {t("Please fix the following")}</div>
                        <ul style={{ margin: 0, paddingLeft: "18px" }}>{toastErrors.map((msg, i) => <li key={i}>{t(msg)}</li>)}</ul>
                    </div>
                )}
                <form onSubmit={handleCreate} style={{ flex: 1, overflow: "hidden", background: pageBg, display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "row", gap: "12px", padding: "12px", overflow: "hidden" }}>

                        {/* LEFT PANEL */}
                        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingRight: "4px", paddingTop: "10px" }}>

                            {/* Customer & Vehicle */}
                            <div style={{ ...cardStyle, marginBottom: "9px" }}>
                                <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Customer & Vehicle")}</span>
                                <div style={{ display: "flex", gap: "8px", alignItems: "end", flexWrap: "wrap" }}>
                                    {/* Customer */}
                                    <div style={{ flex: "1 1 180px", position: "relative" }}>
                                        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Customer")}</label>
                                        <div style={{ outline: errors.customer_id ? "2px solid #dc3545" : "none", borderRadius: "6px" }}>
                                            <Typeahead id="qt3_customer" filterBy={() => true} labelKey="name" emptyLabel="" clearButton={false} open={customerOptions.length === 0 ? false : undefined} ref={customerSearchRef} positionFixed
                                                onChange={(items) => {
                                                    if (!items.length) return;
                                                    const c = items[0];
                                                    formData.customer_id = c.id;
                                                    formData.customer_name = c.name || "";
                                                    formData.customerName = c.name || "";
                                                    if (c.phone && !formData.phone) formData.phone = c.phone;
                                                    delete errors.customer_id;
                                                    setErrors({ ...errors });
                                                    setFormData({ ...formData });
                                                    setSelectedCustomers(items);
                                                    setCustomerOptions([]);
                                                }}
                                                options={customerOptions} selected={selectedCustomers} placeholder={t("Search customer...")} highlightOnlyResult={true}
                                                onInputChange={(t) => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestCustomers(t), 300); }}
                                                onKeyDown={(e) => { if (e.key === "Escape") { setSelectedCustomers([]); setCustomerOptions([]); customerSearchRef.current?.clear(); } }}
                                                renderMenu={(results, menuProps, state) => {
                                                    const words = state.text.toLowerCase().split(" ").filter(Boolean);
                                                    return (
                                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: "min(98vw, 560px)", zIndex: 9999, padding: 0 }}>
                                                            <div style={{ display: "flex", padding: "5px 10px", background: "#f8f9fa", borderBottom: "2px solid #e2e8f0", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                                {CUST_COLS.map(c => <div key={c.key} style={{ width: c.w }}>{c.label}</div>)}
                                                            </div>
                                                            {results.map((opt, idx) => (
                                                                <MenuItem option={opt} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div style={{ display: "flex", padding: "6px 10px", background: idx % 2 === 0 ? "#fff" : "#f8fafc", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                                                                        {CUST_COLS.map(c => <div key={c.key} style={{ width: c.w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{c.key === 'name' ? highlightWords(opt[c.key] || '', words, false) : (opt[c.key] || '')}</div>)}
                                                                    </div>
                                                                </MenuItem>
                                                            ))}
                                                        </Menu>
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Vehicle */}
                                    <div style={{ flex: "0 0 auto" }}>
                                        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Vehicle")}</label>
                                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                            <select className="form-select form-select-sm" style={{ width: "195px", fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5", border: `1px solid ${borderColor}` }}
                                                disabled={!formData.customer_id || isVehicleLoading} value={formData.vehicle_id || ""}
                                                onChange={(e) => { const v = vehicleOptions.find(x => x.id === e.target.value); setVehicleSelection(v || null); }}>
                                                <option value="">{vehiclePlaceholder}</option>
                                                {vehicleOptions.map(v => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
                                            </select>
                                            <Button variant="outline-secondary" size="sm" type="button" disabled={!formData.customer_id} title={t("Add Vehicle")} onClick={() => vehicleCreateRef.current?.open(undefined, formData.customer_id, { name: formData.customer_name })}>
                                                <i className="bi bi-plus-lg"></i>
                                            </Button>
                                            {selectedVehicle && (
                                                <Button variant="outline-primary" size="sm" type="button" title={t("Edit Vehicle")} onClick={() => vehicleCreateRef.current?.open(selectedVehicle.id, formData.customer_id, { name: formData.customer_name })}>
                                                    <i className="bi bi-pencil"></i>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Km Driven */}
                                    <div style={{ flex: "0 0 110px" }}>
                                        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Km Driven")}</label>
                                        <input type="number" min="0" step="0.1" className="form-control form-control-sm" style={{ border: `1px solid ${borderColor}` }}
                                            value={formData.km_driven ?? ""} placeholder="0" onWheel={e => e.target.blur()}
                                            onChange={e => { formData.km_driven = e.target.value === "" ? null : parseFloat(e.target.value); setFormData({ ...formData }); }} />
                                    </div>

                                    {/* Type */}
                                    <div style={{ flex: "0 0 140px" }}>
                                        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Type")}</label>
                                        <select className="form-select form-select-sm" style={{ border: `1px solid ${borderColor}`, fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5" }}
                                            value={formData.type || "quotation"}
                                            onChange={e => { formData.type = e.target.value; if (e.target.value === 'quotation') { formData.payment_status = ""; } setFormData({ ...formData }); }}>
                                            <option value="quotation">{t("Quotation")}</option>
                                            <option value="invoice">{t("Invoice")}</option>
                                        </select>
                                    </div>

                                    {/* Date */}
                                    <div style={{ flex: "0 0 180px" }}>
                                        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Date")}</label>
                                        <DatePicker id="qt3_date" selected={formData.date_str ? new Date(formData.date_str) : null}
                                            value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa") : null}
                                            className={`form-control form-control-sm${errors.date_str ? " is-invalid" : ""}`}
                                            dateFormat="MMMM d, yyyy h:mm aa" showTimeSelect timeIntervals="1"
                                            onChange={v => { formData.date_str = v; setFormData({ ...formData }); }} />
                                    </div>
                                </div>
                            </div>

                            {/* Products & Services */}
                            <div style={cardStyle}>
                                <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Products & Services")}</span>
                                <div className="d-flex gap-2 flex-wrap" style={{ marginBottom: "12px" }}>
                                    <Button variant="primary" size="sm" type="button" onClick={() => props.openProducts?.()}>
                                        <i className="bi bi-list me-1"></i>{t("Products")}
                                    </Button>
                                    <Button variant="light" size="sm" className="border" type="button" onClick={() => props.openServices?.()}>
                                        <i className="bi bi-list me-1"></i>{t("Services")}
                                    </Button>
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                                    <div style={{ flex: 1 }}>
                                        <Typeahead id="qt3_product_search" filterBy={() => true} labelKey="search_label" emptyLabel="" clearButton={false}
                                            open={productOptions.length === 0 ? false : undefined} ref={productSearchRef}
                                            onChange={(items) => {
                                                if (!items.length) return;
                                                const opt = items[0];
                                                if (isProductAdded(opt.id)) removeProduct(activeProducts.find(p => p.product_id === opt.id || p.id === opt.id));
                                                else addProduct(opt);
                                                setTimeout(() => productSearchRef.current?.focus(), 30);
                                            }}
                                            options={productOptions} placeholder={t("Search product by name / code")} highlightOnlyResult={false}
                                            onKeyDown={e => { if (e.key === "Escape") { setProductOptions([]); productSearchRef.current?.clear(); } }}
                                            onInputChange={term => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestProducts(term), 350); }}
                                            renderMenu={(results, menuProps, state) => {
                                                const words = state.text.toLowerCase().split(" ").filter(Boolean);
                                                return (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: "min(96vw, 480px)", zIndex: 9999, padding: 0 }}>
                                                        <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0 }}>
                                                            <div style={{ display: "flex", alignItems: "center", background: "#0f172a", padding: "7px 10px", gap: 6 }}>
                                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", flex: 1 }}>{t("Select Products / Services")}</span>
                                                                <button type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.preventDefault(); e.stopPropagation(); productSearchRef.current?.clear(); setProductOptions([]); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓ {t("Done")}</button>
                                                            </div>
                                                        </MenuItem>
                                                        {results.map((opt, idx) => {
                                                            const ps = opt.product_stores?.[storeId] || {};
                                                            const checked = !!isProductAdded(opt.id);
                                                            return (
                                                                <MenuItem option={opt} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div onClick={e => { e.stopPropagation(); if (checked) removeProduct(activeProducts.find(p => p.product_id === opt.id || p.id === opt.id)); else addProduct(opt); }}
                                                                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: checked ? "#e8f0fe" : idx % 2 === 0 ? "#fff" : "#f8fafc", cursor: "pointer", borderBottom: "1px solid #e5e7eb" }}>
                                                                        <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? "#004ac6" : "#94a3b8"}`, background: checked ? "#004ac6" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                            {checked && <i className="bi bi-check" style={{ color: "#fff", fontSize: 12 }}></i>}
                                                                        </div>
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ fontWeight: checked ? 700 : 500, fontSize: "13px", color: "#191c1e" }}>{highlightWords(opt.name, words, checked)}</div>
                                                                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{[opt.item_code, opt.is_service ? t("Service") : t("Product")].filter(Boolean).join(" • ")}</div>
                                                                        </div>
                                                                        <div style={{ textAlign: "right" }}>
                                                                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#004ac6" }}>{ps.retail_unit_price_with_vat ?? "—"}</div>
                                                                            <div style={{ fontSize: "10px", color: "#6b7280" }}>{t("Stock")}: {ps.stock ?? "—"}</div>
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
                                                <th style={{ width: "36px", padding: "3px 6px", color: "#6b7280", fontWeight: 600 }}>#</th>
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
                                                <tr><td colSpan={8} className="text-center text-muted py-5"><i className="bi bi-box-seam d-block mb-2" style={{ fontSize: "28px" }}></i>{t("Search and add products or services")}</td></tr>
                                            )}
                                            {activeProducts.map((product, index) => {
                                                const lineTotal = trimTo2Decimals((parseFloat(product.quantity) || 0) * ((parseFloat(product.unit_price_with_vat) || 0) - (parseFloat(product.unit_discount_with_vat) || 0)));
                                                const liveIndex = selectedProducts.indexOf(product);
                                                return (
                                                    <tr key={index}>
                                                        <td style={{ padding: "3px 6px", color: "#6b7280", fontWeight: 600, fontSize: "13px", textAlign: "center" }}>{index + 1}</td>
                                                        <td style={{ padding: "3px 6px" }}>
                                                            <div style={{ fontWeight: 600, color: "#191c1e" }}>{product.name}</div>
                                                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{[product.part_number, product.unit, product.is_service ? t("Service") : t("Product")].filter(Boolean).join(" • ")}</div>
                                                        </td>
                                                        <td style={{ padding: "3px 6px", fontSize: "13px", color: "#374151" }}>
                                                            <NumberFormat value={trimTo2Decimals(parseFloat(product.purchase_unit_price) || 0)} displayType="text" thousandSeparator renderText={v => v} />
                                                        </td>
                                                        <td style={{ padding: "3px 6px" }}>
                                                            <input type="number" min="0" className="form-control form-control-sm" value={product.quantity}
                                                                onChange={e => { selectedProducts[liveIndex].quantity = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0); setSelectedProducts([...selectedProducts]); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                                        </td>
                                                        <td style={{ padding: "3px 6px" }}>
                                                            <input type="number" min="0" className="form-control form-control-sm" style={{ width: "90px" }} value={product.unit_price}
                                                                onChange={e => { const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0); selectedProducts[liveIndex].unit_price = v; const vat = 1 + ((parseFloat(formData.vat_percent) || 0) / 100); selectedProducts[liveIndex].unit_price_with_vat = v === "" ? "" : trimTo2Decimals((parseFloat(v) || 0) * vat); setSelectedProducts([...selectedProducts]); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                                        </td>
                                                        <td style={{ padding: "3px 6px" }}>
                                                            <input type="number" min="0" className="form-control form-control-sm" style={{ width: "90px" }} value={product.unit_price_with_vat}
                                                                onChange={e => { const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0); selectedProducts[liveIndex].unit_price_with_vat = v; const vat = 1 + ((parseFloat(formData.vat_percent) || 0) / 100); selectedProducts[liveIndex].unit_price = v === "" ? "" : trimTo2Decimals((parseFloat(v) || 0) / vat); setSelectedProducts([...selectedProducts]); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                                        </td>
                                                        <td style={{ padding: "3px 6px", fontWeight: 700, color: "#0f172a" }}>
                                                            <NumberFormat value={lineTotal} displayType="text" thousandSeparator renderText={v => v} />
                                                        </td>
                                                        <td style={{ padding: "3px 6px" }}>
                                                            <button type="button" className="btn btn-link text-danger p-0" onClick={() => removeProduct(product)}><i className="bi bi-trash"></i></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Payments — only when type=invoice */}
                            {isInvoice && (
                                <div style={{ position: "relative", border: `1px solid ${borderColor}`, borderRadius: "8px", padding: "16px 12px 12px", marginTop: "12px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                                    <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Payments")}</span>
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle mb-0" style={{ fontSize: "12px" }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: "3px 6px", minWidth: "140px" }}>{t("Date")}</th>
                                                    <th style={{ padding: "3px 6px", width: "100px" }}>{t("Amount")}</th>
                                                    <th style={{ padding: "3px 6px", width: "140px" }}>{t("Method")}</th>
                                                    <th style={{ padding: "3px 6px" }}>{t("Description")}</th>
                                                    <th style={{ padding: "3px 6px", width: "36px" }}></th>
                                                </tr>
                                            </thead>
                                            <tbody ref={paymentRowsRef}>
                                                {paymentRows.map((payment, index) => {
                                                    const pi = (formData.payments_input || []).indexOf(payment);
                                                    return (
                                                        <tr key={`payment-${pi}`}>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <DatePicker selected={payment.date_str ? new Date(payment.date_str) : null} onChange={v => { formData.payments_input[pi].date_str = v; setFormData({ ...formData }); }} className="form-control form-control-sm" dateFormat="d MMM yy h:mm aa" showTimeSelect timeIntervals={1} placeholderText={t("Date")} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <input type="number" min="0" className="form-control form-control-sm text-end" value={payment.amount || ""} placeholder={t("Amount")} onChange={e => { formData.payments_input[pi].amount = e.target.value ? parseFloat(e.target.value) : ""; setFormData({ ...formData }); }} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <select className={`form-select form-select-sm${errors[`payment_method_${index}`] ? " is-invalid" : ""}`} style={{ fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5", border: `1px solid ${borderColor}` }}
                                                                    value={payment.method || ""} onChange={e => { delete errors[`payment_method_${index}`]; formData.payments_input[pi].method = e.target.value; setErrors({ ...errors }); setFormData({ ...formData }); }}>
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
                                                                <input type="text" className="form-control form-control-sm" value={payment.description || ""} placeholder={t("Description")} onChange={e => { formData.payments_input[pi].description = e.target.value; setFormData({ ...formData }); }} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <button type="button" className="btn btn-link text-danger p-0" onClick={() => { formData.payments_input[pi].deleted = true; setFormData({ ...formData }); }}><i className="bi bi-trash"></i></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={5} style={{ padding: "6px 6px 2px", borderTop: "2px solid #e5e7eb" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                                                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                                                <span style={{ fontSize: "12px", color: "#6b7280" }}>{t("Total")}: <strong style={{ color: "#191c1e" }}><NumberFormat value={trimTo2Decimals(totalPaymentAmount || 0)} displayType="text" thousandSeparator renderText={v => v} /></strong></span>
                                                                <span style={{ fontSize: "12px", color: "#6b7280" }}>{t("Balance")}: <strong style={{ color: parseFloat(balanceAmount) > 0.01 ? "#b91c1c" : "#166534" }}><NumberFormat value={trimTo2Decimals(balanceAmount || 0)} displayType="text" thousandSeparator renderText={v => v} /></strong></span>
                                                                <span style={{ background: paymentBadge.bg, color: paymentBadge.color, borderRadius: "999px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>{paymentBadge.label}</span>
                                                            </div>
                                                            <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (!formData.payments_input) formData.payments_input = []; formData.payments_input.push(makePayment()); setFormData({ ...formData }); setTimeout(() => paymentRowsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80); }}>+ {t("Add Payment")}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT ASIDE */}
                        <aside style={{ width: "100%", maxWidth: "320px", flexShrink: 0, overflowY: "auto", paddingTop: "10px" }}>
                            {/* Bill Summary */}
                            <div style={cardStyle}>
                                <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Bill Summary")}</span>

                                <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
                                    <div>
                                        <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("Discount (excl. VAT)")}</label>
                                        <input type="number" min="0" className="form-control form-control-sm" value={discount || ""} onChange={e => { const v = e.target.value ? parseFloat(e.target.value) : 0; setDiscount(v); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                    </div>
                                    <div>
                                        <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("Shipping / Handling")}</label>
                                        <input type="number" min="0" className="form-control form-control-sm" value={shipping || ""} onChange={e => { const v = e.target.value ? parseFloat(e.target.value) : 0; setShipping(v); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                    </div>
                                    <div>
                                        <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("Remarks")}</label>
                                        <input type="text" className="form-control form-control-sm" value={formData.remarks || ""} onChange={e => { formData.remarks = e.target.value; setFormData({ ...formData }); }} />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gap: "8px" }}>
                                    {[
                                        { label: t("Subtotal"), value: formData.total || 0 },
                                        { label: t("Discount"), value: discount || 0, negative: true },
                                        { label: `${t("VAT")} (${formData.vat_percent || 0}%)`, value: formData.vat_price || 0 },
                                        { label: t("Shipping / Handling"), value: shipping || 0 },
                                    ].map(row => (
                                        <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "13px" }}>
                                            <span style={{ color: "#6b7280" }}>{row.label}</span>
                                            <span style={{ fontWeight: 600, color: row.negative ? "#b91c1c" : "#191c1e" }}>
                                                {row.negative ? "−" : ""}
                                                <NumberFormat value={trimTo2Decimals(row.value || 0)} displayType="text" thousandSeparator renderText={v => v} />
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "10px", paddingTop: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#191c1e" }}>{t("Net Total")}</span>
                                        <span style={{ fontSize: "22px", fontWeight: 800, color: "#004ac6", lineHeight: 1 }}>
                                            <NumberFormat value={trimTo2Decimals(formData.net_total || 0)} displayType="text" thousandSeparator renderText={v => v} />
                                        </span>
                                    </div>
                                    {isInvoice && (
                                        <>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px", fontSize: "13px" }}>
                                                <span style={{ color: "#6b7280" }}>{t("Total Payments")}</span>
                                                <span style={{ fontWeight: 600, color: "#191c1e" }}><NumberFormat value={trimTo2Decimals(totalPaymentAmount || 0)} displayType="text" thousandSeparator renderText={v => v} /></span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "13px" }}>
                                                <span style={{ color: "#6b7280" }}>{t("Balance")}</span>
                                                <span style={{ fontWeight: 700, color: parseFloat(balanceAmount) > 0.01 ? "#b91c1c" : "#166534" }}><NumberFormat value={trimTo2Decimals(balanceAmount || 0)} displayType="text" thousandSeparator renderText={v => v} /></span>
                                            </div>
                                            <div style={{ marginTop: "9px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                                <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>{t("Payment Status")}</span>
                                                <span style={{ background: paymentBadge.bg, color: paymentBadge.color, borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>{paymentBadge.label}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
                                    <button type="submit" disabled={isSubmitting} style={{ background: "#004ac6", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 14px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                                        {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : (isUpdateForm ? t("Update") : (isInvoice ? t("Create Invoice") : t("Create Quotation")))}
                                    </button>
                                    <button type="button" onClick={handleClose} style={{ background: "#fff", color: "#475569", border: `1px solid ${borderColor}`, borderRadius: "6px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                                        {t("Close")}
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </form>
            </Modal.Body>
        </Modal>

        <VehicleCreate ref={vehicleCreateRef} refreshList={() => {}} openDetailsView={newId => reloadVehicles(newId)} />
        </>
    );
});

export default QuotationType3Form;
