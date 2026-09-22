import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Spinner } from "react-bootstrap";
// eslint-disable-next-line no-unused-vars
import { Typeahead } from "react-bootstrap-typeahead";
import ServiceCategoryCreate from "../service_category/create.js";
import ImageGallery from '../utils/ImageGallery.js';
import { trimTo8Decimals } from "../utils/numberUtils";
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "../utils/product_sales_return_history.js";
import QuotationHistory from "../utils/product_quotation_history.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';

// ── Design tokens ────────────────────────────────────────────────────────────
const CARD = {
    background: '#ffffff',
    border: '1px solid #dde1ea',
    borderRadius: '10px',
    padding: '24px 28px',
    marginBottom: '16px',
};
const INPUT_BASE = {
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontFamily: '"Inter", sans-serif',
    width: '100%',
    outline: 'none',
    color: '#191c1e',
    background: '#fff',
    transition: 'border-color 0.15s ease',
};
const input = (hasError) => ({
    ...INPUT_BASE,
    border: hasError ? '1.5px solid #ba1a1a' : '1px solid #c3c6d7',
});
const selectStyle = (hasError) => ({
    border: hasError ? '1.5px solid #ba1a1a' : '1px solid #c3c6d7',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '13px',
    fontFamily: '"Inter", sans-serif',
    width: '100%',
    color: '#191c1e',
    background: '#fff',
});
const PRICE_INPUT = {
    border: '1px solid #c3c6d7',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '14px',
    fontFamily: '"Inter", sans-serif',
    width: '100%',
    outline: 'none',
    color: '#191c1e',
    background: '#fff',
};
const PRICE_CARD = {
    background: '#f7f9fb',
    border: '1px solid #dde1ea',
    borderRadius: '8px',
    padding: '16px 20px',
};

const Label = ({ children, required }) => (
    <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '12.5px', fontWeight: 600, color: '#434655', marginBottom: '5px', letterSpacing: '0.01em' }}>
        {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
    </label>
);

