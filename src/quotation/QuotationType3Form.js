import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Modal, Button, Spinner, OverlayTrigger, Tooltip, Dropdown } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { trimTo2Decimals, trimTo8Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";
import { ObjectToSearchQueryParams } from "../utils/queryUtils.js";
import { useDraft } from "../utils/useDraft";
import VehicleCreate from "../vehicle/create.js";
import Products from "../utils/products.js";
import OrderPreview from "../order/preview.js";
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "../utils/product_sales_return_history.js";
import PurchaseHistory from "../utils/product_purchase_history.js";
import PurchaseReturnHistory from "../utils/product_purchase_return_history.js";
import QuotationHistory from "../utils/product_quotation_history.js";
import QuotationSalesReturnHistory from "../utils/product_quotation_sales_return_history.js";
import DeliveryNoteHistory from "../utils/product_delivery_note_history.js";
import ProductNonVATSalesHistory from "../utils/product_non_vat_sales_history.js";
import ProductNonVATSalesReturnHistory from "../utils/product_non_vat_sales_return_history.js";
import CustomerPending from "../utils/customer_pending.js";

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
    return { type: "quotation", status: "created", price_type: "retail", vat_percent: 15, discount: 0, discount_percent: 0, discount_with_vat: 0, discount_percent_with_vat: 0, shipping_handling_fees: 0, cash_discount: 0, rounding_amount: 0, auto_rounding_amount: true, total: 0, total_with_vat: 0, vat_price: 0, net_total: 0, balance_amount: 0, delivery_days: 7, validity_days: 2, date_str: new Date().toISOString(), payments_input: [makePayment()], products: [], exclude_service_tax: true, exclude_product_tax: false };
}

function PortalDropdown({ renderMenu }) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const btnRef = useRef(null);

    const toggle = (e) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const openUp = window.innerHeight - rect.bottom < 260;
            setMenuStyle({
                position: 'fixed',
                top: openUp ? 'auto' : rect.bottom + 2,
                bottom: openUp ? window.innerHeight - rect.top + 2 : 'auto',
                left: Math.min(rect.left, window.innerWidth - 215),
                zIndex: 10050,
                background: '#fff',
                border: '1px solid rgba(0,0,0,.15)',
                borderRadius: '0.375rem',
                padding: '0.5rem 0',
                minWidth: '200px',
                boxShadow: '0 0.5rem 1rem rgba(0,0,0,.175)',
                fontSize: '13px',
            });
        }
        setOpen(o => !o);
    };

    const close = () => setOpen(false);

    return (
        <>
            <span ref={btnRef} onClick={toggle} style={{ cursor: 'pointer', padding: '2px 6px', display: 'inline-flex', alignItems: 'center' }}>
                <i className="bi bi-three-dots-vertical" style={{ fontSize: '14px', color: '#6b7280' }}></i>
            </span>
            {open && createPortal(
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10049 }} onClick={close} />
                    <div style={menuStyle}>{renderMenu(close)}</div>
                </>,
                document.body
            )}
        </>
    );
}

