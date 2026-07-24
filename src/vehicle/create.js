import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';

const VehicleCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, customerId, customerData) {
            formData = {};
            setFormData({ ...formData });
            setErrors({});
            setCustomerOptions([]);
            setSelectedCustomers([]);
            setBrandModels([]);
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
            }
            if (id) {
                getVehicle(id);
            }
            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },
    }));

    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (error) { }
    }

    const { t } = useTranslation('common');
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    const [brands, setBrands] = useState([]);
    const [brandModels, setBrandModels] = useState([]);

    const [customerOptions, setCustomerOptions] = useState([]);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const customerSearchRef = useRef();

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function loadBrands() {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        fetch('/v1/vehicle/brands', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (response.ok && data.result) {
                    setBrands(data.result);
                }
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
                if (formData.brand) {
                    updateBrandModels(formData.brand);
                }
                if (formData.customer_id) {
                    selectedCustomers = [{ id: formData.customer_id, name: formData.customer_name }];
                    setSelectedCustomers([...selectedCustomers]);
                }
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
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
        var params = { name: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }

        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };

        let result = await fetch("/v1/customer?select=id,name,name_in_arabic" + queryString, requestOptions);
        let data = await result.json();
        setCustomerOptions(data.result || []);
    }

    function setField(field, value) {
        errors[field] = "";
        setErrors({ ...errors });
        formData[field] = value;
        setFormData({ ...formData });
    }

    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => children
        ? <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
        : null;
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `${t('Update Vehicle')} — ${formData.vehicle_number || formData.brand + ' ' + formData.model}` : t('Create New Vehicle')}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
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
                `}</style>

                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                            <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '300px' : '0', marginBottom: totalErrors > 0 ? '16px' : '0', transition: 'max-height 0.25s ease' }}>
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

                            <div style={CARD}>
                                <SectionTitle icon="bi-person">{t('Customer')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <Label required>{t('Customer')}</Label>
                                        <Typeahead
                                            id="customer_id"
                                            labelKey="name"
                                            onChange={(selectedItems) => {
                                                errors.customer_id = "";
                                                setErrors({ ...errors });
                                                if (selectedItems.length === 0) {
                                                    formData.customer_id = "";
                                                    formData.customer_name = "";
                                                    setFormData({ ...formData });
                                                    setSelectedCustomers([]);
                                                    return;
                                                }
                                                formData.customer_id = selectedItems[0].id;
                                                formData.customer_name = selectedItems[0].name;
                                                setFormData({ ...formData });
                                                setSelectedCustomers([...selectedItems]);
                                            }}
                                            options={customerOptions}
                                            placeholder={t('Search customer...')}
                                            selected={selectedCustomers}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => { suggestCustomers(searchTerm); }}
                                            ref={customerSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") {
                                                    setCustomerOptions([]);
                                                    customerSearchRef.current?.clear();
                                                }
                                            }}
                                        />
                                        <ErrMsg>{errors.customer_id}</ErrMsg>
                                    </div>
                                </div>
                            </div>

                            <div style={CARD}>
                                <SectionTitle icon="bi-car-front">{t('Vehicle Identification')}</SectionTitle>
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

                            <div style={CARD}>
                                <SectionTitle icon="bi-file-earmark-text">{t('Registration & Technical')}</SectionTitle>
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
                                        <input value={formData.current_km === undefined || formData.current_km === null ? '' : formData.current_km} type="number" step="0.1" onChange={(e) => setField("current_km", e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} style={INPUT} placeholder="0" />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Color')}</Label>
                                        <input value={formData.color || ''} type="text" onChange={(e) => setField("color", e.target.value)} style={INPUT} placeholder={t('Color')} />
                                    </div>
                                    <div className="col-12">
                                        <Label>{t('Remarks')}</Label>
                                        <textarea value={formData.remarks || ''} onChange={(e) => setField("remarks", e.target.value)} style={{ ...INPUT, minHeight: '60px' }} placeholder={t('Optional notes')} />
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