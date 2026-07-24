import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner, Button } from "react-bootstrap";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { getEmployeeBalanceInfo } from '../utils/employeeBalance.js';
import { toStoreLocalDate } from '../utils/timezone.js';
import EmployeeSalaryPaymentCreate from "./salaryPayment.js";

const DEFAULT_POSITIONS = [
    'Technician', 'Senior Technician', 'Master Technician',
    'Workshop Manager', 'Service Advisor', 'Parts Manager',
    'Receptionist', 'Cashier', 'Electrician', 'Mechanic',
    'Painter', 'Welder', 'Body Repair Technician', 'Quality Inspector', 'Driver',
];

function loadPositions() {
    try {
        const stored = localStorage.getItem('workshop_positions');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [...DEFAULT_POSITIONS];
}

function savePositions(list) {
    localStorage.setItem('workshop_positions', JSON.stringify(list));
}

const EmployeeCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = { salary_day: 1, salary: 0, is_active: true, joining_date: new Date().toISOString(), opening_balance: 0 };
            setFormData({ ...formData });
            setErrors({});
            setSalaryPayments([]);
            if (id) {
                getEmployee(id);
                loadSalaryPayments(id);
            }
            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },
    }));

    async function getStore(id) {
        try {
            const store = await fetchStore(id);
            setStoreCountryCode((store && store.country_code) || "");
        } catch (error) { }
    }

    const { t } = useTranslation('common');
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);
    const [salaryPayments, setSalaryPayments] = useState([]);
    const [isSalaryLoading, setIsSalaryLoading] = useState(false);
    const SalaryPaymentRef = React.useRef();

    const [positions, setPositions] = useState(() => loadPositions());
    const [showPositionManager, setShowPositionManager] = useState(false);
    const [newPositionText, setNewPositionText] = useState('');
    const [editingPositionIdx, setEditingPositionIdx] = useState(null);
    const [editingPositionText, setEditingPositionText] = useState('');
    // The store's own country code (e.g. "SA"), used so every date shown in
    // this form reflects the store's timezone rather than the browser's.
    const [storeCountryCode, setStoreCountryCode] = useState("");

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function getEmployee(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        formData = {};
        setFormData({ ...formData });

        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/employee/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setErrors({});
                formData = data.result;
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function loadSalaryPayments(employeeId) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = { employee_id: employeeId };
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setIsSalaryLoading(true);
        fetch('/v1/employee-salary-payment?select=id,code,date,amount,payment_method,month,year,description&' + queryParams + "&sort=-date&limit=100", requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setSalaryPayments(data.result || []);
                setIsSalaryLoading(false);
            })
            .catch(error => {
                console.log(error);
                setIsSalaryLoading(false);
            });
    }

    function refreshEmployeeData() {
        if (!formData.id) {
            return;
        }
        loadSalaryPayments(formData.id);
        getEmployee(formData.id);
        if (props.refreshList) props.refreshList();
    }

    function openEditSalaryPayment(paymentId) {
        if (!formData.id) {
            return;
        }
        SalaryPaymentRef.current?.open(formData.id, paymentId);
    }

    function deleteSalaryPayment(id) {
        if (!window.confirm(t("Are you sure you want to delete this salary payment? This will reverse the ledger entries."))) return;

        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/employee-salary-payment/' + id + "?" + queryParams, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        })
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                if (props.showToastMessage) props.showToastMessage(t("Salary payment deleted"), "success");
                if (formData.id) loadSalaryPayments(formData.id);
                getEmployee(formData.id);
                if (props.refreshList) props.refreshList();
            })
            .catch(error => {
                console.log(error);
                if (props.showToastMessage) props.showToastMessage(t("Failed to delete payment"), "danger");
            });
    }

    function handleCreate(event) {
        event.preventDefault();

        let validationErrors = {};
        if (!formData.name || !formData.name.trim()) {
            validationErrors.name = t("Name is required");
        }
        if (formData.salary === '' || formData.salary === undefined || formData.salary === null) {
            validationErrors.salary = t("Salary is required");
        } else if (formData.salary < 0) {
            validationErrors.salary = t("Salary cannot be negative");
        }
        if (!formData.salary_day || formData.salary_day < 1 || formData.salary_day > 28) {
            validationErrors.salary_day = t("Salary day must be between 1 and 28");
        }
        if (!formData.joining_date) {
            validationErrors.joining_date = t("Joining date is required");
        }
        if (formData.opening_balance !== '' && formData.opening_balance !== undefined && formData.opening_balance !== null && formData.opening_balance < 0) {
            validationErrors.opening_balance = t("Opening balance cannot be negative");
        }
        if (formData.opening_balance && !formData.opening_balance_date) {
            validationErrors.opening_balance_date = t("As of date is required when an opening balance is set");
        }
        if (Object.keys(validationErrors).length > 0) {
            setErrors({ ...validationErrors });
            return;
        }

        let endPoint = "/v1/employee";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/employee/" + formData.id;
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
                    if (props.showToastMessage) props.showToastMessage(t("Employee updated successfully!"), "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage(t("Employee created successfully!"), "success");
                }
                if (props.refreshList) props.refreshList();
                handleClose();
                if (props.openDetailsView) props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setErrors({ ...error });
                if (props.showToastMessage) props.showToastMessage(t("Failed to process employee!"), "danger");
            });
    }

    function addPositionItem() {
        const name = newPositionText.trim();
        if (!name) return;
        const updated = [...positions, name];
        setPositions(updated);
        savePositions(updated);
        setNewPositionText('');
    }

    function updatePositionItem(idx, newName) {
        const name = newName.trim();
        if (!name) return;
        const oldName = positions[idx];
        const updated = [...positions];
        updated[idx] = name;
        setPositions(updated);
        savePositions(updated);
        if (formData.position === oldName) {
            formData.position = name;
            setFormData({ ...formData });
        }
        setEditingPositionIdx(null);
        setEditingPositionText('');
    }

    function deletePositionItem(idx) {
        const deleted = positions[idx];
        const updated = positions.filter((_, i) => i !== idx);
        setPositions(updated);
        savePositions(updated);
        if (formData.position === deleted) {
            formData.position = '';
            setFormData({ ...formData });
        }
    }

    // ── Design tokens ──
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
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function setField(field, value) {
        errors[field] = "";
        setErrors({ ...errors });
        formData[field] = value;
        setFormData({ ...formData });
    }

    return (
        <>
            <EmployeeSalaryPaymentCreate
                ref={SalaryPaymentRef}
                refreshList={refreshEmployeeData}
                showToastMessage={props.showToastMessage}
            />

            {/* Position / Designation manager */}
            <Modal show={showPositionManager} onHide={() => { setShowPositionManager(false); setEditingPositionIdx(null); setNewPositionText(''); }} size="sm" centered animation={false}>
                <Modal.Header closeButton style={{ padding: '10px 16px', borderBottom: '1px solid #c3c6d7' }}>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '15px', fontWeight: 700, color: '#191c1e' }}>
                        {t('Manage Positions')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                        <input
                            value={newPositionText}
                            onChange={(e) => setNewPositionText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPositionItem(); } }}
                            style={INPUT}
                            placeholder={t('New position name...')}
                        />
                        <button
                            type="button"
                            onClick={addPositionItem}
                            style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '7px 12px', cursor: 'pointer', flexShrink: 0, fontWeight: 700 }}
                        >
                            <i className="bi bi-plus-lg"></i>
                        </button>
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {positions.map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
                                {editingPositionIdx === idx ? (
                                    <>
                                        <input
                                            autoFocus
                                            value={editingPositionText}
                                            onChange={(e) => setEditingPositionText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); updatePositionItem(idx, editingPositionText); }
                                                if (e.key === 'Escape') { setEditingPositionIdx(null); }
                                            }}
                                            style={{ ...INPUT, flex: 1, padding: '4px 8px' }}
                                        />
                                        <button type="button" onClick={() => updatePositionItem(idx, editingPositionText)}
                                            style={{ background: '#1a7a3a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                                            <i className="bi bi-check-lg"></i>
                                        </button>
                                        <button type="button" onClick={() => setEditingPositionIdx(null)}
                                            style={{ background: '#e0e0e0', color: '#434655', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            onClick={() => { setField("position", p); setShowPositionManager(false); setEditingPositionIdx(null); }}
                                            title={t('Click to select')}
                                            style={{ flex: 1, fontSize: '13px', fontFamily: '"Inter", sans-serif', color: formData.position === p ? '#004ac6' : '#191c1e', fontWeight: formData.position === p ? 700 : 400, cursor: 'pointer', padding: '2px 4px', borderRadius: '3px' }}
                                        >
                                            {formData.position === p && <i className="bi bi-check2 me-1" style={{ fontSize: '12px' }}></i>}
                                            {p}
                                        </span>
                                        <button type="button" onClick={() => { setEditingPositionIdx(idx); setEditingPositionText(p); }}
                                            style={{ background: 'none', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', color: '#434655' }}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button type="button" onClick={() => deletePositionItem(idx)}
                                            style={{ background: 'none', border: '1px solid #f4adaa', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', color: '#ba1a1a' }}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {positions.length === 0 && (
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{t('No positions defined. Add one above.')}</p>
                        )}
                    </div>
                </Modal.Body>
            </Modal>

            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `${t('Update Employee')} — ${formData.name}` : t('Create New Employee')}
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
                                <SectionTitle icon="bi-person-badge">{t('Employee Details')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Label required>{t('Name')}</Label>
                                        <input value={formData.name || ''} type="text" onChange={(e) => setField("name", e.target.value)} style={INPUT} placeholder={t('Full name')} />
                                        <ErrMsg>{errors.name}</ErrMsg>
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Name (Arabic)')}</Label>
                                        <input value={formData.name_in_arabic || ''} type="text" dir="rtl" onChange={(e) => setField("name_in_arabic", e.target.value)} style={INPUT} placeholder={t('Optional')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Position / Designation')}</Label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select
                                                value={formData.position || ''}
                                                onChange={(e) => setField("position", e.target.value)}
                                                style={INPUT}
                                            >
                                                <option value="">{t('Select position...')}</option>
                                                {positions.map((p, i) => (
                                                    <option key={i} value={p}>{p}</option>
                                                ))}
                                                {formData.position && !positions.includes(formData.position) && (
                                                    <option value={formData.position}>{formData.position}</option>
                                                )}
                                            </select>
                                            <button
                                                type="button"
                                                title={t('Manage positions')}
                                                onClick={() => setShowPositionManager(true)}
                                                style={{ background: '#f0f2f4', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 10px', cursor: 'pointer', flexShrink: 0, color: '#434655' }}
                                            >
                                                <i className="bi bi-list-ul"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <Label>{t('Mobile 1')}</Label>
                                        <input value={formData.mob1 || ''} type="text" onChange={(e) => setField("mob1", e.target.value)} style={INPUT} placeholder="05xxxxxxxx" />
                                        <ErrMsg>{errors.mob1}</ErrMsg>
                                    </div>
                                    <div className="col-md-3">
                                        <Label>{t('Mobile 2')}</Label>
                                        <input value={formData.mob2 || ''} type="text" onChange={(e) => setField("mob2", e.target.value)} style={INPUT} placeholder={t('Optional')} />
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Iqama No.')}</Label>
                                        <input value={formData.iqama_no || ''} type="text" onChange={(e) => setField("iqama_no", e.target.value)} style={INPUT} placeholder={t('Iqama Number')} />
                                    </div>
                                    <div className="col-md-3">
                                        <Label required>{t('Joining Date')}</Label>
                                        <input
                                            value={formData.joining_date ? new Date(formData.joining_date).toISOString().slice(0, 10) : ''}
                                            type="date"
                                            onChange={(e) => setField("joining_date", e.target.value ? new Date(e.target.value).toISOString() : '')}
                                            style={INPUT} />
                                        <ErrMsg>{errors.joining_date}</ErrMsg>
                                    </div>
                                    <div className="col-md-3">
                                        <Label>{t('Status')}</Label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px' }}>
                                            <div className="form-check form-switch mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="is_active"
                                                    checked={formData.is_active !== false}
                                                    onChange={(e) => setField("is_active", e.target.checked)}
                                                    style={{ cursor: 'pointer', width: '2.5em', height: '1.4em' }}
                                                />
                                            </div>
                                            <label htmlFor="is_active" style={{ fontSize: '13px', fontFamily: '"Inter", sans-serif', cursor: 'pointer', fontWeight: 600, color: formData.is_active !== false ? '#1a7a3a' : '#ba1a1a' }}>
                                                {formData.is_active !== false ? t('Active') : t('Inactive')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('Address')}</Label>
                                        <textarea value={formData.address || ''} onChange={(e) => setField("address", e.target.value)} style={{ ...INPUT, minHeight: '70px' }} placeholder={t('Address')} />
                                    </div>
                                </div>
                            </div>

                            <div style={CARD}>
                                <SectionTitle icon="bi-cash-stack">{t('Salary Information')}</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Label required>{t('Salary')}</Label>
                                        <input
                                            value={formData.salary === '' || formData.salary === undefined || formData.salary === null ? '' : formData.salary}
                                            type="number" step="0.01"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setField("salary", v === '' ? '' : parseFloat(v));
                                            }}
                                            style={INPUT} />
                                        <ErrMsg>{errors.salary}</ErrMsg>
                                    </div>
                                    <div className="col-md-6">
                                        <Label required>{t('Salary Date (Day of Month)')}</Label>
                                        <input
                                            value={formData.salary_day === '' || formData.salary_day === undefined || formData.salary_day === null ? '' : formData.salary_day}
                                            type="number" min="1" max="28"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setField("salary_day", v === '' ? '' : parseInt(v));
                                            }}
                                            style={INPUT} />
                                        <ErrMsg>{errors.salary_day}</ErrMsg>
                                        <small className="text-muted">{t('Day of month (1-28) when salary is due')}</small>
                                    </div>
                                </div>
                            </div>

                            <div style={CARD}>
                                <SectionTitle icon="bi-arrow-left-right">{t('Opening Balance')}</SectionTitle>
                                <p style={{ fontSize: '12px', color: '#5c6470', fontFamily: '"Inter", sans-serif', marginBottom: '12px' }}>
                                    {t('If this employee is already owed unpaid salary from your previous system, enter that amount and the date as of which it applies. Leave the amount as 0 if fully settled. This system will only track salary due from that date onward.')}
                                    {formData.opening_balance_posted && (' ' + t('(An opening balance entry has already been posted for this employee — changing the values below will update it.)'))}
                                </p>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Label>{t('Opening Balance (Amount Already Owed)')}</Label>
                                        <input
                                            value={formData.opening_balance === '' || formData.opening_balance === undefined || formData.opening_balance === null ? '' : formData.opening_balance}
                                            type="number" step="0.01" min="0"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setField("opening_balance", v === '' ? '' : parseFloat(v));
                                            }}
                                            style={INPUT} />
                                        <ErrMsg>{errors.opening_balance}</ErrMsg>
                                    </div>
                                    <div className="col-md-6">
                                        <Label>{t('As Of Date')}</Label>
                                        <input
                                            value={formData.opening_balance_date ? new Date(formData.opening_balance_date).toISOString().slice(0, 10) : ''}
                                            type="date"
                                            onChange={(e) => setField("opening_balance_date", e.target.value ? new Date(e.target.value).toISOString() : '')}
                                            style={INPUT} />
                                        <ErrMsg>{errors.opening_balance_date}</ErrMsg>
                                        <small className="text-muted">{t('This system starts tracking salary due from this date')}</small>
                                    </div>
                                </div>
                            </div>

                            {formData.id && formData.account && (
                                <div style={CARD}>
                                    <SectionTitle icon="bi-bank2">{t('Account Balance')}</SectionTitle>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <Label>{t('Account Name')}</Label>
                                            <div style={{ ...INPUT, background: '#f0f2f4' }}>{formData.account.name || '-'}</div>
                                        </div>
                                        <div className="col-md-6">
                                            <Label>{getEmployeeBalanceInfo(formData.account, t).label}</Label>
                                            <div style={{ ...INPUT, background: '#f0f2f4', fontWeight: 600, color: getEmployeeBalanceInfo(formData.account, t).colorHex, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>{parseFloat(getEmployeeBalanceInfo(formData.account, t).amount || 0).toFixed(2)}</span>
                                                {props.openBalanceSheetDialogue && (
                                                    <Button
                                                        variant="link"
                                                        style={{ padding: 0, textDecoration: 'none', fontSize: '12px' }}
                                                        onClick={() => props.openBalanceSheetDialogue(formData.account)}
                                                    >
                                                        {t('View Balance Sheet')}
                                                    </Button>
                                                )}
                                            </div>
                                            {getEmployeeBalanceInfo(formData.account, t).suffix && (
                                                <small className="text-muted">{getEmployeeBalanceInfo(formData.account, t).suffix}</small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.id && (
                                <div style={CARD}>
                                    <SectionTitle icon="bi-list-check">{t('Salary Payment History')}</SectionTitle>
                                    {isSalaryLoading && (
                                        <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                                    )}
                                    {!isSalaryLoading && salaryPayments.length === 0 && (
                                        <p className="text-muted">{t('No salary payments recorded yet.')}</p>
                                    )}
                                    {salaryPayments.length > 0 && (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered table-striped">
                                                <thead>
                                                    <tr className="text-center">
                                                        <th>{t('ID')}</th>
                                                        <th>{t('Date')}</th>
                                                        <th>{t('Amount')}</th>
                                                        <th>{t('Method')}</th>
                                                        <th>{t('Period')}</th>
                                                        <th>{t('Description')}</th>
                                                        <th>{t('Actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-center">
                                                    {salaryPayments.map((pmt) => (
                                                        <tr key={pmt.id}>
                                                            <td>
                                                                <span
                                                                    style={{ cursor: "pointer", color: "blue" }}
                                                                    onClick={() => openEditSalaryPayment(pmt.id)}
                                                                >
                                                                    {pmt.code || '-'}
                                                                </span>
                                                            </td>
                                                            <td>{pmt.date ? format(toStoreLocalDate(pmt.date, storeCountryCode), "MMM dd yyyy, h:mm aa") : "-"}</td>
                                                            <td style={{ fontWeight: 600 }}>{parseFloat(pmt.amount || 0).toFixed(2)}</td>
                                                            <td>{pmt.payment_method === 'cash' ? t('Cash') : t('Bank')}</td>
                                                            <td>{`${monthNames[pmt.month] || ''} ${pmt.year}`}</td>
                                                            <td>{pmt.description || '-'}</td>
                                                            <td>
                                                                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEditSalaryPayment(pmt.id)}>
                                                                    <i className="bi bi-pencil"></i>
                                                                </Button>
                                                                <Button size="sm" variant="outline-danger" onClick={() => deleteSalaryPayment(pmt.id)}>
                                                                    <i className="bi bi-trash"></i>
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="text-center" style={{ fontWeight: 700, background: '#f0f2f4' }}>
                                                        <td colSpan={2}>{t('Total Paid')}</td>
                                                        <td>{parseFloat(salaryPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)).toFixed(2)}</td>
                                                        <td colSpan={4}></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default EmployeeCreate;