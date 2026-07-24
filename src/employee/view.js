import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Modal, Button, Spinner } from "react-bootstrap";
import { format } from "date-fns";
import EmployeeSalaryPaymentCreate from "./salaryPayment.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { getEmployeeBalanceInfo } from '../utils/employeeBalance.js';
import { fetchStore } from '../utils/storeUtils.js';
import { toStoreLocalDate } from '../utils/timezone.js';

const EmployeeView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id, opts) {
            getEmployee(id);
            loadSalaryPayments(id);
            setHistoryOnly(!!(opts && opts.historyOnly));
            SetShow(true);
        },
    }));

    const { t } = useTranslation('common');
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);
    const [salaryPayments, setSalaryPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [historyOnly, setHistoryOnly] = useState(false);
    const SalaryPaymentRef = useRef();
    // The store's own country code (e.g. "SA"), used so every date shown in
    // this view reflects the store's timezone rather than the browser's.
    const [storeCountryCode, setStoreCountryCode] = useState("");

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    useEffect(() => {
        const storeId = localStorage.getItem("store_id");
        if (!storeId) return;
        fetchStore(storeId)
            .then(store => setStoreCountryCode((store && store.country_code) || ""))
            .catch(error => console.log(error));
    }, []);

    function getEmployee(id) {
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
                formData = data.result;
                setFormData({ ...formData });
            })
            .catch(error => console.log(error));
    }

    function loadSalaryPayments(employeeId) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = { employee_id: employeeId };
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setIsLoading(true);
        fetch('/v1/employee-salary-payment?select=id,code,date,amount,payment_method,month,year,description&' + queryParams + "&sort=-date&limit=100", requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setSalaryPayments(data.result || []);
                setIsLoading(false);
            })
            .catch(error => {
                console.log(error);
                setIsLoading(false);
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

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const VALUE_BOX = { padding: '8px 12px', background: '#f0f2f4', borderRadius: '4px', fontSize: '14px', fontFamily: '"Inter", sans-serif', color: '#191c1e', minHeight: '34px' };
    const Label = ({ children }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#54647a', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</label>
    );
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    function fmtCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    return (
        <>
            <EmployeeSalaryPaymentCreate
                ref={SalaryPaymentRef}
                refreshList={refreshEmployeeData}
                showToastMessage={props.showToastMessage}
            />
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px' }}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        {formData.name || t('Employee Details')}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {props.openUpdateForm && (
                            <button type="button" style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => { handleClose(); props.openUpdateForm(formData.id); }}>
                                <i className="bi bi-pencil me-1"></i>{t('Edit')}
                            </button>
                        )}
                        <button type="button" className="btn-close ms-1" onClick={handleClose} />
                    </div>
                </Modal.Header>

                <style>{`
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                `}</style>

                <Modal.Body className="pw-body">
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                            {!historyOnly && (
                                <div style={CARD}>
                                    <SectionTitle icon="bi-person-badge">{t('Employee Information')}</SectionTitle>
                                    <div className="row g-3">
                                        <div className="col-md-6"><Label>{t('Name')}</Label><div style={VALUE_BOX}>{formData.name || '-'}</div></div>
                                        <div className="col-md-6"><Label>{t('Name (Arabic)')}</Label><div style={{ ...VALUE_BOX, textAlign: 'right' }} dir="rtl">{formData.name_in_arabic || '-'}</div></div>
                                        {formData.position && <div className="col-md-6"><Label>{t('Position / Designation')}</Label><div style={VALUE_BOX}>{formData.position}</div></div>}
                                        <div className="col-md-3"><Label>{t('Mobile 1')}</Label><div style={VALUE_BOX}>{formData.mob1 || '-'}</div></div>
                                        <div className="col-md-3"><Label>{t('Mobile 2')}</Label><div style={VALUE_BOX}>{formData.mob2 || '-'}</div></div>
                                        <div className="col-md-6"><Label>{t('Iqama No.')}</Label><div style={VALUE_BOX}>{formData.iqama_no || '-'}</div></div>
                                        <div className="col-md-6"><Label>{t('Joining Date')}</Label><div style={VALUE_BOX}>{formData.joining_date ? format(new Date(formData.joining_date), "MMM dd yyyy") : '-'}</div></div>
                                        <div className="col-md-6"><Label>{t('Address')}</Label><div style={VALUE_BOX}>{formData.address || '-'}</div></div>
                                    </div>
                                </div>
                            )}

                            {!historyOnly && (
                                <div style={CARD}>
                                    <SectionTitle icon="bi-cash-stack">{t('Salary Information')}</SectionTitle>
                                    <div className="row g-3">
                                        <div className="col-md-4"><Label>{t('Salary')}</Label><div style={VALUE_BOX}>{fmtCurrency(formData.salary)}</div></div>
                                        <div className="col-md-4"><Label>{t('Salary Day')}</Label><div style={VALUE_BOX}>{formData.salary_day}</div></div>
                                        <div className="col-md-4">
                                            <Label>{getEmployeeBalanceInfo(formData.account, t).label}</Label>
                                            <div style={{ ...VALUE_BOX, fontWeight: 600, color: getEmployeeBalanceInfo(formData.account, t).colorHex, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>{fmtCurrency(getEmployeeBalanceInfo(formData.account, t).amount)}</span>
                                                {formData.account && props.openBalanceSheetDialogue && (
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
                                        {!!formData.opening_balance && (
                                            <>
                                                <div className="col-md-6">
                                                    <Label>{t('Opening Balance (From Previous System)')}</Label>
                                                    <div style={VALUE_BOX}>{fmtCurrency(formData.opening_balance)}</div>
                                                </div>
                                                <div className="col-md-6">
                                                    <Label>{t('Opening Balance As Of')}</Label>
                                                    <div style={VALUE_BOX}>{formData.opening_balance_date ? format(new Date(formData.opening_balance_date), "MMM dd yyyy") : '-'}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={CARD}>
                                <SectionTitle icon="bi-list-check">{t('Salary Payment History')}</SectionTitle>
                                {isLoading && (
                                    <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                                )}
                                {!isLoading && salaryPayments.length === 0 && (
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
                                                        <td style={{ fontWeight: 600 }}>{fmtCurrency(pmt.amount)}</td>
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
                                                    <td>{fmtCurrency(salaryPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0))}</td>
                                                    <td colSpan={4}></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default EmployeeView;