import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Spinner } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { getEmployeeBalanceInfo } from '../utils/employeeBalance.js';
import { fetchStore } from '../utils/storeUtils.js';
import { toStoreLocalDate, fromStoreLocalDate } from '../utils/timezone.js';

const EmployeeSalaryPaymentCreate = forwardRef((props, ref) => {

    // Derives {month, year} from a UTC ISO date string, using the STORE's own
    // country timezone (not the browser's) to decide which local calendar
    // day/month the date falls on — since Month/Year are no longer separate
    // form fields, the payment's Date field is now the single source of truth
    // for which salary period a payment applies to, both for the "already
    // paid this month" cap check and for the value sent to the backend
    // (which still stores month/year for querying/reporting, but always kept
    // in sync with Date here).
    function deriveMonthYear(isoDate, countryCode) {
        const d = toStoreLocalDate(isoDate, countryCode) || new Date();
        return { month: d.getMonth() + 1, year: d.getFullYear() };
    }

    function getDefaultFormData(employeeId, countryCode) {
        const iso = new Date().toISOString();
        return {
            employee_id: employeeId,
            amount: 0,
            payment_method: "cash",
            date: iso,
            ...deriveMonthYear(iso, countryCode),
            description: "",
        };
    }

    useImperativeHandle(ref, () => ({
        open(employeeId, paymentId) {
            formData = getDefaultFormData(employeeId, storeCountryCode);
            setFormData({ ...formData });
            setErrors({});
            setEmployee({});
            setProcessing(false);
            getEmployee(employeeId, !paymentId);
            if (paymentId) {
                getSalaryPayment(paymentId, employeeId);
            }
            SetShow(true);
        },
    }));

    const { t } = useTranslation('common');
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);
    const [employee, setEmployee] = useState({});
    // The store's own country code (e.g. "SA"), used so every date shown/
    // picked in this form reflects the store's timezone rather than
    // whatever timezone the browser happens to be in.
    const [storeCountryCode, setStoreCountryCode] = useState("");

    useEffect(() => {
        const storeId = localStorage.getItem("store_id");
        if (!storeId) return;
        fetchStore(storeId)
            .then(store => setStoreCountryCode((store && store.country_code) || ""))
            .catch(error => console.log(error));
    }, []);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function getEmployee(id, shouldPrefillAmount = true) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/employee/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setEmployee(data.result);
                // Pre-fill amount with the outstanding balance owed to the employee
                // (only when the account is actually a liability — i.e. we owe them).
                // If the account is in "asset" state (employee owes us, e.g. from an
                // over-advance), that balance is not something to pay out, so fall
                // back to the plain salary amount instead.
                if (shouldPrefillAmount && data.result.salary && data.result.salary > 0) {
                    const account = data.result.account;
                    formData.amount = account && account.type === "liability" && account.balance > 0
                        ? account.balance
                        : data.result.salary;
                    setFormData({ ...formData });
                }
            })
            .catch(error => {
                console.log(error);
                setErrors({ employee: t("Unable to load employee details. Please close and try again.") });
            });
    }

    function getSalaryPayment(id, employeeId) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/employee-salary-payment/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                formData = {
                    ...data.result,
                    employee_id: data.result.employee_id || employeeId,
                    ...deriveMonthYear(data.result.date, storeCountryCode),
                };
                setFormData({ ...formData });
                setErrors({});
                getEmployee(formData.employee_id, false);
            })
            .catch(error => {
                console.log(error);
                setErrors({ ...error });
            });
    }

    function handleSave(event) {
        event.preventDefault();

        let validationErrors = {};
        const amount = Number(formData.amount);
        if (formData.amount === '' || formData.amount === undefined || formData.amount === null || !Number.isFinite(amount) || amount <= 0) {
            validationErrors.amount = t("Amount must be greater than 0");
        }
        // Note: no cap is enforced here against the employee's outstanding/accrued
        // balance — salary advances (paying ahead of what's accrued) are a valid
        // use case, so any positive amount is allowed.
        if (Object.keys(validationErrors).length > 0) {
            setErrors({ ...validationErrors });
            return;
        }

        let endPoint = "/v1/employee-salary-payment";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/employee-salary-payment/" + formData.id;
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
                if (props.showToastMessage) props.showToastMessage(
                    formData.id ? t("Salary payment updated successfully!") : t("Salary payment recorded successfully!"),
                    "success"
                );
                if (props.refreshList) props.refreshList();
                if (props.onSaved) props.onSaved(data.result);
                handleClose();
            })
            .catch((error) => {
                setProcessing(false);
                setErrors({ ...error });
                if (props.showToastMessage) props.showToastMessage(
                    formData.id ? t("Failed to update salary payment!") : t("Failed to record salary payment!"),
                    "danger"
                );
            });
    }

    function setField(field, value) {
        errors[field] = "";
        setErrors({ ...errors });
        formData[field] = value;
        setFormData({ ...formData });
    }

    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };
    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => children
        ? <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
        : null;

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    const isEditMode = !!formData.id;

    function fmtCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    return (
        <>
            <Modal show={show} onHide={handleClose} animation={false} backdrop="static" centered>
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px' }}>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e' }}>
                        <i className="bi bi-cash-coin me-2" style={{ color: '#004ac6' }}></i>
                        {isEditMode ? t('Edit Salary Payment') : t('Pay Salary')}
                    </Modal.Title>
                    <button type="button" className="btn-close" onClick={handleClose} />
                </Modal.Header>

                <Modal.Body style={{ padding: '24px' }}>
                    {/* Employee summary */}
                    {employee.name && (
                        <div style={{ background: '#f0f2f4', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong style={{ fontSize: '14px', fontFamily: '"Inter", sans-serif' }}>{employee.name}</strong>
                                    <div style={{ fontSize: '12px', color: '#54647a' }}>
                                        {t('Salary')}: {fmtCurrency(employee.salary)} | {t('Salary Day')}: {employee.salary_day}
                                    </div>
                                </div>
                                {employee.account && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', color: '#54647a', textTransform: 'uppercase' }}>{getEmployeeBalanceInfo(employee.account, t).label}</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: getEmployeeBalanceInfo(employee.account, t).colorHex }}>
                                            {fmtCurrency(getEmployeeBalanceInfo(employee.account, t).amount)}
                                        </div>
                                        {getEmployeeBalanceInfo(employee.account, t).suffix && (
                                            <div style={{ fontSize: '11px', color: '#54647a' }}>{getEmployeeBalanceInfo(employee.account, t).suffix}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {totalErrors > 0 && (
                        <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                            <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                {allErrors.map(([k, v]) => (
                                    <li key={k} style={{ fontSize: '12px', color: '#93000a' }}>{v}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <form onSubmit={handleSave}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <Label required>{t('Amount')}</Label>
                                <input
                                    value={formData.amount === '' || formData.amount === undefined || formData.amount === null ? '' : formData.amount}
                                    type="number" step="0.01"
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setField("amount", v === '' ? '' : parseFloat(v));
                                    }}
                                    style={INPUT} />
                                <ErrMsg>{errors.amount}</ErrMsg>
                            </div>
                            <div className="col-md-6">
                                <Label required>{t('Payment Method')}</Label>
                                <select value={formData.payment_method || 'cash'} onChange={(e) => setField("payment_method", e.target.value)} style={INPUT}>
                                    <option value="cash">{t('Cash (from Cash A/c)')}</option>
                                    <option value="bank_transfer">{t('Bank Transfer (from Bank A/c)')}</option>
                                </select>
                                <ErrMsg>{errors.payment_method}</ErrMsg>
                            </div>
                            <div className="col-md-6">
                                <Label required>{t('Date')}</Label>
                                <DatePicker
                                    id="date"
                                    selected={formData.date ? toStoreLocalDate(formData.date, storeCountryCode) : null}
                                    value={formData.date ? format(toStoreLocalDate(formData.date, storeCountryCode), "MMMM d, yyyy h:mm aa") : null}
                                    className="form-control"
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    showTimeSelect
                                    timeIntervals={1}
                                    wrapperClassName="w-100"
                                    customInput={<input style={INPUT} />}
                                    onChange={(value) => {
                                        // `value` is whatever store-local date/time the user
                                        // picked (its native getters equal the on-screen wall
                                        // clock), so convert it back to true UTC using the
                                        // store's own country timezone before storing it.
                                        const iso = value ? fromStoreLocalDate(value, storeCountryCode) : new Date().toISOString();
                                        // Date is the single source of truth for which salary
                                        // period (month/year) this payment applies to — no
                                        // separate Month/Year fields, so keep them in sync here.
                                        formData.date = iso;
                                        formData.month = deriveMonthYear(iso, storeCountryCode).month;
                                        formData.year = deriveMonthYear(iso, storeCountryCode).year;
                                        setFormData({ ...formData });
                                    }}
                                />
                            </div>
                            <div className="col-12">
                                <Label>{t('Description')}</Label>
                                <textarea value={formData.description || ''} onChange={(e) => setField("description", e.target.value)} style={{ ...INPUT, minHeight: '60px' }} placeholder={t('Optional notes')} />
                            </div>
                        </div>
                    </form>

                    <div style={{ marginTop: '16px', padding: '10px 14px', background: '#e8f0fe', borderRadius: '6px', fontSize: '12px', color: '#54647a' }}>
                        <i className="bi bi-info-circle me-1"></i>
                        {t('This payment will create a double-entry ledger: Debit employee liability account, Credit')} <strong>{formData.payment_method === 'cash' ? t('Cash') : t('Bank')}</strong> {t('account.')}.
                    </div>
                </Modal.Body>

                <Modal.Footer style={{ borderTop: '1px solid #c3c6d7' }}>
                    <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>{t('Cancel')}</button>
                    <button type="button"
                        style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={handleSave} disabled={isProcessing}>
                        {isProcessing && <Spinner as="span" animation="border" size="sm" className="me-1" />}
                        {isEditMode ? t('Update Payment') : `${t('Pay')} ${fmtCurrency(formData.amount)}`}
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    );
});

export default EmployeeSalaryPaymentCreate;