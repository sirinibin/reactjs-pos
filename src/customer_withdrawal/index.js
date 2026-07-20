import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CustomerWithdrawalCreate from "./create.js";
import CustomerWithdrawalView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
//import NumberFormat from "react-number-format";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import CustomerDepositPreview from './../customer_deposit/preview.js';
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { useTableSettings } from '../utils/useTableSettings.js';
import PaginationControls from '../utils/PaginationControls.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';

function CustomerWithdrawalIndex(props) {



    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());
    let [selectedCreatedAtDate, setSelectedCreatedAtDate] = useState(new Date());
    let [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(new Date());
    let [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(new Date());

    const [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    //list
    const [customerwithdrawalList, setCustomerWithdrawalList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);


    //Created At filter
    const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);
    const [createdAtValue, setCreatedAtValue] = useState("");
    const [createdAtFromValue, setCreatedAtFromValue] = useState("");
    const [createdAtToValue, setCreatedAtToValue] = useState("");

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Created By CustomerWithdrawal Auto Suggestion
    const [customerwithdrawalOptions, setCustomerWithdrawalOptions] = useState([]);
    const [selectedCreatedByCustomerWithdrawals, setSelectedCreatedByCustomerWithdrawals] = useState([]);

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);

    const [store, setStore] = useState({});
    const [reportingIds, setReportingIds] = useState(new Set());

    useEffect(() => {
        list();
        getStore(localStorage.getItem("store_id"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    async function getStore(id) {
        try {
            const data = await fetchStore(id);
            if (data) setStore(data);
        } catch (error) { }
    }

    function ReportWithdrawalToZatca(id, index) {
        setReportingIds(prev => new Set([...prev, id]));
        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        let queryParams = ObjectToSearchQueryParams(searchParams);
        let endPoint = "/v1/customer-withdrawal/zatca/report/" + id + "?" + queryParams;
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") },
        };
        fetch(endPoint, requestOptions)
            .then(async response => {
                const data = await response.json();
                setReportingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
                if (!response.ok || !data.status) {
                    const errMsg = data?.errors ? Object.values(data.errors).join("; ") : "Reporting to Zatca failed!";
                    if (props.showToastMessage) props.showToastMessage(errMsg, "danger");
                    let updated = [...customerwithdrawalList];
                    updated[index] = { ...updated[index], _zatcaError: errMsg };
                    setCustomerWithdrawalList(updated);
                    return;
                }
                if (data.result) {
                    let updated = [...customerwithdrawalList];
                    updated[index] = data.result;
                    setCustomerWithdrawalList(updated);
                }
                if (props.showToastMessage) props.showToastMessage("Reported successfully to Zatca!", "success");
            })
            .catch(() => {
                setReportingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
                if (props.showToastMessage) props.showToastMessage("Network error: Reporting to Zatca failed!", "danger");
            });
    }


    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortCustomerWithdrawal, setSortCustomerWithdrawal] = useState("-");

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggest Users");

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCustomerWithdrawalOptions(data.result);
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;
        setFieldFilters(prev => {
            const updated = { ...prev };
            if (value) { updated[field] = value; } else { delete updated[field]; }
            return updated;
        });

        page = 1;
        setPage(page);
        list();
    }

    function searchByDateField(field, value) {
        if (!value) {
            page = 1;
            searchParams[field] = "";
            setPage(page);
            list();
            return;
        }

        let d = new Date(value);
        d = new Date(d.toUTCString());

        value = format(d, "MMM dd yyyy");

        if (field === "date_str") {
            setDateValue(value);
            setFromDateValue("");
            setToDateValue("");
            searchParams["from_date"] = "";
            searchParams["to_date"] = "";
            searchParams[field] = value;
        } else if (field === "from_date") {
            setFromDateValue(value);
            setDateValue("");
            searchParams["date"] = "";
            searchParams[field] = value;
        } else if (field === "to_date") {
            setToDateValue(value);
            setDateValue("");
            searchParams["date"] = "";
            searchParams[field] = value;
        } else if (field === "created_at") {
            setCreatedAtValue(value);
            setCreatedAtFromValue("");
            setCreatedAtToValue("");
            searchParams["created_at_from"] = "";
            searchParams["created_at_to"] = "";
            searchParams[field] = value;
        }
        if (field === "created_at_from") {
            setCreatedAtFromValue(value);
            setCreatedAtValue("");
            searchParams["created_at"] = "";
            searchParams[field] = value;
        } else if (field === "created_at_to") {
            setCreatedAtToValue(value);
            setCreatedAtValue("");
            searchParams["created_at"] = "";
            searchParams[field] = value;
        }

        page = 1;
        setPage(page);

        list();
    }

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByCustomerWithdrawals(values);
        } else if (field === "customer_id") {
            setSelectedCustomers(values);
        } else if (field === "vendor_id") {
            setSelectedVendors(values);
        } else if (field === "payment_methods") {
            setSelectedPaymentMethodList(values);
        }

        searchParams[field] = Object.values(values)
            .map(function (model) {
                return model.id;
            })
            .join(",");

        page = 1;
        setPage(page);

        list();
    }

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            // openProductSearchResult = false;

            setTimeout(() => {
                setOpenCustomerSearchResult(false);
            }, 100);
            return;
        }



        var params = {
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = `&${queryString}`;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,code,additional_keywords,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(
            `/v1/customer?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();
        if (!data.result || data.result.length === 0) {
            setOpenCustomerSearchResult(false);
            return;
        }
        setOpenCustomerSearchResult(true);

        const filtered = data.result.filter((opt) => customFilter(opt, searchTerm));

        setCustomerOptions(filtered);
    }

    let [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);
    let [openCustomerSearchResult, setOpenCustomerSearchResult] = useState(false);

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggest Vendors");
        setVendorOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            // openProductSearchResult = false;

            setTimeout(() => {
                setOpenVendorSearchResult(false);
            }, 100);
            return;
        }


        var params = {
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = `&${queryString}`;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,code,additional_keywords,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(
            `/v1/vendor?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        if (!data.result || data.result.length === 0) {
            setOpenVendorSearchResult(false);
            return;
        }
        setOpenVendorSearchResult(true);

        const filtered = data.result.filter((opt) => customFilter(opt, searchTerm));

        setVendorOptions(filtered);
    }



    const customFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

        const q = normalize(query);
        const qWords = q.split(" ");

        const fields = [
            option.code,
            option.vat_no,
            option.name,
            option.name_in_arabic,
            option.phone,
            option.search_label,
            option.phone_in_arabic,
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];

        const searchable = normalize(fields.join(" "));

        return qWords.every((word) => searchable.includes(word));
    }, []);

    const [statsOpen, setStatsOpen] = useState(false);
    const [fieldFilters, setFieldFilters] = useState({});
    const handleSummaryToggle = (isOpen) => {
        setStatsOpen(isOpen);
    };

    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsOpen]);

    let [totalUnPaidPurchasePay, setTotalUnPaidPurchasePay] = useState(0.00);
    let [totalUnPaidSalesReturnPay, setTotalUnPaidSalesReturnPay] = useState(0.00);

    let [totalPayables, setTotalPayables] = useState(0.00);
    let [totalCashPayables, setTotalCashPayables] = useState(0.00);
    let [totalBankPayables, setTotalBankPayables] = useState(0.00);


    // eslint-disable-next-line no-unused-vars
    let sortOrder = "-";

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,date,type,net_total,total,total_discount,payment_methods,payments,bank_reference_no,description,remarks,customer_id,customer_name,customer_name_arabic,vendor_id,vendor_name,vendor_name_arabic,created_by_name,created_at,uuid,hash,zatca,store_id";

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



        // console.log("queryParams:", queryParams);
        //queryParams = encodeURIComponent(queryParams);

        setIsListLoading(true);
        fetch(
            "/v1/customer-withdrawal?" +
            Select +
            queryParams +
            "&sort=" +
            sortCustomerWithdrawal +
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

                // check for error response
                if (!response.ok) {
                    const error = data && data.errors;
                    return Promise.reject(error);
                }

                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setCustomerWithdrawalList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                totalPayables = data.meta.total;
                setTotalPayables(totalPayables);

                setTotalUnPaidPurchasePay(data.meta.total_vendor || 0);
                setTotalUnPaidSalesReturnPay(data.meta.total_customer || 0);

                totalCashPayables = data.meta.cash;
                setTotalCashPayables(totalCashPayables);

                totalBankPayables = data.meta.bank;
                setTotalBankPayables(totalBankPayables);

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
        sortCustomerWithdrawal = sortCustomerWithdrawal === "-" ? "" : "-";
        setSortCustomerWithdrawal(sortCustomerWithdrawal);
        list();
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        setPageSize(pageSize);
        list();
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list();
    }

    const paymentMethodOptions = [
        {
            id: "cash",
            name: "Cash",
        },
        {
            id: "debit_card",
            name: "Debit Card",
        },
        {
            id: "credit_card",
            name: "Credit Card",
        },
        {
            id: "bank_card",
            name: "Bank Card",
        },
        {
            id: "bank_transfer",
            name: "Bank Transfer",
        },
        {
            id: "bank_cheque",
            name: "Bank Cheque",
        },
    ];

    const [selectedPaymentMethodList, setSelectedPaymentMethodList] = useState([]);

    const CreateFormRef = useRef();
    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }


    function openCreateForm() {
        CreateFormRef.current.open();
    }

    const PreviewRef = useRef();
    function openPreview(model) {
        PreviewRef.current.open(model, undefined, "customer_withdrawal");
    }

    function sendWhatsAppMessage(model) {
        PreviewRef.current.open(model, "whatsapp", "whatsapp_customer_withdrawal");
    }

    const customerSearchRef = useRef();
    const vendorSearchRef = useRef();
    const timerRef = useRef(null);

    const idSearchRef = useRef();
    const netTotalSearchRef = useRef();
    const descriptionSearchRef = useRef();

    const defaultColumns = useMemo(() => [
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "id", label: "ID", fieldName: "code", visible: true },
        { key: "date", label: "Date", fieldName: "date", visible: true },
        { key: "type", label: "Type", fieldName: "type", visible: true },
        { key: "customer", label: "Customer", fieldName: "customer_name", visible: true },
        { key: "vendor", label: "Vendor", fieldName: "vendor_name", visible: true },
        { key: "net_total", label: "Net Total", fieldName: "net_total", visible: true },
        { key: "payment_methods", label: "Payment Methods", fieldName: "payment_methods", visible: true },
        { key: "description", label: "Description", fieldName: "description", visible: true },
        { key: "created_by", label: "Created By", fieldName: "created_by_name", visible: true },
        { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
        { key: "reported_to_zatca", label: "Reported to Zatca", fieldName: "zatca.reporting_passed", visible: true },
        { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
    ], []);

    const { columns, showSettings, setShowSettings, handleToggleColumn, onDragEnd, restoreDefaults } = useTableSettings({ storageKey: "customer_withdrawal_table_settings", defaultColumns });



    return (
        <>
            {/* ⚙️ Settings Modal */}
            <TableSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                title="Customer Withdrawal Settings"
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onDragEnd={onDragEnd}
                onRestoreDefaults={restoreDefaults}
            />

            <CustomerDepositPreview ref={PreviewRef} />
            <CustomerWithdrawalCreate ref={CreateFormRef} refreshList={list} openDetailsView={openDetailsView} showToastMessage={props.showToastMessage} />
            <CustomerWithdrawalView ref={DetailsViewRef} store={store} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} showToastMessage={props.showToastMessage} />

            {/*<div className="container-fluid p-0">
                <div className="row">

                    <div className="col">
                        <h1 className="text-end">
                            Total: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalCustomerWithdrawals}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                    </div>

                </div>
            </div>*/}

            <div className="row">
                <div className="col">
                    <span className="text-end">
                        <StatsSummary
                            title="Payables Summary"
                            filters={{
                                ...(dateValue ? { 'Date': dateValue } : {}),
                                ...(fromDateValue ? { 'From Date': fromDateValue } : {}),
                                ...(toDateValue ? { 'To Date': toDateValue } : {}),
                                ...(createdAtValue ? { 'Created At': createdAtValue } : {}),
                                ...(createdAtFromValue ? { 'Created From': createdAtFromValue } : {}),
                                ...(createdAtToValue ? { 'Created To': createdAtToValue } : {}),
                                ...(selectedCustomers.length > 0 ? { 'Customer': selectedCustomers.map(c => c.name).join(', ') } : {}),
                                ...(selectedVendors.length > 0 ? { 'Vendor': selectedVendors.map(v => v.name).join(', ') } : {}),
                                ...(selectedCreatedByCustomerWithdrawals.length > 0 ? { 'Created By': selectedCreatedByCustomerWithdrawals.map(u => u.name).join(', ') } : {}),
                                ...Object.fromEntries(
                                    Object.entries(fieldFilters)
                                        .filter(([, v]) => v)
                                        .map(([field, value]) => {
                                            const labelMap = { code: 'ID', type: 'Type', net_total: 'Amount', description: 'Description' };
                                            return [labelMap[field] || field, value];
                                        })
                                ),
                            }}
                            stats={{
                                "Total": totalPayables,
                                "Cash": totalCashPayables,
                                "Bank": totalBankPayables,
                                "Payable to Vendors (Unpaid Purchases)": totalUnPaidPurchasePay,
                                "Payable to Customers (Sales Return)": totalUnPaidSalesReturnPay,
                                "Net Payables": (totalUnPaidPurchasePay || 0) + (totalUnPaidSalesReturnPay || 0),
                            }}
                            onToggle={handleSummaryToggle}
                        />
                    </span>
                </div>
            </div>

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3"> Payables</h1>
                    </div>



                    <div className="col text-end">
                        <Button
                            hide={true.toString()}
                            variant="primary"
                            className="btn btn-primary mb-1"
                            onClick={openCreateForm}
                        >
                            <i className="bi bi-plus-lg"></i> Create
                        </Button>
                    </div>
                </div>




                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            {/*
  <div   className="card-header">
                        <h5   className="card-title mb-0"></h5>
                    </div>
                    */}
                            <div className="card-body p-2">
                                <div className="row">
                                    {totalItems === 0 && (
                                        <div className="col">
                                            <p className="text-start">No CustomerWithdrawal to display</p>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                    <Button
                                        onClick={() => {
                                            setIsRefreshInProcess(true);
                                            list();
                                        }}
                                        variant="primary"
                                        disabled={isRefreshInProcess}
                                    >
                                        {isRefreshInProcess ? (
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden={true}
                                            />
                                        ) : (
                                            <i className="fa fa-refresh"></i>
                                        )}
                                        <span className="visually-hidden">Loading...</span>
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
                                        pageSizes={[5, 10, 20, 40, 50, 100, 200, 300, 500, 1000, 1500]}
                                    />
                                    <button
                                        className="btn btn-sm btn-outline-secondary ms-auto"
                                        onClick={() => setShowSettings(!showSettings)}
                                    >
                                        <i className="bi bi-gear-fill" style={{ fontSize: "1.2rem" }} title="Table Settings" />
                                    </button>
                                </div>
                                <div className="table-responsive" style={{ position: "relative", overflowX: "auto", overflowY: "auto", minHeight: "200px" }}
                                    ref={(el) => {
                                        if (!el) return;
                                        const fit = () => {
                                            const top = el.getBoundingClientRect().top;
                                            el.style.height = Math.max(200, window.innerHeight - top - 16) + "px";
                                        };
                                        fit();
                                        if (!el._fitListenerAdded) {
                                            el._fitListenerAdded = true;
                                            window.addEventListener("resize", fit);
                                        }
                                    }}
                                >
                                    {isListLoading && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.5)" }}>
                                            <Spinner animation="grow" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                                        </div>
                                    )}
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                {columns.filter(c => c.visible).map((col) => (
                                                    <th key={col.key}>
                                                        {(col.key === "actions" || col.key === "actions_end") ? col.label : (
                                                            <b
                                                                style={{ textDecoration: "underline", cursor: "pointer" }}
                                                                onClick={() => sort(col.fieldName)}
                                                            >
                                                                {col.label}
                                                                {sortField === col.fieldName && sortCustomerWithdrawal === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === col.fieldName && sortCustomerWithdrawal === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
                                                {columns.filter(c => c.visible).map((col) => (
                                                    <th key={col.key}>
                                                        {(col.key === "actions" || col.key === "actions_end") && <></>}
                                                        {col.key === "id" && (
                                                            <input
                                                                type="text"
                                                                onChange={(e) => searchByFieldValue("code", e.target.value)}
                                                                className="form-control"
                                                                id="payable_id"
                                                                name="payable_id"
                                                                ref={idSearchRef}
                                                                onKeyDown={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (e.key === "Escape") { timerRef.current = setTimeout(() => { idSearchRef.current.value = ""; searchByFieldValue("code", ""); }, 100); }
                                                                }}
                                                            />
                                                        )}
                                                        {col.key === "date" && (
                                                            <>
                                                                <DatePicker
                                                                    id="payable_date"
                                                                    value={dateValue}
                                                                    selected={selectedDate}
                                                                    isClearable={true}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    onChange={(date) => {
                                                                        if (!date) { setDateValue(""); searchByDateField("date_str", ""); return; }
                                                                        searchByDateField("date_str", date);
                                                                        selectedDate = date; setSelectedDate(date);
                                                                    }}
                                                                    onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { setDateValue(""); searchByDateField("date_str", ""); }, 100); } }}
                                                                />
                                                                <small style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }} onClick={() => setShowDateRange(!showDateRange)}>
                                                                    {showDateRange ? "Less.." : "More.."}
                                                                </small>
                                                                {showDateRange && (
                                                                    <span className="text-left">
                                                                        From: <DatePicker id="payable_from_date" value={fromDateValue} selected={selectedFromDate} isClearable={true} className="form-control" dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => { if (!date) { setFromDateValue(""); searchByDateField("from_date", ""); return; } searchByDateField("from_date", date); selectedFromDate = date; setSelectedFromDate(date); }}
                                                                            onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { setFromDateValue(""); searchByDateField("from_date", ""); }, 100); } }}
                                                                        />
                                                                        To: <DatePicker id="payable_to_date" value={toDateValue} selected={selectedToDate} isClearable={true} className="form-control" dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => { if (!date) { setToDateValue(""); searchByDateField("to_date", ""); return; } searchByDateField("to_date", date); selectedToDate = date; setSelectedToDate(date); }}
                                                                            onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { setToDateValue(""); searchByDateField("to_date", ""); }, 100); } }}
                                                                        />
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        {col.key === "type" && (
                                                            <select onChange={(e) => searchByFieldValue("type", e.target.value)}>
                                                                <option value="">All</option>
                                                                <option value="customer">Customer</option>
                                                                <option value="vendor">Vendor</option>
                                                            </select>
                                                        )}
                                                        {col.key === "customer" && (
                                                            <Typeahead
                                                                id="customer_id"
                                                                labelKey="search_label"
                                                                filterBy={['additional_keywords']}
                                                                style={{ minWidth: "300px" }}
                                                                onChange={(selectedItems) => { searchByMultipleValuesField("customer_id", selectedItems); setOpenCustomerSearchResult(false); }}
                                                                open={openCustomerSearchResult}
                                                                options={customerOptions}
                                                                placeholder="Customer Name / Mob / VAT # / ID"
                                                                selected={selectedCustomers}
                                                                highlightOnlyResult={true}
                                                                ref={customerSearchRef}
                                                                onKeyDown={(e) => { if (e.key === "Escape") { setCustomerOptions([]); customerSearchRef.current?.clear(); } }}
                                                                onInputChange={(searchTerm) => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestCustomers(searchTerm), 100); }}
                                                                multiple
                                                            />
                                                        )}
                                                        {col.key === "vendor" && (
                                                            <Typeahead
                                                                id="vendor_id"
                                                                filterBy={() => true}
                                                                labelKey="search_label"
                                                                style={{ minWidth: "300px" }}
                                                                onChange={(selectedItems) => { searchByMultipleValuesField("vendor_id", selectedItems); setOpenVendorSearchResult(false); }}
                                                                options={vendorOptions}
                                                                open={openVendorSearchResult}
                                                                placeholder="Vendor Name / Mob / VAT # / ID"
                                                                selected={selectedVendors}
                                                                highlightOnlyResult={true}
                                                                ref={vendorSearchRef}
                                                                onKeyDown={(e) => { if (e.key === "Escape") { setVendorOptions([]); vendorSearchRef.current?.clear(); } }}
                                                                onInputChange={(searchTerm) => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => suggestVendors(searchTerm), 100); }}
                                                                multiple
                                                            />
                                                        )}
                                                        {col.key === "net_total" && (
                                                            <input
                                                                type="text"
                                                                onChange={(e) => searchByFieldValue("net_total", e.target.value)}
                                                                className="form-control"
                                                                id="payable_net_total"
                                                                name="payable_net_total"
                                                                ref={netTotalSearchRef}
                                                                onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { netTotalSearchRef.current.value = ""; searchByFieldValue("net_total", ""); }, 100); } }}
                                                            />
                                                        )}
                                                        {col.key === "payment_methods" && (
                                                            <Typeahead
                                                                id="payment_methods"
                                                                labelKey="name"
                                                                onChange={(selectedItems) => searchByMultipleValuesField("payment_methods", selectedItems)}
                                                                options={paymentMethodOptions}
                                                                placeholder="Select payment methods"
                                                                selected={selectedPaymentMethodList}
                                                                highlightOnlyResult={true}
                                                                multiple
                                                                onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => searchByMultipleValuesField("payment_methods", []), 100); } }}
                                                            />
                                                        )}
                                                        {col.key === "description" && (
                                                            <input
                                                                type="text"
                                                                onChange={(e) => searchByFieldValue("description", e.target.value)}
                                                                className="form-control"
                                                                id="payable_description"
                                                                name="payable_description"
                                                                ref={descriptionSearchRef}
                                                                onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { descriptionSearchRef.current.value = ""; searchByFieldValue("description", ""); }, 100); } }}
                                                            />
                                                        )}
                                                        {col.key === "created_by" && (
                                                            <Typeahead
                                                                id="created_by"
                                                                labelKey="name"
                                                                onChange={(selectedItems) => searchByMultipleValuesField("created_by", selectedItems)}
                                                                options={customerwithdrawalOptions}
                                                                placeholder="Select Users"
                                                                selected={selectedCreatedByCustomerWithdrawals}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm) => suggestUsers(searchTerm)}
                                                                onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => searchByMultipleValuesField("created_by", []), 100); } }}
                                                                multiple
                                                            />
                                                        )}
                                                        {col.key === "created_at" && (
                                                            <>
                                                                <DatePicker
                                                                    id="created_at"
                                                                    value={createdAtValue}
                                                                    selected={selectedCreatedAtDate}
                                                                    isClearable={true}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    onChange={(date) => {
                                                                        if (!date) { setCreatedAtValue(""); searchByDateField("created_at", ""); return; }
                                                                        searchByDateField("created_at", date);
                                                                        selectedCreatedAtDate = date; setSelectedCreatedAtDate(date);
                                                                    }}
                                                                    onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { setCreatedAtValue(""); searchByDateField("created_at", ""); }, 100); } }}
                                                                />
                                                                <small style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }} onClick={() => setShowCreatedAtDateRange(!showCreatedAtDateRange)}>
                                                                    {showCreatedAtDateRange ? "Less.." : "More.."}
                                                                </small>
                                                                {showCreatedAtDateRange && (
                                                                    <span className="text-left">
                                                                        From: <DatePicker id="created_at_from" value={createdAtFromValue} selected={selectedCreatedAtFromDate} isClearable={true} className="form-control" dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => { if (!date) { setCreatedAtFromValue(""); searchByDateField("created_at_from", ""); return; } searchByDateField("created_at_from", date); selectedCreatedAtFromDate = date; setSelectedCreatedAtFromDate(date); }}
                                                                            onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { setCreatedAtFromValue(""); searchByDateField("created_at_from", ""); }, 100); } }}
                                                                        />
                                                                        To: <DatePicker id="created_at_to" value={createdAtToValue} selected={selectedCreatedAtToDate} isClearable={true} className="form-control" dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => { if (!date) { setCreatedAtToValue(""); searchByDateField("created_at_to", ""); return; } searchByDateField("created_at_to", date); selectedCreatedAtToDate = date; setSelectedCreatedAtToDate(date); }}
                                                                            onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === "Escape") { timerRef.current = setTimeout(() => { setCreatedAtToValue(""); searchByDateField("created_at_to", ""); }, 100); } }}
                                                                        />
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {customerwithdrawalList &&
                                                customerwithdrawalList.map((customerwithdrawal, index) => (
                                                    <tr key={customerwithdrawal.code}>
                                                        {columns.filter(c => c.visible).map((col) => (
                                                            <React.Fragment key={col.key}>
                                                                {col.key === "actions" && (
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <Button className="btn btn-light btn-sm" onClick={() => openUpdateForm(customerwithdrawal.id)}><i className="bi bi-pencil"></i></Button>&nbsp;
                                                                        <Button className="btn btn-primary btn-sm" onClick={() => openDetailsView(customerwithdrawal.id)}><i className="bi bi-eye"></i></Button>&nbsp;
                                                                        <Button className="btn btn-primary btn-sm" onClick={() => openPreview(customerwithdrawal)}><i className="bi bi-printer"></i></Button>&nbsp;
                                                                        <Button className="btn btn-success btn-sm" onClick={() => sendWhatsAppMessage(customerwithdrawal)}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" /></svg>
                                                                        </Button>
                                                                    </td>
                                                                )}
                                                                {col.fieldName === "code" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customerwithdrawal.code}</td>}
                                                                {col.key === "date" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{format(new Date(customerwithdrawal.date), "MMM dd yyyy h:mma")}</td>}
                                                                {col.key === "type" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customerwithdrawal.type}</td>}
                                                                {col.fieldName === "customer_name" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customerwithdrawal.customer_name && <OverflowTooltip value={customerwithdrawal.customer_name + (customerwithdrawal.customer_name_arabic ? "|" + customerwithdrawal.customer_name_arabic : "")} maxWidth={300} />}</td>}
                                                                {col.fieldName === "vendor_name" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customerwithdrawal.vendor_name && <OverflowTooltip value={customerwithdrawal.vendor_name + (customerwithdrawal.vendor_name_arabic ? "|" + customerwithdrawal.vendor_name_arabic : "")} maxWidth={300} />}</td>}
                                                                {col.fieldName === "net_total" && <td style={{ width: "auto", whiteSpace: "nowrap" }}><Amount amount={trimTo2Decimals(customerwithdrawal.net_total)} /></td>}
                                                                {col.key === "payment_methods" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customerwithdrawal.payment_methods && customerwithdrawal.payment_methods.map((name, i) => <React.Fragment key={i}><span className="badge bg-info">{name}</span>&nbsp;</React.Fragment>)}</td>}
                                                                {col.key === "description" && <td style={{ width: "auto", whiteSpace: "nowrap" }}><OverflowTooltip value={customerwithdrawal.description} maxWidth={300} /></td>}
                                                                {col.fieldName === "created_by_name" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customerwithdrawal.created_by_name}</td>}
                                                                {col.fieldName === "created_at" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>{format(new Date(customerwithdrawal.created_at), "MMM dd yyyy h:mma")}</td>}
                                                                {col.key === "reported_to_zatca" && store?.zatca?.phase === "2" && store?.zatca?.connected && store?.settings?.enable_zatca_reporting_for_payables && (
                                                                    <td style={{ width: "auto", minWidth: "174px" }}>
                                                                        {!customerwithdrawal.zatca?.reporting_passed && (
                                                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }}>
                                                                                {(customerwithdrawal.zatca?.reporting_failed_count > 0) && (
                                                                                    <span className="badge bg-danger">Failed</span>
                                                                                )}
                                                                                <Button
                                                                                    className={`btn btn-sm ${customerwithdrawal.zatca?.reporting_failed_count > 0 ? "btn-outline-warning" : "btn-warning"}`}
                                                                                    disabled={reportingIds.has(customerwithdrawal.id)}
                                                                                    onClick={() => ReportWithdrawalToZatca(customerwithdrawal.id, index)}
                                                                                >
                                                                                    {reportingIds.has(customerwithdrawal.id)
                                                                                        ? <Spinner animation="border" size="sm" />
                                                                                        : customerwithdrawal.zatca?.reporting_failed_count > 0
                                                                                            ? <><i className="bi bi-arrow-clockwise"></i> Retry</>
                                                                                            : <><i className="bi bi-cloud-upload"></i> Report</>
                                                                                    }
                                                                                </Button>
                                                                                {customerwithdrawal._zatcaError && (
                                                                                    <span style={{ fontSize: "0.7rem", color: "#dc3545", maxWidth: "180px", whiteSpace: "normal", lineHeight: "1.2" }} title={customerwithdrawal._zatcaError}>
                                                                                        {customerwithdrawal._zatcaError.length > 80 ? customerwithdrawal._zatcaError.substring(0, 77) + "…" : customerwithdrawal._zatcaError}
                                                                                    </span>
                                                                                )}
                                                                                {!customerwithdrawal._zatcaError && customerwithdrawal.zatca?.reporting_errors?.length > 0 && (
                                                                                    <span style={{ fontSize: "0.7rem", color: "#dc3545", maxWidth: "180px", whiteSpace: "normal", lineHeight: "1.2" }} title={customerwithdrawal.zatca.reporting_errors[customerwithdrawal.zatca.reporting_errors.length - 1]}>
                                                                                        {customerwithdrawal.zatca.reporting_errors[customerwithdrawal.zatca.reporting_errors.length - 1].length > 80
                                                                                            ? customerwithdrawal.zatca.reporting_errors[customerwithdrawal.zatca.reporting_errors.length - 1].substring(0, 77) + "…"
                                                                                            : customerwithdrawal.zatca.reporting_errors[customerwithdrawal.zatca.reporting_errors.length - 1]}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {customerwithdrawal.zatca?.reporting_passed && (
                                                                            <>
                                                                                <span className="badge bg-success">Reported</span>&nbsp;
                                                                                <a href={`/zatca/${customerwithdrawal.store_id}/payables/xml/${customerwithdrawal.code}.xml`} target="_blank" rel="noreferrer" className="btn btn-outline-secondary btn-sm"><i className="bi bi-file-earmark-code"></i> XML</a>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                {col.key === "actions_end" && (
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <Button className="btn btn-light btn-sm" onClick={() => openUpdateForm(customerwithdrawal.id)}><i className="bi bi-pencil"></i></Button>
                                                                        <Button className="btn btn-primary btn-sm" onClick={() => openDetailsView(customerwithdrawal.id)}><i className="bi bi-eye"></i></Button>
                                                                    </td>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
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

export default CustomerWithdrawalIndex;
