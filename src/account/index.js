import React, { useState, useEffect, useRef } from "react";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import PostingIndex from "./../posting/index.js";
import Amount from "../utils/amount.js";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { confirm } from 'react-bootstrap-confirmation';

function AccountIndex(props) {
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
            searchParams["from_date"] = "";
            searchParams["to_date"] = "";
            searchParams[field] = value;
        } else if (field === "from_date") {
            searchParams["date"] = "";
            searchParams[field] = value;
        } else if (field === "to_date") {
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



    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,store_id,name,name_arabic,deleted,type,phone,vat_no,number,search_label,open,balance,debit_total,credit_total,created_at,updated_at,reference_model,reference_id,debit_or_credit_balance";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
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

    const AccountBalanceSheetRef = useRef();

    function openBalanceSheetDialogue(account) {
        AccountBalanceSheetRef.current.open(account);
    }

    const timerRef = useRef(null);
    const accountNoSearchRef = useRef();
    const accountNameSearchRef = useRef();
    const debitBalanceSearchRef = useRef();
    const creditBalanceSearchRef = useRef();
    const phoneSearchRef = useRef();
    const vatSearchRef = useRef();
    const balanceSearchRef = useRef();

    //Delete option
    let [deleted, setDeleted] = useState(false);



    const confirmDelete = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to delete this account?');
        console.log(result);
        if (result) {
            deleteAccount(id);
        }
    };

    const confirmRestore = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to restore this account?');
        console.log(result);
        if (result) {
            restoreAccount(id);
        }
    };

    function restoreAccount(id) {
        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch(
            "/v1/account/restore/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Restored successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }


    function deleteAccount(id) {
        const requestOptions = {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch(
            "/v1/account/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Deleted successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }

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
                                <div className="table-responsive" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                <th>Actions</th>
                                                <th>Deleted</th>

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
                                                            sort("vat_no");
                                                        }}
                                                    >
                                                        VAT #
                                                        {sortField === "vat_no" && sortaccount === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "vat_no" && sortaccount === "" ? (
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
                                                <th></th>
                                                <th>
                                                    <select
                                                        onChange={(e) => {
                                                            searchByFieldValue("deleted", e.target.value);
                                                            if (e.target.value === "1") {
                                                                deleted = true;
                                                                setDeleted(deleted);
                                                            } else {
                                                                deleted = false;
                                                                setDeleted(deleted);
                                                            }
                                                        }}
                                                    >
                                                        <option value="0" >NO</option>
                                                        <option value="1">YES</option>
                                                    </select>
                                                </th>

                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="account_no"
                                                        name="account_no"
                                                        onChange={(e) =>
                                                            searchByFieldValue("number", e.target.value)
                                                        }

                                                        ref={accountNoSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    accountNoSearchRef.current.value = "";
                                                                    searchByFieldValue("number", "");
                                                                }, 100);
                                                            }
                                                        }}
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="name"
                                                        name="name"
                                                        onChange={(e) =>
                                                            searchByFieldValue("name", e.target.value)
                                                        }
                                                        className="form-control"
                                                        ref={accountNameSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    accountNameSearchRef.current.value = "";
                                                                    searchByFieldValue("name", "");
                                                                }, 100);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="debit_balance"
                                                        name="debit_balance"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                        ref={debitBalanceSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    debitBalanceSearchRef.current.value = "";
                                                                    searchByFieldValue("balance", "");
                                                                }, 100);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="credit_balance"
                                                        name="credit_balance"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                        ref={creditBalanceSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    creditBalanceSearchRef.current.value = "";
                                                                    searchByFieldValue("balance", "");
                                                                }, 100);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="account_phone"
                                                        name="account_phone"
                                                        onChange={(e) =>
                                                            searchByFieldValue("phone", e.target.value)
                                                        }
                                                        className="form-control"
                                                        ref={phoneSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    phoneSearchRef.current.value = "";
                                                                    searchByFieldValue("phone", "");
                                                                }, 100);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th style={{ width: "110px" }}>
                                                    <input
                                                        type="text"
                                                        id="account_vat_no"
                                                        name="account_vat_no"
                                                        onChange={(e) =>
                                                            searchByFieldValue("vat_no", e.target.value)
                                                        }
                                                        className="form-control"
                                                        ref={vatSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    vatSearchRef.current.value = "";
                                                                    searchByFieldValue("vat_no", "");
                                                                }, 100);
                                                            }
                                                        }}
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
                                                        id="account_balance"
                                                        name="account_balance"
                                                        onChange={(e) =>
                                                            searchByFieldValue("balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                        ref={balanceSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    balanceSearchRef.current.value = "";
                                                                    searchByFieldValue("balance", "");
                                                                }, 100);
                                                            }
                                                        }}
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
                                                        isClearable={true}
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
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    setUpdatedAtValue("");
                                                                    searchByDateField("updated_at", "");
                                                                }, 100);
                                                            }
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
                                                                isClearable={true}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtFromValue("");
                                                                        searchByDateField("updated_at_from", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_from", date);
                                                                    selectedUpdatedAtFromDate = date;
                                                                    setSelectedUpdatedAtFromDate(date);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (e.key === "Escape") {
                                                                        timerRef.current = setTimeout(() => {
                                                                            setUpdatedAtFromValue("");
                                                                            searchByDateField("updated_at_from", "");

                                                                        }, 100);
                                                                    }
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="updated_at_to"
                                                                value={updatedAtToValue}
                                                                selected={selectedUpdatedAtToDate}
                                                                isClearable={true}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setUpdatedAtToValue("");
                                                                        searchByDateField("updated_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("updated_at_to", date);
                                                                    selectedUpdatedAtToDate = date;
                                                                    setSelectedUpdatedAtToDate(date);
                                                                }}

                                                                onKeyDown={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (e.key === "Escape") {
                                                                        timerRef.current = setTimeout(() => {
                                                                            setUpdatedAtToValue("");
                                                                            searchByDateField("updated_at_to", "");

                                                                        }, 100);
                                                                    }
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
                                                        isClearable={true}
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
                                                        onKeyDown={(e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            if (e.key === "Escape") {
                                                                timerRef.current = setTimeout(() => {
                                                                    setCreatedAtValue("");
                                                                    searchByDateField("created_at", "");
                                                                }, 100);
                                                            }
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
                                                                isClearable={true}
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
                                                                onKeyDown={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (e.key === "Escape") {
                                                                        timerRef.current = setTimeout(() => {
                                                                            setCreatedAtFromValue("");
                                                                            searchByDateField("created_at_from", "");
                                                                        }, 100);
                                                                    }
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="created_at_to"
                                                                value={createdAtToValue}
                                                                selected={selectedCreatedAtToDate}
                                                                isClearable={true}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtToValue("");
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                    selectedCreatedAtToDate = date;
                                                                    setSelectedCreatedAtToDate(date);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    if (e.key === "Escape") {
                                                                        timerRef.current = setTimeout(() => {
                                                                            setCreatedAtToValue("");
                                                                            searchByDateField("created_at_to", "");
                                                                        }, 100);
                                                                    }
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
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {!account.deleted && <Button className="btn btn-danger btn-sm" onClick={() => {
                                                                confirmDelete(account.id);
                                                            }}>
                                                                <i className="bi bi-trash"></i>
                                                            </Button>}
                                                            {account.deleted && <Button className="btn btn-success btn-sm" onClick={() => {
                                                                confirmRestore(account.id);
                                                            }}>
                                                                <i className="bi bi-arrow-counterclockwise"></i>
                                                            </Button>}
                                                        </td>
                                                        <td>{account.deleted ? "YES" : "NO"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{account.number}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(account);
                                                            }}>
                                                                {(account.name && account.name_arabic) ? <OverflowTooltip value={account.name + " | " + account.name_arabic} /> : <OverflowTooltip value={account.name} />}

                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.debit_or_credit_balance === "debit_balance" ? <Amount amount={account.balance} /> : "0"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.debit_or_credit_balance === "credit_balance" ? <Amount amount={account.balance} /> : "0"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.phone}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.vat_no}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.type}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(account);
                                                            }}>

                                                                <Amount amount={account.balance} />
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.open ? "Open" : "Closed"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{account.reference_model}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(account.updated_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            {format(
                                                                new Date(account.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            <tr>
                                                <td colSpan={4}></td>
                                                <td><b>
                                                    <Amount amount={debitBalanceTotal} />
                                                </b></td>
                                                <td><b>
                                                    <Amount amount={creditBalanceTotal} />
                                                </b></td>
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
            <PostingIndex ref={AccountBalanceSheetRef} showToastMessage={props.showToastMessage} refreshAccountList={list} />
        </>
    );
}

export default AccountIndex;
