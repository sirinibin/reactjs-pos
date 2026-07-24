import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner, Button } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';

const RepairJobCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            const now = new Date();
            formData = {
                date: now.toISOString(),
                status: "open",
                labour_charge: 0,
                parts: [],
                parts_total: 0,
                total: 0,
                km: 0,
            };
            setFormData({ ...formData });
            setErrors({});
            selectedCustomers = [];
            setSelectedCustomers([]);
            selectedVehicles = [];
            setSelectedVehicles([]);
            selectedTechnicians = [];
            setSelectedTechnicians([]);
            setCustomerOptions([]);
            setVehicleOptions([]);
            if (id) {
                getRepairJob(id);
            }
            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },
    }));

    const [vatPercent, setVatPercent] = useState(15);

    async function getStore(id) {
        try {
            const store = await fetchStore(id);
            if (store && store.vat_percent != null) setVatPercent(store.vat_percent);
        } catch (error) { }
    }

    const { t } = useTranslation('common');
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    // Customer
    const [customerOptions, setCustomerOptions] = useState([]);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const customerSearchRef = useRef();

    // Vehicle
    const [vehicleOptions, setVehicleOptions] = useState([]);
    let [selectedVehicles, setSelectedVehicles] = useState([]);
    const vehicleSearchRef = useRef();

    // Technician
    const [technicianOptions, setTechnicianOptions] = useState([]);
    let [selectedTechnicians, setSelectedTechnicians] = useState([]);
    const technicianSearchRef = useRef();

    // Product search
    const [productOptions, setProductOptions] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    const productSearchRef = useRef();
    const [openProductSearch, setOpenProductSearch] = useState(false);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function getRepairJob(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/repair-job/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setErrors({});
                formData = data.result;
                setFormData({ ...formData });

                if (formData.vehicle_id) {
                    selectedVehicles = [{ id: formData.vehicle_id, vehicle_number: formData.vehicle_number, brand: formData.brand, model: formData.model, customer_name: '', label: `${formData.vehicle_number || ''} - ${formData.brand || ''} ${formData.model || ''}` }];
                    setSelectedVehicles([...selectedVehicles]);
                }
                if (formData.technician_id) {
                    selectedTechnicians = [{ id: formData.technician_id, name: formData.technician_name }];
                    setSelectedTechnicians([...selectedTechnicians]);
                }
                if (formData.customer_id) {
                    fetchCustomerById(formData.customer_id);
                }
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    async function fetchCustomerById(customerId) {
        const token = localStorage.getItem('access_token');
        const storeId = localStorage.getItem('store_id');
        const qp = storeId ? `search[store_id]=${storeId}` : '';
        try {
            const res = await fetch(`/v1/customer/${customerId}?${qp}`, {
                headers: { 'Content-Type': 'application/json', Authorization: token }
            });
            const data = await res.json();
            if (data.result) {
                const c = { ...data.result, label: data.result.name || '' };
                selectedCustomers = [c];
                setSelectedCustomers([...selectedCustomers]);
            }
        } catch (e) { }
    }

    function calculateTotals(data) {
        let partsTotal = 0;
        let partsTotalWithVat = 0;
        if (data.parts && data.parts.length > 0) {
            data.parts.forEach(p => {
                const qty = parseFloat(p.qty) || 0;
                const unitPrice = parseFloat(p.unit_price) || 0;
                const unitPriceWithVat = parseFloat(p.unit_price_with_vat);
                p.total_price = qty * unitPrice;
                p.total_price_with_vat = qty * (isNaN(unitPriceWithVat) ? unitPrice : unitPriceWithVat);
                partsTotal += p.total_price;
                partsTotalWithVat += p.total_price_with_vat;
            });
        }
        data.parts_total = partsTotal;
        data.parts_total_with_vat = partsTotalWithVat;
        const labourCharge = parseFloat(data.labour_charge) || 0;
        data.total = labourCharge + partsTotal;
        data.total_with_vat = labourCharge + partsTotalWithVat;
        return data;
    }

    function handleCreate(event) {
        event.preventDefault();
        let endPoint = "/v1/repair-job";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/repair-job/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }

        formData = calculateTotals({ ...formData });
        setFormData({ ...formData });

        const requestOptions = {
            method,
            headers: { 'Accept': 'application/json', "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
            body: JSON.stringify(formData),
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setErrors({});
                setProcessing(false);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage(t("Repair job updated successfully!"), "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage(t("Repair job created successfully!"), "success");
                }
                if (props.refreshList) props.refreshList();
                handleClose();
                if (props.openDetailsView) props.openDetailsView(data.result.id);
                if (props.onCreated) props.onCreated(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setErrors({ ...error });
                if (props.showToastMessage) props.showToastMessage(t("Failed to process repair job!"), "danger");
            });
    }

    async function suggestCustomers(searchTerm) {
        setCustomerOptions([]);
        if (!searchTerm) return;
        var params = { name: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let result = await fetch(`/v1/customer?select=id,name,code,phone,phone2,vat_no,credit_balance,credit_limit${queryString}&limit=20`, requestOptions);
        let data = await result.json();
        setCustomerOptions((data.result || []).map(c => ({ ...c, label: c.name || '' })));
    }

    async function suggestVehicles(searchTerm, customerIdFilter) {
        setVehicleOptions([]);
        if (!searchTerm && !customerIdFilter) return;
        var params = {};
        if (searchTerm) params.search = searchTerm;
        if (customerIdFilter) params.customer_id = customerIdFilter;
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let result = await fetch("/v1/vehicle?select=id,vehicle_number,brand,model,customer_name,customer_id" + queryString, requestOptions);
        let data = await result.json();
        const opts = (data.result || []).map(v => ({
            ...v,
            label: `${v.vehicle_number || ''} - ${v.brand || ''} ${v.model || ''} ${v.customer_name ? '(' + v.customer_name + ')' : ''}`
        }));
        setVehicleOptions(opts);
    }

    async function suggestTechnicians(searchTerm) {
        setTechnicianOptions([]);
        if (!searchTerm) return;
        var params = { search: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let result = await fetch("/v1/employee?select=id,name,position" + queryString, requestOptions);
        let data = await result.json();
        setTechnicianOptions(data.result || []);
    }

    async function suggestProducts(searchTerm) {
        setProductOptions([]);
        if (!searchTerm) return;
        var params = { name: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        const sid = localStorage.getItem("store_id") || "";
        const psFields = sid
            ? `,product_stores.${sid}.retail_unit_price,product_stores.${sid}.retail_unit_price_with_vat`
            : ",price,unit_price_with_vat";
        let result = await fetch(`/v1/product?select=id,name,is_service,item_code${psFields}` + queryString + "&limit=20", requestOptions);
        let data = await result.json();
        const mapped = (data.result || []).map(p => {
            const ps = (sid && p.product_stores?.[sid]) || {};
            const excl = ps.retail_unit_price ?? p.price ?? 0;
            const incl = ps.retail_unit_price_with_vat ?? p.unit_price_with_vat ?? excl;
            return { ...p, retail_price: excl, retail_price_with_vat: incl };
        });
        setProductOptions(mapped);
        if (mapped.length > 0) setOpenProductSearch(true);
    }

    function setField(field, value) {
        errors[field] = "";
        setErrors({ ...errors });
        formData[field] = value;
        formData = calculateTotals(formData);
        setFormData({ ...formData });
    }

    function addPart(product) {
        if (!formData.parts) formData.parts = [];
        formData.parts.push({
            product_id: product.id,
            name: product.name,
            qty: 1,
            unit_price: product.retail_price ?? 0,
            unit_price_with_vat: product.retail_price_with_vat ?? product.retail_price ?? 0,
            total_price: product.retail_price ?? 0,
            total_price_with_vat: product.retail_price_with_vat ?? product.retail_price ?? 0,
        });
        formData = calculateTotals(formData);
        setFormData({ ...formData });
        setSelectedProducts([]);
    }

    function isPartAdded(productId) {
        return (formData.parts || []).some(p => p.product_id === productId);
    }

    function removePartByProductId(productId) {
        const idx = (formData.parts || []).findIndex(p => p.product_id === productId);
        if (idx > -1) {
            formData.parts.splice(idx, 1);
            formData = calculateTotals(formData);
            setFormData({ ...formData });
        }
    }

    function updatePart(index, field, value) {
        if (!formData.parts || !formData.parts[index]) return;
        if (field === 'qty' || field === 'unit_price' || field === 'unit_price_with_vat') {
            const numVal = value === '' ? '' : (parseFloat(value) || 0);
            formData.parts[index][field] = numVal;
            if (numVal !== '' && vatPercent) {
                const multiplier = 1 + vatPercent / 100;
                if (field === 'unit_price') {
                    formData.parts[index].unit_price_with_vat = parseFloat((numVal * multiplier).toFixed(2));
                } else if (field === 'unit_price_with_vat') {
                    formData.parts[index].unit_price = parseFloat((numVal / multiplier).toFixed(2));
                }
            }
        } else {
            formData.parts[index][field] = value;
        }
        formData = calculateTotals(formData);
        setFormData({ ...formData });
    }

    function removePart(index) {
        if (!formData.parts) return;
        formData.parts.splice(index, 1);
        formData = calculateTotals(formData);
        setFormData({ ...formData });
    }

    // ── Design tokens ──
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '20px 24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };
    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#191c1e', marginBottom: '3px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => children
        ? <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
        : null;
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '16px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '15px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    function fmtCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    // Customer result columns
    const CUST_COLS = [
        { key: 'name', label: 'Name', w: '36%' },
        { key: 'code', label: 'Code', w: '13%' },
        { key: 'phone', label: 'Phone', w: '21%' },
        { key: 'vat_no', label: 'VAT No.', w: '18%' },
        { key: 'credit_balance', label: 'Balance', w: '12%' },
    ];

    const selectedCustomer = selectedCustomers[0] || null;
    const selectedVehicle = selectedVehicles[0] || null;

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        {formData.id ? `${t('Update Repair Job')} — ${formData.job_number}` : t('Create New Repair Job')}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" />}
                            {formData.id ? t('Update') : t('Create')}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} />
                    </div>
                </Modal.Header>

                <style>{`
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .rbt-input-main { height: 34px !important; padding: 6px 12px !important; font-size: 13px !important; border-color: #c3c6d7 !important; }
                `}</style>

                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} style={{ flex: 1, overflow: 'auto', padding: '20px 28px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '860px', margin: '0 auto' }}>

                            {/* Error banner */}
                            <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '300px' : '0', marginBottom: totalErrors > 0 ? '16px' : '0', transition: 'max-height 0.25s ease' }}>
                                <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px' }}>
                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        {allErrors.map(([k, v]) => (
                                            <li key={k} style={{ fontSize: '12px', color: '#93000a' }}>{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* ── Job Information ── */}
                            <div style={CARD}>
                                <SectionTitle icon="bi-clipboard2-pulse">{t('Job Information')}</SectionTitle>
                                <div className="row g-2">
                                    <div className="col-12">
                                        <Label required>{t('Title')}</Label>
                                        <input value={formData.title || ''} type="text" onChange={(e) => setField("title", e.target.value)} style={INPUT} placeholder={t('e.g. Engine overhaul, AC repair, Full service...')} />
                                        <ErrMsg>{errors.title}</ErrMsg>
                                    </div>
                                    <div className="col-md-4">
                                        <Label>{t('Job Number')}</Label>
                                        <input value={formData.job_number || ''} type="text" onChange={(e) => setField("job_number", e.target.value)} style={{ ...INPUT, background: '#f0f2f4' }} readOnly />
                                    </div>
                                    <div className="col-md-4">
                                        <Label>{t('Status')}</Label>
                                        <select value={formData.status || 'open'} onChange={(e) => setField("status", e.target.value)} style={INPUT}>
                                            <option value="open">{t('Open')}</option>
                                            <option value="in_progress">{t('In Progress')}</option>
                                            <option value="completed">{t('Completed')}</option>
                                            <option value="delivered">{t('Delivered')}</option>
                                            <option value="cancelled">{t('Cancelled')}</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <Label>{t('Est. Delivery')}</Label>
                                        <input
                                            value={formData.estimated_delivery ? new Date(formData.estimated_delivery).toISOString().slice(0, 10) : ''}
                                            type="date"
                                            onChange={(e) => setField("estimated_delivery", e.target.value ? new Date(e.target.value).toISOString() : "")}
                                            style={INPUT}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Customer & Vehicle ── */}
                            <div style={CARD}>
                                <SectionTitle icon="bi-person-vcard">{t('Customer & Vehicle')}</SectionTitle>

                                {/* 2-col layout: inputs left | details right */}
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Row A: Customer (narrow) | Vehicle | Date */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                    {/* 1. Customer (narrow input, wide dropdown) */}
                                    <div style={{ flex: '0 0 18%', minWidth: 0 }}>
                                        <Label>{t('Customer')}</Label>
                                        <Typeahead
                                            id="customer_id"
                                            labelKey="label"
                                            filterBy={() => true}
                                            onChange={(selectedItems) => {
                                                errors.customer_id = "";
                                                setErrors({ ...errors });
                                                if (selectedItems.length === 0) {
                                                    formData.customer_id = "";
                                                    setFormData({ ...formData });
                                                    selectedCustomers = [];
                                                    setSelectedCustomers([]);
                                                    setVehicleOptions([]);
                                                    return;
                                                }
                                                const c = selectedItems[0];
                                                formData.customer_id = c.id;
                                                setFormData({ ...formData });
                                                selectedCustomers = [...selectedItems];
                                                setSelectedCustomers([...selectedCustomers]);
                                                // Pre-load this customer's vehicles
                                                suggestVehicles('', c.id);
                                            }}
                                            options={customerOptions}
                                            placeholder={t('Search customer...')}
                                            selected={selectedCustomers}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => { suggestCustomers(searchTerm); }}
                                            ref={customerSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") { setCustomerOptions([]); customerSearchRef.current?.clear(); }
                                            }}
                                            renderMenu={(results, menuProps, state) => {
                                                const searchWords = state.text.toLowerCase().split(' ').filter(Boolean);
                                                function hl(text, bold) {
                                                    if (!text) return '–';
                                                    if (!searchWords.length) return text;
                                                    const parts = text.split(new RegExp(`(${searchWords.join('|')})`, 'gi'));
                                                    return parts.map((p, i) => searchWords.includes(p.toLowerCase())
                                                        ? <mark key={i} style={{ background: '#fef08a', padding: 0, fontWeight: bold ? 700 : 600 }}>{p}</mark>
                                                        : p
                                                    );
                                                }
                                                return (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: 'min(95vw, 680px)', zIndex: 9999, padding: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                                        {/* Header */}
                                                        <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, pointerEvents: 'none' }}>
                                                            <div style={{ display: 'flex', padding: '5px 12px', background: '#f8f9fa', borderBottom: '2px solid #e2e8f0', fontWeight: 700, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                {CUST_COLS.map(c => <div key={c.key} style={{ width: c.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(c.label)}</div>)}
                                                            </div>
                                                        </MenuItem>
                                                        {/* Rows */}
                                                        {results.map((option, idx) => {
                                                            const isActive = state.activeIndex === idx || results.length === 1;
                                                            return (
                                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div style={{ display: 'flex', padding: '7px 12px', background: isActive ? '#e8f0fe' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                                                                        {CUST_COLS.map(col => (
                                                                            <div key={col.key} style={{ width: col.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: isActive ? '#191c1e' : '#374151', fontWeight: (isActive && col.key === 'name') ? 700 : 400 }}>
                                                                                {col.key === 'name' && hl(option.name, true)}
                                                                                {col.key === 'code' && (option.code || '–')}
                                                                                {col.key === 'phone' && (option.phone || '–')}
                                                                                {col.key === 'vat_no' && (option.vat_no || '–')}
                                                                                {col.key === 'credit_balance' && (
                                                                                    <span style={{ fontWeight: 600, color: (option.credit_balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                                                                                        {option.credit_balance != null ? parseFloat(option.credit_balance).toFixed(2) : '–'}
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

                                    {/* 2. Vehicle */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Label>{t('Vehicle')}</Label>
                                        <Typeahead
                                            id="vehicle_id"
                                            labelKey="label"
                                            onChange={(selectedItems) => {
                                                errors.vehicle_id = "";
                                                setErrors({ ...errors });
                                                if (selectedItems.length === 0) {
                                                    formData.vehicle_id = "";
                                                    formData.vehicle_number = "";
                                                    formData.brand = "";
                                                    formData.model = "";
                                                    setFormData({ ...formData });
                                                    setSelectedVehicles([]);
                                                    return;
                                                }
                                                const v = selectedItems[0];
                                                formData.vehicle_id = v.id;
                                                formData.vehicle_number = v.vehicle_number || "";
                                                formData.brand = v.brand || "";
                                                formData.model = v.model || "";
                                                // Auto-set customer from vehicle if not already set
                                                if (v.customer_id && !formData.customer_id) {
                                                    formData.customer_id = v.customer_id;
                                                    fetchCustomerById(v.customer_id);
                                                }
                                                setFormData({ ...formData });
                                                setSelectedVehicles([...selectedItems]);
                                            }}
                                            options={vehicleOptions}
                                            placeholder={t('Search vehicle...')}
                                            selected={selectedVehicles}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => {
                                                const custId = selectedCustomer?.id || null;
                                                suggestVehicles(searchTerm, custId);
                                            }}
                                            ref={vehicleSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") { setVehicleOptions([]); vehicleSearchRef.current?.clear(); }
                                            }}
                                            renderMenuItemChildren={(option) => (
                                                <div style={{ padding: '4px 2px' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#191c1e' }}>
                                                        {option.vehicle_number} {option.brand && <span style={{ fontWeight: 400, color: '#5e6c84' }}>— {option.brand} {option.model}</span>}
                                                    </div>
                                                    {option.customer_name && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: 1 }}><i className="bi bi-person me-1"></i>{option.customer_name}</div>}
                                                </div>
                                            )}
                                        />
                                    </div>

                                    {/* 3. Date */}
                                    <div style={{ flex: '0 0 25%', minWidth: 0 }}>
                                        <Label>{t('Date')}</Label>
                                        <input
                                            value={formData.date ? new Date(formData.date).toISOString().slice(0, 10) : ''}
                                            type="date"
                                            onChange={(e) => setField("date", e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                                            style={INPUT}
                                        />
                                    </div>
                                </div>

                                {/* Row B: KM + Technician */}
                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    <div style={{ flex: '0 0 28%', minWidth: 0 }}>
                                        <Label>{t('KM')}</Label>
                                        <input value={formData.km === undefined || formData.km === null ? '' : formData.km} type="number" step="0.1"
                                            onChange={(e) => setField("km", e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                            style={INPUT} placeholder="0" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Label>{t('Technician')}</Label>
                                        <Typeahead
                                            id="technician_id"
                                            labelKey="name"
                                            onChange={(selectedItems) => {
                                                errors.technician_id = "";
                                                setErrors({ ...errors });
                                                if (selectedItems.length === 0) {
                                                    formData.technician_id = "";
                                                    formData.technician_name = "";
                                                    setFormData({ ...formData });
                                                    setSelectedTechnicians([]);
                                                    return;
                                                }
                                                formData.technician_id = selectedItems[0].id;
                                                formData.technician_name = selectedItems[0].name;
                                                setFormData({ ...formData });
                                                setSelectedTechnicians([...selectedItems]);
                                            }}
                                            options={technicianOptions}
                                            placeholder={t('Search employee by name...')}
                                            selected={selectedTechnicians}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => { suggestTechnicians(searchTerm); }}
                                            ref={technicianSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") { setTechnicianOptions([]); technicianSearchRef.current?.clear(); }
                                            }}
                                            renderMenuItemChildren={(option) => (
                                                <div style={{ padding: '4px 2px' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#191c1e' }}>{option.name}</div>
                                                    {option.position && (
                                                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{option.position}</div>
                                                    )}
                                                </div>
                                            )}
                                        />
                                    </div>
                                </div>
                                </div>{/* end left column */}

                                {/* RIGHT: Customer & Vehicle details */}
                                <div style={{ flex: '0 0 255px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {selectedCustomer && (
                                        <div style={{ padding: '12px 14px', background: 'rgba(0,74,198,0.04)', border: '1px solid #c7d7f5', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                                                <i className="bi bi-person-circle" style={{ color: '#004ac6', fontSize: 16 }}></i>
                                                {selectedCustomer.code && (
                                                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{selectedCustomer.code}</span>
                                                )}
                                                <span style={{ fontWeight: 700, fontSize: 13, color: '#191c1e' }}>{selectedCustomer.name}</span>
                                            </div>
                                            {selectedCustomer.name_in_arabic && (
                                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{selectedCustomer.name_in_arabic}</div>
                                            )}
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: '#374151', marginBottom: 5 }}>
                                                {selectedCustomer.phone && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: 11 }}></i>{selectedCustomer.phone}
                                                    </span>
                                                )}
                                                {selectedCustomer.phone2 && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: 11 }}></i>{selectedCustomer.phone2}
                                                    </span>
                                                )}
                                                {selectedCustomer.vat_no && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: 11 }}></i>
                                                        <span style={{ color: '#6b7280' }}>VAT:</span>
                                                        <strong>{selectedCustomer.vat_no}</strong>
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: 12 }}></i>
                                                    <span style={{ fontSize: 12, color: '#6b7280' }}>{t('Balance')}:</span>
                                                    <strong style={{ fontSize: 14, color: (parseFloat(selectedCustomer.credit_balance) || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                                                        {parseFloat(selectedCustomer.credit_balance || 0).toFixed(2)}
                                                    </strong>
                                                </span>
                                                {parseFloat(selectedCustomer.credit_limit) > 0 && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="bi bi-shield-check" style={{ color: '#6b7280', fontSize: 12 }}></i>
                                                        <span style={{ fontSize: 12, color: '#6b7280' }}>{t('Limit')}:</span>
                                                        <strong style={{ fontSize: 13, color: '#374151' }}>{parseFloat(selectedCustomer.credit_limit).toFixed(2)}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {selectedVehicle && (
                                        <div style={{ padding: '12px 14px', background: 'rgba(0,135,90,0.04)', border: '1px solid #b3e0cc', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                                                <i className="bi bi-car-front" style={{ color: '#00875a', fontSize: 16 }}></i>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: '#191c1e', letterSpacing: '0.04em' }}>{selectedVehicle.vehicle_number}</span>
                                                {(selectedVehicle.brand || selectedVehicle.model) && (
                                                    <span style={{ fontSize: 12, color: '#5e6c84', fontWeight: 400 }}>{selectedVehicle.brand} {selectedVehicle.model}</span>
                                                )}
                                            </div>
                                            {selectedVehicle.customer_name && (
                                                <div style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                    <i className="bi bi-person" style={{ color: '#6b7280', fontSize: 11 }}></i>
                                                    {selectedVehicle.customer_name}
                                                </div>
                                            )}
                                            {selectedVehicle.year && (
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{t('Year')}: <strong>{selectedVehicle.year}</strong></div>
                                            )}
                                            {selectedVehicle.color && (
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{t('Color')}: <strong>{selectedVehicle.color}</strong></div>
                                            )}
                                            {formData.km > 0 && (
                                                <div style={{ marginTop: 4, fontSize: 12, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0faf5', border: '1px solid #b3e0cc', borderRadius: 4, padding: '2px 8px' }}>
                                                    <i className="bi bi-speedometer2" style={{ color: '#00875a', fontSize: 11 }}></i>
                                                    <strong>{parseFloat(formData.km).toLocaleString()}</strong> km
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!selectedCustomer && !selectedVehicle && (
                                        <div style={{ minHeight: 90, border: '1.5px dashed #d1d5db', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, gap: 6 }}>
                                            <i className="bi bi-person-car" style={{ fontSize: 20 }}></i>
                                            <span>{t('Select customer & vehicle')}</span>
                                        </div>
                                    )}
                                </div>
                                </div>{/* end 2-col flex */}
                            </div>

                            {/* ── Service Details ── */}
                            <div style={CARD}>
                                <SectionTitle icon="bi-tools">{t('Service Details')}</SectionTitle>
                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <Label>{t('Complaint')}</Label>
                                        <textarea value={formData.complaint || ''} onChange={(e) => setField("complaint", e.target.value)} style={{ ...INPUT, minHeight: '80px' }} placeholder={t('Customer complaint description')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Inspection')}</Label>
                                        <textarea value={formData.inspection || ''} onChange={(e) => setField("inspection", e.target.value)} style={{ ...INPUT, minHeight: '80px' }} placeholder={t('Inspection findings')} />
                                    </div>
                                    <div className="col-12">
                                        <Label>{t('Work Done')}</Label>
                                        <textarea value={formData.work_done || ''} onChange={(e) => setField("work_done", e.target.value)} style={{ ...INPUT, minHeight: '80px' }} placeholder={t('Description of work performed')} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Parts & Labour ── */}
                            <div style={CARD}>
                                <SectionTitle icon="bi-box-seam">{t('Parts & Labour')}</SectionTitle>

                                <div className="row g-2 mb-3">
                                    <div className="col-md-8">
                                        <Label>{t('Search & Add Parts / Services')}</Label>
                                        <Typeahead
                                            id="product_search"
                                            labelKey="name"
                                            filterBy={() => true}
                                            open={openProductSearch}
                                            onChange={(selectedItems) => {
                                                setSelectedProducts([]);
                                            }}
                                            options={productOptions}
                                            placeholder={t('Search products or services to add...')}
                                            selected={selectedProducts}
                                            highlightOnlyResult={false}
                                            onInputChange={(searchTerm) => {
                                                suggestProducts(searchTerm);
                                                if (!searchTerm) { setOpenProductSearch(false); setProductOptions([]); }
                                            }}
                                            ref={productSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") { setProductOptions([]); setOpenProductSearch(false); productSearchRef.current?.clear(); }
                                            }}
                                            renderMenu={(results, menuProps) => (
                                                <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: 'min(96vw, 920px)', zIndex: 9999, padding: 0 }}>
                                                    <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, pointerEvents: 'auto' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '7px 12px', gap: 10 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1 }}>{t('Select Products / Services')}</span>
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenProductSearch(false); productSearchRef.current?.clear(); setProductOptions([]); }}
                                                                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                                            >
                                                                ✓ {t('Done')}
                                                            </button>
                                                        </div>
                                                    </MenuItem>
                                                    {results.map((option, idx) => {
                                                        let checked = isPartAdded(option.id);
                                                        return (
                                                            <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                <div
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: checked ? '#eff6ff' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        checked = !checked;
                                                                        if (checked) { addPart(option); } else { removePartByProductId(option.id); }
                                                                        setOpenProductSearch(true);
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isPartAdded(option.id)}
                                                                        onChange={() => { }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0, accentColor: '#004ac6' }}
                                                                    />
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#191c1e' }}>{option.name}</div>
                                                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                                            {[option.item_code, option.is_service ? t('Service') : t('Product')].filter(Boolean).join(' • ')}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                                            {t('Excl. VAT')}: <strong style={{ color: '#191c1e' }}>{fmtCurrency(option.retail_price)}</strong>
                                                                        </div>
                                                                        <div style={{ fontSize: '11px', color: '#004ac6' }}>
                                                                            {t('Incl. VAT')}: <strong>{fmtCurrency(option.retail_price_with_vat)}</strong>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Menu>
                                            )}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <Label>{t('Labour Charge')}</Label>
                                        <input value={formData.labour_charge ?? ''} type="number" step="0.01" onChange={(e) => setField("labour_charge", e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} style={INPUT} />
                                    </div>
                                </div>

                                {formData.parts && formData.parts.length > 0 && (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered">
                                            <thead>
                                                <tr className="text-center">
                                                    <th>{t('Part / Service Name')}</th>
                                                    <th style={{ width: '90px' }}>{t('Qty')}</th>
                                                    <th style={{ width: '160px' }}>
                                                        <div>{t('Unit Price')}</div>
                                                        <div style={{ fontWeight: 400, fontSize: '10px', color: '#6b7280' }}>{t('Excl. VAT')} / {t('Incl. VAT')}</div>
                                                    </th>
                                                    <th style={{ width: '150px' }}>
                                                        <div>{t('Total')}</div>
                                                        <div style={{ fontWeight: 400, fontSize: '10px', color: '#6b7280' }}>{t('Excl. VAT')} / {t('Incl. VAT')}</div>
                                                    </th>
                                                    <th style={{ width: '50px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.parts.map((part, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            <input value={part.name || ''} type="text" onChange={(e) => updatePart(idx, 'name', e.target.value)} style={INPUT} />
                                                        </td>
                                                        <td>
                                                            <input value={part.qty ?? ''} type="number" step="0.01" onChange={(e) => updatePart(idx, 'qty', e.target.value)} style={INPUT} />
                                                        </td>
                                                        <td>
                                                            <input value={part.unit_price ?? ''} type="number" step="0.01" onChange={(e) => updatePart(idx, 'unit_price', e.target.value)} style={INPUT} placeholder={t('Excl. VAT')} />
                                                            <input value={part.unit_price_with_vat ?? part.unit_price ?? ''} type="number" step="0.01" onChange={(e) => updatePart(idx, 'unit_price_with_vat', e.target.value)} style={{ ...INPUT, marginTop: '3px', color: '#004ac6' }} placeholder={t('Incl. VAT')} />
                                                        </td>
                                                        <td className="text-end" style={{ paddingTop: '10px' }}>
                                                            <div style={{ fontWeight: 600, color: '#191c1e', fontSize: '13px' }}>{fmtCurrency(part.total_price)}</div>
                                                            <div style={{ fontWeight: 600, color: '#004ac6', fontSize: '13px', marginTop: '3px' }}>{fmtCurrency(part.total_price_with_vat !== undefined ? part.total_price_with_vat : part.total_price)}</div>
                                                        </td>
                                                        <td className="text-center">
                                                            <Button size="sm" variant="outline-danger" onClick={() => removePart(idx)}>
                                                                <i className="bi bi-trash"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: '#f0f2f4' }}>
                                                    <td colSpan="3" className="text-end"><strong>{t('Parts Total')} ({t('Excl. VAT')}):</strong></td>
                                                    <td className="text-end"><strong>{fmtCurrency(formData.parts_total)}</strong></td>
                                                    <td></td>
                                                </tr>
                                                <tr style={{ background: '#e8f0fe' }}>
                                                    <td colSpan="3" className="text-end"><strong style={{ color: '#004ac6' }}>{t('Parts Total')} ({t('Incl. VAT')}):</strong></td>
                                                    <td className="text-end"><strong style={{ color: '#004ac6' }}>{fmtCurrency(formData.parts_total_with_vat)}</strong></td>
                                                    <td></td>
                                                </tr>
                                                <tr style={{ background: '#f0f2f4' }}>
                                                    <td colSpan="3" className="text-end"><strong>{t('Labour Charge')}:</strong></td>
                                                    <td className="text-end"><strong>{fmtCurrency(formData.labour_charge)}</strong></td>
                                                    <td></td>
                                                </tr>
                                                <tr style={{ background: '#d0e1fb' }}>
                                                    <td colSpan="3" className="text-end"><strong style={{ fontSize: '14px' }}>{t('Grand Total')} ({t('Excl. VAT')}):</strong></td>
                                                    <td className="text-end"><strong style={{ fontSize: '14px', color: '#004ac6' }}>{fmtCurrency(formData.total)}</strong></td>
                                                    <td></td>
                                                </tr>
                                                <tr style={{ background: '#bbd0f5' }}>
                                                    <td colSpan="3" className="text-end"><strong style={{ fontSize: '14px' }}>{t('Grand Total')} ({t('Incl. VAT')}):</strong></td>
                                                    <td className="text-end"><strong style={{ fontSize: '14px', color: '#004ac6' }}>{fmtCurrency(formData.total_with_vat)}</strong></td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default RepairJobCreate;
