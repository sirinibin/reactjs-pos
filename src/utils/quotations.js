import React, { useState, useRef, forwardRef, useEffect, useImperativeHandle, useCallback } from "react";
import { Button, Spinner, Modal } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import "react-datepicker/dist/react-datepicker.css";
import OverflowTooltip from "./OverflowTooltip.js";
import QuotationCreate from "./../quotation/create.js";
import QuotationView from "./../quotation/view.js";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import ReactPaginate from "react-paginate";
import { trimTo2Decimals } from "./numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "./StatsSummary.js";
import eventEmitter from "./eventEmitter";
import OrderCreate from "./../order/create.js";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";


const shortLocale = {
    ...enUS,
    formatDistance: (token, count) => {
        const format = {
            xSeconds: `${count}s`,
            xMinutes: `${count}m`,
            xHours: `${count}h`,
            xDays: `${count}d`,
            xMonths: `${count}mo`,
            xYears: `${count}y`,
        };
        return format[token] || "";
    },
};

const TimeAgo = ({ date }) => {
    return <span>{formatDistanceToNowStrict(new Date(date), { locale: shortLocale })} ago</span>;
};

const Quotations = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, selectedCustomers, typeValue, selectedPaymentStatusList) {
            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);
            ResetSearchParams();
            type = "";
            setType(type);
            paymentStatus = "";
            setPaymentStatus(paymentStatus);

            if (typeValue) {
                type = typeValue
                setType(type);
                searchByFieldValue("type", type, true);
            }

            if (selectedCustomers?.length > 0) {
                searchByMultipleValuesField("customer_id", selectedCustomers, true);
            }

            if (selectedPaymentStatusList) {
                searchByMultipleValuesField("payment_status", selectedPaymentStatusList, true);
            }

            list();
            getStore(localStorage.getItem("store_id"));
            SetShow(true);

            /*
            console.log("selectedCustomers:", selectedCustomers);
            if (selectedCustomers?.length > 0) {
                setSelectedCustomers(selectedCustomers)
                searchByMultipleValuesField("customer_id", selectedCustomers);
            } else {
                list();
            }

            getStore(localStorage.getItem("store_id"));
            */

        },
    }));


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };


    let [searchParams, setSearchParams] = useState({});

    function ResetSearchParams() {
        for (let key in searchParams) {
            if (searchParams.hasOwnProperty(key)) {
                searchParams[key] = "";
            }
        }
    }

    let [type, setType] = useState("");
    let [paymentStatus, setPaymentStatus] = useState("");
    let [enableSelection, setEnableSelection] = useState(false);





    let [store, setStore] = useState({});

    async function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);
                store = data.result;
                setStore(store);
            })
            .catch(error => {

            });
    }


    let [totalQuotation, setTotalQuotation] = useState(0.00);
    let [profit, setProfit] = useState(0.00);
    let [loss, setLoss] = useState(0.00);

    //list
    const [quotationList, setQuotationList] = useState([]);

    //pagination
    const [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    const selectedDate = new Date();
    let [dateValue, setDateValue] = useState("");
    let [fromDateValue, setFromDateValue] = useState("");
    let [toDateValue, setToDateValue] = useState("");

    //Created At filter
    const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);
    const [createdAtValue, setCreatedAtValue] = useState("");
    const [createdAtFromValue, setCreatedAtFromValue] = useState("");
    const [createdAtToValue, setCreatedAtToValue] = useState("");

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);

    //Status Auto Suggestion
    const statusOptions = [
        {
            id: "sent",
            name: "Sent",
        },
        {
            id: "pending",
            name: "Pending",
        },
        {
            id: "accepted",
            name: "Accepted",
        },
        {
            id: "rejected",
            name: "Rejected",
        },
        {
            id: "cancelled",
            name: "Cancelled",
        },
        {
            id: "deleted",
            name: "Deleted",
        },
    ];

    const [selectedStatusList, setSelectedStatusList] = useState([]);

    // useEffect(() => {
    //    list();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);

    //Search params

    let [sortField, setSortField] = useState("created_at");
    let [sortOrder, setSortOrder] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");

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

        setCustomerOptions(data.result);
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setCustomerOptions([]);

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

        setUserOptions(data.result);
    }

    function searchByFieldValue(field, value, noList) {
        searchParams[field] = value;

        page = 1;
        setPage(page);

        if (!noList) {
            list();
        }
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
            console.log("Value:", value);
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

    function searchByMultipleValuesField(field, values, noList) {
        if (field === "created_by") {
            setSelectedCreatedByUsers(values);
        } else if (field === "customer_id") {
            setSelectedCustomers(values);
        } else if (field === "status") {
            setSelectedStatusList(values);
        } else if (field === "payment_status") {
            setSelectedPaymentStatusList(values);
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
        console.log("searchParams1:", searchParams);
        setSearchParams(searchParams);
        if (!noList) {
            list();
        }
    }



    //Payment Status Auto Suggestion
    const paymentStatusOptions = [
        {
            id: "paid",
            name: "Paid",
        },
        {
            id: "not_paid",
            name: "Not Paid",
        },
        {
            id: "paid_partially",
            name: "Paid partially",
        },
    ];
    const [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);

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

    let [statsOpen, setStatsOpen] = useState(false);


    const [invoiceTotalSales, setInvoiceTotalSales] = useState(0.00);
    const [invoiceNetProfit, setInvoiceNetProfit] = useState(0.00);
    const [invoiceVatPrice, setInvoiceVatPrice] = useState(0.00);
    const [invoiceTotalShippingHandlingFees, setInvoiceTotalShippingHandlingFees] = useState(0.00);
    const [invoiceTotalDiscount, setInvoiceTotalDiscount] = useState(0.00);
    const [invoiceTotalCashDiscount, setInvoiceTotalCashDiscount] = useState(0.00);
    const [invoiceTotalPaidSales, setInvoiceTotalPaidSales] = useState(0.00);
    const [invoiceTotalUnPaidSales, setInvoiceTotalUnPaidSales] = useState(0.00);
    const [invoiceTotalCashSales, setInvoiceTotalCashSales] = useState(0.00);
    const [invoiceTotalBankAccountSales, setInvoiceTotalBankAccountSales] = useState(0.00);
    const [invoiceLoss, setInvoiceLoss] = useState(0.00);


    const list = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,order_code,order_id,customer_id,reported_to_zatca,reported_to_zatca_at,type,payment_status,payment_methods,total_payment_received,balance_amount,code,date,net_total,created_by_name,customer_name,status,cash_discount,discount_with_vat,created_at,profit,loss";

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
            "/v1/quotation?" +
            Select +
            queryParams +
            "&sort=" +
            sortOrder +
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
                setQuotationList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                setTotalQuotation(data.meta.total_quotation);
                setProfit(data.meta.profit);
                setLoss(data.meta.loss);

                //invoice meta

                setInvoiceTotalSales(data.meta.invoice_total_sales);
                setInvoiceNetProfit(data.meta.invoice_net_profit);
                setInvoiceLoss(data.meta.invoice_net_loss);
                setInvoiceVatPrice(data.meta.invoice_vat_price);
                setInvoiceTotalShippingHandlingFees(data.meta.invoice_shipping_handling_fees);
                setInvoiceTotalDiscount(data.meta.invoice_discount);
                setInvoiceTotalCashDiscount(data.meta.invoice_cash_discount);
                setInvoiceTotalPaidSales(data.meta.invoice_paid_sales);
                setInvoiceTotalUnPaidSales(data.meta.invoice_unpaid_sales);
                setInvoiceTotalCashSales(data.meta.invoice_cash_sales);
                setInvoiceTotalBankAccountSales(data.meta.invoice_bank_account_sales);
            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [sortOrder, sortField, page, pageSize, statsOpen, searchParams]);

    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen
        setStatsOpen(statsOpen)
    };

    useEffect(() => {
        if (statsOpen) {
            list();  // Call list() whenever statsOpen changes to true
        }
    }, [statsOpen, list]);




    useEffect(() => {
        const handleSocketOpen = () => {
            //console.log("WebSocket Opened in sales list");
            list();
        };

        eventEmitter.on("socket_connection_open", handleSocketOpen);

        return () => {
            eventEmitter.off("socket_connection_open", handleSocketOpen); // Cleanup
        };
    }, [list]); // Runs only once when component mounts

    function sort(field) {
        sortField = field;
        setSortField(sortField);
        sortOrder = sortOrder === "-" ? "" : "-";
        setSortOrder(sortOrder);
        list();
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            list();
        }, 300);

        // Cleanup to avoid memory leaks
        return () => clearTimeout(timer);
    }, [pageSize, list]);


    function changePageSize(size) {
        setPageSize(parseInt(size));
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list();
    }

    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }


    const handleSelected = (selected) => {
        props.onSelectQuotation(selected); // Send to parent
        handleClose();
    };

    const customerSearchRef = useRef();
    const timerRef = useRef(null);


    const SalesUpdateFormRef = useRef();
    const [showUpdateOrderForm, setShowUpdateOrderForm] = useState(false);
    function openSalesUpdateForm(id) {
        setShowUpdateOrderForm(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            SalesUpdateFormRef.current.open(id);
        }, 100);
    }

    return (
        <>
            {showUpdateOrderForm && <OrderCreate ref={SalesUpdateFormRef} />}
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>{enableSelection && "Select Quotation"}</Modal.Title>
                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>

                    <>
                        <QuotationCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
                        <QuotationView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />
                        <div className="container-fluid p-0">
                            <div className="row">

                                <div className="col">
                                    <span className="text-end">
                                        <StatsSummary
                                            title="Quotation"
                                            stats={{
                                                "Quotation": totalQuotation,
                                                "Profit": profit,
                                                "Profit %": profit && totalQuotation ? (profit / totalQuotation) * 100 : "",
                                                "Loss": loss,
                                            }}
                                            onToggle={handleSummaryToggle}
                                        />
                                    </span>
                                    <span className="text-end">
                                        <StatsSummary
                                            title="Sales"
                                            stats={{
                                                "Sales": invoiceTotalSales,
                                                "Paid Sales": invoiceTotalPaidSales,
                                                "Cash Sales": invoiceTotalCashSales,
                                                "Bank Account Sales": invoiceTotalBankAccountSales,
                                                "Credit Sales": invoiceTotalUnPaidSales,
                                                "Sales Discount": invoiceTotalDiscount,
                                                "Cash Discount": invoiceTotalCashDiscount,
                                                "Shipping/Handling fees": invoiceTotalShippingHandlingFees,
                                                "VAT Collected": invoiceVatPrice,
                                                "Net Profit": invoiceNetProfit,
                                                "Net Profit %": invoiceNetProfit && invoiceTotalSales ? ((invoiceNetProfit / invoiceTotalSales) * 100) : "",
                                                "Net Loss": invoiceLoss,
                                            }}
                                            onToggle={handleSummaryToggle}
                                        />
                                    </span>

                                </div>

                            </div>

                            <div className="row">
                                <div className="col">
                                    <h1 className="h3">Quotations</h1>
                                </div>

                                <div className="col text-end">
                                    <Button
                                        hide={true.toString()}
                                        variant="primary"
                                        className="btn btn-primary mb-3"
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
                                        <div className="card-body">
                                            <div className="row">
                                                {totalItems === 0 && (
                                                    <div className="col">
                                                        <p className="text-start">No Quotations to display</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="row" style={{ border: "solid 0px" }}>
                                                <div className="col text-start" style={{ border: "solid 0px" }}>
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
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <i className="fa fa-refresh"></i>
                                                        )}
                                                        <span className="visually-hidden">Loading...</span>
                                                    </Button>
                                                </div>
                                                <div className="col text-center">
                                                    {isListLoading && (
                                                        <Spinner animation="grow" variant="primary" />
                                                    )}
                                                </div>
                                                <div className="col text-end">
                                                    {totalItems > 0 && (
                                                        <>
                                                            <label className="form-label">Size:&nbsp;</label>
                                                            <select
                                                                value={pageSize}
                                                                onChange={(e) => {
                                                                    changePageSize(e.target.value);
                                                                }}
                                                                className="form-control pull-right"
                                                                style={{
                                                                    border: "solid 1px",
                                                                    borderColor: "silver",
                                                                    width: "55px",
                                                                }}
                                                            >
                                                                <option value="5">
                                                                    5
                                                                </option>
                                                                <option value="10">
                                                                    10
                                                                </option>
                                                                <option value="20">20</option>
                                                                <option value="40">40</option>
                                                                <option value="50">50</option>
                                                                <option value="100">100</option>
                                                            </select>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <br />
                                            <div className="row">
                                                <div className="col" style={{ border: "solid 0px" }}>
                                                    {totalPages ? <ReactPaginate
                                                        breakLabel="..."
                                                        nextLabel="next >"
                                                        onPageChange={(event) => {
                                                            changePage(event.selected + 1);
                                                        }}
                                                        pageRangeDisplayed={5}
                                                        pageCount={totalPages}
                                                        previousLabel="< previous"
                                                        renderOnZeroPageCount={null}
                                                        className="pagination  flex-wrap"
                                                        pageClassName="page-item"
                                                        pageLinkClassName="page-link"
                                                        activeClassName="active"
                                                        previousClassName="page-item"
                                                        nextClassName="page-item"
                                                        previousLinkClassName="page-link"
                                                        nextLinkClassName="page-link"
                                                        forcePage={page - 1}
                                                    /> : ""}
                                                </div>
                                            </div>
                                            <div className="row">
                                                {totalItems > 0 && (
                                                    <>
                                                        <div className="col text-start">
                                                            <p className="text-start">
                                                                showing {offset + 1}-{offset + currentPageItemsCount} of{" "}
                                                                {totalItems}
                                                            </p>
                                                        </div>

                                                        <div className="col text-end">
                                                            <p className="text-end">
                                                                page {page} of {totalPages}
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="table-responsive" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}>
                                                <table className="table table-striped table-sm table-bordered">
                                                    <thead>
                                                        <tr className="text-center">
                                                            <th>Actions</th>
                                                            {enableSelection && <th>Select</th>}
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("code");
                                                                    }}
                                                                >
                                                                    ID
                                                                    {sortField === "code" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "code" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("date");
                                                                    }}
                                                                >
                                                                    Date
                                                                    {sortField === "date" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-down"></i>
                                                                    ) : null}
                                                                    {sortField === "date" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("customer_name");
                                                                    }}
                                                                >
                                                                    Customer
                                                                    {sortField === "customer_name" &&
                                                                        sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "customer_name" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("net_total");
                                                                    }}
                                                                >
                                                                    Net Total
                                                                    {sortField === "net_total" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "net_total" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("order_code");
                                                                    }}
                                                                >
                                                                    Sales ID
                                                                    {sortField === "order_code" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "order_code" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            {store.zatca?.phase === "2" && store.zatca?.connected ? <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("reported_to_zatca");
                                                                    }}
                                                                >
                                                                    Reported to Zatca
                                                                    {sortField === "reported_to_zatca" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "reported_to_zatca" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th> : ""}
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("type");
                                                                    }}
                                                                >
                                                                    Type
                                                                    {sortField === "type" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "type" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("total_payment_received");
                                                                    }}
                                                                >
                                                                    Amount Paid
                                                                    {sortField === "total_payment_received" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "total_payment_received" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>

                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("balance_amount");
                                                                    }}
                                                                >
                                                                    Credit Balance
                                                                    {sortField === "balance_amount" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "balance_amount" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("payment_status");
                                                                    }}
                                                                >
                                                                    Payment Status
                                                                    {sortField === "payment_status" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "payment_status" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("payment_methods");
                                                                    }}
                                                                >
                                                                    Payment Methods
                                                                    {sortField === "payment_methods" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "payment_methods" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>

                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("cash_discount");
                                                                    }}
                                                                >
                                                                    Cash Discount
                                                                    {sortField === "cash_discount" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "cash_discount" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("discount");
                                                                    }}
                                                                >
                                                                    Discount
                                                                    {sortField === "discount" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-numeric-down"></i>
                                                                    ) : null}
                                                                    {sortField === "discount" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-numeric-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            {localStorage.getItem("admin") === "true" ?
                                                                <th>
                                                                    <b
                                                                        style={{
                                                                            textDecoration: "underline",
                                                                            cursor: "pointer",
                                                                        }}
                                                                        onClick={() => {
                                                                            sort("profit");
                                                                        }}
                                                                    >
                                                                        Expected Profit
                                                                        {sortField === "profit" && sortOrder === "-" ? (
                                                                            <i className="bi bi-sort-numeric-down"></i>
                                                                        ) : null}
                                                                        {sortField === "profit" && sortOrder === "" ? (
                                                                            <i className="bi bi-sort-numeric-up"></i>
                                                                        ) : null}
                                                                    </b>
                                                                </th> : ""}
                                                            {localStorage.getItem("admin") === "true" ?
                                                                <th>
                                                                    <b
                                                                        style={{
                                                                            textDecoration: "underline",
                                                                            cursor: "pointer",
                                                                        }}
                                                                        onClick={() => {
                                                                            sort("loss");
                                                                        }}
                                                                    >
                                                                        Expected Loss
                                                                        {sortField === "loss" && sortOrder === "-" ? (
                                                                            <i className="bi bi-sort-numeric-down"></i>
                                                                        ) : null}
                                                                        {sortField === "loss" && sortOrder === "" ? (
                                                                            <i className="bi bi-sort-numeric-up"></i>
                                                                        ) : null}
                                                                    </b>
                                                                </th> : ""}
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("created_by");
                                                                    }}
                                                                >
                                                                    Created By
                                                                    {sortField === "created_by" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "created_by" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>

                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("status");
                                                                    }}
                                                                >
                                                                    Status
                                                                    {sortField === "status" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "status" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-alpha-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("created_at");
                                                                    }}
                                                                >
                                                                    Created At
                                                                    {sortField === "created_at" && sortOrder === "-" ? (
                                                                        <i className="bi bi-sort-down"></i>
                                                                    ) : null}
                                                                    {sortField === "created_at" && sortOrder === "" ? (
                                                                        <i className="bi bi-sort-up"></i>
                                                                    ) : null}
                                                                </b>
                                                            </th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>

                                                    <thead>
                                                        <tr className="text-center">
                                                            <th></th>
                                                            <th></th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="code"
                                                                    value={searchParams.code}
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("code", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>

                                                            <th>
                                                                <DatePicker
                                                                    id="date_str"
                                                                    value={dateValue}
                                                                    selected={selectedDate}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    onChange={(date) => {
                                                                        if (!date) {
                                                                            setDateValue("");
                                                                            searchByDateField("date_str", "");
                                                                            return;
                                                                        }
                                                                        searchByDateField("date_str", date);
                                                                    }}
                                                                />
                                                                <small
                                                                    style={{
                                                                        color: "blue",
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={(e) => setShowDateRange(!showDateRange)}
                                                                >
                                                                    {showDateRange ? "Less.." : "More.."}
                                                                </small>
                                                                <br />

                                                                {showDateRange ? (
                                                                    <span className="text-left">
                                                                        From:{" "}
                                                                        <DatePicker
                                                                            id="from_date"
                                                                            value={fromDateValue}
                                                                            selected={selectedDate}
                                                                            className="form-control"
                                                                            dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => {
                                                                                if (!date) {
                                                                                    setFromDateValue("");
                                                                                    searchByDateField("from_date", "");
                                                                                    return;
                                                                                }
                                                                                searchByDateField("from_date", date);
                                                                            }}
                                                                        />
                                                                        To:{" "}
                                                                        <DatePicker
                                                                            id="to_date"
                                                                            value={toDateValue}
                                                                            selected={selectedDate}
                                                                            className="form-control"
                                                                            dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => {
                                                                                if (!date) {
                                                                                    setToDateValue("");
                                                                                    searchByDateField("to_date", "");
                                                                                    return;
                                                                                }
                                                                                searchByDateField("to_date", date);
                                                                            }}
                                                                        />
                                                                    </span>
                                                                ) : null}
                                                            </th>
                                                            <th>
                                                                <Typeahead
                                                                    id="customer_id"
                                                                    labelKey="search_label"
                                                                    filterBy={['additional_keywords']}
                                                                    style={{ minWidth: "300px" }}
                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "customer_id",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={customerOptions}
                                                                    placeholder="Customer Name / Mob / VAT # / ID"
                                                                    selected={selectedCustomers}
                                                                    highlightOnlyResult={true}
                                                                    ref={customerSearchRef}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Escape") {
                                                                            setCustomerOptions([]);
                                                                            customerSearchRef.current?.clear();
                                                                        }
                                                                    }}
                                                                    onInputChange={(searchTerm, e) => {
                                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                                        timerRef.current = setTimeout(() => {
                                                                            suggestCustomers(searchTerm);
                                                                        }, 100);
                                                                    }}
                                                                    multiple
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="net_total"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("net_total", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="order_code"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("order_code", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            {store.zatca?.phase === "2" && store.zatca?.connected ? <th>
                                                                <select
                                                                    onChange={(e) => {
                                                                        searchByFieldValue("reported_to_zatca", e.target.value);
                                                                    }}
                                                                >
                                                                    <option value="" SELECTED>ALL</option>
                                                                    <option value="1">REPORTED</option>
                                                                    <option value="0">NOT REPORTED</option>
                                                                </select>
                                                            </th> : ""}
                                                            <th>
                                                                <select
                                                                    value={type}
                                                                    onChange={(e) => {
                                                                        type = e.target.value;
                                                                        setType(type);
                                                                        searchByFieldValue("type", e.target.value);

                                                                    }}
                                                                >
                                                                    <option value="" >All</option>
                                                                    <option value="quotation" >Quotation</option>
                                                                    <option value="invoice">Invoice</option>
                                                                </select>
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="sales_total_payment_received"
                                                                    name="sales_total_payment_received"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("total_payment_received", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="sales_balance_amount"
                                                                    name="sales_balance_amount"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("balance_amount", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <Typeahead
                                                                    id="payment_status"

                                                                    labelKey="name"
                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "payment_status",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={paymentStatusOptions}
                                                                    placeholder="Select Payment Status"
                                                                    selected={selectedPaymentStatusList}
                                                                    highlightOnlyResult={true}
                                                                    multiple
                                                                />
                                                            </th>
                                                            <th>
                                                                <Typeahead
                                                                    id="payment_methods"

                                                                    labelKey="name"
                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "payment_methods",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={paymentMethodOptions}
                                                                    placeholder="Select payment methods"
                                                                    selected={selectedPaymentMethodList}
                                                                    highlightOnlyResult={true}
                                                                    multiple
                                                                />
                                                            </th>

                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="sales_cash_discount"
                                                                    name="sales_cash_discount"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("cash_discount", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="sales_discount"
                                                                    name="sales_discount"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("discount", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            {localStorage.getItem("admin") === "true" ?
                                                                <th>
                                                                    <input
                                                                        type="text"
                                                                        id="profit"
                                                                        onChange={(e) =>
                                                                            searchByFieldValue("profit", e.target.value)
                                                                        }
                                                                        className="form-control"
                                                                    />
                                                                </th> : ""}
                                                            {localStorage.getItem("admin") === "true" ?
                                                                <th>
                                                                    <input
                                                                        type="text"
                                                                        id="loss"
                                                                        onChange={(e) =>
                                                                            searchByFieldValue("loss", e.target.value)
                                                                        }
                                                                        className="form-control"
                                                                    />
                                                                </th> : ""}
                                                            <th>
                                                                <Typeahead
                                                                    id="created_by"
                                                                    labelKey="name"

                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "created_by",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={userOptions}
                                                                    placeholder="Select Users"
                                                                    selected={selectedCreatedByUsers}
                                                                    highlightOnlyResult={true}
                                                                    onInputChange={(searchTerm, e) => {
                                                                        suggestUsers(searchTerm);
                                                                    }}
                                                                    multiple
                                                                />
                                                            </th>

                                                            <th>
                                                                <Typeahead
                                                                    id="status"
                                                                    labelKey="name"

                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "status",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={statusOptions}
                                                                    placeholder="Select Status"
                                                                    selected={selectedStatusList}
                                                                    highlightOnlyResult={true}
                                                                    multiple
                                                                />
                                                            </th>
                                                            <th>
                                                                <DatePicker
                                                                    id="created_at"
                                                                    value={createdAtValue}
                                                                    selected={selectedDate}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    onChange={(date) => {
                                                                        if (!date) {
                                                                            setCreatedAtValue("");
                                                                            searchByDateField("created_at", "");
                                                                            return;
                                                                        }
                                                                        searchByDateField("created_at", date);
                                                                    }}
                                                                />
                                                                <small
                                                                    style={{
                                                                        color: "blue",
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={(e) =>
                                                                        setShowCreatedAtDateRange(!showCreatedAtDateRange)
                                                                    }
                                                                >
                                                                    {showCreatedAtDateRange ? "Less.." : "More.."}
                                                                </small>
                                                                <br />

                                                                {showCreatedAtDateRange ? (
                                                                    <span className="text-left">
                                                                        From:{" "}
                                                                        <DatePicker
                                                                            id="created_at_from"
                                                                            value={createdAtFromValue}
                                                                            selected={selectedDate}
                                                                            className="form-control"
                                                                            dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => {
                                                                                if (!date) {
                                                                                    setCreatedAtFromValue("");
                                                                                    searchByDateField("created_at_from", "");
                                                                                    return;
                                                                                }
                                                                                searchByDateField("created_at_from", date);
                                                                            }}
                                                                        />
                                                                        To:{" "}
                                                                        <DatePicker
                                                                            id="created_at_to"
                                                                            value={createdAtToValue}
                                                                            selected={selectedDate}
                                                                            className="form-control"
                                                                            dateFormat="MMM dd yyyy"
                                                                            onChange={(date) => {
                                                                                if (!date) {
                                                                                    setCreatedAtToValue("");
                                                                                    searchByDateField("created_at_to", "");
                                                                                    return;
                                                                                }
                                                                                searchByDateField("created_at_to", date);
                                                                            }}
                                                                        />
                                                                    </span>
                                                                ) : null}
                                                            </th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>

                                                    <tbody className="text-center">
                                                        {quotationList &&
                                                            quotationList.map((quotation) => (
                                                                <tr key={quotation.code}>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        <Button className="btn btn-light btn-sm" onClick={() => {
                                                                            openUpdateForm(quotation.id);
                                                                        }}>
                                                                            <i className="bi bi-pencil"></i>
                                                                        </Button>

                                                                        <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                            openDetailsView(quotation.id);
                                                                        }}>
                                                                            <i className="bi bi-eye"></i>
                                                                        </Button>
                                                                    </td>
                                                                    {enableSelection && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <Button className="btn btn-success btn-sm" onClick={() => {
                                                                            handleSelected(quotation);
                                                                        }}>
                                                                            Select
                                                                        </Button>
                                                                    </td>}
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.code}</td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        {format(new Date(quotation.date), "MMM dd yyyy h:mma")}
                                                                    </td>
                                                                    <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        <OverflowTooltip value={quotation.customer_name} />
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} > <Amount amount={quotation.net_total} /> </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        {quotation.order_code && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                            openSalesUpdateForm(quotation.order_id);
                                                                        }}>{quotation.order_code}</span>}
                                                                    </td>
                                                                    {store.zatca?.phase === "2" && store.zatca?.connected ? <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {quotation.reported_to_zatca ? <span>&nbsp;<span className="badge bg-success">
                                                                            Reported
                                                                            {quotation.reported_to_zatca && quotation.reported_to_zatca_at ? <span>&nbsp;<TimeAgo date={quotation.reported_to_zatca_at} />&nbsp;</span> : ""}
                                                                            &nbsp;</span></span> : ""}
                                                                        {!quotation.reported_to_zatca ? <span className="badge bg-warning">
                                                                            Not Reported
                                                                            &nbsp;</span> : ""}
                                                                    </td> : ""}
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >  {quotation.type}</td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        <Amount amount={trimTo2Decimals(quotation.total_payment_received)} />
                                                                    </td>
                                                                    <td><Amount amount={trimTo2Decimals(quotation.balance_amount)} /></td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {quotation.payment_status === "paid" ?
                                                                            <span className="badge bg-success">
                                                                                Paid
                                                                            </span> : ""}
                                                                        {quotation.payment_status === "paid_partially" ?
                                                                            <span className="badge bg-warning">
                                                                                Paid Partially
                                                                            </span> : ""}
                                                                        {quotation.payment_status === "not_paid" ?
                                                                            <span className="badge bg-danger">
                                                                                Not Paid
                                                                            </span> : ""}
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>

                                                                        {quotation.payment_methods &&
                                                                            quotation.payment_methods.map((name) => (
                                                                                <span className="badge bg-info">{name}</span>
                                                                            ))}

                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} ><Amount amount={trimTo2Decimals(quotation.cash_discount)} /> </td>
                                                                    <td>{trimTo2Decimals(quotation.discount_with_vat)} </td>
                                                                    {localStorage.getItem("admin") === "true" ?
                                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.profit ? <Amount amount={trimTo2Decimals(quotation.profit)} /> : 0.00} </td>
                                                                        : ""}
                                                                    {localStorage.getItem("admin") === "true" ?
                                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.loss ? <Amount amount={trimTo2Decimals(quotation.loss)} /> : 0.00} </td>
                                                                        : ""}
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.created_by_name}</td>

                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        <span className="badge bg-success">
                                                                            {quotation.status}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        {format(
                                                                            new Date(quotation.created_at),
                                                                            "MMM dd yyyy h:mma"
                                                                        )}
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        <Button className="btn btn-light btn-sm" onClick={() => {
                                                                            openUpdateForm(quotation.id);
                                                                        }}>
                                                                            <i className="bi bi-pencil"></i>
                                                                        </Button>

                                                                        <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                            openDetailsView(quotation.id);
                                                                        }}>
                                                                            <i className="bi bi-eye"></i>
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {totalPages ? <ReactPaginate
                                                breakLabel="..."
                                                nextLabel="next >"
                                                onPageChange={(event) => {
                                                    changePage(event.selected + 1);
                                                }}
                                                pageRangeDisplayed={5}
                                                pageCount={totalPages}
                                                previousLabel="< previous"
                                                renderOnZeroPageCount={null}
                                                className="pagination  flex-wrap"
                                                pageClassName="page-item"
                                                pageLinkClassName="page-link"
                                                activeClassName="active"
                                                previousClassName="page-item"
                                                nextClassName="page-item"
                                                previousLinkClassName="page-link"
                                                nextLinkClassName="page-link"
                                                forcePage={page - 1}
                                            /> : ""}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default Quotations;

