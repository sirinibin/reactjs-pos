import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import EmployeeCreate from "./create.js";
import EmployeeView from "./view.js";
import EmployeeSalaryPaymentCreate from "./salaryPayment.js";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import { confirm } from 'react-bootstrap-confirmation';
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import PaginationControls from '../utils/PaginationControls.js';
import { getEmployeeBalanceInfo } from '../utils/employeeBalance.js';
import PostingIndex from "../posting/index.js";
import StatsSummary from "../utils/StatsSummary.js";

function EmployeeIndex(props) {
    const { t } = useTranslation('common');

    const [employeeList, setEmployeeList] = useState([]);

    let [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('employee_pageSize') || '10'));
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortDir, setSortDir] = useState("-");

    // Stats
    let [statsOpen, setStatsOpen] = useState(false);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [totalSalary, setTotalSalary] = useState(0);
    const [totalOwedToEmployees, setTotalOwedToEmployees] = useState(0);
    const [totalEmployeesOwe, setTotalEmployeesOwe] = useState(0);
    const [totalSalaryPaid, setTotalSalaryPaid] = useState(0);

    // Created At date range filter state
    const [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(null);
    const [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(null);
    const [createdAtFromValue, setCreatedAtFromValue] = useState("");
    const [createdAtToValue, setCreatedAtToValue] = useState("");
    const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);

    useEffect(() => {
        list();
        getStore(localStorage.getItem("store_id"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen;
        setStatsOpen(statsOpen);
    };

    useEffect(() => {
        if (statsOpen) {
            list();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsOpen]);

    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (error) { }
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;
        page = 1;
        setPage(page);
        list();
    }

    function searchByDateField(field, value) {
        if (!value) {
            searchParams[field] = "";
            page = 1;
            setPage(page);
            list();
            return;
        }

        let d = new Date(value);
        d = new Date(d.toUTCString());
        value = format(d, "MMM dd yyyy");

        if (field === "created_at_from") {
            setCreatedAtFromValue(value);
            searchParams["created_at_from"] = value;
        } else if (field === "created_at_to") {
            setCreatedAtToValue(value);
            searchParams["created_at_to"] = value;
        }

        page = 1;
        setPage(page);
        list();
    }

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "select=id,name,name_in_arabic,mob1,mob2,iqama_no,address,salary,salary_day,joining_date,account,created_by_name,created_at";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (statsOpen) {
            searchParams["stats"] = "1";
        } else {
            searchParams["stats"] = "0";
        }

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        setIsListLoading(true);
        fetch(
            "/v1/employee?" +
            Select +
            queryParams +
            "&sort=" +
            sortDir +
            sortField +
            "&page=" +
            page +
            "&limit=" +
            pageSize,
            requestOptions
        )
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                if (!response.ok) {
                    const error = data && data.errors;
                    return Promise.reject(error);
                }

                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setEmployeeList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);
                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                if (data.meta) {
                    setTotalEmployees(data.meta.total_employees || 0);
                    setTotalSalary(data.meta.total_salary || 0);
                    setTotalOwedToEmployees(data.meta.total_owed_to_employees || 0);
                    setTotalEmployeesOwe(data.meta.total_employees_owe || 0);
                    setTotalSalaryPaid(data.meta.total_salary_paid || 0);
                }
            })
            .catch((error) => {
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
        list();
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        localStorage.setItem('employee_pageSize', size);
        setPageSize(pageSize);
        list();
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list();
    }

    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    function openDetailsView(id, opts) {
        DetailsViewRef.current.open(id, opts);
    }

    function openCreateForm() {
        CreateFormRef.current.open();
    }

    function openPaySalary(employeeId) {
        SalaryPaymentRef.current.open(employeeId);
    }

    async function deleteEmployee(employee) {
        const ok = await confirm(
            t('Permanently delete "{{name}}"? This will remove the employee along with ALL related salary payments, accrual entries and balance sheet postings. This cannot be undone.', { name: employee.name }),
            { okText: t('Delete'), cancelText: t('Cancel'), okButtonStyle: 'danger' }
        );
        if (!ok) return;

        let params = {};
        if (localStorage.getItem("store_id")) params.store_id = localStorage.getItem("store_id");

        try {
            const response = await fetch(
                "/v1/employee/permanent/" + employee.id + "?" + ObjectToSearchQueryParams(params),
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: localStorage.getItem("access_token"),
                    },
                }
            );
            const isJson = response.headers.get("content-type")?.includes("application/json");
            const data = isJson && (await response.json());

            if (!response.ok || (data && data.status === false)) {
                const error = (data && data.errors && Object.values(data.errors)[0]) || t('Unable to delete employee');
                props.showToastMessage(error, "error");
                return;
            }

            props.showToastMessage(t('Employee deleted permanently'), "success");
            list();
        } catch (error) {
            console.log(error);
            props.showToastMessage(t('Unable to delete employee'), "error");
        }
    }

    const DetailsViewRef = useRef();
    const CreateFormRef = useRef();
    const SalaryPaymentRef = useRef();
    const AccountBalanceSheetRef = useRef();

    function openBalanceSheetDialogue(account) {
        AccountBalanceSheetRef.current.open(account);
    }

    function formatCurrency(val) {
        if (val === undefined || val === null) return "0.00";
        return parseFloat(val).toFixed(2);
    }

    return (
        <>
            <EmployeeCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} openBalanceSheetDialogue={openBalanceSheetDialogue} />
            <EmployeeView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} showToastMessage={props.showToastMessage} refreshList={list} openBalanceSheetDialogue={openBalanceSheetDialogue} />
            <EmployeeSalaryPaymentCreate ref={SalaryPaymentRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <PostingIndex ref={AccountBalanceSheetRef} showToastMessage={props.showToastMessage} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">{t('Employees')}</h1>
                    </div>
                    <div className="col text-end">
                        <Button variant="primary" className="btn btn-primary mb-1" onClick={openCreateForm}>
                            <i className="bi bi-plus-lg"></i> {t('Create')}
                        </Button>
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        <StatsSummary
                            title="Employees Summary"
                            storageKey="employee_summary"
                            stats={{
                                "Total Employees": totalEmployees,
                                "Total Monthly Salary": totalSalary,
                                "Total Salary Paid": totalSalaryPaid,
                                "Owed to Employees": totalOwedToEmployees,
                                "Employees Owe": totalEmployeesOwe,
                                "Net Balance": totalEmployeesOwe - totalOwedToEmployees,
                            }}
                            statsWithInfo={[
                                {
                                    label: "Total Employees",
                                    info: t("Number of employees matching the current filters"),
                                    noActions: true,
                                },
                                {
                                    label: "Total Monthly Salary",
                                    info: t("Sum of all matching employees' monthly salary amounts (payroll budget)"),
                                },
                                {
                                    label: "Total Salary Paid",
                                    info: t("Total salary payments made to matching employees across all time"),
                                },
                                {
                                    label: "Owed to Employees",
                                    info: t("Total amount the store owes to matching employees (accrued salary not yet paid)"),
                                },
                                {
                                    label: "Employees Owe",
                                    info: t("Total amount matching employees owe the store (e.g. advances not yet worked off)"),
                                },
                                {
                                    label: "Net Balance",
                                    info: t("Net balance across all matching employees. Positive = employees owe the store overall; negative = store owes employees overall"),
                                    colorByValue: true,
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
                                <div className="row">
                                    {totalItems === 0 && (
                                        <div className="col">
                                            <p className="text-start">{t('No Employees to display')}</p>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                    <Button
                                        onClick={() => { setIsRefreshInProcess(true); list(); }}
                                        variant="primary"
                                        disabled={isRefreshInProcess}
                                    >
                                        {isRefreshInProcess ? (
                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        ) : (
                                            <i className="fa fa-refresh"></i>
                                        )}
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
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("name")}>
                                                    {t('Name')}
                                                    {sortField === "name" && sortDir === "-" ? <i className="bi bi-sort-alpha-up-alt"></i> : null}
                                                    {sortField === "name" && sortDir === "" ? <i className="bi bi-sort-alpha-up"></i> : null}
                                                </b></th>
                                                <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("mob1")}>
                                                    {t('Mobile')}
                                                </b></th>
                                                <th><b>{t('Balance')}</b></th>
                                                <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("created_at")}>
                                                    {t('Created At')}
                                                </b></th>
                                                <th>{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <thead>
                                            <tr className="text-center">
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) => searchByFieldValue("search", e.target.value)}
                                                        className="form-control"
                                                        placeholder={t('Search')}
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) => searchByFieldValue("mob1", e.target.value)}
                                                        className="form-control"
                                                        placeholder={t('Mobile')}
                                                    />
                                                </th>
                                                <th></th>
                                                <th>
                                                    <div style={{ minWidth: "130px" }}>
                                                        <small
                                                            style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}
                                                            onClick={() => setShowCreatedAtDateRange(!showCreatedAtDateRange)}
                                                        >
                                                            {showCreatedAtDateRange ? t("Less..") : t("More..")}
                                                        </small>
                                                        {showCreatedAtDateRange && (
                                                            <span>
                                                                <div className="mt-1">
                                                                    <small className="text-muted">{t('From')}:</small>
                                                                    <DatePicker
                                                                        id="created_at_from"
                                                                        value={createdAtFromValue}
                                                                        selected={selectedCreatedAtFromDate}
                                                                        className="form-control form-control-sm"
                                                                        dateFormat="MMM dd yyyy"
                                                                        isClearable={true}
                                                                        onChange={(date) => {
                                                                            if (!date) {
                                                                                setCreatedAtFromValue("");
                                                                                setSelectedCreatedAtFromDate(null);
                                                                                searchByDateField("created_at_from", "");
                                                                                return;
                                                                            }
                                                                            setSelectedCreatedAtFromDate(date);
                                                                            searchByDateField("created_at_from", date);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="mt-1">
                                                                    <small className="text-muted">{t('To')}:</small>
                                                                    <DatePicker
                                                                        id="created_at_to"
                                                                        value={createdAtToValue}
                                                                        selected={selectedCreatedAtToDate}
                                                                        className="form-control form-control-sm"
                                                                        dateFormat="MMM dd yyyy"
                                                                        isClearable={true}
                                                                        onChange={(date) => {
                                                                            if (!date) {
                                                                                setCreatedAtToValue("");
                                                                                setSelectedCreatedAtToDate(null);
                                                                                searchByDateField("created_at_to", "");
                                                                                return;
                                                                            }
                                                                            setSelectedCreatedAtToDate(date);
                                                                            searchByDateField("created_at_to", date);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </span>
                                                        )}
                                                    </div>
                                                </th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {employeeList && employeeList.map((employee) => (
                                                <tr key={employee.id}>
                                                    <td className="text-start" style={{ whiteSpace: "nowrap" }}>
                                                        <OverflowTooltip value={employee.name} maxWidth={250} />
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        {employee.mob1}
                                                        {employee.mob2 && <div><small className="text-muted">{employee.mob2}</small></div>}
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        {(() => {
                                                            const info = getEmployeeBalanceInfo(employee.account, t);
                                                            if (!employee.account) {
                                                                return <span className={info.colorClass}>{formatCurrency(info.amount)}</span>;
                                                            }
                                                            return (
                                                                <Button variant="link" className={info.colorClass} style={{ padding: 0, textDecoration: 'none' }} onClick={() => openBalanceSheetDialogue(employee.account)}>
                                                                    {formatCurrency(info.amount)}
                                                                    {info.magnitude > 0 && <div><small className="text-muted">{info.suffix}</small></div>}
                                                                </Button>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        {employee.created_at ? format(new Date(employee.created_at), "MMM dd yyyy H:mma") : ""}
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <Button className="btn btn-success btn-sm me-1" title={t('Pay Salary')} onClick={() => openPaySalary(employee.id)}>
                                                            <i className="bi bi-cash-coin me-1"></i>{t('PAY SALARY')}
                                                        </Button>
                                                        <Button className="btn btn-info btn-sm me-1" title={t('Salary History')} onClick={() => openDetailsView(employee.id, { historyOnly: true })}>
                                                            <i className="bi bi-clock-history"></i>
                                                        </Button>
                                                        <Button className="btn btn-light btn-sm me-1" onClick={() => openUpdateForm(employee.id)}>
                                                            <i className="bi bi-pencil"></i>
                                                        </Button>
                                                        <Button className="btn btn-primary btn-sm" onClick={() => openDetailsView(employee.id)}>
                                                            <i className="bi bi-eye"></i>
                                                        </Button>
                                                        <Button className="btn btn-danger btn-sm ms-1" title={t('Delete Permanently')} onClick={() => deleteEmployee(employee)}>
                                                            <i className="bi bi-trash"></i>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default EmployeeIndex;
