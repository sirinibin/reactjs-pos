import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { toStoreLocalDate, fromStoreLocalDate } from '../utils/timezone.js';

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

const TABS = [
    { id: 'invoice_titles',   label: 'Invoice Titles',   icon: 'bi-file-earmark-text' },
    { id: 'bank_account',     label: 'Bank Account',     icon: 'bi-bank' },
    { id: 'opening_balances', label: 'Opening Balances', icon: 'bi-wallet2' },
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

function StoreSettingsModal({ show, onHide }) {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('invoice_titles');
    const [flash, setFlash] = useState(null);
    const flashTimer = useRef(null);

    useEffect(() => {
        if (show) {
            setActiveTab('invoice_titles');
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
            deepFillEmptyStrings(result.settings.invoice, defaultInvoiceSettings);
            setFormData(result);
        } catch (_) {
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        const storeId = localStorage.getItem('store_id');
        const token = localStorage.getItem('access_token');
        if (!storeId || !token || !formData) return;
        setSaving(true);
        try {
            const res = await fetch(`/v1/store/${storeId}`, {
                method: 'PUT',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(formData),
            });
            await res.json();
            if (!res.ok) {
                showFlash('Failed to save. Please check your inputs.', 'danger');
                return;
            }
            showFlash('Store settings saved successfully!', 'success');
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

    const inv = formData?.settings?.invoice || {};
    const countryCode = formData?.country_code;

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="xl"
            backdrop="static"
            animation={false}

        >
            <Modal.Header closeButton style={{ borderBottom: '1px solid #e9ecef', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-gear-fill" style={{ fontSize: '18px', color: ACCENT }}></i>
                    </span>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1d23', lineHeight: 1.2 }}>Store Settings</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                            {localStorage.getItem('store_name') || 'Current Store'}
                        </div>
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
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px', color: '#888' }}>
                            <Spinner animation="border" size="sm" style={{ color: ACCENT }} />
                            <span style={{ fontSize: '14px' }}>Loading store data…</span>
                        </div>
                    )}

                    {!loading && formData && activeTab === 'invoice_titles' && (
                        <div>
                            <SectionHeader icon="bi-file-earmark-text" title="Invoice Titles" />

                            {/* ── Phase 1 — only when store is NOT Phase 2 ── */}
                            {formData.zatca?.phase !== '2' && (
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

                            {/* ── Phase 2 B2C — only when store is Phase 2 ── */}
                            {formData.zatca?.phase === '2' && (
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

                            {/* ── Phase 2 B2B — only when store is Phase 2 ── */}
                            {formData.zatca?.phase === '2' && (
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

                            {/* ── Purchase Titles (separate card, phase-aware) ── */}
                            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ background: '#6c757d', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>PURCHASE TITLES</span>
                                </div>

                                {formData.zatca?.phase !== '2' && (
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

                                {formData.zatca?.phase === '2' && (
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
                            </div>

                            {/* ── Other Invoice Titles ── */}
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

                    {!loading && formData && activeTab === 'opening_balances' && (
                        <div>
                            <SectionHeader icon="bi-wallet2" title="Opening Balances" />
                            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '10px', padding: '24px' }}>
                                <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
                                    Enter the cash and bank balances already held when you joined this system. These are posted as the starting point in the Cash and Bank ledgers.
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
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="form-control form-control-sm"
                                                        value={formData.settings?.cash_opening_balance || ''}
                                                        onChange={e => setNestedPath(['settings', 'cash_opening_balance'], parseFloat(e.target.value) || 0)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>As of Date &amp; Time</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control form-control-sm"
                                                    value={toDatetimeLocalValue(formData.settings?.cash_opening_balance_date, countryCode)}
                                                    onChange={e => setNestedPath(['settings', 'cash_opening_balance_date'], fromDatetimeLocalValue(e.target.value, countryCode))}
                                                />
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
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="form-control form-control-sm"
                                                        value={formData.settings?.bank_opening_balance || ''}
                                                        onChange={e => setNestedPath(['settings', 'bank_opening_balance'], parseFloat(e.target.value) || 0)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>As of Date &amp; Time</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control form-control-sm"
                                                    value={toDatetimeLocalValue(formData.settings?.bank_opening_balance_date, countryCode)}
                                                    onChange={e => setNestedPath(['settings', 'bank_opening_balance_date'], fromDatetimeLocalValue(e.target.value, countryCode))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: '1px solid #e9ecef', padding: '12px 24px', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                    {flash && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                            background: flash.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: flash.type === 'success' ? '#065f46' : '#991b1b',
                            border: `1px solid ${flash.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                        }}>
                            <i className={`bi ${flash.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
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
    );
}

export default StoreSettingsModal;
