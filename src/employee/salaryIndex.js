import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Button, Spinner } from "react-bootstrap";
import { confirm } from 'react-bootstrap-confirmation';
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import EmployeeSalaryPaymentCreate from "./salaryPayment.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import PaginationControls from '../utils/PaginationControls.js';
import OverflowTooltip from '../utils/OverflowTooltip.js';
import StatsSummary from '../utils/StatsSummary.js';

function SalaryIndex(props) {
    const { t } = useTranslation('common');

    const [list, setList] = useState([]);
    let [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('salary_pageSize') || '10'));
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    // Stats
    let [statsOpen, setStatsOpen] = useState(false);
    const [totalPayments, setTotalPayments] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalCash, setTotalCash] = useState(0);
    const [totalBankTransfer, setTotalBankTransfer] = useState(0);

    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("date");
    let [sortDir, setSortDir] = useState("-");

    // Date filter
    const [selectedDateFrom, setSelectedDateFrom] = useState(null);
    const [selectedDateTo, setSelectedDateTo] = useState(null);
    const [dateFromValue, setDateFromValue] = useState("");
    const [dateToValue, setDateToValue] = useState("");
    const [showDateRange, setShowDateRange] = useState(false);

    const SalaryPaymentRef = useRef();

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen;
        setStatsOpen(statsOpen);
    };

    useEffect(() => {
        if (statsOpen) fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsOpen]);

    function fetchList() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let params = { ...searchParams };
        if (localStorage.getItem("store_id")) params.store_id = localStorage.getItem("store_id");

        const d = new Date();
        params.timezone_offset = parseFloat(d.getTimezoneOffset() / 60);

        params.stats = statsOpen ? "1" : "0";

        setSearchParams(params);
        let queryParams = ObjectToSearchQueryParams(params);
        if (queryParams) queryParams = "&" + queryParams;

        setIsListLoading(true);
        fetch(
            "/v1/employee-salary-payment?select=id,code,employee_id,employee_name,amount,payment_method,date,month,year,description" +
            queryParams +
            "&sort=" + sortDir + sortField +
            "&page=" + page +
            "&limit=" + pageSize,
            requestOptions
        )
            .then(async response => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data && data.errors);

                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setList(data.result || []);
                const pageCount = Math.ceil((data.total_count || 0) / pageSize);
                setTotalPages(pageCount);
                setTotalItems(data.total_count || 0);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount((data.result || []).length);

                if (data.meta) {
                    setTotalPayments(data.meta.total_payments || 0);
                    setTotalAmount(data.meta.total_amount || 0);
                    setTotalCash(data.meta.total_cash || 0);
                    setTotalBankTransfer(data.meta.total_bank_transfer || 0);
                }
            })
            .catch(error => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }

    function sort(field) {
        sortField = field;
        setSortField(sortField);
        sortDir = sortDir === "-" ? "" : "-";
        setSortDir(sortDir);
        fetchList();
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;
        page = 1;
        setPage(page);
        fetchList();
    }

    function searchByDateField(field, value) {
        if (!value) {
            searchParams[field] = "";
            page = 1;
            setPage(page);
            fetchList();
            return;
        }
        let d = new Date(value);
        d = new Date(d.toUTCString());
        const formatted = format(d, "MMM dd yyyy");
        if (field === "date_from") {
            setDateFromValue(formatted);
            searchParams["date_from"] = formatted;
        } else {
            setDateToValue(formatted);
            searchParams["date_to"] = formatted;
        }
        page = 1;
        setPage(page);
        fetchList();
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        localStorage.setItem('salary_pageSize', size);
        setPageSize(pageSize);
        fetchList();
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        fetchList();
    }

    async function deletePayment(payment) {
        const ok = await confirm(
            t('Permanently delete this salary payment of {{amount}} for {{name}}? This cannot be undone.', {
                amount: formatCurrency(payment.amount),
                name: payment.employee_name,
            }),
            { okText: t('Delete'), cancelText: t('Cancel'), okButtonStyle: 'danger' }
        );
        if (!ok) return;

        let params = {};
        if (localStorage.getItem("store_id")) params.store_id = localStorage.getItem("store_id");

        try {
            const response = await fetch(
                "/v1/employee-salary-payment/" + payment.id + "?" + ObjectToSearchQueryParams(params),
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("access_token"),
                    },
                }
            );
            const isJson = response.headers.get("content-type")?.includes("application/json");
            const data = isJson && await response.json();
            if (!response.ok || (data && data.status === false)) {
                const error = (data && data.errors && Object.values(data.errors)[0]) || t('Unable to delete');
                props.showToastMessage(error, "error");
                return;
            }
            props.showToastMessage(t('Salary payment deleted'), "success");
            fetchList();
        } catch (error) {
            console.log(error);
            props.showToastMessage(t('Unable to delete'), "error");
        }
    }

    function formatCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    function fmtPaymentMethod(method) {
        if (method === "bank_transfer") return t("Bank Transfer");
        return t("Cash");
    }

    return (
        <>
            <EmployeeSalaryPaymentCreate
                ref={SalaryPaymentRef}
                refreshList={fetchList}
                showToastMessage={props.showToastMessage}
            />

            <div className="container-fluid p-0">
                <div className="row mb-2">
                    <div className="col">
                        <h1 className="h3">{t('Salaries')}</h1>
                    </div>
                    <div className="col text-end">
                        <Button variant="primary" onClick={() => SalaryPaymentRef.current.open()}>
                            <i className="bi bi-plus-lg"></i> {t('Create')}
                        </Button>
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        <StatsSummary
                            title="Salaries Summary"
                            storageKey="salary_summary"
                            stats={{
                                "Total Payments": totalPayments,
                                "Total Amount Paid": totalAmount,
                                "Total Cash": totalCash,
                                "Total Bank Transfer": totalBankTransfer,
                            }}
                            statsWithInfo={[
                                {
                                    label: "Total Payments",
                                    info: t("Number of salary payments matching the current filters"),
                                    noActions: true,
                                },
                                {
                                    label: "Total Amount Paid",
                                    info: t("Total salary amount paid across all matching payments"),
                                },
                                {
                                    label: "Total Cash",
                                    info: t("Total salary paid via cash (from Cash A/c)"),
                                },
                                {
                                    label: "Total Bank Transfer",
                                    info: t("Total salary paid via bank transfer (from Bank A/c)"),
                                },
                            ]}
                            onToggle={handleSummaryToggle}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body p-2">
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                    <Button
                                        onClick={() => { setIsRefreshInProcess(true); fetchList(); }}
                                        variant="primary"
                                        disabled={isRefreshInProcess}
                                    >
                                        {isRefreshInProcess
                                            ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                            : <i className="fa fa-refresh"></i>}
                                    </Button>
                                    <PaginationControls
                                        totalPages={totalPages}
                                        page={page}
                                        totalItems={totalItems}
                                        offset={offset}
                                        currentPageItemsCount={currentPageItemsCount}
                                        pageSize={pageSize}
                                        onPageChange={changePage}
                                        onPageSizeChange={changePageSize}
                                        pageSizes={[5, 10, 20, 40, 50, 100]}
                                    />
                                </div>

                                <div className="table-responsive" style={{ position: "relative", overflowX: "auto", overflowY: "auto", minHeight: "200px" }}>
                                    {isListLoading && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.5)" }}>
                                            <Spinner animation="grow" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                                        </div>
                                    )}
                                    {totalItems === 0 && !isListLoading && (
                                        <p className="text-start mt-2">{t('No salary payments to display')}</p>
                                    )}
                                    {totalItems > 0 && (
                                        <table className="table table-striped table-sm table-bordered">
                                            <thead>
                                                <tr className="text-center">
                                                    <th><b>{t('Code')}</b></th>
                                                    <th>
                                                        <b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("employee_name")}>
                                                            {t('Employee')}
                                                            {sortField === "employee_name" && sortDir === "-" && <i className="bi bi-sort-alpha-up-alt ms-1"></i>}
                                                            {sortField === "employee_name" && sortDir === "" && <i className="bi bi-sort-alpha-up ms-1"></i>}
                                                        </b>
                                                    </th>
                                                    <th>
                                                        <b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("amount")}>
                                                            {t('Amount')}
                                                            {sortField === "amount" && sortDir === "-" && <i className="bi bi-sort-numeric-up-alt ms-1"></i>}
                                                            {sortField === "amount" && sortDir === "" && <i className="bi bi-sort-numeric-up ms-1"></i>}
                                                        </b>
                                                    </th>
                                                    <th><b>{t('Method')}</b></th>
                                                    <th>
                                                        <b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("date")}>
                                                            {t('Date')}
                                                            {sortField === "date" && sortDir === "-" && <i className="bi bi-sort-down ms-1"></i>}
                                                            {sortField === "date" && sortDir === "" && <i className="bi bi-sort-up ms-1"></i>}
                                                        </b>
                                                    </th>
                                                    <th><b>{t('Description')}</b></th>
                                                    <th><b>{t('Actions')}</b></th>
                                                </tr>
                                            </thead>
                                            <thead>
                                                <tr className="text-center">
                                                    <th></th>
                                                    <th>
                                                        <input
                                                            type="text"
                                                            onChange={e => searchByFieldValue("employee_name", e.target.value)}
                                                            className="form-control"
                                                            placeholder={t('Search')}
                                                        />
                                                    </th>
                                                    <th></th>
                                                    <th>
                                                        <select className="form-select form-select-sm" onChange={e => searchByFieldValue("payment_method", e.target.value)}>
                                                            <option value="">{t('All')}</option>
                                                            <option value="cash">{t('Cash')}</option>
                                                            <option value="bank_transfer">{t('Bank Transfer')}</option>
                                                        </select>
                                                    </th>
                                                    <th>
                                                        <div style={{ minWidth: "130px" }}>
                                                            <small
                                                                style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}
                                                                onClick={() => setShowDateRange(!showDateRange)}
                                                            >
                                                                {showDateRange ? t("Less..") : t("More..")}
                                                            </small>
                                                            {showDateRange && (
                                                                <span>
                                                                    <div className="mt-1">
                                                                        <small className="text-muted">{t('From')}:</small>
                                                                        <DatePicker
                                                                            value={dateFromValue}
                                                                            selected={selectedDateFrom}
                                                                            className="form-control form-control-sm"
                                                                            dateFormat="MMM dd yyyy"
                                                                            isClearable
                                                                            onChange={date => {
                                                                                if (!date) { setDateFromValue(""); setSelectedDateFrom(null); searchByDateField("date_from", ""); return; }
                                                                                setSelectedDateFrom(date);
                                                                                searchByDateField("date_from", date);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="mt-1">
                                                                        <small className="text-muted">{t('To')}:</small>
                                                                        <DatePicker
                                                                            value={dateToValue}
                                                                            selected={selectedDateTo}
                                                                            className="form-control form-control-sm"
                                                                            dateFormat="MMM dd yyyy"
                                                                            isClearable
                                                                            onChange={date => {
                                                                                if (!date) { setDateToValue(""); setSelectedDateTo(null); searchByDateField("date_to", ""); return; }
                                                                                setSelectedDateTo(date);
                                                                                searchByDateField("date_to", date);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </th>
                                                    <th></th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-center">
                                                {list.map(payment => (
                                                    <tr key={payment.id}>
                                                        <td style={{ whiteSpace: "nowrap" }}>
                                                            <small className="text-muted">{payment.code}</small>
                                                        </td>
                                                        <td className="text-start" style={{ whiteSpace: "nowrap" }}>
                                                            <OverflowTooltip value={payment.employee_name} maxWidth={200} />
                                                        </td>
                                                        <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                                                            {formatCurrency(payment.amount)}
                                                        </td>
                                                        <td style={{ whiteSpace: "nowrap" }}>
                                                            {fmtPaymentMethod(payment.payment_method)}
                                                        </td>
                                                        <td style={{ whiteSpace: "nowrap" }}>
                                                            {payment.date ? format(new Date(payment.date), "MMM dd yyyy") : ""}
                                                        </td>
                                                        <td className="text-start">
                                                            {payment.description
                                                                ? <OverflowTooltip value={payment.description} maxWidth={200} />
                                                                : <span className="text-muted">&mdash;</span>}
                                                        </td>
                                                        <td style={{ whiteSpace: "nowrap" }}>
                                                            <Button
                                                                className="btn btn-light btn-sm me-1"
                                                                title={t('Edit')}
                                                                onClick={() => SalaryPaymentRef.current.open(payment.employee_id, payment.id)}
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>
                                                            <Button
                                                                className="btn btn-danger btn-sm"
                                                                title={t('Delete')}
                                                                onClick={() => deletePayment(payment)}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SalaryIndex;
