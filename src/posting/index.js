import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Badge, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import NumberFormat from "react-number-format";
import BalanceSheetPrintPreview from './printPreview.js';

const PostingIndex = forwardRef((props, ref) => {

    const cookies = new Cookies();

    let [selectedAccount, setSelectedAccount] = useState(null);
    let [showAccountBalanceSheet, setShowAccountBalanceSheet] = useState(false);
    function handleAccountBalanceSheetClose() {
        showAccountBalanceSheet = false;
        setShowAccountBalanceSheet(false);
        //list();
    }

    useImperativeHandle(ref, () => ({
        open(account) {
            showAccountBalanceSheet = true;
            setShowAccountBalanceSheet(true);
            selectedAccount = account;
            setSelectedAccount(selectedAccount);
            list();
        },
    }));

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
    const [postingList, setPostingList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(null);
    const [totalItems, setTotalItems] = useState();
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

    useEffect(() => {
        moveToLastPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages]);


    function moveToLastPage() {
        if (totalPages) {
            sortField = "posts.date"
            setSortField(sortField)
            sortPosting = ""
            setSortPosting(sortPosting)
            page = totalPages;
            setPage(page);
            list();
        }
    }


    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("posts.date");
    let [sortPosting, setSortPosting] = useState("-");

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

    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [selectedDebitAccounts, setSelectedDebitAccounts] = useState([]);
    const [selectedCreditAccounts, setSelectedCreditAccounts] = useState([]);

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByExpenses(values);
        } else if (field === "category_id") {
            setSelectedExpenseCategories(values);
        } else if (field === "account_id") {
            setSelectedAccounts(values);
        } else if (field === "debit_account_id") {
            setSelectedDebitAccounts(values);
        } else if (field === "credit_account_id") {
            setSelectedCreditAccounts(values);
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

    let [debitTotal, setDebitTotal] = useState(0.00);
    let [creditTotal, setCreditTotal] = useState(0.00);

    let [debitBalance, setDebitBalance] = useState(0.00);
    let [creditBalance, setCreditBalance] = useState(0.00);

    let [debitBalanceBoughtDown, setDebitBalanceBoughtDown] = useState(0.00);
    let [creditBalanceBoughtDown, setCreditBalanceBoughtDown] = useState(0.00);

    let [allPostings, setAllPostings] = useState([]);
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    async function GetAllPostings() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,date,store_id,account_id,account_name,account_number,reference_id,reference_model,reference_code,posts,debit_total_credit_total,created_at";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        if (selectedAccount) {
            searchParams.account_id = selectedAccount.id;
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        let size = 1000;

        let postings = [];
        var pageNo = 1;

        // makeSalesReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/posting?" +
                Select +
                queryParams +
                "&sort=" +
                sortPosting +
                sortField +
                "&page=" +
                pageNo +
                "&limit=" +
                size,
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

                    // setIsListLoading(false);
                    if (!data.result || data.result.length === 0) {
                        return [];
                    }


                    // console.log("Orders:", orders);

                    return data.result;


                })
                .catch((error) => {
                    console.log(error);
                    return [];
                    //break;

                });
            if (res.length === 0) {
                break;
            }
            postings = postings.concat(res);
            pageNo++;
        }

        allPostings = postings;
        setAllPostings(allPostings);

        console.log("allPostings:", allPostings);
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

    }

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,date,store_id,account_id,account_name,account_number,reference_id,reference_model,reference_code,posts,debit_total_credit_total,created_at";

        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }

        if (selectedAccount) {
            searchParams.account_id = selectedAccount.id;
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
            "/v1/posting?" +
            Select +
            queryParams +
            "&sort=" +
            sortPosting +
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
                setPostingList(data.result);
                selectedAccount.posts = data.result;

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                debitTotal = data.meta.debit_total;
                setDebitTotal(debitTotal);

                creditTotal = data.meta.credit_total;
                setCreditTotal(creditTotal);



                if (data.meta.debit_balance) {
                    debitBalance = data.meta.debit_balance;
                    setDebitBalance(debitBalance);
                } else {
                    debitBalance = 0.00;
                    setDebitBalance(0.00);
                }

                if (data.meta.debit_balance_bought_down) {
                    debitBalanceBoughtDown = data.meta.debit_balance_bought_down;
                    setDebitBalanceBoughtDown(debitBalanceBoughtDown);
                } else {
                    debitBalanceBoughtDown = 0.00;
                    setDebitBalanceBoughtDown(0.00);
                }

                if (data.meta.credit_balance_bought_down) {
                    creditBalanceBoughtDown = data.meta.credit_balance_bought_down;
                    setCreditBalanceBoughtDown(creditBalanceBoughtDown);
                } else {
                    creditBalanceBoughtDown = 0.00;
                    setCreditBalanceBoughtDown(0.00);
                }

                if (data.meta.credit_balance) {
                    creditBalance = data.meta.credit_balance;
                    setCreditBalance(creditBalance);
                } else {
                    creditBalance = 0.00;
                    setCreditBalance(0.00);
                }


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
        sortPosting = sortPosting === "-" ? "" : "-";
        setSortPosting(sortPosting);
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

    const [accountOptions, setAccountOptions] = useState([]);

    async function suggestAccounts(searchTerm) {
        console.log("Inside handle suggestAccounts");

        var params = {
            search: searchTerm,
        };

        if (cookies.get("store_id")) {
            params.store_id = cookies.get("store_id");
        }

        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = `&${queryString}`;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name,phone,number,search_label,open,balance,debit_total,credit_total";
        let result = await fetch(
            `/v1/account?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        setAccountOptions(data.result);
    }

    const PreviewRef = useRef();
    async function openPreview(account) {
        console.log("Opening account: ", account);
        await GetAllPostings();
        account.posts = allPostings;
        account.debitBalance = debitBalance;
        account.creditBalance = creditBalance;
        account.debitBalanceBoughtDown = debitBalanceBoughtDown;
        account.creditBalanceBoughtDown = creditBalanceBoughtDown;
        account.creditTotal = creditTotal;
        account.debitTotal = debitTotal;

        console.log(" account.posts", account.posts);
        console.log("opening")

        account.dateRangeStr="";

        account.dateValue=dateValue;
        account.fromDateValue=fromDateValue;
        account.toDateValue=toDateValue;
       

        /*
        if (dateValue) {
            account.dateRangeStr = "Date: " + format(new Date(dateValue), "MMM dd yyyy h:mma")
        } else if (fromDateValue && toDateValue) {
            account.dateRangeStr = "Date From: " + format(new Date(fromDateValue), "MMM dd yyyy h:mma") + " To:" + format(new Date(toDateValue), "MMM dd yyyy h:mma")
        } else if (fromDateValue) {
            account.dateRangeStr = "Date From: " + format(new Date(fromDateValue), "MMM dd yyyy h:mma")
        } else if (toDateValue) {
            account.dateRangeStr = "Date Upto: " + format(new Date(toDateValue), "MMM dd yyyy h:mma")
        }
        */

        PreviewRef.current.open(account);
    }


    return (
        <>
            <BalanceSheetPrintPreview ref={PreviewRef} />
            <Modal show={showAccountBalanceSheet} size="xl" onHide={handleAccountBalanceSheetClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Balance sheet of {selectedAccount?.name + " A/c (#" + selectedAccount?.number + ")"} </Modal.Title>

                    <div className="col align-self-end text-end">
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={() => {
                            openPreview(selectedAccount);
                        }} >
                            <i className="bi bi-display"></i> 
                            {fettingAllRecordsInProgress ? "Preparing.." : " Print Preview"}
                        </Button>

                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleAccountBalanceSheetClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>


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
                                <h1 className="h3">{/*Postings*/}</h1>
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
                                                    <p className="text-start">No postings to display</p>
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



                                                        {/*
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("account_name");
                                                        }}
                                                    >
                                                        Account
                                                        {sortField === "account_name" && sortPosting === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "account_name" && sortPosting === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                        */}
                                                        <th>
                                                            <b
                                                                style={{
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => {
                                                                    sort("posts.date");
                                                                }}
                                                            >
                                                                Date
                                                                {sortField === "posts.date" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-down"></i>
                                                                ) : null}
                                                                {sortField === "posts.date" && sortPosting === "" ? (
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
                                                                    sort("posts.debit");
                                                                }}
                                                            >
                                                                Debit
                                                                {sortField === "posts.debit" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "posts.debit" && sortPosting === "" ? (
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
                                                                    sort("posts.credit");
                                                                }}
                                                            >
                                                                Credit
                                                                {sortField === "posts.credit" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "posts.credit" && sortPosting === "" ? (
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
                                                                Type
                                                                {sortField === "reference_model" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "reference_model" && sortPosting === "" ? (
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
                                                                    sort("reference_code");
                                                                }}
                                                            >
                                                                ID
                                                                {sortField === "reference_code" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "reference_code" && sortPosting === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>


                                                        {/*
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
                                                        {sortField === "created_at" && sortPosting === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortPosting === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                        */}

                                                    </tr>
                                                </thead>

                                                <thead>
                                                    <tr className="text-center">

                                                        {/*
                                                <th style={{ minWidth: "250px" }}>
                                                    <Typeahead
                                                        id="account_id"
                                                        labelKey="search_label"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "account_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={accountOptions}
                                                        placeholder="Name / mob / acc no."
                                                        selected={selectedAccounts}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestAccounts(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                    */}

                                                        <th style={{ width: "80px" }}>
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
                                                                    selectedDate = date;
                                                                    setSelectedDate(date);
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
                                                                        selected={selectedFromDate}
                                                                        className="form-control"
                                                                        dateFormat="MMM dd yyyy"
                                                                        onChange={(date) => {
                                                                            if (!date) {
                                                                                setFromDateValue("");
                                                                                searchByDateField("from_date", "");
                                                                                return;
                                                                            }
                                                                            searchByDateField("from_date", date);
                                                                            selectedFromDate = date;
                                                                            setSelectedFromDate(date);
                                                                        }}
                                                                    />
                                                                    To:{" "}
                                                                    <DatePicker
                                                                        id="to_date"
                                                                        value={toDateValue}
                                                                        selected={selectedToDate}
                                                                        className="form-control"
                                                                        dateFormat="MMM dd yyyy"
                                                                        onChange={(date) => {
                                                                            if (!date) {
                                                                                setToDateValue("");
                                                                                searchByDateField("to_date", "");
                                                                                return;
                                                                            }
                                                                            searchByDateField("to_date", date);
                                                                            selectedToDate = date;
                                                                            setSelectedToDate(date);
                                                                        }}
                                                                    />
                                                                </span>
                                                            ) : null}
                                                        </th>


                                                        <th style={{ width: "130px" }}>
                                                            <Typeahead
                                                                id="account_id"
                                                                labelKey="search_label"
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "debit_account_id",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={accountOptions}
                                                                placeholder="Debit A/c name / acc no. / phone"
                                                                selected={selectedDebitAccounts}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm, e) => {
                                                                    suggestAccounts(searchTerm);
                                                                }}
                                                                multiple
                                                            />
                                                            <br />

                                                            <input
                                                                type="text"
                                                                id="debit"
                                                                placeholder="Debit amount"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("debit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th style={{ width: "130px" }}>
                                                            <Typeahead
                                                                id="account_id"
                                                                labelKey="search_label"
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "credit_account_id",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={accountOptions}
                                                                placeholder="Credit A/c name / acc no. / phone"
                                                                selected={selectedCreditAccounts}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm, e) => {
                                                                    suggestAccounts(searchTerm);
                                                                }}
                                                                multiple
                                                            />
                                                            <br />
                                                            <input
                                                                type="text"
                                                                id="credit"
                                                                placeholder="Credit amount"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("credit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th style={{ width: "80px" }}>
                                                            <select className="form-control" onChange={(e) =>
                                                                searchByFieldValue("reference_model", e.target.value)
                                                            }>
                                                                <option value="">All</option>
                                                                <option value="sales">Sales</option>
                                                                <option value="sales_return">Sales Return</option>
                                                                <option value="purchase">Purchase</option>
                                                                <option value="purchase_return">Purchase Return</option>
                                                                <option value="capital">Capital</option>
                                                                <option value="drawing">Drawing</option>
                                                                <option value="expense">Expense</option>
                                                                <option value="customer_deposit">Customer deposit</option>
                                                                <option value="customer_withdrawal">Customer withdrawl</option>
                                                            </select>

                                                        </th>
                                                        <th style={{ width: "80px" }}>
                                                            <input
                                                                type="text"
                                                                id="reference_code"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("reference_code", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        {/*
                                                <th style={{ minWidth: "150px" }}>
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
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                                            */}
                                                    </tr>
                                                </thead>

                                                <tbody className="text-center">
                                                    {selectedAccount && (debitBalanceBoughtDown > 0 || creditBalanceBoughtDown > 0) ? <tr>
                                                        <td></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{debitBalanceBoughtDown > 0 ? "To balance b/d " + debitBalanceBoughtDown : ""}</b></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{creditBalanceBoughtDown > 0 ? "By balance b/d " + creditBalanceBoughtDown : ""}</b></td>
                                                        <td colSpan={2}></td>
                                                    </tr> : ""}

                                                    {postingList &&
                                                        postingList.map((posting) => (
                                                            <tr key={posting.id}>


                                                                {/*
                                                          <td colSpan={4} style={{border:"solid 1px"}}>
                                                            <tr style={{border:"solid 1px"}}>
                                                            <td>1</td>
                                                            <td>2</td>
                                                            </tr>
                                                          </td>
                                                       */}

                                                                <td colSpan={3}>
                                                                    {posting.posts &&
                                                                        posting.posts.map((post, key) => (
                                                                            <tr key={key} style={{ border: "solid 1px" }}>
                                                                                <td style={{ border: "solid 1px", minWidth: "184px" }}>{format(new Date(post.date), "MMM dd yyyy h:mma")}</td>
                                                                                <td colSpan={2} style={{ border: "solid 0px" }}>
                                                                                    <td style={{ border: "solid 0px", borderRight: "solid 0px", paddingLeft: "5px" }}>
                                                                                        <td style={{ textAlign: "left", border: "solid 0px", minWidth: "162px" }}>
                                                                                            {post.debit_or_credit == "debit" ? "To " + post.account_name + " A/c #" + post.account_number + " Dr." : ""}
                                                                                        </td>
                                                                                        <td style={{ textAlign: "right", border: "solid 0px", minWidth: "140px" }}>
                                                                                            {post.debit ? post.debit : ""}
                                                                                        </td>
                                                                                    </td>
                                                                                    <td style={{ border: "solid 0px", paddingLeft: "5px", borderLeft: "solid 1px" }}>
                                                                                        <td style={{ textAlign: "left", border: "solid 0px", minWidth: "193px" }}>
                                                                                            {post.debit_or_credit == "credit" ? "By " + post.account_name + " A/c #" + post.account_number + "  Cr." : ""}
                                                                                        </td>
                                                                                        <td style={{ textAlign: "right", border: "solid 0px", minWidth: "105px" }}>
                                                                                            {post.credit ? post.credit : ""}
                                                                                        </td>
                                                                                    </td>
                                                                                </td>
                                                                                {/*
                                                                        <td colSpan={2} >
                                                                            <td style={{ border: "solid 1px", minWidth: "250px", maxWidth: "250px", textAlign: "left", paddingLeft: post.debit_or_credit == "debit" ? "10px" : "10px" }} >
                                                                                {post.debit_or_credit == "debit" ? "To " + post.account_name + " A/c  Dr." : ""}
                                                                            </td>
                                                                            <td style={{ border: "solid 1px", textAlign: "right", paddingLeft: "100px" }} >
                                                                                {post.debit ? post.debit : ""}
                                                                            </td>
                                                                        </td>
                                                                        <td colSpan={2} >
                                                                            <td style={{ border: "solid 1px", minWidth: "250px", maxWidth: "250px", textAlign: "left", paddingLeft: post.debit_or_credit == "credit" ? "10px" : "10px" }} >
                                                                                {post.debit_or_credit == "credit" ? "To " + post.account_name + " A/c  Dr." : ""}
                                                                            </td>
                                                                            <td style={{ border: "solid 1px", textAlign: "right", paddingLeft: "100px" }} >
                                                                                {post.credit ? post.credit : ""}
                                                                            </td>
                                                                        </td>
                                                                */}

                                                                            </tr>))}


                                                                </td>
                                                                <td style={{ minWidth: "155px", maxWidth: "155px" }} >{posting.reference_model}</td>
                                                                <td style={{ minWidth: "120px", maxWidth: "120px" }}>{posting.reference_code}</td>


                                                            </tr>
                                                        ))}
                                                    {selectedAccount && (debitBalance > 0 || creditBalance > 0) ? <tr>
                                                        <td></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{debitBalance > 0 ? "To balance c/d " + debitBalance : ""}</b></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{creditBalance > 0 ? "By balance c/d " + creditBalance : ""}</b></td>
                                                        <td colSpan={2}></td>
                                                    </tr> : ""}
                                                    {selectedAccount ? <tr>
                                                        <td></td>
                                                        <td style={{ textAlign: "right" }}><b>{creditTotal > debitTotal ? creditTotal : debitTotal}</b></td>
                                                        <td style={{ textAlign: "right" }}><b>{creditTotal > debitTotal ? creditTotal : debitTotal}</b></td>
                                                        <td colSpan={2}></td>
                                                    </tr> : ""}
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
                </Modal.Body>
            </Modal>
        </>
    );
});

export default PostingIndex;
