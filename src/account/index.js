import React, { useState, useEffect, useRef } from "react";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Badge, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import NumberFormat from "react-number-format";
import PostingIndex from "./../posting/index.js";

function AccountIndex(props) {

    const cookies = new Cookies();

    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    //const selectedDate = new Date();
    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());
    const [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    //list
    const [accountList, setaccountList] = useState([]);

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

    let [selectedCreatedAtDate, setSelectedCreatedAtDate] = useState(new Date());
    let [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(new Date());
    let [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(new Date());

    let [selectedUpdatedAtDate, setSelectedUpdatedAtDate] = useState(new Date());
    let [selectedUpdatedAtFromDate, setSelectedUpdatedAtFromDate] = useState(new Date());
    let [selectedUpdatedAtToDate, setSelectedUpdatedAtToDate] = useState(new Date());

    //Updated At filter
    const [showUpdatedAtDateRange, setShowUpdatedAtDateRange] = useState(false);
    const [updatedAtValue, setUpdatedAtValue] = useState("");
    const [updatedAtFromValue, setUpdatedAtFromValue] = useState("");
    const [updatedAtToValue, setUpdatedAtToValue] = useState("");

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Created By Expense Auto Suggestion
    const [expenseOptions, setExpenseOptions] = useState([]);
    const [selectedCreatedByExpenses, setSelectedCreatedByExpenses] = useState([]);

    //Created By Expense Auto Suggestion
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [selectedExpenseCategories, setSelectedExpenseCategories] = useState([]);


    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("updated_at");
    let [sortaccount, setSortaccount] = useState("-");

    let [debitBalanceTotal, setDebitBalanceTotal] = useState(0.00);
    let [creditBalanceTotal, setCreditBalanceTotal] = useState(0.00);

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;

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
        } else if (field === "updated_at") {
            setUpdatedAtValue(value);
            setUpdatedAtFromValue("");
            setUpdatedAtToValue("");
            searchParams["updated_at_from"] = "";
            searchParams["updated_at_to"] = "";
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

        if (field === "updated_at_from") {
            setUpdatedAtFromValue(value);
            setUpdatedAtValue("");
            searchParams["updated_at"] = "";
            searchParams[field] = value;
        } else if (field === "updated_at_to") {
            setUpdatedAtToValue(value);
            setUpdatedAtValue("");
            searchParams["updated_at"] = "";
            searchParams[field] = value;
        }

        page = 1;
        setPage(page);

        list();
    }

    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState({});

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByExpenses(values);
        } else if (field === "category_id") {
            setSelectedExpenseCategories(values);
        } else if (field === "account_id") {
            setSelectedAccounts(values);
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

    let [totalExpenses, setTotalExpenses] = useState(0.00);

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,name,type,phone,number,search_label,open,balance,debit_total,credit_total,created_at,updated_at,reference_model,debit_or_credit_balance";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        // console.log("queryParams:", queryParams);
        //queryParams = encodeURIComponent(queryParams);

        setIsListLoading(true);
        fetch(
            "/v1/account?" +
            Select +
            queryParams +
            "&sort=" +
            sortaccount +
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
                setaccountList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                debitBalanceTotal = data.meta.debit_balance_total;
                setDebitBalanceTotal(debitBalanceTotal);

                creditBalanceTotal = data.meta.credit_balance_total;
                setCreditBalanceTotal(creditBalanceTotal);



                //totalExpenses = data.meta.total;
                //setTotalExpenses(totalExpenses);

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
        sortaccount = sortaccount === "-" ? "" : "-";
        setSortaccount(sortaccount);
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

    let [showAccountBalanceSheet, setShowAccountBalanceSheet] = useState(false);

    function openBalanceSheetDialogue(account) {
        setSelectedAccount(account);
        showAccountBalanceSheet = true;
        setShowAccountBalanceSheet(true);
    }

    function handleAccountBalanceSheetClose() {
        showAccountBalanceSheet = false;
        setShowAccountBalanceSheet(false);
        //list();
    }
    const AccountBalanceSheetRef = useRef();

    return (
        <>
            {/*
            <div className="container-fluid p-0">
                <div className="row">
                    
                    <div className="col">
                        <h1 className="text-end">
                            Total: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalExpenses}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                    </div>

                </div>
            </div>
           */}

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Accounts & Trial balances</h1>
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
                                            <p className="text-start">No Accounts to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bexpense: "solid 0px" }}>
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
                                                    animation="bexpense"
                                                    size="sm"
                                                    role="status"
                                                    aria-hidden={true}
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
                                                        bexpense: "solid 1px",
                                                        bexpenseColor: "silver",
                                                        width: "55px",
                                                    }}
                                                >
                                                    <option value="5">
                                                        5
                                                    </option>
                                                    <option value="10" >
                                                        10
                                                    </option>
                                                    <option value="20">20</option>
                                                    <option value="40">40</option>
                                                    <option value="50">50</option>
                                                    <option value="100">100</option>
                                                    <option value="200">200</option>
                                                    <option value="300">300</option>
                                                    <option value="500">500</option>
                                                    <option value="1000">1000</option>
                                                    <option value="1500">1500</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <br />
                                <div className="row">
                                    <div className="col" style={{ bexpense: "solid 0px" }}>
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
                                <div className="table-responsive" style={{ overflowX: "auto" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">

                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("number");
                                                        }}
                                                    >
                                                        Account No.
                                                        {sortField === "number" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "number" && sortaccount === "" ? (
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
                                                            sort("name");
                                                        }}
                                                    >
                                                        Account Name
                                                        {sortField === "name" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "name" && sortaccount === "" ? (
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
                                                            sort("balance");
                                                        }}
                                                    >
                                                        Debit Balance
                                                        {sortField === "balance" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "balance" && sortaccount === "" ? (
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
                                                            sort("balance");
                                                        }}
                                                    >
                                                        Credit Balance
                                                        {sortField === "balance" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "balance" && sortaccount === "" ? (
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
                                                            sort("phone");
                                                        }}
                                                    >
                                                        Phone
                                                        {sortField === "phone" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "phone" && sortaccount === "" ? (
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
                                                            sort("type");
                                                        }}
                                                    >
                                                        Type
                                                        {sortField === "type" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "type" && sortaccount === "" ? (
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
                                                            sort("balance");
                                                        }}
                                                    >
                                                        Balance
                                                        {sortField === "balance" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "balance" && sortaccount === "" ? (
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
                                                            sort("open");
                                                        }}
                                                    >
                                                        Status
                                                        {sortField === "open" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "open" && sortaccount === "" ? (
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
                                                            sort("reference_model");
                                                        }}
                                                    >
                                                        Reference model
                                                        {sortField === "reference_model" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "reference_model" && sortaccount === "" ? (
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
                                                            sort("updated_at");
                                                        }}
                                                    >
                                                        Updated At
                                                        {sortField === "updated_at" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "updated_at" && sortaccount === "" ? (
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
                                                            sort("created_at");
                                                        }}
                                                    >
                                                        Created At
                                                        {sortField === "created_at" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortaccount === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>

                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="number"
                                                        onChange={(e) =>
                                                            searchByFieldValue("number", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="name"
                                                        onChange={(e) =>
                                                            searchByFieldValue("name", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="phone"
                                                        onChange={(e) =>
                                                            searchByFieldValue("phone", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <select onChange={(e) =>
                                                        searchByFieldValue("type", e.target.value)
                                                    }
                                                        className="form-control">
                                                        <option value="">All</option>
                                                        <option value="drawing">Drawing</option>
                                                        <option value="expense">Expense</option>
                                                        <option value="asset">Asset</option>
                                                        <option value="liability">Liability</option>
                                                        <option value="capital">Capital</option>
                                                        <option value="revenue">Revenue</option>
                                                    </select>
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="balance"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ minWidth: "130px" }}>
                                                    <select onChange={(e) =>
                                                        searchByFieldValue("open", e.target.value)
                                                    }
                                                        className="form-control">
                                                        <option value="">All</option>
                                                        <option value="1">Open</option>
                                                        <option value="0">Closed</option>
                                                    </select>
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <select onChange={(e) =>
                                                        searchByFieldValue("reference_model", e.target.value)
                                                    }
                                                        className="form-control">
                                                        <option value="">All</option>
                                                        <option value="customer">Customer</option>
                                                        <option value="vendor">Vendor</option>
                                                        <option value="investor">Investor</option>
                                                        <option value="withdrawer">Withdrawer</option>
                                                        <option value="expense_category">Expense Category</option>
                                                    </select>
                                                </th>

                                                <th style={{ minWidth: "150px" }}>
                                                    <DatePicker
                                                        id="updated_at"
                                                        value={updatedAtValue}
                                                        selected={selectedUpdatedAtDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setUpdatedAtValue("");
                                                                searchByDateField("updated_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("updated_at", date);
                                                            selectedUpdatedAtDate = date;
                                                            setSelectedUpdatedAtDate(date);
                                                        }}
                                                    />
                                                    <small
                                                        style={{
                                                            color: "blue",
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={(e) =>
                                                            setShowUpdatedAtDateRange(!showUpdatedAtDateRange)
                                                        }
                                                    >
                                                        {showUpdatedAtDateRange ? "Less.." : "More.."}
                                                    </small>
                                                    <br />

                                                    {showUpdatedAtDateRange ? (
                                                        <span className="text-left">
                                                            From:{" "}
                                                            <DatePicker
                                                                id="updated_at_from"
                                                                value={updatedAtFromValue}
                                                                selected={selectedUpdatedAtFromDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("updated_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_from", date);
                                                                    selectedUpdatedAtFromDate = date;
                                                                    setSelectedUpdatedAtFromDate(date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="updated_at_to"
                                                                value={updatedAtToValue}
                                                                selected={selectedUpdatedAtToDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtFromValue("");
                                                                        searchByDateField("updated_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_to", date);
                                                                    selectedUpdatedAtToDate = date;
                                                                    setSelectedUpdatedAtToDate(date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>

                                                <th style={{ minWidth: "150px" }}>
                                                    <DatePicker
                                                        id="created_at"
                                                        value={createdAtValue}
                                                        selected={selectedCreatedAtDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setCreatedAtValue("");
                                                                searchByDateField("created_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("created_at", date);
                                                            selectedCreatedAtDate = date;
                                                            setSelectedCreatedAtDate(date);
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
                                                                selected={selectedCreatedAtFromDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("created_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_from", date);
                                                                    selectedCreatedAtFromDate = date;
                                                                    setSelectedCreatedAtFromDate(date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="created_at_to"
                                                                value={createdAtToValue}
                                                                selected={selectedCreatedAtToDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                    selectedCreatedAtToDate = date;
                                                                    setSelectedCreatedAtToDate(date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {accountList &&
                                                accountList.map((account) => (
                                                    <tr key={account.id}>
                                                        <td style={{ minWidth: "155px", maxWidth: "155px" }} >{account.number}</td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>
                                                            <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(account);
                                                            }}>
                                                                {account.name}
                                                            </Button>
                                                        </td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>{account.debit_or_credit_balance == "debit_balance" ? account.balance : "0"}</td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>{account.debit_or_credit_balance == "credit_balance" ? account.balance : "0"}</td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>{account.phone}</td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>{account.type}</td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>
                                                            <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(account);
                                                            }}>
                                                                {account.balance}
                                                            </Button>
                                                        </td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>{account.open ? "Open" : "Closed"}</td>
                                                        <td style={{ minWidth: "120px", maxWidth: "120px" }}>{account.reference_model}</td>
                                                        <td>
                                                            {format(
                                                                new Date(account.updated_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {format(
                                                                new Date(account.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            <tr>
                                                <td colSpan={2}></td>
                                                <td><b>{debitBalanceTotal}</b></td>
                                                <td><b>{creditBalanceTotal}</b></td>
                                                <td colSpan={7}></td>
                                            </tr>
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

            <Modal show={showAccountBalanceSheet} size="xl" onHide={handleAccountBalanceSheetClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Balance sheet of {selectedAccount.name + " A/c (#" + selectedAccount.number + ")"} </Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleAccountBalanceSheetClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <PostingIndex ref={AccountBalanceSheetRef} showToastMessage={props.showToastMessage} account={selectedAccount} refreshAccountList={list} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default AccountIndex;
