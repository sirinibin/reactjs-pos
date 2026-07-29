import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner, Dropdown } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { highlightWords } from '../utils/search.js';

const CUST_COLS = [
    { key: 'code',           label: 'Code',    w: '11%' },
    { key: 'name',           label: 'Name',    w: '37%' },
    { key: 'phone',          label: 'Phone',   w: '20%' },
    { key: 'vat_no',         label: 'VAT No.', w: '18%' },
    { key: 'credit_balance', label: 'Balance', w: '14%' },
];

const VehicleCreate = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    const customerSearchRef = useRef();
    const timerRef = useRef();

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    const [brands, setBrands] = useState([]);
    const [brandModels, setBrandModels] = useState([]);

    const [customerOptions, setCustomerOptions] = useState([]);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const [activeCustomer, setActiveCustomer] = useState(null);
    const [customerVehicles, setCustomerVehicles] = useState([]);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function doOpen(id, customerId, customerData) {
        formData = {};
        setFormData({ ...formData });
        setErrors({});
        setCustomerOptions([]);
        setSelectedCustomers([]);
        setBrandModels([]);
        setActiveCustomer(null);
        setCustomerVehicles([]);
        loadBrands();
        if (customerId) {
            formData.customer_id = customerId;
            if (customerData?.name) {
                formData.customer_name = customerData.name;
                selectedCustomers = [{ id: customerId, name: customerData.name }];
                setSelectedCustomers([...selectedCustomers]);
            }
            if (customerData?.name_in_arabic) {
                formData.customer_name_arabic = customerData.name_in_arabic;
            }
            setFormData({ ...formData });
            onCustomerSelected({ id: customerId, name: customerData?.name || "", ...customerData });
        }
        if (id) {
            getVehicle(id);
        }
        getStore(localStorage.getItem("store_id"));
        SetShow(true);
    }

    useImperativeHandle(ref, () => ({ open: doOpen }));

    async function getStore(id) {
        try { await fetchStore(id); } catch (error) { }
    }

    function loadBrands() {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        fetch('/v1/vehicle/brands', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (response.ok && data.result) { setBrands(data.result); }
            })
            .catch(error => console.log(error));
    }

    function getVehicle(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/vehicle/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setErrors({});
                formData = data.result;
                setFormData({ ...formData });
                if (formData.brand) { updateBrandModels(formData.brand); }
                if (formData.customer_id) {
                    selectedCustomers = [{ id: formData.customer_id, name: formData.customer_name }];
                    setSelectedCustomers([...selectedCustomers]);
                    onCustomerSelected({ id: formData.customer_id, name: formData.customer_name });
                }
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    async function onCustomerSelected(customer) {
        if (!customer?.id) { setActiveCustomer(null); setCustomerVehicles([]); return; }
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const storeId = localStorage.getItem('store_id') || '';
        try {
            const r = await fetch(`/v1/customer/${customer.id}?search[store_id]=${storeId}`, { headers }).then(r => r.json());
            if (r?.result) { setActiveCustomer(r.result); }
            else { setActiveCustomer(customer); }
        } catch(e) { setActiveCustomer(customer); }
        try {
            const r = await fetch(`/v1/vehicle?search[customer_id]=${customer.id}&search[store_id]=${storeId}&limit=50&sort=-created_at&select=id,vehicle_number,brand,model,variant,year,color`, { headers }).then(r => r.json());
            setCustomerVehicles(r?.result || []);
        } catch(e) { setCustomerVehicles([]); }
    }

    function updateBrandModels(brandName) {
        const brandData = brands.find(b => b.brand === brandName);
        setBrandModels(brandData ? brandData.models : []);
    }

    function handleCreate(event) {
        event.preventDefault();
        if (!formData.customer_id) {
            errors.customer_id = t("Customer is required");
            setErrors({ ...errors });
            return;
        }
        let endPoint = "/v1/vehicle";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/vehicle/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }
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
                    if (props.showToastMessage) props.showToastMessage(t("Vehicle updated successfully!"), "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage(t("Vehicle created successfully!"), "success");
                }
                if (props.refreshList) props.refreshList();
                handleClose();
                if (props.openDetailsView) props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setErrors({ ...error });
                if (props.showToastMessage) props.showToastMessage(t("Failed to process vehicle!"), "danger");
            });
    }

    async function suggestCustomers(searchTerm) {
        setCustomerOptions([]);
        if (!searchTerm) return;
        const storeId = localStorage.getItem('store_id') || '';
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        const qs = `select=id,code,name,name_in_arabic,phone,vat_no,credit_balance&name=${encodeURIComponent(searchTerm)}&search[store_id]=${storeId}`;
        try {
            let result = await fetch("/v1/customer?" + qs, { method: "GET", headers });
            let data = await result.json();
            setCustomerOptions(data.result || []);
        } catch(e) {}
    }

    function setField(field, value) {
        errors[field] = "";
        setErrors({ ...errors });
        formData[field] = value;
        setFormData({ ...formData });
    }

    // ── Design tokens ──────────────────────────────────────────────────────────
    const cardStyle = {
        position: 'relative',
        border: '1px solid #d0d7e2',
        borderRadius: '8px',
        padding: '16px 16px 14px',
        marginBottom: '16px',
        background: '#fff',
    };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };
    const FloatLabel = ({ children }) => (
        <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {children}
        </span>
    );
    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '3px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => children
        ? <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
        : null;

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    const custBalance = parseFloat(activeCustomer?.credit_balance ?? 0);

    function handleNewCustomer() {
        if (!props.onOpenCustomerForm) return;
        props.onOpenCustomerForm(undefined, (customer) => {
            if (!customer?.id) return;
            formData.customer_id = customer.id;
            formData.customer_name = customer.name;
            setFormData({ ...formData });
            selectedCustomers = [{ id: customer.id, name: customer.name, code: customer.code, phone: customer.phone, vat_no: customer.vat_no }];
            setSelectedCustomers([...selectedCustomers]);
            onCustomerSelected(customer);
            errors.customer_id = "";
            setErrors({ ...errors });
        });
    }

    function handleEditCustomer() {
        if (!activeCustomer?.id || !props.onOpenCustomerForm) return;
        props.onOpenCustomerForm(activeCustomer.id, (customer) => {
            if (!customer?.id) return;
            formData.customer_id = customer.id;
            formData.customer_name = customer.name;
            if (customer.name_in_arabic) formData.customer_name_arabic = customer.name_in_arabic;
            setFormData({ ...formData });
            selectedCustomers = [{ id: customer.id, name: customer.name, code: customer.code, phone: customer.phone, vat_no: customer.vat_no }];
            setSelectedCustomers([...selectedCustomers]);
            onCustomerSelected(customer);
        });
    }

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal" className="pw-modal-wrap">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `${t('Update Vehicle')} — ${formData.vehicle_number || [formData.brand, formData.model].filter(Boolean).join(' ')}` : t('Create New Vehicle')}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <Dropdown align="end">
                                <Dropdown.Toggle variant="outline-secondary" size="sm" id="veh-form-hist" title={t('History')}>
                                    <i className="bi bi-clock-history"></i>
                                </Dropdown.Toggle>
                                <Dropdown.Menu style={{ minWidth: 200 }}>
                                    <Dropdown.Item onClick={() => { handleClose(); props.openDetailsView && props.openDetailsView(formData.id, 'repairs'); }}>
                                        <i className="bi bi-tools me-2 text-warning"></i>{t('Repair Jobs')}
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => { handleClose(); props.openDetailsView && props.openDetailsView(formData.id, 'sales'); }}>
                                        <i className="bi bi-receipt me-2 text-success"></i>{t('Sales History')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => { handleClose(); props.openDetailsView && props.openDetailsView(formData.id, 'quotations'); }}>
                                        <i className="bi bi-file-earmark-text me-2 text-info"></i>{t('Quotation History')}
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? t('Update') : t('Create')}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>

                <style>{`
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .vc-veh-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 6px; border: 1px solid #d0d7e2; background: #f8fafc; cursor: pointer; font-size: 12px; font-weight: 500; color: #374151; transition: background 0.12s, border-color 0.12s; margin: 3px 3px 3px 0; }
                    .vc-veh-pill:hover:not(:disabled) { background: #e8f0fe; border-color: #93b4f5; color: #004ac6; }
                    .vc-veh-pill.active-veh { background: #dbeafe; border-color: #60a5fa; color: #1d4ed8; font-weight: 700; cursor: default; }
                `}</style>

                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} style={{ flex: 1, overflow: 'auto', padding: '20px 28px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

                            {/* Error banner */}
                            <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '300px' : '0', marginBottom: totalErrors > 0 ? '14px' : '0', transition: 'max-height 0.25s ease' }}>
                                <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px' }}>
                                    <div style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#93000a', marginBottom: '8px', fontSize: '13px' }}>
                                        {totalErrors} error{totalErrors > 1 ? 's' : ''} — {t('please fix before saving')}:
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        {allErrors.map(([k, v]) => (
                                            <li key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#93000a' }}>{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* ── Customer card ── */}
                            <div style={cardStyle}>
                                <FloatLabel>{t('Customer')}</FloatLabel>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                                    {/* Left: narrow search (40%) */}
                                    <div style={{ flex: '0 0 38%', minWidth: 0 }}>
                                        <Label required>{t('Search Customer')}</Label>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <div style={{ flex: 1, minWidth: 0, borderRadius: '4px', outline: errors.customer_id ? '2px solid #dc3545' : 'none' }}>
                                                <Typeahead
                                                    id="vehicle_customer_id"
                                                    positionFixed
                                                    filterBy={() => true}
                                                    labelKey="name"
                                                    emptyLabel=""
                                                    clearButton={false}
                                                    open={customerOptions.length === 0 ? false : undefined}
                                                    onChange={(selectedItems) => {
                                                        errors.customer_id = "";
                                                        setErrors({ ...errors });
                                                        if (selectedItems.length === 0) {
                                                            formData.customer_id = "";
                                                            formData.customer_name = "";
                                                            setFormData({ ...formData });
                                                            setSelectedCustomers([]);
                                                            setActiveCustomer(null);
                                                            setCustomerVehicles([]);
                                                            return;
                                                        }
                                                        const c = selectedItems[0];
                                                        formData.customer_id = c.id;
                                                        formData.customer_name = c.name;
                                                        setFormData({ ...formData });
                                                        setSelectedCustomers([...selectedItems]);
                                                        setCustomerOptions([]);
                                                        onCustomerSelected(c);
                                                    }}
                                                    options={customerOptions}
                                                    placeholder={t('Search customer...')}
                                                    selected={selectedCustomers}
                                                    highlightOnlyResult={true}
                                                    ref={customerSearchRef}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setCustomerOptions([]);
                                                            customerSearchRef.current?.clear();
                                                        }
                                                    }}
                                                    onInputChange={(searchTerm) => {
                                                        if (!searchTerm) {
                                                            formData.customer_id = "";
                                                            setSelectedCustomers([]);
                                                            setActiveCustomer(null);
                                                            setCustomerVehicles([]);
                                                            setFormData({ ...formData });
                                                        }
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => { suggestCustomers(searchTerm); }, 350);
                                                    }}
                                                    renderMenu={(results, menuProps, state) => {
                                                        const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                                        return (
                                                            <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '90vw', maxWidth: '90vw', minWidth: '300px', zIndex: 9999, padding: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                                                <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, pointerEvents: 'none' }}>
                                                                    <div style={{ display: 'flex', padding: '5px 10px', background: '#f8f9fa', borderBottom: '2px solid #e2e8f0', fontWeight: 700, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                        {CUST_COLS.map(col => (
                                                                            <div key={col.key} style={{ width: col.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(col.label)}</div>
                                                                        ))}
                                                                    </div>
                                                                </MenuItem>
                                                                {results.map((option, idx) => {
                                                                    const isActive = state.activeIndex === idx || results.length === 1;
                                                                    return (
                                                                        <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                            <div style={{ display: 'flex', padding: '6px 10px', background: isActive ? '#e8f0fe' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                                                                                {CUST_COLS.map(col => (
                                                                                    <div key={col.key} style={{ width: col.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: isActive ? '#191c1e' : '#374151', fontWeight: (isActive && col.key === 'name') ? 700 : 400 }}>
                                                                                        {col.key === 'code' && (option.code ? highlightWords(option.code, searchWords, isActive) : '–')}
                                                                                        {col.key === 'name' && highlightWords(option.name + (option.name_in_arabic ? ` - ${option.name_in_arabic}` : ''), searchWords, isActive)}
                                                                                        {col.key === 'phone' && (option.phone ? highlightWords(option.phone, searchWords, isActive) : '–')}
                                                                                        {col.key === 'vat_no' && (option.vat_no ? highlightWords(option.vat_no, searchWords, isActive) : '–')}
                                                                                        {col.key === 'credit_balance' && (
                                                                                            <span style={{ fontWeight: 600, color: (option.credit_balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                                                                                                {option.credit_balance != null ? option.credit_balance : '–'}
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
                                            {props.onOpenCustomerForm && (
                                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleNewCustomer} title={t('New Customer')}>
                                                    <i className="bi bi-plus-lg"></i>
                                                </button>
                                            )}
                                        </div>
                                        <ErrMsg>{errors.customer_id}</ErrMsg>
                                    </div>

                                    {/* Right: selected customer details + their vehicles (60%) */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {activeCustomer ? (
                                            <div style={{ background: 'rgba(0,74,198,0.04)', border: '1px solid #c7d7f5', borderRadius: '8px', padding: '10px 14px' }}>
                                                {/* Customer info */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                    <i className="bi bi-person-circle" style={{ color: '#004ac6', fontSize: 15 }}></i>
                                                    {activeCustomer.code && (
                                                        <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{activeCustomer.code}</span>
                                                    )}
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: '#191c1e' }}>{activeCustomer.name}</span>
                                                    {activeCustomer.name_in_arabic && (
                                                        <span style={{ fontSize: 12, color: '#6b7280' }}>{activeCustomer.name_in_arabic}</span>
                                                    )}
                                                    {props.onOpenCustomerForm && (
                                                        <button type="button" onClick={handleEditCustomer}
                                                            style={{ background: 'none', border: '1px solid #c7d7f5', borderRadius: 4, padding: '1px 7px', cursor: 'pointer', color: '#004ac6', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                            <i className="bi bi-pencil" style={{ fontSize: 10 }}></i>{t('Edit')}
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#374151', marginBottom: 6 }}>
                                                    {activeCustomer.phone && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="bi bi-telephone" style={{ color: '#6b7280', fontSize: 11 }}></i>{activeCustomer.phone}
                                                        </span>
                                                    )}
                                                    {activeCustomer.vat_no && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="bi bi-receipt" style={{ color: '#6b7280', fontSize: 11 }}></i>
                                                            <span style={{ color: '#6b7280' }}>VAT:</span>
                                                            <strong>{activeCustomer.vat_no}</strong>
                                                        </span>
                                                    )}
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="bi bi-wallet2" style={{ color: '#004ac6', fontSize: 11 }}></i>
                                                        <span style={{ color: '#6b7280' }}>{t('Balance')}:</span>
                                                        <strong style={{ color: custBalance > 0 ? '#dc2626' : '#16a34a' }}>{custBalance.toFixed(2)}</strong>
                                                    </span>
                                                </div>

                                                {/* Customer vehicles */}
                                                {customerVehicles.length > 0 && (
                                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
                                                            <i className="bi bi-car-front me-1"></i>{t('Vehicles')} ({customerVehicles.length})
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                            {customerVehicles.map(v => (
                                                                <button
                                                                    key={v.id}
                                                                    type="button"
                                                                    className={`vc-veh-pill${formData.id === v.id ? ' active-veh' : ''}`}
                                                                    onClick={() => doOpen(v.id)}
                                                                    disabled={formData.id === v.id}
                                                                    title={[v.brand, v.model, v.variant, v.year ? `(${v.year})` : ''].filter(Boolean).join(' ')}
                                                                >
                                                                    <i className="bi bi-car-front" style={{ fontSize: 11, color: '#6b7280' }}></i>
                                                                    <span>{v.vehicle_number || [v.brand, v.model].filter(Boolean).join(' ') || '—'}</span>
                                                                    {v.year && <span style={{ color: '#9ca3af', fontSize: 11 }}>{v.year}</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ height: '100%', minHeight: 60, border: '1px dashed #d0d7e2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: 12, color: '#9ca3af' }}><i className="bi bi-person me-1"></i>{t('Select a customer to see details')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Vehicle Identification card ── */}
                            <div style={cardStyle}>
                                <FloatLabel><i className="bi bi-car-front me-1"></i>{t('Vehicle Identification')}</FloatLabel>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Label required>{t('Brand')}</Label>
                                        <select value={formData.brand || ''} onChange={(e) => {
                                            setField("brand", e.target.value);
                                            setField("model", "");
                                            updateBrandModels(e.target.value);
                                        }} style={INPUT}>
                                            <option value="">{t('Select Brand')}</option>
                                            {brands.map((b) => (
                                                <option key={b.brand} value={b.brand}>{b.brand}</option>
                                            ))}
                                        </select>
                                        <ErrMsg>{errors.brand}</ErrMsg>
                                    </div>
                                    <div className="col-md-6">
                                        <Label required>{t('Model')}</Label>
                                        <select value={formData.model || ''} onChange={(e) => setField("model", e.target.value)} style={INPUT} disabled={!formData.brand}>
                                            <option value="">{t('Select Model')}</option>
                                            {brandModels.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <ErrMsg>{errors.model}</ErrMsg>
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Variant')}</Label>
                                        <input value={formData.variant || ''} type="text" onChange={(e) => setField("variant", e.target.value)} style={INPUT} placeholder={t('e.g. GXL, Limited, LX')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Manufacture Year')}</Label>
                                        <input value={formData.year || ''} type="number" onChange={(e) => setField("year", parseInt(e.target.value) || 0)} style={INPUT} placeholder="2020" />
                                    </div>
                                </div>
                            </div>

                            {/* ── Registration & Technical card ── */}
                            <div style={cardStyle}>
                                <FloatLabel><i className="bi bi-file-earmark-text me-1"></i>{t('Registration & Technical')}</FloatLabel>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Label>{t('Vehicle Number (Plate)')}</Label>
                                        <input value={formData.vehicle_number || ''} type="text" onChange={(e) => setField("vehicle_number", e.target.value)} style={INPUT} placeholder={t('Plate number')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Istimara No.')}</Label>
                                        <input value={formData.istimara_no || ''} type="text" onChange={(e) => setField("istimara_no", e.target.value)} style={INPUT} placeholder={t('Istimara Number')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Chassis Number')}</Label>
                                        <input value={formData.chassis_number || ''} type="text" onChange={(e) => setField("chassis_number", e.target.value)} style={INPUT} placeholder={t('VIN / Chassis')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Engine Number')}</Label>
                                        <input value={formData.engine_number || ''} type="text" onChange={(e) => setField("engine_number", e.target.value)} style={INPUT} placeholder={t('Engine Number')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Current KM')}</Label>
                                        <input
                                            value={formData.current_km === undefined || formData.current_km === null ? '' : formData.current_km}
                                            type="number"
                                            step="0.1"
                                            onChange={(e) => setField("current_km", e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                            style={{ ...INPUT, ...(formData.id ? { background: '#f4f5f7', color: '#97a0af', cursor: 'not-allowed' } : {}) }}
                                            placeholder="0"
                                            disabled={!!formData.id}
                                        />
                                        {formData.id && (
                                            <div style={{ fontSize: 11, color: '#97a0af', marginTop: 3 }}>
                                                {t('Updated automatically from the latest sales or quotation')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Color')}</Label>
                                        <input value={formData.color || ''} type="text" onChange={(e) => setField("color", e.target.value)} style={INPUT} placeholder={t('Color')} />
                                    </div>
                                    <div className="col-12">
                                        <Label>{t('Remarks')}</Label>
                                        <textarea value={formData.remarks || ''} onChange={(e) => setField("remarks", e.target.value)} style={{ ...INPUT, minHeight: '56px' }} placeholder={t('Optional notes')} />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default VehicleCreate;
