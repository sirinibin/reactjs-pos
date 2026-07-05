import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Modal } from "react-bootstrap";
import { Spinner } from "react-bootstrap";
import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';

const WarehouseCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            formData = {
                national_address: {},
                code: "",
            };
            setFormData({ ...formData });
            selectedCountries = [];
            setSelectedCountries([]);
            if (id) {
                getWarehouse(id);
            }
            SetShow(true);
        },
    }));

    useEnterKeyNavigation();

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [flash, setFlash] = useState(null);
    const flashTimerRef = useRef(null);
    const timerRef = useRef(null);

    function showFlash(text, type = 'success') {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlash({ text, type });
        flashTimerRef.current = setTimeout(() => setFlash(null), 4000);
    }

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    let [formData, setFormData] = useState({ national_address: {} });

    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function getWarehouse(id) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        let queryParams = ObjectToSearchQueryParams(searchParams);
        fetch('/v1/warehouse/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setErrors({});
                let warehouseData = data.result;
                if (!warehouseData.national_address) warehouseData.national_address = {};
                if (warehouseData.country_code && warehouseData.country_name) {
                    selectedCountries = [{ value: warehouseData.country_code, label: warehouseData.country_name }];
                    setSelectedCountries(selectedCountries);
                }
                setFormData({ ...warehouseData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error || {});
            });
    }

    function isValidNDigitNumber(str, n) {
        return new RegExp(`^\\d{${n}}$`).test(str);
    }

    const validateSaudiPhone = (phone) => /^(?:\+9665|05)[0-9]{8}$/.test(phone);

    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");
    function convertToArabicNumber(input) {
        return input.replace(/\d/g, m => persianMap[parseInt(m)]);
    }

    function handleCreate(event) {
        event.preventDefault();

        if (formData.phone) formData.phone_in_arabic = convertToArabicNumber(formData.phone.toString());
        if (formData.zipcode) formData.zipcode_in_arabic = convertToArabicNumber(formData.zipcode.toString());

        if (formData.national_address) {
            const na = formData.national_address;
            if (na.application_no) na.application_no_arabic = convertToArabicNumber(na.application_no.toString());
            if (na.service_no) na.service_no_arabic = convertToArabicNumber(na.service_no.toString());
            if (na.customer_account_no) na.customer_account_no_arabic = convertToArabicNumber(na.customer_account_no.toString());
            if (na.building_no) na.building_no_arabic = convertToArabicNumber(na.building_no.toString());
            if (na.zipcode) na.zipcode_arabic = convertToArabicNumber(na.zipcode.toString());
            if (na.additional_no) na.additional_no_arabic = convertToArabicNumber(na.additional_no.toString());
            if (na.unit_no) na.unit_no_arabic = convertToArabicNumber(na.unit_no.toString());
        }

        let haveErrors = false;
        errors = {};
        setErrors({ ...errors });

        if (!formData.name) { errors["name"] = "Name is required"; haveErrors = true; }
        if (formData.phone && !validateSaudiPhone(formData.phone)) { errors["phone"] = "Invalid phone no."; haveErrors = true; }
        if (formData.email && !validateEmail(formData.email)) { errors["email"] = "E-mail is not valid"; haveErrors = true; }
        if (formData.national_address?.building_no && !isValidNDigitNumber(formData.national_address?.building_no, 4)) {
            errors["national_address_building_no"] = "Building number should be 4 digits"; haveErrors = true;
        }
        if (formData.national_address?.zipcode && !isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
            errors["national_address_zipcode"] = "Zip code should be 5 digits"; haveErrors = true;
        }

        if (haveErrors) {
            setErrors({ ...errors });
            showFlash("Please fix the errors before saving.", "danger");
            return;
        }

        if (localStorage.getItem('store_id')) formData.store_id = localStorage.getItem('store_id');

        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        let queryParams = ObjectToSearchQueryParams(searchParams);

        const wasNew = !formData.id;
        let endPoint = "/v1/warehouse";
        let method = "POST";
        if (formData.id) { endPoint = "/v1/warehouse/" + formData.id + "?" + queryParams; method = "PUT"; }

        const requestOptions = {
            method,
            headers: { 'Accept': 'application/json', "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
            body: JSON.stringify(formData),
        };

        setProcessing(true);
        fetch(endPoint, requestOptions)
            .then(async response => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }

                setErrors({});
                formData.id = data.result?.id;
                setFormData({ ...formData });
                const msg = wasNew ? "Warehouse created successfully!" : "Warehouse updated successfully!";
                showFlash(msg, "success");
                if (props.showToastMessage) props.showToastMessage(msg, "success");

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    setProcessing(false);
                    if (props.refreshList) props.refreshList();
                    if (localStorage.getItem("warehouse_id") && localStorage.getItem("warehouse_id") === data.result.id) {
                        localStorage.setItem("vat_percent", data.result.vat_percent);
                    }
                    handleClose();
                    if (props.openDetailsView) props.openDetailsView(data.result.id);
                }, 300);
            })
            .catch(error => {
                setProcessing(false);
                setErrors({ ...(error || {}) });
                showFlash("Failed to save warehouse. Please fix the errors and try again.", "danger");
                if (props.showToastMessage) props.showToastMessage("Failed to process warehouse!", "danger");
            });
    }

    const countryOptions = useMemo(() => countryList().getData(), []);
    let [selectedCountries, setSelectedCountries] = useState([]);
    const countrySearchRef = useRef();

    // ── Design tokens ─────────────────────────────────────────────────────
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => (
        <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
    );
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
            {flash && (
                <div style={{
                    position: 'fixed', top: '20px', right: '24px', zIndex: 99999,
                    background: flash.type === 'success' ? '#dcfce7' : '#ffdad6',
                    border: `1px solid ${flash.type === 'success' ? '#86efac' : '#f4adaa'}`,
                    borderRadius: '8px', padding: '12px 18px',
                    fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600,
                    color: flash.type === 'success' ? '#15803d' : '#93000a',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                    minWidth: '280px', maxWidth: '380px',
                    animation: 'fadeInDown 0.2s ease',
                }}>
                    <i className={`bi ${flash.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}
                        style={{ fontSize: '16px', flexShrink: 0 }}></i>
                    <span style={{ flex: 1 }}>{flash.text}</span>
                    <button type="button" onClick={() => setFlash(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: 1, padding: 0, marginLeft: '4px', opacity: 0.7 }}>
                        ×
                    </button>
                </div>
            )}

            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `Update Warehouse — ${formData.name}` : 'Create New Warehouse'}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                                <i className="bi bi-eye me-1"></i>View Detail
                            </button>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? 'Update' : 'Create'}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>
                <style>{`
                    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .pw-content-scroll { flex: 1; overflow-y: auto; padding: 20px 28px; background: #f7f9fb; }
                    .pw-tab-wrap { max-width: 900px; }
                    @media (max-width: 767px) {
                        .pw-content-scroll { padding: 14px 16px !important; }
                        .pw-tab-wrap { max-width: 100%; }
                    }
                    @media (min-width: 768px) and (max-width: 1100px) {
                        .pw-content-scroll { padding: 16px 20px; }
                        .pw-tab-wrap { max-width: 100%; }
                    }
                `}</style>
                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <div className="pw-content-scroll">

                            {/* Error Summary */}
                            <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '500px' : '0', marginBottom: totalErrors > 0 ? '16px' : '0', transition: 'max-height 0.25s ease, margin-bottom 0.2s ease' }}>
                                <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px' }}>
                                    <div style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#93000a', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '14px' }}></i>
                                        {totalErrors} error{totalErrors > 1 ? 's' : ''} — please fix before saving:
                                    </div>
                                    {allErrors.map(([k, v]) => (
                                        <div key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#93000a', paddingLeft: '10px' }}>• {v}</div>
                                    ))}
                                </div>
                            </div>

                            {/* General Info */}
                            <div className="pw-tab-wrap">
                                <div className="pw-card" style={CARD}>
                                    <SectionTitle icon="bi-building">Warehouse Identity</SectionTitle>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <Label required>Name</Label>
                                            <input
                                                value={formData.name || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    errors["name"] = ""; setErrors({ ...errors });
                                                    formData.name = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Warehouse name"
                                            />
                                            {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                                        </div>
                                        <div className="col-md-6">
                                            <Label>Name in Arabic</Label>
                                            <input
                                                value={formData.name_in_arabic || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    errors["name_in_arabic"] = ""; setErrors({ ...errors });
                                                    formData.name_in_arabic = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={{ ...INPUT, direction: 'rtl' }} placeholder="اسم المستودع"
                                            />
                                            {errors.name_in_arabic && <ErrMsg>{errors.name_in_arabic}</ErrMsg>}
                                        </div>
                                        <div className="col-md-4">
                                            <Label>Phone (05.. / +966..)</Label>
                                            <input
                                                value={formData.phone || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    errors["phone"] = ""; setErrors({ ...errors });
                                                    formData.phone = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Phone"
                                            />
                                            {errors.phone && <ErrMsg>{errors.phone}</ErrMsg>}
                                        </div>
                                        <div className="col-md-4">
                                            <Label>Email</Label>
                                            <input
                                                value={formData.email || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    errors["email"] = ""; setErrors({ ...errors });
                                                    formData.email = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Email"
                                            />
                                            {errors.email && <ErrMsg>{errors.email}</ErrMsg>}
                                        </div>
                                        <div className="col-md-4">
                                            <Label>Country</Label>
                                            <Typeahead
                                                id="country_code"
                                                labelKey="label"
                                                onChange={(selectedItems) => {
                                                    errors.country_code = ""; setErrors(errors);
                                                    if (selectedItems.length === 0) {
                                                        errors.country_code = "Invalid country selected"; setErrors(errors);
                                                        formData.country_code = ""; formData.country_name = "";
                                                        setFormData({ ...formData }); setSelectedCountries([]); return;
                                                    }
                                                    formData.country_code = selectedItems[0].value;
                                                    formData.country_name = selectedItems[0].label;
                                                    setFormData({ ...formData }); setSelectedCountries(selectedItems);
                                                }}
                                                options={countryOptions} placeholder="Country name"
                                                selected={selectedCountries} highlightOnlyResult={true}
                                                ref={countrySearchRef}
                                                onKeyDown={(e) => { if (e.key === "Escape") { countrySearchRef.current?.clear(); } }}
                                                onInputChange={() => {}}
                                            />
                                            {errors.country_code && <ErrMsg>{errors.country_code}</ErrMsg>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* National Address */}
                            <div className="pw-tab-wrap">
                                <div className="pw-card" style={CARD}>
                                    <SectionTitle icon="bi-geo-alt">National Address</SectionTitle>
                                    <div className="row g-3">
                                        <div className="col-md-3">
                                            <Label>Short Code</Label>
                                            <input
                                                value={formData.national_address?.short_code || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.short_code = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Short code"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>Building Number (4 digits)</Label>
                                            <input
                                                value={formData.national_address?.building_no || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    errors["national_address_building_no"] = "";
                                                    formData.national_address.building_no = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Building Number"
                                            />
                                            {errors.national_address_building_no && <ErrMsg>{errors.national_address_building_no}</ErrMsg>}
                                        </div>
                                        <div className="col-md-3">
                                            <Label>Street Name</Label>
                                            <input
                                                value={formData.national_address?.street_name || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.street_name = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Street Name"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>Street Name (Arabic)</Label>
                                            <input
                                                value={formData.national_address?.street_name_arabic || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.street_name_arabic = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={{ ...INPUT, direction: 'rtl' }} placeholder="اسم الشارع"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>District Name</Label>
                                            <input
                                                value={formData.national_address?.district_name || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.district_name = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="District Name"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>District Name (Arabic)</Label>
                                            <input
                                                value={formData.national_address?.district_name_arabic || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.district_name_arabic = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={{ ...INPUT, direction: 'rtl' }} placeholder="اسم الحي"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>City Name</Label>
                                            <input
                                                value={formData.national_address?.city_name || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.city_name = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="City Name"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>City Name (Arabic)</Label>
                                            <input
                                                value={formData.national_address?.city_name_arabic || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.city_name_arabic = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={{ ...INPUT, direction: 'rtl' }} placeholder="اسم المدينة"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>Zipcode (5 digits)</Label>
                                            <input
                                                value={formData.national_address?.zipcode || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    errors["national_address_zipcode"] = "";
                                                    formData.national_address.zipcode = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Zipcode"
                                            />
                                            {errors.national_address_zipcode && <ErrMsg>{errors.national_address_zipcode}</ErrMsg>}
                                        </div>
                                        <div className="col-md-3">
                                            <Label>Additional Number</Label>
                                            <input
                                                value={formData.national_address?.additional_no || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.additional_no = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Additional Number"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <Label>Unit Number</Label>
                                            <input
                                                value={formData.national_address?.unit_no || ""}
                                                type="text"
                                                onChange={(e) => {
                                                    formData.national_address.unit_no = e.target.value; setFormData({ ...formData });
                                                }}
                                                style={INPUT} placeholder="Unit Number"
                                            />
                                        </div>
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

export default WarehouseCreate;
