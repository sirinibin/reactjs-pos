import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import countryList from 'react-select-country-list';
import { toStoreLocalDate, fromStoreLocalDate } from '../utils/timezone.js';
import ZatcaConnect from './zatca_connect.js';
import { resolveImageUrl } from '../utils/imageUtils.js';
import SampleInvoiceBg1 from '../INVOICE.jpg';
import SampleInvoiceBg2 from '../LGK_WHATSAPP.png';

function toDatetimeLocalValue(isoString, countryCode) {
    const local = toStoreLocalDate(isoString, countryCode);
    if (!local) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

function fromDatetimeLocalValue(datetimeLocal, countryCode) {
    if (!datetimeLocal) return null;
    const [datePart, timePart = '00:00'] = datetimeLocal.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return fromStoreLocalDate(new Date(year, month - 1, day, hours, minutes, 0), countryCode);
}

const defaultInvoiceSettings = {
    quotation_sales_titles: { paid: 'TAX INVOICE | الفاتورة الضريبية', credit: 'CREDIT TAX INVOICE | فاتورة ضريبة الائتمان', cash: 'CASH TAX INVOICE | فاتورة ضريبية نقدية' },
    quotation_sales_return_titles: { paid: 'SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة', credit: 'SALES RETURN CREDIT TAX INVOICE | إقرار مبيعات فاتورة ضريبة الائتمان', cash: 'SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية' },
    non_vat_sales_titles: { paid: 'TAX INVOICE | الفاتورة الضريبية', credit: 'CREDIT INVOICE | فاتورة ائتمانية', cash: 'CASH INVOICE | فاتورة نقدية' },
    non_vat_sales_return_titles: { paid: 'SALES RETURN INVOICE | فاتورة مبيعات مرتجعة', credit: 'SALES RETURN CREDIT INVOICE | فاتورة ائتمان مبيعات مرتجعة', cash: 'SALES RETURN CASH INVOICE | فاتورة نقدية مبيعات مرتجعة' },
    quotation_title: 'QUOTATION | اقتباس',
    delivery_note_title: 'DELIVERY NOTE | مذكرة التسليم',
    stock_transfer_title: 'STOCK TRANSFER | نقل الأسهم',
    purchase_order_title: 'PURCHASE ORDER | أمر الشراء',
    payable_title: 'PAYMENT RECEIPT (PAYABLE / REFUND) | إيصال الدفع (مستحق الدفع / مسترد)',
    receivable_title: 'PAYMENT RECEIPT (RECEIVABLE) | إيصال الدفع (مستحق القبض)',
    phase1: {
        sales_titles: { paid: 'TAX INVOICE | الفاتورة الضريبية', credit: 'CREDIT TAX INVOICE | فاتورة ضريبة الائتمان', cash: 'CASH TAX INVOICE | فاتورة ضريبية نقدية' },
        sales_return_titles: { paid: 'SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة', credit: 'SALES RETURN CREDIT TAX INVOICE | إقرار مبيعات فاتورة ضريبة الائتمان', cash: 'SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية' },
        purchase_titles: { paid: 'PURCHASE TAX INVOICE | فاتورة ضريبة الشراء', credit: 'CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان', cash: 'CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي' },
        purchase_return_titles: { paid: 'PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات', credit: 'CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان', cash: 'CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي' },
    },
    phase2: {
        sales_titles: { paid: 'SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة', credit: 'SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة', cash: 'SIMPLIFIED CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة' },
        sales_return_titles: { paid: 'SIMPLIFIED CREDIT NOTE TAX INVOICE | فاتورة ضريبية مبسطة لملاحظة الائتمان', credit: 'SIMPLIFIED CREDIT NOTE CREDIT TAX INVOICE | مذكرة ائتمان مبسطة فاتورة ضريبة الائتمان', cash: 'SIMPLIFIED CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة' },
        purchase_titles: { paid: 'PURCHASE TAX INVOICE | فاتورة ضريبة الشراء', credit: 'CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان', cash: 'CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي' },
        purchase_return_titles: { paid: 'PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات', credit: 'CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان', cash: 'CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي' },
    },
    phase2_b2b: {
        sales_titles: { paid: 'STANDARD TAX INVOICE | فاتورة ضريبية قياسية', credit: 'STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية', cash: 'STANDARD CASH TAX INVOICE | فاتورة ضريبية نقدية قياسية' },
        sales_return_titles: { paid: 'STANDARD CREDIT NOTE TAX INVOICE | فاتورة ضريبية لسند ائتمان قياسي', credit: 'STANDARD CREDIT NOTE CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية', cash: 'STANDARD CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية بسند ائتمان قياسي' },
        purchase_titles: { paid: 'PURCHASE TAX INVOICE | فاتورة ضريبة الشراء', credit: 'CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان', cash: 'CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي' },
        purchase_return_titles: { paid: 'PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات', credit: 'CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان', cash: 'CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي' },
    },
};

function deepFillEmptyStrings(target, defaults) {
    if (!defaults || typeof defaults !== 'object') return;
    for (const key of Object.keys(defaults)) {
        const defaultVal = defaults[key];
        const targetVal = target[key];
        if (typeof defaultVal === 'object' && defaultVal !== null && !Array.isArray(defaultVal)) {
            if (typeof targetVal !== 'object' || targetVal === null || Array.isArray(targetVal)) {
                target[key] = {};
            }
            deepFillEmptyStrings(target[key], defaultVal);
        } else {
            if (typeof targetVal === 'undefined' || targetVal === null || targetVal === '') {
                target[key] = defaultVal;
            }
        }
    }
}

function trimStringFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(trimStringFields);
    const result = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
            result[key] = val.trimEnd();
        } else if (typeof val === 'object' && val !== null) {
            result[key] = trimStringFields(val);
        } else {
            result[key] = val;
        }
    }
    return result;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const TABS = [
    { id: 'general',            label: 'General Info',      icon: 'bi-building' },
    { id: 'address',            label: 'National Address',  icon: 'bi-geo-alt' },
    { id: 'contact',            label: 'Contact',           icon: 'bi-telephone' },
    { id: 'invoice_titles',     label: 'Invoice Titles',    icon: 'bi-file-earmark-text' },
    { id: 'bank_account',       label: 'Bank Account',      icon: 'bi-bank' },
    { id: 'opening_balances',   label: 'Opening Balances',  icon: 'bi-wallet2' },
    { id: 'logo',               label: 'Logo',              icon: 'bi-image-fill' },
    { id: 'invoice_background', label: 'Invoice BG Image',  icon: 'bi-image' },
];