const InlineError = ({ msg }) =>
    msg ? (
        <div style={{ color: '#ba1a1a', fontSize: '11.5px', fontFamily: '"Inter", sans-serif', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="bi bi-exclamation-circle" style={{ fontSize: '11px' }}></i> {msg}
        </div>
    ) : null;

const SectionTitle = ({ children, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #eef0f4' }}>
        {icon && <i className={`bi ${icon}`} style={{ fontSize: '16px', color: '#004ac6' }}></i>}
        <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '15px', fontWeight: 700, color: '#191c1e', margin: 0 }}>{children}</h3>
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const ServiceCreate = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    const timerRef = useRef(null);
    const ImageGalleryRef = useRef(null);
    const ServiceCategoryCreateFormRef = useRef(null);
    // eslint-disable-next-line no-unused-vars
    const categorySearchRef = useRef(null);
    const SalesHistoryRef = useRef(null);
    const SalesReturnHistoryRef = useRef(null);
    const QuotationHistoryRef = useRef(null);

    let [selectedCategories, setSelectedCategories] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

    let [store, setStore] = useState({});
    let [formData, setFormData] = useState({});
    let [productStores, setProductStores] = useState({});
    const [priceInputs, setPriceInputs] = useState({});
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [show, SetShow] = useState(false);
    let [productImages, setProductImages] = useState([]);

    useImperativeHandle(ref, () => ({
        async open(id) {
            formData = { is_service: true, unit: 'C62' };
            setFormData({ ...formData });
            productStores = {};
            setProductStores({});
            setPriceInputs({});
            selectedCategories = [];
            setSelectedCategories([]);
            setErrors({});
            setProductImages([]);

            await getStore(localStorage.getItem("store_id"));

            if (id) {
                await getService(id);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => { ImageGalleryRef.current?.open(); }, 400);
            }

            SetShow(true);
        },
    }));

    async function getStore(id) {
        try {
            const data = await fetchStore(id);
            store = data;
            setStore({ ...data });
        } catch (error) { }
    }

    async function getService(id) {
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        let qs = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") || "" });
        try {
            const r = await fetch('/v1/product/' + id + "?" + qs, { method: 'GET', headers });
            const data = await r.json();
            if (!r.ok) return;
            formData = data.result;
            // Normalize legacy unit values to UN/CEFACT Rec 20 codes
            const legacyUnitMap = { hour: 'HUR', day: 'DAY', month: 'MON', session: 'C62', package: 'C62', visit: 'C62' };
            if (!formData.unit || legacyUnitMap[formData.unit]) {
                formData.unit = legacyUnitMap[formData.unit] || 'C62';
            }
            // Migrate: for old services where item_code held the user's intended SKU and part_number was auto-generated
            if (formData.item_code) {
                formData.part_number = formData.item_code;
            }
            setFormData({ ...formData });
            productStores = formData.product_stores || {};
            setProductStores({ ...productStores });
            const _sid = localStorage.getItem("store_id");
            const _ps = productStores[_sid] || {};
            setPriceInputs({
                wholesale_unit_price: _ps.wholesale_unit_price != null ? String(_ps.wholesale_unit_price) : '',
                wholesale_unit_price_with_vat: _ps.wholesale_unit_price_with_vat != null ? String(_ps.wholesale_unit_price_with_vat) : '',
                retail_unit_price: _ps.retail_unit_price != null ? String(_ps.retail_unit_price) : '',
                retail_unit_price_with_vat: _ps.retail_unit_price_with_vat != null ? String(_ps.retail_unit_price_with_vat) : '',
                purchase_unit_price: _ps.purchase_unit_price != null ? String(_ps.purchase_unit_price) : '',
                purchase_unit_price_with_vat: _ps.purchase_unit_price_with_vat != null ? String(_ps.purchase_unit_price_with_vat) : '',
            });
            if (formData.images) setProductImages(formData.images);
            if (formData.service_category_id) {
                selectedCategories = [{ id: formData.service_category_id, name: formData.service_category_name }];
                setSelectedCategories([...selectedCategories]);
            }
        } catch (e) {}
    }

    useEffect(() => {
        if (!show) return;
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        const storeId = localStorage.getItem("store_id") || "";
        fetch(`/v1/service-category?select=id,name&limit=500${storeId ? `&search[store_id]=${storeId}` : ''}`, { method: "GET", headers })
            .then(r => r.json()).then(d => { if (d.result) setCategoryOptions(d.result); }).catch(() => {});
    }, [show]);

    function refreshServiceCategories() {
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        const storeId = localStorage.getItem("store_id") || "";
        fetch(`/v1/service-category?select=id,name&limit=500${storeId ? `&search[store_id]=${storeId}` : ''}`, { method: "GET", headers })
            .then(r => r.json()).then(d => { if (d.result) setCategoryOptions(d.result); }).catch(() => {});
    }

    // eslint-disable-next-line no-unused-vars
    async function suggestCategories(searchTerm) {
        if (!searchTerm) return;
        setIsCategoriesLoading(true);
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        let q = ObjectToSearchQueryParams({ name: searchTerm, store_id: localStorage.getItem("store_id") || "" });
        try {
            let r = await fetch("/v1/service-category?select=id,name&" + q, { method: "GET", headers });
            let data = await r.json();
            setCategoryOptions(data.result || []);
        } catch (e) {}
        setIsCategoriesLoading(false);
    }

    async function handleCreate(event) {
        if (event) event.preventDefault();

        // Front-end validation for mandatory fields
        const validationErrors = {};
        if (!formData.name?.trim())               validationErrors.name               = t("Name is required");
        if (!formData.unit?.trim())               validationErrors.unit               = t("Unit is required");
        if (Object.keys(validationErrors).length > 0) {
            setErrors({ ...errors, ...validationErrors });
            return;
        }

        formData.is_service = true;
        const storeId = localStorage.getItem('store_id');
        if (!formData.id && storeId) formData.store_id = storeId;
        if (storeId && Object.keys(productStores).length > 0) formData.product_stores = productStores;

        let endPoint = "/v1/product";
        let method = "POST";
        if (formData.id) { endPoint = "/v1/product/" + formData.id; method = "PUT"; }

        const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        let qs = ObjectToSearchQueryParams({ store_id: storeId || "" });
        setProcessing(true);
        try {
            const r = await fetch(endPoint + "?" + qs, { method, headers, body: JSON.stringify(formData) });
            const data = await r.json();
            if (!r.ok) { setErrors({ ...(data.errors || {}) }); setProcessing(false); return; }
            setErrors({});
            setProcessing(false);
            if (props.showToastMessage) props.showToastMessage(t("Service saved successfully"), "success");
            if (props.refreshList) props.refreshList();
            handleClose();
        } catch (err) {
            setProcessing(false);
            if (props.showToastMessage) props.showToastMessage(t("Error saving service"), "danger");
        }
    }

    async function handleDeleteImage(image) {
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        await fetch('/v1/product-image/' + image.id, { method: 'DELETE', headers });
        productImages = productImages.filter(img => img.id !== image.id);
        setProductImages([...productImages]);
    }

    function handleClose() { SetShow(false); }

    function clearError(field) {
        if (errors[field]) { errors[field] = ""; setErrors({ ...errors }); }
    }

    const storeId = localStorage.getItem('store_id');
    const errorCount = Object.values(errors).filter(Boolean).length;

    const vatRate = store?.vat_percent ? store.vat_percent / 100 : 0;

    function updateWholesaleExcl(val) {
        setPriceInputs(prev => ({ ...prev, wholesale_unit_price: val }));
        if (!productStores[storeId]) productStores[storeId] = {};
        const n = parseFloat(val) || 0;
        productStores[storeId].wholesale_unit_price = n;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const cross = parseFloat(trimTo8Decimals(n * (1 + vatRate)));
            productStores[storeId].wholesale_unit_price_with_vat = cross;
            setPriceInputs(prev => ({ ...prev, wholesale_unit_price_with_vat: String(cross) }));
            setProductStores({ ...productStores });
        }, 150);
        setProductStores({ ...productStores });
    }
    function updateWholesaleIncl(val) {
        setPriceInputs(prev => ({ ...prev, wholesale_unit_price_with_vat: val }));
        if (!productStores[storeId]) productStores[storeId] = {};
        const n = parseFloat(val) || 0;
        productStores[storeId].wholesale_unit_price_with_vat = n;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const cross = parseFloat(trimTo8Decimals(n / (1 + vatRate)));
            productStores[storeId].wholesale_unit_price = cross;
            setPriceInputs(prev => ({ ...prev, wholesale_unit_price: String(cross) }));
            setProductStores({ ...productStores });
        }, 150);
        setProductStores({ ...productStores });
    }
    function updateRetailExcl(val) {
        setPriceInputs(prev => ({ ...prev, retail_unit_price: val }));
        if (!productStores[storeId]) productStores[storeId] = {};
        const n = parseFloat(val) || 0;
        productStores[storeId].retail_unit_price = n;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const cross = parseFloat(trimTo8Decimals(n * (1 + vatRate)));
            productStores[storeId].retail_unit_price_with_vat = cross;
            setPriceInputs(prev => ({ ...prev, retail_unit_price_with_vat: String(cross) }));
            setProductStores({ ...productStores });
        }, 150);
        setProductStores({ ...productStores });
    }
    function updateRetailIncl(val) {
        setPriceInputs(prev => ({ ...prev, retail_unit_price_with_vat: val }));
        if (!productStores[storeId]) productStores[storeId] = {};
        const n = parseFloat(val) || 0;
        productStores[storeId].retail_unit_price_with_vat = n;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const cross = parseFloat(trimTo8Decimals(n / (1 + vatRate)));
            productStores[storeId].retail_unit_price = cross;
            setPriceInputs(prev => ({ ...prev, retail_unit_price: String(cross) }));
            setProductStores({ ...productStores });
        }, 150);
        setProductStores({ ...productStores });
    }
    function updatePurchaseExcl(val) {
        setPriceInputs(prev => ({ ...prev, purchase_unit_price: val }));
        if (!productStores[storeId]) productStores[storeId] = {};
        const n = parseFloat(val) || 0;
        productStores[storeId].purchase_unit_price = n;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const cross = parseFloat(trimTo8Decimals(n * (1 + vatRate)));
            productStores[storeId].purchase_unit_price_with_vat = cross;
            setPriceInputs(prev => ({ ...prev, purchase_unit_price_with_vat: String(cross) }));
            setProductStores({ ...productStores });
        }, 150);
        setProductStores({ ...productStores });
    }
    function updatePurchaseIncl(val) {
        setPriceInputs(prev => ({ ...prev, purchase_unit_price_with_vat: val }));
        if (!productStores[storeId]) productStores[storeId] = {};
        const n = parseFloat(val) || 0;
        productStores[storeId].purchase_unit_price_with_vat = n;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const cross = parseFloat(trimTo8Decimals(n / (1 + vatRate)));
            productStores[storeId].purchase_unit_price = cross;
            setPriceInputs(prev => ({ ...prev, purchase_unit_price: String(cross) }));
            setProductStores({ ...productStores });
        }, 150);
        setProductStores({ ...productStores });
    }

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" keyboard={false} dialogClassName="pw-modal" className={`pw-modal-wrap${props.modalClass ? ' ' + props.modalClass : ''}`}>
                <style>{`
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .svc-body { overflow-y: auto !important; padding: 0 !important; flex: 1; min-height: 0; }
                    .svc-form { max-width: 860px; margin: 0 auto; padding: 24px 28px; }
                    input[type="number"]::-webkit-outer-spin-button,
                    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                    input[type="number"] { -moz-appearance: textfield; }
                `}</style>

                <Modal.Header style={{ background: '#fff', borderBottom: '1px solid #dde1ea', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '15px' }}></i> {t('Back')}
                    </button>

                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 700, color: '#191c1e', flex: 1, letterSpacing: '-0.01em' }}>
                        <i className="bi bi-tools me-2" style={{ color: '#004ac6', fontSize: '15px' }}></i>
                        {formData.id ? `${t('Edit Service')} — ${formData.name}` : t('New Service')}
                    </Modal.Title>

                    <div className="d-flex align-items-center gap-2">
                        <button type="button"
                            style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 20px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: isProcessing ? 0.7 : 1 }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? t('Save Changes') : t('Create Service')}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label={t('Close')} />
                    </div>
                </Modal.Header>

                {/* Error panel — slides in between header and body, no shift inside the form */}
                <div style={{
                    flexShrink: 0,
                    overflow: 'hidden',
                    maxHeight: errorCount > 0 ? '320px' : '0px',
                    opacity: errorCount > 0 ? 1 : 0,
                    transition: 'max-height 0.22s ease, opacity 0.18s ease',
                    background: '#fff8f7',
                    borderBottom: errorCount > 0 ? '1px solid #f4adaa' : 'none',
                }}>
                    <div style={{ padding: '12px 24px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#93000a', fontSize: '14px' }}></i>
                            <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '13px', color: '#93000a' }}>
                                {errorCount} error{errorCount > 1 ? 's' : ''} — please fix before saving
                            </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {Object.entries(errors).filter(([, v]) => v).map(([k, v]) => (
                                <li key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12.5px', color: '#93000a', marginBottom: '3px', lineHeight: 1.5 }}>
                                    {v}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <Modal.Body className="svc-body">
                    <form className="svc-form" onSubmit={handleCreate}>

                        {/* ── 1. Service Identity ────────────────────────────────────── */}
                        <div style={CARD}>
                            <SectionTitle icon="bi-person-badge">{t('Service Identity')}</SectionTitle>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <Label required>{t('Name')}</Label>
                                    <input type="text" value={formData.name || ''}
                                        onChange={(e) => { clearError('name'); formData.name = e.target.value; setFormData({ ...formData }); }}
                                        style={input(errors.name)} placeholder={t('Service name')} />
                                    <InlineError msg={errors.name} />
                                </div>
                                <div className="col-md-6">
                                    <Label>{t('Name in Arabic')}</Label>
                                    <input type="text" value={formData.name_in_arabic || ''}
                                        onChange={(e) => { formData.name_in_arabic = e.target.value; setFormData({ ...formData }); }}
                                        style={{ ...input(false), direction: 'rtl' }} placeholder="الاسم بالعربية" />
                                </div>
                            </div>
                        </div>

                        {/* ── 2. Classification ─────────────────────────────────────── */}
                        <div style={CARD}>
                            <SectionTitle icon="bi-tags">{t('Classification')}</SectionTitle>
                            <div className="row g-3">
                                <div className="col-md-5">
                                    <Label>{t('Service Category')}</Label>
                                    <div className="d-flex gap-1">
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                type="text"
                                                style={{ width: '100%', border: `1px solid ${errors.service_category_id ? '#dc3545' : '#c3c6d7'}`, borderRadius: '6px', padding: '4px 8px', fontSize: '13px', fontFamily: '"Inter",sans-serif', background: '#fff', color: '#191c1e', height: '34px', outline: 'none' }}
                                                value={categoryOpen ? categorySearch : (formData.service_category_name || '')}
                                                placeholder={t('-- Select category --')}
                                                onFocus={() => { setCategoryOpen(true); setCategorySearch(''); }}
                                                onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
                                                onChange={e => setCategorySearch(e.target.value)}
                                            />
                                            {categoryOpen && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxHeight: '220px', overflowY: 'auto' }}>
                                                    <div style={{ padding: '5px 10px', cursor: 'pointer', fontSize: '13px', color: '#888', borderBottom: '1px solid #f0f0f0' }}
                                                        onMouseDown={() => { clearError('service_category_id'); formData.service_category_id = ''; formData.service_category_name = ''; setFormData({ ...formData }); setSelectedCategories([]); setCategoryOpen(false); }}>
                                                        {t('-- Select category --')}
                                                    </div>
                                                    {categoryOptions.filter(c => !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase())).map(c => (
                                                        <div key={c.id}
                                                            style={{ padding: '5px 10px', cursor: 'pointer', fontSize: '13px', background: formData.service_category_id === c.id ? '#e8f0fe' : undefined }}
                                                            onMouseDown={() => { clearError('service_category_id'); formData.service_category_id = c.id; formData.service_category_name = c.name; setFormData({ ...formData }); setSelectedCategories([c]); setCategoryOpen(false); setCategorySearch(''); }}>
                                                            {c.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button type="button"
                                            style={{ background: '#f2f4f6', border: '1px solid #c3c6d7', borderRadius: '6px', padding: '0 10px', cursor: 'pointer', color: '#434655', flexShrink: 0 }}
                                            onClick={() => ServiceCategoryCreateFormRef.current?.open()} title={t("New Category")}>
                                            <i className="bi bi-plus-lg"></i>
                                        </button>
                                    </div>
                                    <InlineError msg={errors.service_category_id} />
                                </div>
                                <div className="col-md-3">
                                    <Label required>{t('Unit')}</Label>
                                    <select style={selectStyle(!!errors.unit)} value={formData.unit || 'C62'}
                                        onChange={(e) => { clearError('unit'); formData.unit = e.target.value; setFormData({ ...formData }); }}>
                                        <option value="C62">{t('Each / Per Visit (C62)')}</option>
                                        <option value="HUR">{t('Hour (HUR)')}</option>
                                        <option value="DAY">{t('Day (DAY)')}</option>
                                        <option value="WEE">{t('Week (WEE)')}</option>
                                        <option value="MON">{t('Month (MON)')}</option>
                                        <option value="ANN">{t('Year (ANN)')}</option>
                                    </select>
                                    {(() => {
                                        const labels = { C62: t('Each / Per Visit'), HUR: t('Hour'), DAY: t('Day'), WEE: t('Week'), MON: t('Month'), ANN: t('Year') };
                                        const code = formData.unit || 'C62';
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                                <span style={{ fontSize: '10px', color: '#737686', fontFamily: '"Inter", sans-serif' }}>{t('ZATCA code:')}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: '#004ac6', background: '#eef2ff', padding: '1px 6px', borderRadius: '3px' }}>({code})</span>
                                                <span style={{ fontSize: '11px', color: '#737686', fontFamily: '"Inter", sans-serif' }}>{labels[code] || code}</span>
                                            </div>
                                        );
                                    })()}
                                    <InlineError msg={errors.unit} />
                                </div>
                                <div className="col-md-4">
                                    <Label>{t('Item Code / SKU')}</Label>
                                    <input type="text" value={formData.item_code || formData.part_number || ''}
                                        onChange={(e) => { clearError('part_number'); formData.part_number = e.target.value; formData.item_code = e.target.value; setFormData({ ...formData }); }}
                                        style={input(!!errors.part_number)} placeholder={t('Auto-generated if empty')} />
                                    <InlineError msg={errors.part_number} />
                                </div>
                            </div>
                        </div>

                        {/* ── 3. Service Details ────────────────────────────────────── */}
                        <div style={CARD}>
                            <SectionTitle icon="bi-sliders">{t('Service Details')}</SectionTitle>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <Label>{t('Duration')}</Label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input type="number" min="0"
                                            value={formData.duration_minutes || ''}
                                            onChange={(e) => { formData.duration_minutes = e.target.value ? parseInt(e.target.value) : 0; setFormData({ ...formData }); }}
                                            style={{ ...input(false), flex: 1 }} placeholder={t('e.g. 2')} />
                                        <select
                                            value={formData.duration_unit || 'minutes'}
                                            onChange={(e) => { formData.duration_unit = e.target.value; setFormData({ ...formData }); }}
                                            style={{ ...selectStyle(false), width: 'auto', minWidth: '88px', flex: '0 0 auto' }}>
                                            <option value="minutes">{t('Min')}</option>
                                            <option value="hours">{t('Hours')}</option>
                                            <option value="days">{t('Days')}</option>
                                            <option value="weeks">{t('Weeks')}</option>
                                        </select>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#737686', marginTop: '3px', fontFamily: '"Inter", sans-serif' }}>
                                        {(!formData.duration_unit || formData.duration_unit === 'minutes') && formData.duration_minutes >= 60
                                            ? `${Math.floor(formData.duration_minutes / 60)}h ${formData.duration_minutes % 60 ? (formData.duration_minutes % 60) + 'm' : ''}`
                                            : ''}
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <Label>{t('Delivery Mode')}</Label>
                                    <select style={selectStyle(false)} value={formData.delivery_mode || ''}
                                        onChange={(e) => { formData.delivery_mode = e.target.value; setFormData({ ...formData }); }}>
                                        <option value="">{t('— Not specified —')}</option>
                                        <option value="in_store">{t('In Store')}</option>
                                        <option value="remote">{t('Remote / Online')}</option>
                                        <option value="at_customer_location">{t('At Customer Location')}</option>
                                    </select>
                                </div>
                                <div className="col-md-4 d-flex align-items-center" style={{ paddingTop: '22px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: formData.booking_required ? '#f0f5ff' : '#f7f9fb', border: `1px solid ${formData.booking_required ? '#c7d9ff' : '#dde1ea'}`, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => { formData.booking_required = !formData.booking_required; setFormData({ ...formData }); }}>
                                        <input type="checkbox" id="booking_required"
                                            style={{ width: '15px', height: '15px', accentColor: '#004ac6', cursor: 'pointer' }}
                                            checked={formData.booking_required || false}
                                            onChange={() => {}} />
                                        <label htmlFor="booking_required" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 500, color: formData.booking_required ? '#004ac6' : '#434655', cursor: 'pointer', marginBottom: 0, lineHeight: 1.3 }}>
                                            {t('Booking / Appointment Required')}
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="row g-3 mt-0">
                                <div className="col-12">
                                    <Label>{t('Description / Notes')}</Label>
                                    <textarea rows={3} value={formData.note || ''}
                                        onChange={(e) => { formData.note = e.target.value; setFormData({ ...formData }); }}
                                        style={{ ...input(false), resize: 'vertical', minHeight: '80px' }}
                                        placeholder={t('Describe the service, any terms, or additional details...')} />
                                </div>
                            </div>
                        </div>

                        {/* ── 4. Pricing ────────────────────────────────────────────── */}
                        <div style={CARD}>
                            <SectionTitle icon="bi-currency-dollar">{t('Pricing')}</SectionTitle>
                            <div className="row g-4">
                                {/* Purchase */}
                                <div className="col-md-4">
                                    <div style={PRICE_CARD}>
                                        <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 700, color: '#737686', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                                            {t('Purchase Unit Price')}
                                        </div>
                                        <div style={{ marginBottom: '14px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', marginBottom: '5px' }}>{t('Excl. VAT')}</div>
                                            <input type="text" inputMode="decimal"
                                                value={priceInputs.purchase_unit_price ?? ''}
                                                style={PRICE_INPUT} placeholder={t('0.00')}
                                                onChange={(e) => updatePurchaseExcl(e.target.value)} />
                                        </div>
                                        <div style={{ borderTop: '1px solid #e0e3e5', paddingTop: '12px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', marginBottom: '5px' }}>{t('Incl. VAT')}</div>
                                            <input type="text" inputMode="decimal"
                                                value={priceInputs.purchase_unit_price_with_vat ?? ''}
                                                style={{ ...PRICE_INPUT, background: '#f0f2f4' }} placeholder={t('Calculated automatically')}
                                                onChange={(e) => updatePurchaseIncl(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Wholesale */}
                                <div className="col-md-4">
                                    <div style={PRICE_CARD}>
                                        <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 700, color: '#737686', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                                            {t('Wholesale Unit Price')}
                                        </div>
                                        <div style={{ marginBottom: '14px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', marginBottom: '5px' }}>{t('Excl. VAT')}</div>
                                            <input type="text" inputMode="decimal"
                                                value={priceInputs.wholesale_unit_price ?? ''}
                                                style={PRICE_INPUT} placeholder={t('0.00')}
                                                onChange={(e) => updateWholesaleExcl(e.target.value)} />
                                        </div>
                                        <div style={{ borderTop: '1px solid #e0e3e5', paddingTop: '12px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', marginBottom: '5px' }}>{t('Incl. VAT')}</div>
                                            <input type="text" inputMode="decimal"
                                                value={priceInputs.wholesale_unit_price_with_vat ?? ''}
                                                style={{ ...PRICE_INPUT, background: '#f0f2f4' }} placeholder={t('Calculated automatically')}
                                                onChange={(e) => updateWholesaleIncl(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Retail */}
                                <div className="col-md-4">
                                    <div style={PRICE_CARD}>
                                        <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 700, color: '#737686', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                                            {t('Retail Unit Price')}
                                        </div>
                                        <div style={{ marginBottom: '14px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', marginBottom: '5px' }}>{t('Excl. VAT')}</div>
                                            <input type="text" inputMode="decimal"
                                                value={priceInputs.retail_unit_price ?? ''}
                                                style={PRICE_INPUT} placeholder={t('0.00')}
                                                onChange={(e) => updateRetailExcl(e.target.value)} />
                                        </div>
                                        <div style={{ borderTop: '1px solid #e0e3e5', paddingTop: '12px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', marginBottom: '5px' }}>{t('Incl. VAT')}</div>
                                            <input type="text" inputMode="decimal"
                                                value={priceInputs.retail_unit_price_with_vat ?? ''}
                                                style={{ ...PRICE_INPUT, background: '#f0f2f4' }} placeholder={t('Calculated automatically')}
                                                onChange={(e) => updateRetailIncl(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── 5. Photos ─────────────────────────────────────────────── */}
                        <div style={CARD}>
                            <SectionTitle icon="bi-images">{t('Photos')}</SectionTitle>
                            <ImageGallery ref={ImageGalleryRef} id={formData.id} storeID={formData.store_id}
                                storedImages={formData.images} modelName="product"
                                handleDelete={handleDeleteImage} />
                        </div>

                        {/* ── 6. Sales History (edit mode only) ─────────────────────── */}
                        {formData.id && (
                            <div style={CARD}>
                                <SectionTitle icon="bi-clock-history">{t('Transaction History')}</SectionTitle>
                                <div className="d-flex flex-wrap gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-primary"
                                        onClick={() => SalesHistoryRef.current?.open(formData.id)}>
                                        <i className="bi bi-receipt me-1"></i> {t('Sales History')}
                                    </button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary"
                                        onClick={() => SalesReturnHistoryRef.current?.open(formData.id)}>
                                        <i className="bi bi-receipt-cutoff me-1"></i> {t('Sales Returns')}
                                    </button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary"
                                        onClick={() => QuotationHistoryRef.current?.open(formData.id)}>
                                        <i className="bi bi-clipboard2-check me-1"></i> {t('Quotations')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ height: '40px' }} />
                    </form>
                </Modal.Body>
            </Modal>
            <ServiceCategoryCreate ref={ServiceCategoryCreateFormRef} showToastMessage={props.showToastMessage} refreshList={refreshServiceCategories} />
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
        </>
    );
});

export default ServiceCreate;