const QuotationType3Form = forwardRef((props, ref) => {
    const { t } = useTranslation("common");
    const apiBase = props.apiBase || '/v1/quotation';
    const [show, setShow] = useState(false);
    const [isUpdateForm, setIsUpdateForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [disablePreviousButton, setDisablePreviousButton] = useState(false);
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
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [discountWithVAT, setDiscountWithVAT] = useState(0);
    const [shipping, setShipping] = useState(0);
    const [vehicleReloadKey, setVehicleReloadKey] = useState(0);
    const customerSearchRef = useRef();
    const productSearchRef = useRef();
    const vehicleCreateRef = useRef();
    const productsRef = useRef();
    const paymentRowsRef = useRef();
    const timerRef = useRef();
    const reCalculateRef = useRef(null);
    const previewRef = useRef();
    const repairJobIdsRef = useRef(null);
    const SalesHistoryRef = useRef();
    const SalesReturnHistoryRef = useRef();
    const PurchaseHistoryRef = useRef();
    const PurchaseReturnHistoryRef = useRef();
    const QuotationHistoryRef = useRef();
    const QuotationSalesReturnHistoryRef = useRef();
    const DeliveryNoteHistoryRef = useRef();
    const NonVATSalesHistoryRef = useRef();
    const NonVATSalesReturnHistoryRef = useRef();
    const [showCustomerPending, setShowCustomerPending] = useState(false);
    const CustomerPendingRef = useRef();
    const clearDraftRef = useRef(() => {});
    const draftFlashShownRef = useRef(false);

    function openSalesHistory(model) { SalesHistoryRef.current?.open(model); }
    function openSalesReturnHistory(model) { SalesReturnHistoryRef.current?.open(model); }
    function openPurchaseHistory(model) { PurchaseHistoryRef.current?.open(model); }
    function openPurchaseReturnHistory(model) { PurchaseReturnHistoryRef.current?.open(model); }
    function openQuotationHistory(model) { QuotationHistoryRef.current?.open(model); }
    function openQuotationSalesHistory(model) { QuotationHistoryRef.current?.open(model, [], "invoice"); }
    function openQuotationSalesReturnHistory(model) { QuotationSalesReturnHistoryRef.current?.open(model, []); }
    function openDeliveryNoteHistory(model) { DeliveryNoteHistoryRef.current?.open(model); }
    function openNonVATSalesHistory(model) { NonVATSalesHistoryRef.current?.open(model); }
    function openNonVATSalesReturnHistory(model) { NonVATSalesReturnHistoryRef.current?.open(model); }
    function openCustomerPending(customer) {
        setShowCustomerPending(true);
        setTimeout(() => { CustomerPendingRef.current?.open(false, customer); }, 50);
    }
    const [store, setStore] = useState({});
    const [repairJobInfos, setRepairJobInfos] = useState([]);
    const [isResumingDraft, setIsResumingDraft] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [draftSavedFlash, setDraftSavedFlash] = useState(false);
    const storeId = localStorage.getItem("store_id");
    const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") }), []);

    const getFormDataForDraft = useCallback(() => ({ ...formData, products: selectedProducts }), [formData, selectedProducts]);
    const { clearDraft } = useDraft({
        enabled: !!store?.settings?.enable_drafts && formData.status !== 'draft' && !isResumingDraft,
        entityType: 'quotation',
        getFormData: getFormDataForDraft,
        productsCount: selectedProducts.filter(p => !p.deleted).length,
        onNewDraftSaved: () => {
            if (props.onDraftSaved) props.onDraftSaved();
            if (!draftFlashShownRef.current) {
                draftFlashShownRef.current = true;
                setDraftSavedFlash(true);
                setTimeout(() => setDraftSavedFlash(false), 2500);
            }
        },
    });
    clearDraftRef.current = clearDraft;

    useImperativeHandle(ref, () => ({
        open(id, prefill) {
            setIsResumingDraft(false);
            clearDraftRef.current?.();
            draftFlashShownRef.current = false;
            const fd = makeFormData();
            fd.store_id = storeId;
            fd.store_name = localStorage.getItem("store_name") || "";
            setRepairJobInfos([]);
            repairJobIdsRef.current = null;
            if (prefill) {
                if (prefill.type) fd.type = prefill.type;
                if (prefill.customer_id) { fd.customer_id = prefill.customer_id; fd.customer_name = prefill.customer_name || ""; }
                if (prefill.vehicle_id) { fd.vehicle_id = prefill.vehicle_id; fd.vehicle_snapshot = prefill.vehicle_snapshot || undefined; }
                if (prefill.km_driven != null) fd.km_driven = prefill.km_driven;
                if (prefill.repair_job_id) fd.repair_job_id = prefill.repair_job_id;
                if (prefill.repair_job_ids?.length) { fd.repair_job_ids = prefill.repair_job_ids; repairJobIdsRef.current = prefill.repair_job_ids; }
                if (prefill.repair_job_infos?.length) setRepairJobInfos(prefill.repair_job_infos);
                if (prefill.non_vat_sales_id) fd.non_vat_sales_id = prefill.non_vat_sales_id;
                if (prefill.exclude_service_tax !== undefined) fd.exclude_service_tax = prefill.exclude_service_tax;
                if (prefill.exclude_product_tax !== undefined) fd.exclude_product_tax = prefill.exclude_product_tax;
                if (prefill.vat_percent !== undefined) fd.vat_percent = prefill.vat_percent;
                if (prefill.discount !== undefined) fd.discount = prefill.discount;
                if (prefill.discount_with_vat !== undefined) fd.discount_with_vat = prefill.discount_with_vat;
                if (prefill.shipping_handling_fees !== undefined) fd.shipping_handling_fees = prefill.shipping_handling_fees;
            }
            if (apiBase !== '/v1/quotation') fd.type = 'non_vat_invoice';
            setFormData({ ...fd });
            setSelectedProducts(prefill?.products || []);
            setVehicleOptions([]);
            setSelectedVehicle(prefill?.vehicle || null);
            setDiscount(prefill?.discount || 0);
            setDiscountWithVAT(prefill?.discount_with_vat || 0);
            setShipping(prefill?.shipping_handling_fees || 0);
            setErrors({});
            setToastErrors([]);
            setIsUpdateForm(false);
            if (id) {
                loadRecord(id);
                setIsUpdateForm(true);
            } else {
                if (prefill?.products?.length) {
                    setTimeout(() => reCalculateRef.current?.(prefill.products), 300);
                }
                if (prefill?.customer_id) {
                    const customerSelect = "id,code,credit_limit,credit_balance,vat_no,name,phone,phone2,name_in_arabic,search_label,stores";
                    fetch(`/v1/customer/${prefill.customer_id}?search[store_id]=${storeId}&select=${customerSelect}`, { headers })
                        .then(cr => cr.json())
                        .then(data => setSelectedCustomers(data?.result ? [data.result] : (prefill.customer ? [prefill.customer] : [])))
                        .catch(() => setSelectedCustomers(prefill.customer ? [prefill.customer] : []));
                } else {
                    setSelectedCustomers(prefill?.customer ? [prefill.customer] : []);
                }
                if (prefill?.vehicle_id) {
                    setVehicleReloadKey(k => k + 1);
                }
            }
            setShow(true);
            fetch(`/v1/store/${storeId}`, { headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") } })
                .then(r => r.json()).then(d => { if (d.result) setStore(d.result); }).catch(() => { });
        },
        openDraft(id) {
            setIsResumingDraft(true);
            clearDraftRef.current?.();
            draftFlashShownRef.current = false;
            const fd = makeFormData();
            fd.store_id = storeId;
            fd.store_name = localStorage.getItem("store_name") || "";
            setRepairJobInfos([]);
            repairJobIdsRef.current = null;
            setFormData({ ...fd });
            setSelectedProducts([]);
            setVehicleOptions([]);
            setSelectedVehicle(null);
            setSelectedCustomers([]);
            setDiscount(0);
            setShipping(0);
            setErrors({});
            setToastErrors([]);
            setIsUpdateForm(true);
            loadRecord(id);
            setShow(true);
            fetch(`/v1/store/${storeId}`, { headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") } })
                .then(r => r.json()).then(d => { if (d.result) setStore(d.result); }).catch(() => {});
        },
    }));

    function handleClose() {
        setIsResumingDraft(false);
        clearDraftRef.current?.();
        draftFlashShownRef.current = false;
        setShow(false);
    }

    async function openCreateForm() {
        setDisablePreviousButton(false);
        const fd = makeFormData();
        fd.store_id = storeId;
        fd.store_name = localStorage.getItem("store_name") || "";
        if (apiBase !== '/v1/quotation') fd.type = 'non_vat_invoice';
        setFormData({ ...fd });
        setSelectedProducts([]);
        setSelectedCustomers([]);
        setSelectedVehicle(null);
        setDiscount(0);
        setDiscountWithVAT(0);
        setShipping(0);
        setErrors({});
        setToastErrors([]);
        setIsUpdateForm(false);
    }

    function getNavBase() {
        if (apiBase === '/v1/non-vat-sales') return { prev: '/v1/previous-non-vat-sale', next: '/v1/next-non-vat-sale', last: '/v1/last-non-vat-sale' };
        return { prev: '/v1/previous-quotation', next: '/v1/next-quotation', last: '/v1/last-quotation' };
    }

    async function openPreviousForm() {
        if (!formData.id) return;
        const qs = `search[store_id]=${storeId}`;
        const nav = getNavBase();
        const r = await fetch(`${nav.prev}/${formData.id}?${qs}`, { headers }).then(r => r.json()).catch(() => ({}));
        if (r.result?.id) {
            setDisablePreviousButton(false);
            loadRecord(r.result.id);
            setIsUpdateForm(true);
        } else {
            setDisablePreviousButton(true);
        }
    }

    async function openNextForm() {
        if (!formData.id) return;
        const qs = `search[store_id]=${storeId}`;
        const nav = getNavBase();
        const r = await fetch(`${nav.next}/${formData.id}?${qs}`, { headers }).then(r => r.json()).catch(() => ({}));
        if (r.result?.id) {
            loadRecord(r.result.id);
            setIsUpdateForm(true);
        }
    }

    async function openLastForm() {
        const qs = `search[store_id]=${storeId}`;
        const nav = getNavBase();
        const r = await fetch(`${nav.last}?${qs}`, { headers }).then(r => r.json()).catch(() => ({}));
        if (r.result?.id) {
            setDisablePreviousButton(false);
            loadRecord(r.result.id);
            setIsUpdateForm(true);
        }
    }

    async function loadRecord(id) {
        try {
            const r = await fetch(`${apiBase}/${id}?search[store_id]=${storeId}`, { headers }).then(r => r.json());
            if (!r.result) return;
            const q = r.result;
            const fd = { ...q, store_id: storeId };
            if (!fd.type && apiBase !== '/v1/quotation') fd.type = 'non_vat_invoice';
            // date_str is bson:"-" so GET doesn't return it; use the stored date field
            if (!fd.date_str && q.date) fd.date_str = q.date;
            if (!fd.payments_input?.length) {
                if (fd.payments?.length) {
                    fd.payments_input = fd.payments;
                } else {
                    fd.payments_input = [makePayment()];
                }
            }
            // Populate payment date_str from date if missing
            fd.payments_input = fd.payments_input.map(p => ({ ...p, date_str: p.date_str || p.date || new Date().toISOString() }));
            setFormData(fd);
            setDiscount(q.discount || 0);
            setDiscountWithVAT(q.discount_with_vat || 0);
            setShipping(q.shipping_handling_fees || 0);
            if (q.products) setSelectedProducts(q.products.map(p => ({ ...p, product_id: p.product_id || p.id })));
            if (q.customer_id) {
                const customerSelect = "id,code,credit_limit,credit_balance,vat_no,name,phone,phone2,name_in_arabic,search_label,stores";
                fetch(`/v1/customer/${q.customer_id}?search[store_id]=${storeId}&select=${customerSelect}`, { headers })
                    .then(cr => cr.json())
                    .then(data => setSelectedCustomers(data?.result ? [data.result] : [{ id: q.customer_id, name: q.customer_name }]))
                    .catch(() => setSelectedCustomers([{ id: q.customer_id, name: q.customer_name }]));
            }
            if (q.vehicle_id) setSelectedVehicle({ id: q.vehicle_id, ...q.vehicle_snapshot });
            if (q.repair_job_ids?.length) {
                Promise.all(q.repair_job_ids.map(jid =>
                    fetch(`/v1/repair-job/${jid}?search[store_id]=${storeId}`, { headers })
                        .then(r => r.json()).then(d => d.result ? { id: jid, job_number: d.result.job_number, customer_name: d.result.customer_name } : null).catch(() => null)
                )).then(infos => setRepairJobInfos(infos.filter(Boolean)));
            }
        } catch (e) { console.error(e); }
    }

    // Load vehicles when customer changes
    useEffect(() => {
        const customerId = formData.customer_id;
        if (!customerId) { setVehicleOptions([]); setSelectedVehicle(null); return; }
        setIsVehicleLoading(true);
        const vehicleUrl = `/v1/vehicle?limit=1000&select=id,customer_id,vehicle_number,brand,model,variant,year,engine_number,istimara_no,chassis_number,current_km&search[customer_id]=${encodeURIComponent(customerId)}&search[store_id]=${encodeURIComponent(storeId)}`;
        fetch(vehicleUrl, { headers })
            .then(r => r.json()).then(data => {
                const list = data?.result || [];
                setVehicleOptions(list);
                if (formData.vehicle_id) {
                    const matched = list.find(v => v.id === formData.vehicle_id);
                    if (matched) {
                        setSelectedVehicle(matched);
                    } else if (formData.vehicle_snapshot) {
                        const snapVehicle = { id: formData.vehicle_id, ...formData.vehicle_snapshot };
                        setVehicleOptions(prev => [snapVehicle, ...prev.filter(v => v.id !== formData.vehicle_id)]);
                        setSelectedVehicle(snapVehicle);
                    }
                }
            }).catch(() => {
                if (formData.vehicle_id && formData.vehicle_snapshot) {
                    const snapVehicle = { id: formData.vehicle_id, ...formData.vehicle_snapshot };
                    setVehicleOptions([snapVehicle]);
                    setSelectedVehicle(snapVehicle);
                }
            }).finally(() => setIsVehicleLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.customer_id, vehicleReloadKey]);

    function setVehicleSelection(v) {
        formData.vehicle_id = v?.id || null;
        formData.vehicle_snapshot = buildVehicleSnapshot(v);
        setSelectedVehicle(v || null);
        setFormData({ ...formData });
        // For new quotations, fetch latest km from records to pre-fill km_driven
        if (!formData.id && v?.id) fetchLatestKmForVehicle(v.id);
    }

    async function fetchLatestKmForVehicle(vehicleId) {
        const qs = `search[vehicle_id]=${vehicleId}&search[store_id]=${storeId}&limit=1&sort=-date&select=id,km_driven,date`;
        const [orderData, quotData] = await Promise.all([
            fetch(`/v1/order?${qs}`, { headers }).then(r => r.json()).catch(() => ({})),
            fetch(`/v1/quotation?${qs}`, { headers }).then(r => r.json()).catch(() => ({})),
        ]);
        const latest = [orderData?.result?.[0], quotData?.result?.[0]]
            .filter(r => r?.km_driven != null && r.km_driven !== '')
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (latest?.km_driven != null) {
            setFormData(prev => ({ ...prev, km_driven: parseFloat(latest.km_driven) || prev.km_driven }));
        }
    }

    function reloadVehicles(selectId) {
        if (!formData.customer_id) return;
        const vehicleUrl = `/v1/vehicle?limit=1000&select=id,customer_id,vehicle_number,brand,model,variant,year,engine_number,istimara_no,chassis_number,current_km&search[customer_id]=${encodeURIComponent(formData.customer_id)}&search[store_id]=${encodeURIComponent(storeId)}`;
        fetch(vehicleUrl, { headers }).then(r => r.json()).then(data => {
            const list = data?.result || [];
            setVehicleOptions(list);
            if (selectId) { const v = list.find(x => x.id === selectId); if (v) setVehicleSelection(v); }
        }).catch(() => { });
    }

    async function suggestCustomers(searchTerm) {
        setCustomerOptions([]);
        searchTerm = searchTerm.replace(/\s+/g, " ").trim();
        if (!searchTerm) return;
        const qs = ObjectToSearchQueryParams({ query: searchTerm, store_id: storeId });
        const select = "select=id,code,credit_limit,credit_balance,remarks,use_remarks_in_sales,vat_no,name,phone,phone2,name_in_arabic,search_label,stores";
        try {
            const r = await fetch(`/v1/customer?limit=100&${select}&${qs}`, { headers });
            const data = await r.json();
            setCustomerOptions(data?.result || []);
        } catch (e) { }
    }

    async function suggestProducts(searchTerm) {
        setProductOptions([]);
        searchTerm = searchTerm.replace(/\s+/g, " ").trim();
        if (!searchTerm) return;
        const apiTerm = searchTerm
            .replace(/([a-zA-Z؀-ۿ]{2,})(\d{2,})/g, "$1 $2")
            .replace(/(\d{2,})([a-zA-Z؀-ۿ]{2,})/g, "$1 $2")
            .split(/\s+/).map(w => w.replace(/^-+/, "")).filter(Boolean).join(" ");
        const qs = ObjectToSearchQueryParams({ search_text: apiTerm || searchTerm, store_id: storeId });
        const select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,is_service,product_stores.${storeId}.purchase_unit_price,product_stores.${storeId}.purchase_unit_price_with_vat,product_stores.${storeId}.retail_unit_price,product_stores.${storeId}.retail_unit_price_with_vat,product_stores.${storeId}.stock,product_stores.${storeId}.warehouse_stocks`;
        try {
            const r = await fetch(`/v1/product?${select}&${qs}&limit=100&sort=-country_name`, { headers });
            const data = await r.json();
            setProductOptions(data?.result || []);
        } catch (e) { }
    }

    function openProductsModal() { productsRef.current?.open(true); }
    function openServicesModal() { productsRef.current?.open(true, null, null, true); }
    function handleSelectedProductsFromModal(selected) {
        const newProds = selected.map(option => {
            const ps = option.product_stores?.[storeId] || {};
            const basePrice = parseFloat(ps.retail_unit_price) || 0;
            const priceWithVat = ((excludeServiceVat && option.is_service) || (excludeProductVat && !option.is_service)) ? basePrice : (parseFloat(ps.retail_unit_price_with_vat) || 0);
            return { product_id: option.id, part_number: option.part_number || option.item_code || "", name: option.name, quantity: 1, unit_price: basePrice, unit_price_with_vat: priceWithVat, purchase_unit_price: parseFloat(ps.purchase_unit_price) || 0, purchase_unit_price_with_vat: parseFloat(ps.purchase_unit_price_with_vat) || 0, unit_discount: 0, unit_discount_with_vat: 0, unit_discount_percent: 0, unit_discount_percent_with_vat: 0, unit: option.unit || "", is_service: option.is_service, stock: parseFloat(ps.stock) || 0, warehouse_stocks: ps.warehouse_stocks || {} };
        });
        const updated = [...newProds, ...selectedProducts];
        setSelectedProducts(updated);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => reCalculate(updated), 150);
    }

    function isProductAdded(id) { return selectedProducts.find(p => !p.deleted && (p.product_id === id || p.id === id)); }

    function addProduct(option) {
        const ps = option.product_stores?.[storeId] || {};
        const basePrice = parseFloat(ps.retail_unit_price) || 0;
        const priceWithVat = ((excludeServiceVat && option.is_service) || (excludeProductVat && !option.is_service)) ? basePrice : (parseFloat(ps.retail_unit_price_with_vat) || 0);
        const newProd = { product_id: option.id, part_number: option.part_number || option.item_code || "", name: option.name, quantity: 1, unit_price: basePrice, unit_price_with_vat: priceWithVat, purchase_unit_price: parseFloat(ps.purchase_unit_price) || 0, purchase_unit_price_with_vat: parseFloat(ps.purchase_unit_price_with_vat) || 0, unit_discount: 0, unit_discount_with_vat: 0, unit_discount_percent: 0, unit_discount_percent_with_vat: 0, unit: option.unit || "", is_service: option.is_service, stock: parseFloat(ps.stock) || 0, warehouse_stocks: ps.warehouse_stocks || {} };
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
        const body = { ...formData, products: products.filter(p => !p.deleted).map(p => ({ product_id: p.product_id || p.id, quantity: parseFloat(p.quantity) || 0, unit_price: parseFloat(p.unit_price) || 0, unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0, unit_discount: parseFloat(p.unit_discount) || 0, unit_discount_with_vat: parseFloat(p.unit_discount_with_vat) || 0, is_service: !!p.is_service })), discount: disc, shipping_handling_fees: ship };
        try {
            const r = await fetch(`${apiBase}/calculate-net-total`, { method: "POST", headers, body: JSON.stringify(body) }).then(r => r.json());
            if (r?.result) {
                setFormData(prev => {
                    const isInv = prev.type === 'invoice' || apiBase !== '/v1/quotation';
                    const newNetTotal = parseFloat(r.result.net_total) || 0;
                    let paymentsInput = prev.payments_input;
                    if (isInv && paymentsInput) {
                        const active = paymentsInput.filter(p => !p.deleted);
                        if (active.length === 1) {
                            const currentAmount = parseFloat(active[0].amount) || 0;
                            const prevNetTotal = parseFloat(prev.net_total) || 0;
                            if (currentAmount === 0 || currentAmount === prevNetTotal) {
                                const idx = paymentsInput.indexOf(active[0]);
                                if (idx >= 0) {
                                    paymentsInput = paymentsInput.map((p, i) => i === idx ? { ...p, amount: newNetTotal } : p);
                                }
                            }
                        }
                    }
                    return { ...prev, ...r.result, products: prev.products, id: prev.id, date_str: prev.date_str, payments_input: paymentsInput };
                });
            }
        } catch (e) { console.error(e); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, selectedProducts, discount, shipping, headers]);

    // Keep ref in sync so open()'s setTimeout always calls the latest version
    useEffect(() => { reCalculateRef.current = reCalculate; }, [reCalculate]);


    async function handleCreate(e) {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        let haveErrors = false;
        const errs = {};
        if (!formData.customer_id && apiBase === '/v1/quotation') { errs.customer_id = "Customer is required"; haveErrors = true; }
        if (!formData.date_str) { errs.date_str = "Date is required"; haveErrors = true; }
        if (selectedProducts.filter(p => !p.deleted).length === 0) { errs.products = "Add at least one product"; haveErrors = true; }
        if (isInvoice) {
            const paymentMethods = (formData.payments_input || []).filter(p => !p.deleted);
            paymentMethods.forEach((p, i) => { if (!p.method) { errs[`payment_method_${i}`] = "Method is required"; haveErrors = true; } });
        }
        if (haveErrors) {
            setErrors({ ...errs });
            setToastErrors(Object.values(errs));
            setTimeout(() => setToastErrors([]), 5000);
            return;
        }

        if (!formData.customer_id && apiBase !== '/v1/quotation') {
            try {
                const cr = await fetch(`/v1/customer?select=id,name,name_in_arabic&search[name]=UNKNOWN CUSTOMER&search[store_id]=${storeId}&limit=1`, { headers }).then(r => r.json());
                const unk = cr?.result?.[0];
                if (unk) { formData.customer_id = unk.id; formData.customer_name = unk.name; formData.customer_name_arabic = unk.name_in_arabic || ""; }
            } catch (_) { }
        }
        if (!formData.customer_id) formData.customer_id = null;

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
        if (formData.type === 'quotation') {
            formData.payment_status = "";
            formData.payments_input = [];
        }

        if (repairJobIdsRef.current?.length) {
            formData.repair_job_ids = repairJobIdsRef.current;
        }

        const endpoint = formData.id ? `${apiBase}/${formData.id}` : apiBase;
        const method = formData.id ? "PUT" : "POST";
        setIsSubmitting(true);
        try {
            const r = await fetch(`${endpoint}?search[store_id]=${storeId}`, { method, headers, body: JSON.stringify(formData) }).then(r => r.json());
            if (r.status === false) { setErrors(r.errors || {}); return; }
            setErrors({});
            if (props.showToastMessage) {
                const isNonVAT = apiBase !== '/v1/quotation';
                props.showToastMessage(formData.id
                    ? (isNonVAT ? t("Invoice updated successfully!") : t("Quotation updated successfully!"))
                    : (isNonVAT ? t("Invoice created successfully!") : t("Quotation created successfully!")), "success");
            }
            if (props.refreshList) props.refreshList();
            const createdRepairJobId = !formData.id ? (r.result?.repair_job_id || formData.repair_job_id) : formData.repair_job_id;
            if (!formData.id && r.result?.id) {
                setShow(false);
                if (store.settings?.enable_automobile_module && apiBase === '/v1/quotation') {
                    setTimeout(() => previewRef.current?.open({ ...r.result }, undefined, "quotation"), 100);
                } else {
                    if (props.openDetailsView) props.openDetailsView(r.result.id);
                }
                if (createdRepairJobId && props.openJobCard) props.openJobCard(createdRepairJobId);
            } else if (formData.id && !isResumingDraft) {
                setShow(false);
                if (props.openDetailsView) props.openDetailsView(formData.id);
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
            await fetch(`/v1/vehicle/${vehicleId}?search[store_id]=${storeId}`, { method: 'PUT', headers, body: JSON.stringify({ current_km: parseFloat(latest.km_driven) }) }).catch(() => { });
        }
    }

    const activeProducts = useMemo(() => selectedProducts.filter(p => !p.deleted), [selectedProducts]);
    const paymentRows = (formData.payments_input || []).filter(p => !p.deleted);
    const isNonVATForm = apiBase !== '/v1/quotation';
    const isInvoice = formData.type === 'invoice' || isNonVATForm;
    const excludeServiceVat = isNonVATForm ? !!formData.exclude_service_tax : false;
    const excludeProductVat = isNonVATForm && !!formData.exclude_product_tax;

    const totalPaymentAmount = useMemo(() => (formData.payments_input || []).filter(p => !p.deleted).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0), [formData.payments_input]);
    const balanceAmount = trimTo2Decimals((parseFloat(formData.net_total) || 0) - totalPaymentAmount);

    const paymentBadge = useMemo(() => {
        const status = formData.payment_status || (
            totalPaymentAmount <= 0 ? "not_paid" :
                balanceAmount <= 0 ? "paid" : "paid_partially"
        );
        if (status === "paid") return { bg: "#dcfce7", color: "#166534", label: t("Paid") };
        if (status === "not_paid") return { bg: "#fee2e2", color: "#b91c1c", label: t("Unpaid") };
        if (status === "paid_partially") return { bg: "#fef9c3", color: "#a16207", label: t("Partial") };
        return { bg: "#f0f2f4", color: "#54647a", label: t("Pending") };
    }, [formData.payment_status, totalPaymentAmount, balanceAmount, t]);

    const vehiclePlaceholder = !formData.customer_id ? t("Select customer first") : isVehicleLoading ? t("Loading...") : vehicleOptions.length === 0 ? t("No vehicles found") : t("Select vehicle");

    const activeCustomer = selectedCustomers[0];
    const customerStore = activeCustomer?.stores?.[storeId] || {};

    return (
        <>
            <style>{`.qt3-modal-wrap { z-index: ${props.modalClass === 'above-pending-modal' ? 1095 : 1080} !important; } .pw-modal-wrap { z-index: 1085 !important; } .vehicle-list-modal-wrap { z-index: 1086 !important; } .products-modal-wrap { z-index: 1095 !important; } .order-create-wrap { z-index: ${props.modalClass === 'above-pending-modal' ? 1095 : 1080} !important; } .order-preview-wrap { z-index: 1300 !important; }`}</style>
            <style>{`
          .qt3-main-layout { flex: 1; display: flex; flex-direction: row; gap: 12px; padding: 12px; overflow: hidden; }
          .qt3-left-panel { flex: 1; min-width: 0; overflow-y: auto; padding-right: 4px; padding-top: 10px; }
          .qt3-right-aside { width: 100%; max-width: 320px; flex-shrink: 0; overflow-y: auto; padding-top: 10px; }
          .qt3-vehicle-select { width: 195px; font-size: .875rem; padding: .25rem 2rem .25rem .5rem; line-height: 1.5; border: 1px solid #c3c6d7; }
          @media (max-width: 767px) {
            .qt3-modal-wrap .modal-body { overflow-y: auto !important; overflow-x: hidden !important; }
            .qt3-modal-wrap form { flex: none !important; min-height: 100%; overflow: visible !important; }
            .qt3-main-layout { flex-direction: column !important; overflow: visible !important; flex: none !important; padding: 8px; gap: 8px; }
            .qt3-left-panel { overflow-y: visible !important; padding-right: 0; flex: none !important; }
            .qt3-right-aside { max-width: 100% !important; overflow-y: visible !important; padding-top: 0 !important; }
            .qt3-vehicle-wrap { flex: 1 1 100% !important; }
            .qt3-vehicle-select { width: 100% !important; }
            .qt3-tax-flags { margin-left: 0 !important; width: 100%; margin-top: 4px; }
            .qt3-modal-wrap .modal-header { padding: 8px 12px !important; }
            .qt3-modal-wrap .modal-header h1 { font-size: 15px !important; }
          }
          @media (min-width: 768px) and (max-width: 1199px) {
            .qt3-right-aside { max-width: 280px; }
          }
          @media (min-width: 1920px) {
            .qt3-main-layout { gap: 16px; padding: 16px; }
            .qt3-right-aside { max-width: 400px; }
          }
          @media (min-width: 2560px) {
            .qt3-main-layout { gap: 20px; padding: 20px; }
            .qt3-right-aside { max-width: 500px; }
          }
        `}</style>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" keyboard={false} dialogClassName="qt3-modal" className={`qt3-modal-wrap${props.modalClass ? ' ' + props.modalClass : ''}`}>
                <Modal.Header style={{ backgroundColor: "#fff", borderBottom: `1px solid ${borderColor}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e" }}>
                        {isUpdateForm
                            ? (apiBase === '/v1/non-vat-sales-return' ? `${t("Update Non VAT Sales Return")} #${formData.code}` : apiBase !== '/v1/quotation' ? `${t("Update Non VAT Sales")} #${formData.code}` : `${t("Update")} #${formData.code}`)
                            : (apiBase === '/v1/non-vat-sales-return' ? t("Non VAT Sales Return Create form") : apiBase !== '/v1/quotation' ? t("Create Non VAT Sale") : (isInvoice ? t("Create Invoice") : t("Create Quotation")))}
                    </h1>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <button type="button" disabled={disablePreviousButton} onClick={(e) => { e.preventDefault(); if (isUpdateForm) { openPreviousForm(); } else { openLastForm(); } }} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: disablePreviousButton ? 0.5 : 1 }}>
                            <i className="bi-chevron-double-left" style={{ fontSize: "13px" }}></i> {t("Previous")}
                        </button>
                        <button type="button" disabled={!isUpdateForm} onClick={(e) => { e.preventDefault(); openNextForm(); }} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                            {t("Next")} <i className="bi-chevron-double-right" style={{ fontSize: "13px" }}></i>
                        </button>
                        <button type="button" disabled={!isUpdateForm} onClick={(e) => { e.preventDefault(); openCreateForm(); }} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                            <i className="bi bi-plus" style={{ fontSize: "14px" }}></i> {t("Create New")}
                        </button>
                        <button type="button" disabled={!isUpdateForm} onClick={() => previewRef.current?.open({ ...formData, store }, undefined, apiBase === '/v1/non-vat-sales-return' ? "non_vat_sales_return" : apiBase !== '/v1/quotation' ? "non_vat_invoice" : "quotation")} style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${borderColor}`, backgroundColor: "#f7f9fb", color: "#434655", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, cursor: "pointer", opacity: !isUpdateForm ? 0.5 : 1 }}>
                            <i className="bi bi-file-earmark-pdf" style={{ fontSize: "14px" }}></i> {t("Print A4")}
                        </button>
                        {props.openJobCard && (formData.repair_job_ids?.length > 0 ? (
                            <Dropdown>
                                <Dropdown.Toggle as="button" id="jc-drop-qt3" style={{ display: "flex", alignItems: "center", gap: "4px", border: "1px solid #004ac6", backgroundColor: "#f0f4ff", color: "#004ac6", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                    <i className="bi bi-tools" style={{ fontSize: "13px" }}></i>&nbsp;{formData.repair_job_ids.length}&nbsp;{t("Jobs")}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    {formData.repair_job_ids.map((id, idx) => {
                                        const info = repairJobInfos.find(j => j.id === id);
                                        return (
                                            <Dropdown.Item key={id} onClick={() => props.openJobCard(id)}>
                                                <i className="bi bi-tools me-2 text-primary"></i>
                                                {info ? `${info.job_number || ('Job ' + (idx + 1))}${info.customer_name ? ' · ' + info.customer_name : ''}` : `Job ${idx + 1}`}
                                            </Dropdown.Item>
                                        );
                                    })}
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (isUpdateForm && formData.repair_job_id) ? (
                            <button type="button" onClick={() => props.openJobCard(formData.repair_job_id)} style={{ display: "flex", alignItems: "center", gap: "4px", border: "1px solid #004ac6", backgroundColor: "#f0f4ff", color: "#004ac6", padding: "6px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                <i className="bi bi-tools" style={{ fontSize: "13px" }}></i> {t("View Job Card")}
                            </button>
                        ) : null)}
                        <button type="button" onClick={(e) => handleCreate(e)} style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#004ac6", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : <><i className="bi bi-check2"></i> {isUpdateForm ? t("Update") : (apiBase === '/v1/non-vat-sales-return' ? t("Create Non VAT Sales Return") : apiBase !== '/v1/quotation' ? t("Create Non VAT Sale") : (isInvoice ? t("Create Invoice") : t("Create Quotation")))}</>}
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
                        <div className="qt3-main-layout">

                            {/* LEFT PANEL */}
                            <div className="qt3-left-panel">

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
                                                        if (!items.length) {
                                                            formData.customer_id = "";
                                                            formData.customer_name = "";
                                                            formData.customerName = "";
                                                            formData.vehicle_id = null;
                                                            formData.vehicle_snapshot = undefined;
                                                            setSelectedVehicle(null);
                                                            setVehicleOptions([]);
                                                            delete errors.customer_id;
                                                            setErrors({ ...errors });
                                                            setSelectedCustomers([]);
                                                            setCustomerOptions([]);
                                                            setFormData({ ...formData });
                                                            return;
                                                        }
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
                                                    options={customerOptions} selected={selectedCustomers} placeholder={t("Search customer...")} highlightOnlyResult={false}
                                                    onInputChange={(t) => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestCustomers(t), 300); }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            formData.customer_id = "";
                                                            formData.customer_name = "";
                                                            formData.vehicle_id = null;
                                                            formData.vehicle_snapshot = undefined;
                                                            setSelectedVehicle(null);
                                                            setVehicleOptions([]);
                                                            setSelectedCustomers([]);
                                                            setCustomerOptions([]);
                                                            customerSearchRef.current?.clear();
                                                            setFormData({ ...formData });
                                                        }
                                                    }}
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
                                        <div className="qt3-vehicle-wrap" style={{ flex: "0 0 auto" }}>
                                            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Vehicle")}</label>
                                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                                <select className="form-select form-select-sm qt3-vehicle-select" style={{ border: `1px solid ${borderColor}` }}
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

                                        {/* Type — only shown when Enable Sales in Quotation is on */}
                                        {apiBase === '/v1/quotation' && store?.settings?.enable_sales_in_quotation && (
                                            <div style={{ flex: "0 0 140px" }}>
                                                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>{t("Type")}</label>
                                                <select className="form-select form-select-sm" style={{ border: `1px solid ${borderColor}`, fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5" }}
                                                    value={formData.type || "quotation"}
                                                    onChange={e => { formData.type = e.target.value; if (e.target.value === 'quotation') { formData.payment_status = ""; } setFormData({ ...formData }); }}>
                                                    <option value="quotation">{t("Quotation")}</option>
                                                    <option value="invoice">{t("Invoice")}</option>
                                                </select>
                                            </div>
                                        )}

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
                                    <div className="d-flex gap-2 flex-wrap align-items-center" style={{ marginBottom: "12px" }}>
                                        <Button variant="primary" size="sm" type="button" onClick={openProductsModal}>
                                            <i className="bi bi-list me-1"></i>{t("Products")}
                                        </Button>
                                        <Button variant="light" size="sm" className="border" type="button" onClick={openServicesModal}>
                                            <i className="bi bi-list me-1"></i>{t("Services")}
                                        </Button>
                                        {apiBase !== '/v1/quotation' && (
                                            <div className="qt3-tax-flags" style={{ display: "flex", gap: "20px", marginLeft: "auto" }}>
                                                <div className="form-check mb-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="qt3_exclude_service_tax"
                                                        checked={!!formData.exclude_service_tax}
                                                        disabled={apiBase === '/v1/non-vat-sales-return'}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            formData.exclude_service_tax = checked;
                                                            setFormData({ ...formData });
                                                            const vatMul = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                            const updatedProds = selectedProducts.map(p => {
                                                                if (!p.is_service) return p;
                                                                const upwv = checked ? p.unit_price : parseFloat(trimTo2Decimals(p.unit_price * vatMul));
                                                                const udwv = checked ? p.unit_discount : parseFloat(trimTo8Decimals(p.unit_discount * vatMul));
                                                                return { ...p, unit_price_with_vat: upwv, unit_discount_with_vat: udwv };
                                                            });
                                                            setSelectedProducts(updatedProds);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => reCalculateRef.current?.(updatedProds), 150);
                                                        }}
                                                    />
                                                    <label className="form-check-label fw-semibold" style={{ fontSize: "13px" }} htmlFor="qt3_exclude_service_tax">
                                                        {t("Exclude Service Tax")}
                                                    </label>
                                                </div>
                                                <div className="form-check mb-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="qt3_exclude_product_tax"
                                                        checked={!!formData.exclude_product_tax}
                                                        disabled={apiBase === '/v1/non-vat-sales-return'}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            formData.exclude_product_tax = checked;
                                                            setFormData({ ...formData });
                                                            const vatMul = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                            const updatedProds = selectedProducts.map(p => {
                                                                if (p.is_service) return p;
                                                                const upwv = checked ? p.unit_price : parseFloat(trimTo2Decimals(p.unit_price * vatMul));
                                                                const udwv = checked ? p.unit_discount : parseFloat(trimTo8Decimals(p.unit_discount * vatMul));
                                                                return { ...p, unit_price_with_vat: upwv, unit_discount_with_vat: udwv };
                                                            });
                                                            setSelectedProducts(updatedProds);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => reCalculateRef.current?.(updatedProds), 150);
                                                        }}
                                                    />
                                                    <label className="form-check-label fw-semibold" style={{ fontSize: "13px" }} htmlFor="qt3_exclude_product_tax">
                                                        {t("Exclude Products Tax")}
                                                    </label>
                                                </div>
                                            </div>
                                        )}
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
                                                            <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, pointerEvents: "auto" }}>
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
                                                    <th style={{ width: "36px", padding: "3px 6px" }}></th>
                                                    <th style={{ width: "90px", padding: "3px 6px" }}>{t("P. U.Price (Exc. VAT)")}</th>
                                                    <th style={{ width: "70px", padding: "3px 6px" }}>{t("Stock")}</th>
                                                    <th style={{ width: "80px", padding: "3px 6px" }}>{t("Qty")}</th>
                                                    <th style={{ width: "90px", padding: "3px 6px" }}>{t("U.Price Ex. VAT")}</th>
                                                    <th style={{ width: "90px", padding: "3px 6px" }}>{t("U.Price Inc. VAT")}</th>
                                                    <th style={{ width: "110px", padding: "3px 6px" }}>{t("L.Discount (Inc. VAT)")}</th>
                                                    <th style={{ width: "110px", padding: "3px 6px" }}>{t("Line Total (Inc. VAT)")}</th>
                                                    <th style={{ width: "50px", padding: "3px 6px" }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeProducts.length === 0 && (
                                                    <tr><td colSpan={11} className="text-center text-muted py-5"><i className="bi bi-box-seam d-block mb-2" style={{ fontSize: "28px" }}></i>{t("Search and add products or services")}</td></tr>
                                                )}
                                                {activeProducts.map((product, index) => {
                                                    const liveIndex = selectedProducts.indexOf(product);
                                                    return (
                                                        <tr key={index}>
                                                            <td style={{ padding: "3px 6px", color: "#6b7280", fontWeight: 600, fontSize: "13px", textAlign: "center" }}>{index + 1}</td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                                    <input type="text" className="form-control form-control-sm" style={{ fontWeight: 600, color: "#191c1e", border: "none", background: "transparent", padding: "0 2px", minWidth: 80, boxShadow: "none" }} value={product.name || ""} onChange={e => { selectedProducts[liveIndex].name = e.target.value; setSelectedProducts([...selectedProducts]); }} />
                                                                    {props.openUpdateProductForm && product.product_id && (
                                                                        <button type="button" className="btn btn-link p-0" style={{ color: "#94a3b8", lineHeight: 1, fontSize: "11px", flexShrink: 0 }} title={t("Edit product")} onClick={() => props.openUpdateProductForm(product.product_id, !!product.is_service)}><i className="bi bi-pencil"></i></button>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{[product.part_number, product.unit, product.is_service ? t("Service") : t("Product")].filter(Boolean).join(" • ")}</div>
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <PortalDropdown renderMenu={close => (<>
                                                                    <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openSalesHistory(product); close(); }}><i className="bi bi-cart-check me-2" style={{ color: '#2563eb' }}></i>{t('Sales History')}</div>
                                                                    <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openSalesReturnHistory(product); close(); }}><i className="bi bi-cart-dash me-2" style={{ color: '#dc2626' }}></i>{t('Sales Return History')}</div>
                                                                    <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openPurchaseHistory(product); close(); }}><i className="bi bi-bag-check me-2" style={{ color: '#7c3aed' }}></i>{t('Purchase History')}</div>
                                                                    <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openPurchaseReturnHistory(product); close(); }}><i className="bi bi-bag-dash me-2" style={{ color: '#db2777' }}></i>{t('Purchase Return History')}</div>
                                                                    <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openDeliveryNoteHistory(product); close(); }}><i className="bi bi-truck me-2" style={{ color: '#0891b2' }}></i>{t('Delivery Note History')}</div>
                                                                    <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openQuotationHistory(product); close(); }}><i className="bi bi-file-earmark-text me-2" style={{ color: '#d97706' }}></i>{t('Quotation History')}</div>
                                                                    {store?.settings?.enable_sales_in_quotation && (
                                                                        <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openQuotationSalesHistory(product); close(); }}><i className="bi bi-receipt me-2" style={{ color: '#16a34a' }}></i>{t('Qtn. Sales History')}</div>
                                                                    )}
                                                                    {store?.settings?.enable_sales_in_quotation && (
                                                                        <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openQuotationSalesReturnHistory(product); close(); }}><i className="bi bi-file-earmark-x me-2" style={{ color: '#be123c' }}></i>{t('Qtn. Sales Return History')}</div>
                                                                    )}
                                                                    {store?.settings?.non_vat_sales && (
                                                                        <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openNonVATSalesHistory(product); close(); }}><i className="bi bi-receipt-cutoff me-2" style={{ color: '#059669' }}></i>{t('Non VAT Sales History')}</div>
                                                                    )}
                                                                    {store?.settings?.non_vat_sales && (
                                                                        <div className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { openNonVATSalesReturnHistory(product); close(); }}><i className="bi bi-arrow-return-left me-2" style={{ color: '#9d174d' }}></i>{t('Non VAT Sales Return History')}</div>
                                                                    )}
                                                                </>)} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px", fontSize: "13px", color: "#374151" }}>
                                                                <NumberFormat value={trimTo2Decimals(parseFloat(product.purchase_unit_price) || 0)} displayType="text" thousandSeparator renderText={v => v} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px", whiteSpace: "nowrap" }}>
                                                                {!product.is_service && (
                                                                    <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={
                                                                            <Tooltip id={`qt3-stock-tooltip-${liveIndex}`}>
                                                                                {(() => {
                                                                                    const ws = product.warehouse_stocks || {};
                                                                                    const entries = [];
                                                                                    if (ws.hasOwnProperty("main_store")) entries.push(["main_store", ws["main_store"]]);
                                                                                    Object.entries(ws).forEach(([k, v]) => { if (k !== "main_store") entries.push([k, v]); });
                                                                                    const details = entries.map(([k, v]) => `${k === "main_store" ? t("Main Store") : k.replace(/^wh/, "WH").toUpperCase()}: ${v}`).join(", ");
                                                                                    return details || `${t("Main Store")}: ${product.stock ?? 0}`;
                                                                                })()}
                                                                            </Tooltip>
                                                                        }
                                                                    >
                                                                        <span style={{ cursor: "pointer", textDecoration: "underline dotted", fontSize: "13px" }}>
                                                                            {product.stock ?? 0}
                                                                        </span>
                                                                    </OverlayTrigger>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <input type="number" min="0" step="any" className="form-control form-control-sm" value={product.quantity}
                                                                    onChange={e => {
                                                                        const _newQty = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                                                                        const _oldLineDisc = selectedProducts[liveIndex].line_discount_with_vat != null
                                                                            ? selectedProducts[liveIndex].line_discount_with_vat
                                                                            : (selectedProducts[liveIndex].unit_discount_with_vat || 0) * (parseFloat(selectedProducts[liveIndex].quantity) || 1);
                                                                        selectedProducts[liveIndex].quantity = _newQty;
                                                                        if (_oldLineDisc && _newQty) {
                                                                            const vatMul = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                                            const udwv = parseFloat(trimTo8Decimals(_oldLineDisc / _newQty));
                                                                            selectedProducts[liveIndex].unit_discount_with_vat = udwv;
                                                                            selectedProducts[liveIndex].unit_discount = ((excludeServiceVat && product.is_service) || (excludeProductVat && !product.is_service))
                                                                                ? udwv
                                                                                : parseFloat(trimTo8Decimals(udwv / vatMul));
                                                                            selectedProducts[liveIndex].line_discount_with_vat = _oldLineDisc;
                                                                        }
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => reCalculate(), 150);
                                                                    }} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <input type="number" min="0" step="any" className="form-control form-control-sm" style={{ width: "90px" }} value={product.unit_price}
                                                                    onChange={e => { const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0); selectedProducts[liveIndex].unit_price = v; if ((excludeServiceVat && product.is_service) || (excludeProductVat && !product.is_service)) { selectedProducts[liveIndex].unit_price_with_vat = v; } else { const vat = 1 + ((parseFloat(formData.vat_percent) || 0) / 100); selectedProducts[liveIndex].unit_price_with_vat = v === "" ? "" : trimTo2Decimals((parseFloat(v) || 0) * vat); } setSelectedProducts([...selectedProducts]); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <input type="number" min="0" step="any" className="form-control form-control-sm" style={{ width: "90px" }} value={product.unit_price_with_vat}
                                                                    onChange={e => { const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0); selectedProducts[liveIndex].unit_price_with_vat = v; if ((excludeServiceVat && product.is_service) || (excludeProductVat && !product.is_service)) { selectedProducts[liveIndex].unit_price = v; } else { const vat = 1 + ((parseFloat(formData.vat_percent) || 0) / 100); selectedProducts[liveIndex].unit_price = v === "" ? "" : trimTo2Decimals((parseFloat(v) || 0) / vat); } setSelectedProducts([...selectedProducts]); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculate(), 150); }} />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    className="form-control form-control-sm"
                                                                    style={{ width: "100px" }}
                                                                    value={product.line_discount_with_vat != null ? product.line_discount_with_vat : (parseFloat(trimTo2Decimals((parseFloat(product.unit_discount_with_vat) || 0) * (parseFloat(product.quantity) || 0))) || "")}
                                                                    onChange={e => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const qty = parseFloat(product.quantity) || 1;
                                                                        const vatMul = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                                        const udwv = parseFloat(trimTo8Decimals(val / qty));
                                                                        selectedProducts[liveIndex].unit_discount_with_vat = udwv;
                                                                        selectedProducts[liveIndex].unit_discount = ((excludeServiceVat && product.is_service) || (excludeProductVat && !product.is_service))
                                                                            ? udwv
                                                                            : parseFloat(trimTo8Decimals(udwv / vatMul));
                                                                        selectedProducts[liveIndex].line_discount_with_vat = val;
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => reCalculate(), 150);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: "3px 6px" }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    className="form-control form-control-sm"
                                                                    style={{ width: "100px", fontWeight: 700 }}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={
                                                                        selectedProducts[liveIndex].line_total_with_vat !== undefined
                                                                            ? selectedProducts[liveIndex].line_total_with_vat
                                                                            : parseFloat(trimTo2Decimals(((selectedProducts[liveIndex].unit_price_with_vat || 0) - (selectedProducts[liveIndex].unit_discount_with_vat || 0)) * (selectedProducts[liveIndex].quantity || 0))) || ""
                                                                    }
                                                                    onFocus={(e) => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                                                    onChange={e => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        const rawVal = e.target.value;
                                                                        selectedProducts[liveIndex].line_total_with_vat = rawVal;
                                                                        setSelectedProducts([...selectedProducts]);
                                                                        timerRef.current = setTimeout(() => {
                                                                            if (!rawVal || parseFloat(rawVal) === 0) {
                                                                                selectedProducts[liveIndex].unit_price = 0;
                                                                                selectedProducts[liveIndex].unit_price_with_vat = 0;
                                                                            } else if (selectedProducts[liveIndex].quantity > 0) {
                                                                                const vatMul = 1 + ((parseFloat(formData.vat_percent) || 0) / 100);
                                                                                const udwv = parseFloat(selectedProducts[liveIndex].unit_discount_with_vat) || 0;
                                                                                const newUPwVAT = parseFloat(trimTo8Decimals(parseFloat(rawVal) / selectedProducts[liveIndex].quantity)) + udwv;
                                                                                selectedProducts[liveIndex].unit_price_with_vat = newUPwVAT;
                                                                                selectedProducts[liveIndex].unit_price = ((excludeServiceVat && product.is_service) || (excludeProductVat && !product.is_service)) ? newUPwVAT : parseFloat(trimTo8Decimals(newUPwVAT / vatMul));
                                                                            }
                                                                            selectedProducts[liveIndex].line_total_with_vat = undefined;
                                                                            setSelectedProducts([...selectedProducts]);
                                                                            reCalculate();
                                                                        }, 150);
                                                                    }}
                                                                />
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
                                                                    <input type="number" min="0" step="any" className="form-control form-control-sm text-end" value={payment.amount || ""} placeholder={t("Amount")} onChange={e => { formData.payments_input[pi].amount = e.target.value ? parseFloat(e.target.value) : ""; setFormData({ ...formData }); }} />
                                                                </td>
                                                                <td style={{ padding: "3px 6px" }}>
                                                                    <select className={`form-select form-select-sm${errors[`payment_method_${index}`] ? " is-invalid" : ""}`} style={{ fontSize: ".875rem", padding: ".25rem 2rem .25rem .5rem", lineHeight: "1.5", border: `1px solid ${borderColor}` }}
                                                                        value={payment.method || ""} onChange={e => { delete errors[`payment_method_${index}`]; formData.payments_input[pi].method = e.target.value; setErrors({ ...errors }); setFormData({ ...formData }); }}>
                                                                        <option value="">{t("Method")}</option>
                                                                        <option value="cash">{t("Cash")}</option>
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
                            <aside className="qt3-right-aside">

                                {/* Customer & Vehicle info card */}
                                {activeCustomer && (
                                    <div style={{ background: "rgba(0,74,198,0.04)", border: "1px solid #c7d7f5", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px", position: "relative" }}>
                                        <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#f0f4ff", padding: "0 4px" }}>{t("Selected Customer")}</span>
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
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => openCustomerPending(activeCustomer)} title={t("Click to view pendings")}>
                                                <i className="bi bi-wallet2" style={{ color: "#004ac6", fontSize: 12 }}></i>
                                                <span style={{ fontSize: 12, color: "#6b7280" }}>{t("Balance")}:</span>
                                                <strong style={{ fontSize: 14, color: (parseFloat(customerStore.credit_balance ?? activeCustomer.credit_balance) || 0) > 0 ? "#dc2626" : "#16a34a", textDecoration: "underline dotted" }}>
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
                                            {!isVehicleLoading && (
                                                <button type="button" onClick={() => setShowVehicleModal(true)}
                                                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                                                    <i className="bi bi-car-front" style={{ fontSize: 12 }}></i>
                                                    {vehicleOptions.length} {vehicleOptions.length === 1 ? t("vehicle") : t("vehicles")}
                                                </button>
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
                                                {(formData.km_driven != null && formData.km_driven !== '') ? (
                                                    <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, background: "#f0faf5", border: "1px solid #b3e0cc", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                                                        <i className="bi bi-speedometer2" style={{ color: "#00875a", fontSize: 11 }}></i>
                                                        <strong>{parseFloat(formData.km_driven).toLocaleString()}</strong> km
                                                    </div>
                                                ) : selectedVehicle.current_km ? (
                                                    <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, background: "#f0faf5", border: "1px solid #b3e0cc", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                                                        <i className="bi bi-speedometer2" style={{ color: "#00875a", fontSize: 11 }}></i>
                                                        <strong>{parseFloat(selectedVehicle.current_km).toLocaleString()}</strong> km
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bill Summary */}
                                <div style={cardStyle}>
                                    <span style={{ position: "absolute", top: "-8px", left: "14px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px" }}>{t("Bill Summary")}</span>

                                    <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
                                        <div>
                                            <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>{t("Shipping / Handling")}</label>
                                            <input type="number" min="0" step="any" className="form-control form-control-sm" value={shipping || ""} onChange={e => { const v = e.target.value ? parseFloat(e.target.value) : 0; setShipping(v); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculateRef.current?.(), 150); }} />
                                        </div>
                                        <div>
                                            <label className="form-label fw-semibold" style={{ fontSize: "12px", marginBottom: "4px" }}>
                                                {t("Discount")}
                                            </label>
                                            <input type="number" min="0" step="any" className="form-control form-control-sm" value={discountWithVAT || ""} onChange={e => { const v = e.target.value ? parseFloat(e.target.value) : 0; setDiscountWithVAT(v); const vatMul = 1 + ((parseFloat(formData.vat_percent) || 0) / 100); setDiscount(excludeServiceVat ? v : parseFloat((v / vatMul).toFixed(8))); if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => reCalculateRef.current?.(), 150); }} />
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gap: "8px" }}>
                                        {[
                                            { label: t("Total"), value: formData.total_with_vat || 0 },
                                            { label: t("Shipping / Handling"), value: shipping || 0 },
                                            { label: t("Discount"), value: discount || 0, negative: true },
                                            { label: t("Total Taxable"), value: (formData.total || 0) + (shipping || 0) - (discount || 0) },
                                            { label: `${t("VAT")} (${formData.vat_percent || 0}%)`, value: formData.vat_price || 0 },
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
                                        {parseFloat(formData.rounding_amount || 0) !== 0 && (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "13px", marginBottom: "6px" }}>
                                                <span style={{ color: "#6b7280" }}>{t("Net Total Before Rounding")}</span>
                                                <span style={{ fontWeight: 600, color: "#191c1e" }}>
                                                    <NumberFormat value={trimTo2Decimals((formData.net_total || 0) - (formData.rounding_amount || 0))} displayType="text" thousandSeparator renderText={v => v} />
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "13px", marginBottom: "6px" }}>
                                            <span style={{ color: "#6b7280" }}>
                                                {t("Rounding Amount")}
                                                {" "}[<label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 500 }}>
                                                    <input type="checkbox" style={{ width: 13, height: 13 }} checked={!!formData.auto_rounding_amount} onChange={() => {
                                                        formData.auto_rounding_amount = !formData.auto_rounding_amount;
                                                        setFormData({ ...formData });
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => reCalculateRef.current?.(), 100);
                                                    }} />
                                                    {t("Auto")}
                                                </label>]
                                            </span>
                                            <input type="number" disabled={!!formData.auto_rounding_amount} style={{ width: 100, fontSize: 12 }} className="form-control form-control-sm" value={formData.rounding_amount || ""} onWheel={e => e.target.blur()}
                                                onChange={e => {
                                                    formData.rounding_amount = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                    setFormData({ ...formData });
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    timerRef.current = setTimeout(() => reCalculateRef.current?.(), 100);
                                                }}
                                            />
                                        </div>
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

            <VehicleCreate ref={vehicleCreateRef} refreshList={() => { }} openDetailsView={newId => reloadVehicles(newId)} />
            <Products ref={productsRef} onSelectProducts={handleSelectedProductsFromModal} showToastMessage={props.showToastMessage} />
            <Modal show={showVehicleModal} onHide={() => setShowVehicleModal(false)} size="lg" className="vehicle-list-modal-wrap">
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: "15px", fontWeight: 700 }}>
                        <i className="bi bi-car-front me-2"></i>
                        {t("Vehicles")} — {formData.customer_name || t("Customer")}
                        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6b7280", fontWeight: 400 }}>({vehicleOptions.length})</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: 0 }}>
                    {vehicleOptions.length === 0 ? (
                        <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                            <i className="bi bi-car-front" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}></i>
                            {t("No vehicles found for this customer")}
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="table table-sm table-hover align-middle mb-0">
                                <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                                    <tr>
                                        <th style={{ fontSize: "12px", padding: "8px 12px", fontWeight: 700 }}>{t("Vehicle No.")}</th>
                                        <th style={{ fontSize: "12px", padding: "8px 12px", fontWeight: 700 }}>{t("Brand / Model")}</th>
                                        <th style={{ fontSize: "12px", padding: "8px 12px", fontWeight: 700 }}>{t("Year")}</th>
                                        <th style={{ fontSize: "12px", padding: "8px 12px", fontWeight: 700 }}>{t("Chassis No.")}</th>
                                        <th style={{ fontSize: "12px", padding: "8px 12px", fontWeight: 700 }}>{t("Istimara No.")}</th>
                                        <th style={{ fontSize: "12px", padding: "8px 12px", fontWeight: 700 }}>{t("Current KM")}</th>
                                        <th style={{ fontSize: "12px", padding: "8px 12px" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicleOptions.map((v) => (
                                        <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => { setVehicleSelection(v); setShowVehicleModal(false); }}>
                                            <td style={{ fontSize: "13px", padding: "8px 12px", fontWeight: 600 }}>{v.vehicle_number || "—"}</td>
                                            <td style={{ fontSize: "13px", padding: "8px 12px" }}>{[v.brand, v.model, v.variant].filter(Boolean).join(" ") || "—"}</td>
                                            <td style={{ fontSize: "13px", padding: "8px 12px" }}>{v.year || "—"}</td>
                                            <td style={{ fontSize: "13px", padding: "8px 12px" }}>{v.chassis_number || "—"}</td>
                                            <td style={{ fontSize: "13px", padding: "8px 12px" }}>{v.istimara_no || "—"}</td>
                                            <td style={{ fontSize: "13px", padding: "8px 12px" }}>{v.current_km || "—"}</td>
                                            <td style={{ padding: "8px 12px" }}>
                                                <button type="button" className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); setVehicleSelection(v); setShowVehicleModal(false); }} style={{ fontSize: "11px", padding: "3px 10px" }}>{t("Select")}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
            <OrderPreview ref={previewRef} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationSalesReturnHistory ref={QuotationSalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />
            <ProductNonVATSalesHistory ref={NonVATSalesHistoryRef} />
            <ProductNonVATSalesReturnHistory ref={NonVATSalesReturnHistoryRef} />
            {showCustomerPending && <CustomerPending ref={CustomerPendingRef} />}
        </>
    );
});

export default QuotationType3Form;