const ACCENT = '#004ac6';

const sidebarStyle = {
    width: '210px',
    flexShrink: 0,
    borderRight: '1px solid #e9ecef',
    background: '#f8f9fb',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
};

const tabBtnBase = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    borderLeft: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: '#555',
    textAlign: 'left',
    transition: 'all 0.15s',
    borderRadius: 0,
};

const tabBtnActive = {
    ...tabBtnBase,
    borderLeft: `3px solid ${ACCENT}`,
    background: '#eef3ff',
    color: ACCENT,
    fontWeight: 600,
};

function ImageDropzone({ currentSrc, previewSrc, onFile, onRemove, hint, label, compact = false }) {
    const inputRef = React.useRef(null);
    const [dragging, setDragging] = React.useState(false);

    const displaySrc = previewSrc || currentSrc;
    const isNew = !!previewSrc;

    function handleFiles(files) {
        if (!files || !files[0]) return;
        onFile(files[0]);
    }

    const zoneStyle = {
        border: `2px dashed ${dragging ? ACCENT : '#c8d8f5'}`,
        borderRadius: '10px',
        padding: compact ? '18px 14px' : '36px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? '#eef3ff' : '#f8faff',
        transition: 'all 0.15s',
        userSelect: 'none',
    };

    function openPicker() { inputRef.current?.click(); }

    function onDragOver(e) { e.preventDefault(); setDragging(true); }
    function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
    function onDrop(e) { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
            />
            {displaySrc ? (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: compact ? '12px' : '16px', background: '#fafbff', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                            src={displaySrc}
                            alt={label}
                            title="Click to enlarge"
                            style={{
                                maxHeight: compact ? '64px' : '180px',
                                maxWidth: compact ? '120px' : '240px',
                                objectFit: 'contain',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef',
                                display: 'block',
                                cursor: compact ? 'default' : 'pointer',
                            }}
                            onClick={compact ? undefined : (e => { const w = window.open(); w.document.write(`<img src="${e.target.src}" style="max-width:100%;max-height:100vh;display:block;margin:auto;">`); })}
                        />
                        {!compact && (
                            <span
                                style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={e => { const src = e.currentTarget.previousSibling.src; const w = window.open(); w.document.write(`<img src="${src}" style="max-width:100%;max-height:100vh;display:block;margin:auto;">`); }}
                            >
                                <i className="bi bi-zoom-in"></i> Enlarge
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: '8px' }}>
                            {isNew ? (
                                <span style={{ fontSize: '10px', fontWeight: 700, background: '#fff8e1', color: '#7a5800', border: '1px solid #ffe082', borderRadius: '4px', padding: '2px 7px' }}>
                                    <i className="bi bi-clock me-1"></i>Not saved yet
                                </span>
                            ) : (
                                <span style={{ fontSize: '10px', fontWeight: 700, background: '#e6f4ea', color: '#137333', border: '1px solid #a8d5b0', borderRadius: '4px', padding: '2px 7px' }}>
                                    <i className="bi bi-check-circle me-1"></i>Saved
                                </span>
                            )}
                        </div>
                        {hint && <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.5, marginBottom: '10px' }}>{hint}</div>}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={openPicker}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', border: `1px solid ${ACCENT}`, background: '#eef3ff', color: ACCENT, cursor: 'pointer' }}
                            >
                                <i className="bi bi-arrow-repeat"></i> Change
                            </button>
                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!window.confirm(`Remove this ${label} image? This will delete it when you save.`)) return;
                                        onRemove();
                                    }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', border: '1px solid #dc3545', background: '#fff5f5', color: '#dc3545', cursor: 'pointer' }}
                                >
                                    <i className="bi bi-trash3"></i> Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={zoneStyle} onClick={openPicker} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                    <i className="bi bi-cloud-upload" style={{ fontSize: compact ? '24px' : '36px', color: dragging ? ACCENT : '#b0bec5', display: 'block' }}></i>
                    <div style={{ fontWeight: 600, color: '#444', fontSize: '13px', marginTop: '8px' }}>
                        {dragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>PNG, JPG, WEBP</div>
                    {hint && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>{hint}</div>}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ icon, title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #e9ecef' }}>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`bi ${icon}`} style={{ fontSize: '16px', color: ACCENT }}></i>
            </span>
            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1d23' }}>{title}</h5>
        </div>
    );
}

function GroupTitle({ title }) {
    return (
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#888', margin: '20px 0 10px' }}>
            {title}
        </div>
    );
}

function TitleRow({ label, value, onChange }) {
    return (
        <div className="col-md-4 mb-3">
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444', marginBottom: '4px' }}>{label}</label>
            <input
                type="text"
                className="form-control form-control-sm"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder="Invoice title"
                style={{ fontSize: '12px' }}
            />
        </div>
    );
}

function BankField({ label, value, onChange, placeholder }) {
    return (
        <div className="col-md-6 mb-3">
            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '4px' }}>{label}</label>
            <input
                type="text"
                className="form-control form-control-sm"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || label}
            />
        </div>
    );
}

function Field({ label, value, onChange, placeholder, error, type = 'text', required = false, optional = false }) {
    return (
        <div className="col-md-4 mb-3">
            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '4px' }}>
                {label}{required && <span style={{ color: '#ba1a1a' }}> *</span>}{optional && <span style={{ fontWeight: 400, color: '#888', fontSize: '11px' }}> (Optional)</span>}
            </label>
            <input
                type={type}
                className={`form-control form-control-sm${error ? ' is-invalid' : ''}`}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || label}
            />
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
}

function StoreSettingsModal({ show, onHide }) {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [flash, setFlash] = useState(null);
    const [connectFlash, setConnectFlash] = useState(null);
    const [errors, setErrors] = useState({});
    const [selectedCountries, setSelectedCountries] = useState([]);
    const flashTimer = useRef(null);
    const connectFlashTimer = useRef(null);
    const countrySearchRef = useRef();
    const zatcaConnectRef = useRef();

    function showConnectFlash(text, type = 'success') {
        clearTimeout(connectFlashTimer.current);
        setConnectFlash({ text, type });
        connectFlashTimer.current = setTimeout(() => setConnectFlash(null), 4000);
    }
    const countryOptions = useMemo(() => countryList().getData(), []);

    useEffect(() => {
        if (show) {
            setActiveTab('general');
            setErrors({});
            loadStore();
        }
    }, [show]);

    function showFlash(text, type = 'success') {
        clearTimeout(flashTimer.current);
        setFlash({ text, type });
        flashTimer.current = setTimeout(() => setFlash(null), 3500);
    }

    async function loadStore() {
        const storeId = localStorage.getItem('store_id');
        const token = localStorage.getItem('access_token');
        if (!storeId || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`/v1/store/${storeId}`, {
                headers: { 'Content-Type': 'application/json', Authorization: token },
            });
            const data = await res.json();
            if (!res.ok || !data.result) return;
            const result = data.result;
            if (!result.bank_account) result.bank_account = {};
            if (!result.settings) result.settings = {};
            if (!result.settings.invoice) result.settings.invoice = {};
            if (!result.national_address) result.national_address = {};
            deepFillEmptyStrings(result.settings.invoice, defaultInvoiceSettings);

            // Initialise country typeahead
            if (result.country_code) {
                const opts = countryList().getData();
                const match = opts.find(o => o.value === result.country_code);
                setSelectedCountries(match ? [match] : []);
            } else {
                setSelectedCountries([]);
            }

            setFormData(result);
        } catch (_) {
        } finally {
            setLoading(false);
        }
    }

    function validate(fd) {
        const errs = {};
        if (!fd.name) errs.name = 'Registered Company Name is required';
        if (!fd.name_in_arabic) errs.name_in_arabic = 'Registered Company Name in Arabic is required';
        if (!fd.code) errs.code = 'Branch Code is required';
        if (!fd.branch_name) errs.branch_name = 'Branch Name is required';
        if (!fd.registration_number) errs.registration_number = 'Registration Number (CRN) is required';
        if (!fd.vat_no) errs.vat_no = 'VAT No. is required';
        if (!fd.vat_percent) errs.vat_percent = 'VAT % is required';
        if (!fd.phone) errs.phone = 'Phone is required';
        if (!fd.email) errs.email = 'Email is required';
        else if (!validateEmail(fd.email)) errs.email = 'Email is not valid';
        if (!fd.national_address?.building_no) errs.national_address_building_no = 'Building Number is required';
        if (!fd.national_address?.street_name) errs.national_address_street_name = 'Street Name is required';
        if (!fd.national_address?.district_name) errs.national_address_district_name = 'District Name is required';
        if (!fd.national_address?.city_name) errs.national_address_city_name = 'City Name is required';
        if (!fd.national_address?.zipcode) errs.national_address_zipcode = 'Zipcode is required';
        return errs;
    }

    const ERROR_TAB_MAP = {
        name: 'general', name_in_arabic: 'general', code: 'general', branch_name: 'general',
        registration_number: 'general', vat_no: 'general', vat_percent: 'general',
        phone: 'contact', email: 'contact',
        national_address_building_no: 'address', national_address_street_name: 'address',
        national_address_district_name: 'address', national_address_city_name: 'address',
        national_address_zipcode: 'address', country_code: 'address',
    };

    function getErrorTab(key) {
        return ERROR_TAB_MAP[key] || (key.startsWith('national_address_') ? 'address' : 'general');
    }

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const tabErrorCounts = TABS.reduce((acc, tab) => {
        acc[tab.id] = allErrors.filter(([k]) => getErrorTab(k) === tab.id).length;
        return acc;
    }, {});
    const totalErrors = allErrors.length;

    async function handleSave() {
        const storeId = localStorage.getItem('store_id');
        const token = localStorage.getItem('access_token');
        if (!storeId || !token || !formData) return;

        const errs = validate(formData);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            // Switch to first tab that has errors
            const firstErrTab = TABS.find(t => Object.keys(errs).some(k => getErrorTab(k) === t.id));
            if (firstErrTab) setActiveTab(firstErrTab.id);
            return;
        }

        const trimmed = trimStringFields(formData);
        setSaving(true);
        try {
            const res = await fetch(`/v1/store/${storeId}`, {
                method: 'PUT',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(trimmed),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.errors) setErrors(data.errors);
                showFlash('Failed to save. Please check your inputs.', 'danger');
                return;
            }
            showFlash('Store settings saved successfully!', 'success');
            // Reload to get updated zatca.reconnect_required
            await loadStore();
            // Suppress success flash when reconnect is required (banner is shown instead)
            if (data.result?.zatca?.zatca_reconnect_required) {
                setFlash(null);
            }
        } catch (_) {
            showFlash('Network error. Please try again.', 'danger');
        } finally {
            setSaving(false);
        }
    }

    function setNestedPath(path, value) {
        const next = { ...formData };
        let cur = next;
        for (let i = 0; i < path.length - 1; i++) {
            if (typeof cur[path[i]] !== 'object' || cur[path[i]] === null) cur[path[i]] = {};
            cur = cur[path[i]];
        }
        cur[path[path.length - 1]] = value;
        setFormData(next);
    }

    function setField(key, value) {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    }

    function setNationalAddress(key, value) {
        setFormData(prev => ({
            ...prev,
            national_address: { ...(prev.national_address || {}), [key]: value },
        }));
        const errKey = 'national_address_' + key;
        if (errors[errKey]) setErrors(prev => ({ ...prev, [errKey]: '' }));
    }

    const inv = formData?.settings?.invoice || {};
    const countryCode = formData?.country_code;
    const isPhase2 = formData?.zatca?.phase === '2';
    const isPhase1 = !isPhase2;
    const reconnectRequired = formData?.zatca?.zatca_reconnect_required;
    const zatcaReceivablesEnabled = !!formData?.settings?.enable_zatca_reporting_for_receivables;
    const zatcaPayablesEnabled = !!formData?.settings?.enable_zatca_reporting_for_payables;

    function zatcaReportingScope() {
        const parts = ['sales', 'sales returns'];
        if (zatcaReceivablesEnabled) parts.push('receivables');
        if (zatcaPayablesEnabled) parts.push('payables');
        return parts.join(', ');
    }

    return (
        <>
            <Modal
                show={show}
                onHide={onHide}
                size="xl"
                backdrop="static"
                animation={false}
            >
                <Modal.Header closeButton style={{ borderBottom: '1px solid #e9ecef', padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="bi bi-gear-fill" style={{ fontSize: '18px', color: ACCENT }}></i>
                        </span>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1d23', lineHeight: 1.2 }}>Store Settings</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {localStorage.getItem('store_name') || 'Current Store'}
                                {formData?.zatca?.phase && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                                        borderRadius: '10px', letterSpacing: '0.3px',
                                        background: formData.zatca.phase === '2' ? '#e8f0fe' : '#e6f4ea',
                                        color: formData.zatca.phase === '2' ? '#1558d6' : '#137333',
                                        border: `1px solid ${formData.zatca.phase === '2' ? '#b3ccfc' : '#a8d5b0'}`,
                                    }}>
                                        <i className={`bi bi-shield-${formData.zatca.phase === '2' ? 'fill-check' : 'check'}`} style={{ fontSize: '9px' }}></i>
                                        ZATCA Phase {formData.zatca.phase}
                                    </span>
                                )}
                                {isPhase2 && formData?.zatca?.connected && formData.zatca.last_connected_at && (
                                    <span style={{ fontSize: '10px', color: '#137333', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <i className="bi bi-clock-history" style={{ fontSize: '9px' }}></i>
                                        Last connected: {(() => {
                                            const d = toStoreLocalDate(formData.zatca.last_connected_at, countryCode);
                                            return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                        })()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || loading || !formData}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '7px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                                        cursor: saving || loading || !formData ? 'not-allowed' : 'pointer',
                                        border: 'none',
                                        background: ACCENT, color: '#fff',
                                        opacity: saving || loading || !formData ? 0.65 : 1,
                                    }}
                                >
                                    {saving
                                        ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</>
                                        : <><i className="bi bi-floppy2-fill" style={{ fontSize: '13px' }}></i> Save Changes</>
                                    }
                                </button>
                                {flash && flash.type === 'success' && (
                                    <span style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                        background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0',
                                        whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    }}>
                                        <i className="bi bi-check-circle-fill" style={{ fontSize: '12px' }}></i>
                                        {flash.text}
                                    </span>
                                )}
                            </div>
                            {connectFlash && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                    background: connectFlash.type === 'success' ? '#d1fae5' : '#fee2e2',
                                    color: connectFlash.type === 'success' ? '#065f46' : '#991b1b',
                                    border: `1px solid ${connectFlash.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                                }}>
                                    <i className={`bi bi-${connectFlash.type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'}`} style={{ fontSize: '12px' }}></i>
                                    {connectFlash.text}
                                </span>
                            )}
                            {isPhase2 && formData && (
                                <button
                                    type="button"
                                    onClick={() => zatcaConnectRef.current?.open(formData.id)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', border: 'none',
                                        background: formData.zatca?.connected ? '#eef3ff' : '#ba1a1a',
                                        color: formData.zatca?.connected ? ACCENT : '#fff',
                                        boxShadow: formData.zatca?.connected ? `0 0 0 1px ${ACCENT}` : 'none',
                                    }}
                                >
                                    <i className={`bi bi-${formData.zatca?.connected ? 'arrow-repeat' : 'plug-fill'}`} style={{ fontSize: '13px' }}></i>
                                    {formData.zatca?.connected ? 'Reconnect to ZATCA' : 'Connect to ZATCA'}
                                </button>
                            )}
                        </div>
                    </div>
                </Modal.Header>

                <Modal.Body style={{ padding: 0, display: 'flex', height: '70vh', overflow: 'hidden' }}>
                    {/* Left sidebar */}
                    <div style={sidebarStyle}>
                        <div style={{ padding: '0 16px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#aaa' }}>
                            Settings
                        </div>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                style={activeTab === tab.id ? tabBtnActive : tabBtnBase}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={`bi ${tab.icon}`} style={{ fontSize: '15px', width: '18px', textAlign: 'center' }}></i>
                                <span style={{ flex: 1 }}>{tab.label}</span>
                                {tabErrorCounts[tab.id] > 0 && (
                                    <span style={{ background: '#ba1a1a', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {tabErrorCounts[tab.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px', color: '#888' }}>
                                <Spinner animation="border" size="sm" style={{ color: ACCENT }} />
                                <span style={{ fontSize: '14px' }}>Loading store data…</span>
                            </div>
                        )}

                        {/* ZATCA Reconnect Required banner */}
                        {!loading && formData && reconnectRequired && (
                            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#856404', fontSize: '18px', flexShrink: 0 }}></i>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ fontWeight: 700, color: '#856404', fontSize: '13px' }}>ZATCA Reconnection Required</div>
                                    <div style={{ color: '#856404', fontSize: '12px', marginTop: '2px' }}>
                                        Key store details have changed. You must reconnect to ZATCA before reporting {zatcaReportingScope()}.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    style={{ background: '#856404', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                                    onClick={() => zatcaConnectRef.current?.open(formData.id)}
                                >
                                    <i className="bi bi-plug-fill me-1"></i>Reconnect to ZATCA
                                </button>
                            </div>
                        )}

                        {/* Error summary */}
                        {!loading && totalErrors > 0 && (
                            <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                                <div style={{ fontWeight: 700, color: '#93000a', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '14px' }}></i>
                                    {totalErrors} error{totalErrors > 1 ? 's' : ''} — please fix before saving:
                                </div>
                                {TABS.map(tab => {
                                    const tabErrs = allErrors.filter(([k]) => getErrorTab(k) === tab.id);
                                    if (!tabErrs.length) return null;
                                    return (
                                        <div key={tab.id} style={{ marginBottom: '6px' }}>
                                            <button type="button" onClick={() => setActiveTab(tab.id)} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, color: ACCENT, cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', display: 'block', marginBottom: '2px' }}>
                                                {tab.label}:
                                            </button>
                                            {tabErrs.map(([k, v]) => (
                                                <div key={k} style={{ fontSize: '12px', color: '#93000a', paddingLeft: '10px' }}>• {v}</div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── GENERAL INFO ── */}
                        {!loading && formData && activeTab === 'general' && (
                            <div>
                                <SectionHeader icon="bi-building" title="General Info" />
                                {isPhase2 && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#7a5800' }}>
                                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '14px', color: '#f59e0b', flexShrink: 0, marginTop: '1px' }}></i>
                                        <span><strong>ZATCA Re-Connection Required:</strong> Changing any of these fields will require you to <strong>Re-Connect</strong> this store to ZATCA. Until re-connected, you will not be able to report {zatcaReportingScope()} to ZATCA.</span>
                                    </div>
                                )}
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Business Category*</label>
                                            <select
                                                className={`form-control form-control-sm${errors.business_category ? ' is-invalid' : ''}`}
                                                value={formData.business_category || ''}
                                                onChange={e => setField('business_category', e.target.value)}
                                            >
                                                <option value="">-- Select category --</option>
                                                <option value="Supply Activities">Supply Activities</option>
                                                <option value="Service Activities">Service Activities</option>
                                                <option value="Retail">Retail</option>
                                                <option value="Food and Beverages">Food and Beverages</option>
                                                <option value="Trading">Trading</option>
                                                <option value="Manufacturing">Manufacturing</option>
                                                <option value="Healthcare">Healthcare</option>
                                                <option value="Real Estate">Real Estate</option>
                                                <option value="Construction">Construction</option>
                                                <option value="Transportation">Transportation</option>
                                                <option value="Technology">Technology</option>
                                                <option value="Education">Education</option>
                                                <option value="Financial Services">Financial Services</option>
                                            </select>
                                            {errors.business_category && <div className="invalid-feedback">{errors.business_category}</div>}
                                        </div>

                                        <Field label="Registered Company Name" value={formData.name} onChange={v => setField('name', v)} error={errors.name} required />
                                        <Field label="Registered Company Name In Arabic" value={formData.name_in_arabic} onChange={v => setField('name_in_arabic', v)} error={errors.name_in_arabic} required />
                                        <Field label="Branch Code" value={formData.code} onChange={v => setField('code', v)} error={errors.code} required />
                                        <Field label="Branch Name" value={formData.branch_name} onChange={v => setField('branch_name', v)} error={errors.branch_name} required />
                                        <Field label="Registration Number (CRN)" value={formData.registration_number} onChange={v => setField('registration_number', v)} error={errors.registration_number} required />
                                        <Field label="VAT NO. (15 digits)" value={formData.vat_no} onChange={v => setField('vat_no', v)} error={errors.vat_no} required />

                                        <Field label="Store Name" value={formData.store_name} onChange={v => setField('store_name', v)} optional />
                                        <Field label="Store Name In Arabic" value={formData.store_name_in_arabic} onChange={v => setField('store_name_in_arabic', v)} optional />
                                        <Field label="Title (Optional)" value={formData.title} onChange={v => setField('title', v)} placeholder="Title" />
                                        <Field label="Title In Arabic (Optional)" value={formData.title_in_arabic} onChange={v => setField('title_in_arabic', v)} placeholder="Title In Arabic" />

                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── NATIONAL ADDRESS ── */}
                        {!loading && formData && activeTab === 'address' && (
                            <div>
                                <SectionHeader icon="bi-geo-alt" title="National Address" />
                                {isPhase2 && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#7a5800' }}>
                                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '14px', color: '#f59e0b', flexShrink: 0, marginTop: '1px' }}></i>
                                        <span><strong>ZATCA Re-Connection Required:</strong> Changing any of these fields will require you to <strong>Re-Connect</strong> this store to ZATCA. Until re-connected, you will not be able to report {zatcaReportingScope()} to ZATCA.</span>
                                    </div>
                                )}
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Country*</label>
                                            <Typeahead
                                                id="sm_country_code"
                                                labelKey="label"
                                                onChange={(items) => {
                                                    if (items.length === 0) {
                                                        setField('country_code', '');
                                                        setField('country_name', '');
                                                        setSelectedCountries([]);
                                                        return;
                                                    }
                                                    setField('country_code', items[0].value);
                                                    setField('country_name', items[0].label);
                                                    setSelectedCountries(items);
                                                    if (errors.country_code) setErrors(prev => ({ ...prev, country_code: '' }));
                                                }}
                                                options={countryOptions}
                                                placeholder="Country name"
                                                selected={selectedCountries}
                                                highlightOnlyResult={true}
                                                ref={countrySearchRef}
                                            />
                                            {errors.country_code && <div style={{ color: '#ba1a1a', fontSize: '12px', marginTop: '4px' }}>{errors.country_code}</div>}
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Short Code</label>
                                            <input type="text" className="form-control form-control-sm" value={formData.national_address?.short_code || ''} onChange={e => setNationalAddress('short_code', e.target.value)} placeholder="Short Code" />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Building Number (4 digits)*</label>
                                            <input type="text" className={`form-control form-control-sm${errors.national_address_building_no ? ' is-invalid' : ''}`} value={formData.national_address?.building_no || ''} onChange={e => setNationalAddress('building_no', e.target.value)} placeholder="Building Number" />
                                            {errors.national_address_building_no && <div className="invalid-feedback">{errors.national_address_building_no}</div>}
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Street Name*</label>
                                            <input type="text" className={`form-control form-control-sm${errors.national_address_street_name ? ' is-invalid' : ''}`} value={formData.national_address?.street_name || ''} onChange={e => setNationalAddress('street_name', e.target.value)} placeholder="Street Name" />
                                            {errors.national_address_street_name && <div className="invalid-feedback">{errors.national_address_street_name}</div>}
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Street Name (Arabic)</label>
                                            <input type="text" className="form-control form-control-sm" value={formData.national_address?.street_name_arabic || ''} onChange={e => setNationalAddress('street_name_arabic', e.target.value)} placeholder="Street Name (Arabic)" />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>District Name*</label>
                                            <input type="text" className={`form-control form-control-sm${errors.national_address_district_name ? ' is-invalid' : ''}`} value={formData.national_address?.district_name || ''} onChange={e => setNationalAddress('district_name', e.target.value)} placeholder="District Name" />
                                            {errors.national_address_district_name && <div className="invalid-feedback">{errors.national_address_district_name}</div>}
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>District Name (Arabic)</label>
                                            <input type="text" className="form-control form-control-sm" value={formData.national_address?.district_name_arabic || ''} onChange={e => setNationalAddress('district_name_arabic', e.target.value)} placeholder="District Name (Arabic)" />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>City Name*</label>
                                            <input type="text" className={`form-control form-control-sm${errors.national_address_city_name ? ' is-invalid' : ''}`} value={formData.national_address?.city_name || ''} onChange={e => setNationalAddress('city_name', e.target.value)} placeholder="City Name" />
                                            {errors.national_address_city_name && <div className="invalid-feedback">{errors.national_address_city_name}</div>}
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>City Name (Arabic)</label>
                                            <input type="text" className="form-control form-control-sm" value={formData.national_address?.city_name_arabic || ''} onChange={e => setNationalAddress('city_name_arabic', e.target.value)} placeholder="City Name (Arabic)" />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Zipcode (5 digits)*</label>
                                            <input type="text" className={`form-control form-control-sm${errors.national_address_zipcode ? ' is-invalid' : ''}`} value={formData.national_address?.zipcode || ''} onChange={e => setNationalAddress('zipcode', e.target.value)} placeholder="Zipcode" />
                                            {errors.national_address_zipcode && <div className="invalid-feedback">{errors.national_address_zipcode}</div>}
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Additional Number</label>
                                            <input type="text" className="form-control form-control-sm" value={formData.national_address?.additional_no || ''} onChange={e => setNationalAddress('additional_no', e.target.value)} placeholder="Additional Number" />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Unit Number</label>
                                            <input type="text" className="form-control form-control-sm" value={formData.national_address?.unit_no || ''} onChange={e => setNationalAddress('unit_no', e.target.value)} placeholder="Unit Number" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── CONTACT ── */}
                        {!loading && formData && activeTab === 'contact' && (
                            <div>
                                <SectionHeader icon="bi-telephone" title="Contact" />
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Phone*</label>
                                            <input
                                                type="text"
                                                className={`form-control form-control-sm${errors.phone ? ' is-invalid' : ''}`}
                                                value={formData.phone || ''}
                                                onChange={e => { setField('phone', e.target.value); }}
                                                placeholder="e.g. +1 555 123 4567"
                                            />
                                            {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Email*</label>
                                            <input
                                                type="text"
                                                className={`form-control form-control-sm${errors.email ? ' is-invalid' : ''}`}
                                                value={formData.email || ''}
                                                onChange={e => { setField('email', e.target.value); }}
                                                placeholder="Email"
                                            />
                                            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── INVOICE TITLES ── */}
                        {!loading && formData && activeTab === 'invoice_titles' && (
                            <div>
                                <SectionHeader icon="bi-file-earmark-text" title="Invoice Titles" />

                                {isPhase1 && (
                                    <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ background: '#004ac6', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>ZATCA PHASE 1</span>
                                        </div>
                                        <GroupTitle title="Sales" />
                                        <div className="row">
                                            <TitleRow label="Paid" value={inv.phase1?.sales_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'sales_titles', 'paid'], v)} />
                                            <TitleRow label="Credit" value={inv.phase1?.sales_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'sales_titles', 'credit'], v)} />
                                            <TitleRow label="Cash" value={inv.phase1?.sales_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'sales_titles', 'cash'], v)} />
                                        </div>
                                        <GroupTitle title="Sales Return" />
                                        <div className="row">
                                            <TitleRow label="Paid" value={inv.phase1?.sales_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'sales_return_titles', 'paid'], v)} />
                                            <TitleRow label="Credit" value={inv.phase1?.sales_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'sales_return_titles', 'credit'], v)} />
                                            <TitleRow label="Cash" value={inv.phase1?.sales_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'sales_return_titles', 'cash'], v)} />
                                        </div>
                                    </div>
                                )}

                                {isPhase2 && (
                                    <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ background: '#0066cc', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>ZATCA PHASE 2 · B2C</span>
                                        </div>
                                        <GroupTitle title="Sales" />
                                        <div className="row">
                                            <TitleRow label="Paid B2C" value={inv.phase2?.sales_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'sales_titles', 'paid'], v)} />
                                            <TitleRow label="Credit B2C" value={inv.phase2?.sales_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'sales_titles', 'credit'], v)} />
                                            <TitleRow label="Cash B2C" value={inv.phase2?.sales_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'sales_titles', 'cash'], v)} />
                                        </div>
                                        <GroupTitle title="Sales Return" />
                                        <div className="row">
                                            <TitleRow label="Paid" value={inv.phase2?.sales_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'sales_return_titles', 'paid'], v)} />
                                            <TitleRow label="Credit" value={inv.phase2?.sales_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'sales_return_titles', 'credit'], v)} />
                                            <TitleRow label="Cash" value={inv.phase2?.sales_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'sales_return_titles', 'cash'], v)} />
                                        </div>
                                    </div>
                                )}

                                {isPhase2 && (
                                    <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ background: '#1a3a6b', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>ZATCA PHASE 2 · B2B</span>
                                        </div>
                                        <GroupTitle title="Sales" />
                                        <div className="row">
                                            <TitleRow label="Paid B2B" value={inv.phase2_b2b?.sales_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'sales_titles', 'paid'], v)} />
                                            <TitleRow label="Credit B2B" value={inv.phase2_b2b?.sales_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'sales_titles', 'credit'], v)} />
                                            <TitleRow label="Cash B2B" value={inv.phase2_b2b?.sales_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'sales_titles', 'cash'], v)} />
                                        </div>
                                        <GroupTitle title="Sales Return" />
                                        <div className="row">
                                            <TitleRow label="Paid" value={inv.phase2_b2b?.sales_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'sales_return_titles', 'paid'], v)} />
                                            <TitleRow label="Credit" value={inv.phase2_b2b?.sales_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'sales_return_titles', 'credit'], v)} />
                                            <TitleRow label="Cash" value={inv.phase2_b2b?.sales_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'sales_return_titles', 'cash'], v)} />
                                        </div>
                                    </div>
                                )}

                                {(isPhase1 || isPhase2) && <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ background: '#6c757d', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>PURCHASE TITLES</span>
                                    </div>
                                    {isPhase1 && (
                                        <>
                                            <GroupTitle title="Purchase" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.phase1?.purchase_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'purchase_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.phase1?.purchase_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'purchase_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.phase1?.purchase_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'purchase_titles', 'cash'], v)} />
                                            </div>
                                            <GroupTitle title="Purchase Return" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.phase1?.purchase_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'purchase_return_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.phase1?.purchase_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'purchase_return_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.phase1?.purchase_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase1', 'purchase_return_titles', 'cash'], v)} />
                                            </div>
                                        </>
                                    )}
                                    {isPhase2 && (
                                        <>
                                            <GroupTitle title="Purchase · B2C" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.phase2?.purchase_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'purchase_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.phase2?.purchase_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'purchase_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.phase2?.purchase_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'purchase_titles', 'cash'], v)} />
                                            </div>
                                            <GroupTitle title="Purchase Return · B2C" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.phase2?.purchase_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'purchase_return_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.phase2?.purchase_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'purchase_return_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.phase2?.purchase_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2', 'purchase_return_titles', 'cash'], v)} />
                                            </div>
                                            <GroupTitle title="Purchase · B2B" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.phase2_b2b?.purchase_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'purchase_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.phase2_b2b?.purchase_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'purchase_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.phase2_b2b?.purchase_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'purchase_titles', 'cash'], v)} />
                                            </div>
                                            <GroupTitle title="Purchase Return · B2B" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.phase2_b2b?.purchase_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'purchase_return_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.phase2_b2b?.purchase_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'purchase_return_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.phase2_b2b?.purchase_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'phase2_b2b', 'purchase_return_titles', 'cash'], v)} />
                                            </div>
                                        </>
                                    )}
                                </div>}

                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ background: '#495057', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>OTHER INVOICE TITLES</span>
                                    </div>
                                    <GroupTitle title="Document Titles" />
                                    <div className="row">
                                        <TitleRow label="Quotation" value={inv.quotation_title} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_title'], v)} />
                                        <TitleRow label="Delivery Note" value={inv.delivery_note_title} onChange={v => setNestedPath(['settings', 'invoice', 'delivery_note_title'], v)} />
                                        {formData.settings?.enable_warehouse_module && (
                                            <TitleRow label="Stock Transfer" value={inv.stock_transfer_title} onChange={v => setNestedPath(['settings', 'invoice', 'stock_transfer_title'], v)} />
                                        )}
                                        {formData.settings?.enable_purchase_order_module && (
                                            <TitleRow label="Purchase Order" value={inv.purchase_order_title} onChange={v => setNestedPath(['settings', 'invoice', 'purchase_order_title'], v)} />
                                        )}
                                        <TitleRow label="Payable" value={inv.payable_title} onChange={v => setNestedPath(['settings', 'invoice', 'payable_title'], v)} />
                                        <TitleRow label="Receivable" value={inv.receivable_title} onChange={v => setNestedPath(['settings', 'invoice', 'receivable_title'], v)} />
                                    </div>
                                    {formData.settings?.enable_sales_in_quotation && (
                                        <>
                                            <GroupTitle title="Quotation Sales" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.quotation_sales_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_sales_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.quotation_sales_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_sales_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.quotation_sales_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_sales_titles', 'cash'], v)} />
                                            </div>
                                            <GroupTitle title="Quotation Sales Return" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.quotation_sales_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_sales_return_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.quotation_sales_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_sales_return_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.quotation_sales_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'quotation_sales_return_titles', 'cash'], v)} />
                                            </div>
                                        </>
                                    )}
                                    {formData.settings?.non_vat_sales && (
                                        <>
                                            <GroupTitle title="Non-VAT Sales" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.non_vat_sales_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'non_vat_sales_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.non_vat_sales_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'non_vat_sales_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.non_vat_sales_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'non_vat_sales_titles', 'cash'], v)} />
                                            </div>
                                            <GroupTitle title="Non-VAT Sales Return" />
                                            <div className="row">
                                                <TitleRow label="Paid" value={inv.non_vat_sales_return_titles?.paid} onChange={v => setNestedPath(['settings', 'invoice', 'non_vat_sales_return_titles', 'paid'], v)} />
                                                <TitleRow label="Credit" value={inv.non_vat_sales_return_titles?.credit} onChange={v => setNestedPath(['settings', 'invoice', 'non_vat_sales_return_titles', 'credit'], v)} />
                                                <TitleRow label="Cash" value={inv.non_vat_sales_return_titles?.cash} onChange={v => setNestedPath(['settings', 'invoice', 'non_vat_sales_return_titles', 'cash'], v)} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── BANK ACCOUNT ── */}
                        {!loading && formData && activeTab === 'bank_account' && (
                            <div>
                                <SectionHeader icon="bi-bank" title="Bank Account" />
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '24px' }}>
                                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
                                        Bank account details printed on your invoices and payment receipts.
                                    </p>
                                    <div className="row">
                                        <BankField label="Bank Name" value={formData.bank_account?.bank_name} onChange={v => setNestedPath(['bank_account', 'bank_name'], v)} />
                                        <BankField label="Customer No." value={formData.bank_account?.customer_no} onChange={v => setNestedPath(['bank_account', 'customer_no'], v)} placeholder="Customer Number" />
                                        <BankField label="IBAN" value={formData.bank_account?.iban} onChange={v => setNestedPath(['bank_account', 'iban'], v)} placeholder="International Bank Account Number" />
                                        <BankField label="Account Name" value={formData.bank_account?.account_name} onChange={v => setNestedPath(['bank_account', 'account_name'], v)} />
                                        <BankField label="Account No." value={formData.bank_account?.account_no} onChange={v => setNestedPath(['bank_account', 'account_no'], v)} placeholder="Account Number" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── OPENING BALANCES ── */}
                        {!loading && formData && activeTab === 'opening_balances' && (
                            <div>
                                <SectionHeader icon="bi-wallet2" title="Opening Balances" />
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '24px' }}>
                                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
                                        Enter the cash and bank balances already held when you joined this system.
                                    </p>
                                    <div className="row">
                                        <div className="col-md-6 mb-4">
                                            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', border: '1px solid #e9ecef' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                                    <i className="bi bi-cash-coin" style={{ color: ACCENT, fontSize: '16px' }}></i>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>Cash Account</span>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>Opening Balance</label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text" style={{ background: '#eef3ff', border: '1px solid #c8d8f5', color: ACCENT, fontWeight: 600, fontSize: '12px' }}>
                                                            {formData.currency_code || 'SAR'}
                                                        </span>
                                                        <input type="number" min="0" step="0.01" className="form-control form-control-sm" value={formData.settings?.cash_opening_balance || ''} onChange={e => setNestedPath(['settings', 'cash_opening_balance'], parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>As of Date &amp; Time</label>
                                                    <input type="datetime-local" className="form-control form-control-sm" value={toDatetimeLocalValue(formData.settings?.cash_opening_balance_date, countryCode)} onChange={e => setNestedPath(['settings', 'cash_opening_balance_date'], fromDatetimeLocalValue(e.target.value, countryCode))} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 mb-4">
                                            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', border: '1px solid #e9ecef' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                                    <i className="bi bi-bank" style={{ color: ACCENT, fontSize: '16px' }}></i>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>Bank Account</span>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>Opening Balance</label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text" style={{ background: '#eef3ff', border: '1px solid #c8d8f5', color: ACCENT, fontWeight: 600, fontSize: '12px' }}>
                                                            {formData.currency_code || 'SAR'}
                                                        </span>
                                                        <input type="number" min="0" step="0.01" className="form-control form-control-sm" value={formData.settings?.bank_opening_balance || ''} onChange={e => setNestedPath(['settings', 'bank_opening_balance'], parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>As of Date &amp; Time</label>
                                                    <input type="datetime-local" className="form-control form-control-sm" value={toDatetimeLocalValue(formData.settings?.bank_opening_balance_date, countryCode)} onChange={e => setNestedPath(['settings', 'bank_opening_balance_date'], fromDatetimeLocalValue(e.target.value, countryCode))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* ── LOGO ── */}
                        {!loading && formData && activeTab === 'logo' && (
                            <div>
                                <SectionHeader icon="bi-image-fill" title="Logo" />
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                                    <div style={{ background: '#f0f4ff', border: '1px solid #c8d8f5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#1558d6', lineHeight: 1.7 }}>
                                        <div style={{ fontWeight: 700, marginBottom: '4px' }}><i className="bi bi-info-circle-fill me-1"></i>Logo Guidelines</div>
                                        <div>• <strong>Recommended size:</strong> 300 × 100 px</div>
                                        <div>• <strong>Format:</strong> transparent PNG preferred</div>
                                        <div>• <strong>Max file size:</strong> 500 KB</div>
                                        <div>• Used in the invoice header</div>
                                    </div>
                                    <ImageDropzone
                                        label="Logo"
                                        currentSrc={formData.logo ? resolveImageUrl(formData.logo, formData.id, 'store') : null}
                                        previewSrc={formData.logo_content || null}
                                        hint="Recommended 300×100 px · transparent PNG · max 500 KB · used in invoice header"
                                        onFile={file => {
                                            const reader = new FileReader();
                                            reader.onload = ev => setField('logo_content', ev.target.result);
                                            reader.readAsDataURL(file);
                                        }}
                                        onRemove={() => setFormData(prev => ({ ...prev, logo: '', logo_content: '', remove_logo: true }))}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── INVOICE BACKGROUND ── */}
                        {!loading && formData && activeTab === 'invoice_background' && (
                            <div>
                                <SectionHeader icon="bi-image" title="Invoice Background Image" />
                                <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                                    <div style={{ background: '#f0f4ff', border: '1px solid #c8d8f5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#1558d6', lineHeight: 1.7 }}>
                                        <div style={{ fontWeight: 700, marginBottom: '4px' }}><i className="bi bi-info-circle-fill me-1"></i>Background Image Guidelines</div>
                                        <div>• <strong>Recommended size:</strong> A4 at 150 dpi — <strong>1240 × 1754 px</strong></div>
                                        <div>• Acceptable: A4 at 72 dpi — 595 × 842 px (lower quality on high-DPI screens)</div>
                                        <div>• <strong>Format:</strong> PNG (transparent areas stay clear) or JPG</div>
                                        <div>• The image is stretched to fill the entire invoice page — keep important content centred or near edges</div>
                                        <div>• <strong>Max file size:</strong> 2 MB</div>
                                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #c8d8f5' }}>
                                            <div style={{ fontWeight: 700, marginBottom: '8px' }}><i className="bi bi-download me-1"></i>Sample backgrounds — download to see how it should look:</div>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                <a href={SampleInvoiceBg1} download="sample-invoice-background-1.jpg"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', border: '1px solid #1558d6', background: '#fff', color: '#1558d6', textDecoration: 'none', cursor: 'pointer' }}>
                                                    <i className="bi bi-file-earmark-image"></i> Sample 1 (JPG)
                                                </a>
                                                <a href={SampleInvoiceBg2} download="sample-invoice-background-2.png"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', border: '1px solid #1558d6', background: '#fff', color: '#1558d6', textDecoration: 'none', cursor: 'pointer' }}>
                                                    <i className="bi bi-file-earmark-image"></i> Sample 2 (PNG)
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <ImageDropzone
                                        label="Invoice Background"
                                        currentSrc={formData.invoice_background ? resolveImageUrl(formData.invoice_background, formData.id, 'store') : null}
                                        previewSrc={formData.invoice_background_content || null}
                                        hint="Recommended 1240×1754 px (A4 @ 150 dpi) · PNG or JPG · max 2 MB"
                                        onFile={file => {
                                            const reader = new FileReader();
                                            reader.onload = ev => setField('invoice_background_content', ev.target.result);
                                            reader.readAsDataURL(file);
                                        }}
                                        onRemove={() => setFormData(prev => ({ ...prev, invoice_background: '', remove_invoice_background: true }))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Modal.Body>

                <Modal.Footer style={{ borderTop: '1px solid #e9ecef', padding: '12px 24px', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                        {flash && flash.type !== 'success' && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
                            }}>
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {flash.text}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button variant="outline-secondary" size="sm" onClick={onHide} disabled={saving} style={{ padding: '7px 18px', fontWeight: 500 }}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || loading || !formData}
                            style={{ padding: '7px 20px', fontWeight: 600, background: ACCENT, borderColor: ACCENT }}
                        >
                            {saving ? (
                                <><Spinner animation="border" size="sm" className="me-2" />Saving…</>
                            ) : (
                                <><i className="bi bi-check2 me-1"></i>Save Changes</>
                            )}
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            <ZatcaConnect
                ref={zatcaConnectRef}
                refreshList={() => {
                    loadStore();
                    showConnectFlash('Successfully connected to ZATCA!');
                }}
            />
        </>
    );
}

export default StoreSettingsModal;
