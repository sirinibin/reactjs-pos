import React, { useState, useEffect, useRef } from "react";
import CustomerCreate from "./create.js";
import CustomerView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import PostingIndex from "./../posting/index.js";
import { confirm } from 'react-bootstrap-confirmation';

function CustomerIndex(props) {



    const selectedDate = new Date();

    //list
    const [customerList, setCustomerList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(20);
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

    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);


    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortCustomer, setSortCustomer] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");

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

        if (field === "created_at") {
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
            setSelectedCreatedByUsers(values);
        } else if (field === "customer_id") {
            setSelectedCustomers(values);
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

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,deleted,credit_balance,account,name,email,phone,vat_no,created_by_name,created_at,stores";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        setIsListLoading(true);
        fetch(
            "/v1/customer?" +
            Select +
            queryParams +
            "&sort=" +
            sortCustomer +
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
                setCustomerList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
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
        sortCustomer = sortCustomer === "-" ? "" : "-";
        setSortCustomer(sortCustomer);
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


    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
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

        let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(
            `/v1/customer?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
    }

    const AccountBalanceSheetRef = useRef();
    function openBalanceSheetDialogue(account) {
        AccountBalanceSheetRef.current.open(account);
    }



    function restoreCustomer(id) {
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
            "/v1/customer/restore/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Customer restored successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }


    function deleteCustomer(id) {
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
            "/v1/customer/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Customer deleted successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }

    const confirmDelete = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to delete this customer?');
        console.log(result);
        if (result) {
            deleteCustomer(id);
        }
    };

    const confirmRestore = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to restore this customer?');
        console.log(result);
        if (result) {
            restoreCustomer(id);
        }
    };

    let [deleted, setDeleted] = useState(false);
    const customerSearchRef = useRef();


    return (
        <>
            <PostingIndex ref={AccountBalanceSheetRef} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <CustomerView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Customers</h1>
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
                                            <p className="text-start">No Customers to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bcustomer: "solid 0px" }}>
                                    <div className="col text-start" style={{ bcustomer: "solid 0px" }}>
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
                                                    animation="bcustomer"
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
                                                        bcustomer: "solid 1px",
                                                        bcustomerColor: "silver",
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
                                    <div className="col" style={{ bcustomer: "solid 0px" }}>
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
                                                <th>Deleted</th>
                                                <th>Actions</th>
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
                                                        {sortField === "code" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortCustomer === "" ? (
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
                                                            sort("mob");
                                                        }}
                                                    >
                                                        Phone
                                                        {sortField === "phone" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "phone" && sortCustomer === "" ? (
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
                                                            sort("vat_no");
                                                        }}
                                                    >
                                                        VAT #
                                                        {sortField === "vat_no" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "vat_no" && sortCustomer === "" ? (
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
                                                        Name
                                                        {sortField === "name" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "name" && sortCustomer === "" ? (
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
                                                            sort("credit_balance");
                                                        }}
                                                    >
                                                        Credit balance
                                                        {sortField === "credit_balance" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "credit_balance" && sortCustomer === "" ? (
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
                                                            sort("email");
                                                        }}
                                                    >
                                                        Email
                                                        {sortField === "email" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "email" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_count");
                                                        }}
                                                    >
                                                        Sales count
                                                        {sortField === "stores.sales_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_amount");
                                                        }}
                                                    >
                                                        Total Sales amount
                                                        {sortField === "stores.sales_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_paid_amount");
                                                        }}
                                                    >
                                                        Sales paid amount
                                                        {sortField === "stores.sales_paid_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_paid_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_balance_amount");
                                                        }}
                                                    >
                                                        Sales Credit balance amount
                                                        {sortField === "stores.sales_balance_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_balance_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_profit");
                                                        }}
                                                    >
                                                        Sales profit
                                                        {sortField === "stores.sales_profit" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_profit" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_loss");
                                                        }}
                                                    >
                                                        Sales loss
                                                        {sortField === "stores.sales_loss" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_loss" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_paid_count");
                                                        }}
                                                    >
                                                        Sales paid count
                                                        {sortField === "stores.sales_paid_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_paid_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_not_paid_count");
                                                        }}
                                                    >
                                                        Sales unpaid count
                                                        {sortField === "stores.sales_not_paid_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_not_paid_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_paid_partially_count");
                                                        }}
                                                    >
                                                        Sales paid partially count
                                                        {sortField === "stores.sales_paid_partially_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_paid_partially_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_count");
                                                        }}
                                                    >
                                                        Sales return count
                                                        {sortField === "stores.sales_return_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_amount");
                                                        }}
                                                    >
                                                        Sales return amount
                                                        {sortField === "stores.sales_return_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_paid_amount");
                                                        }}
                                                    >
                                                        Sales return paid amount
                                                        {sortField === "stores.sales_return_paid_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_paid_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_balance_amount");
                                                        }}
                                                    >
                                                        Sales return Credit balance amount
                                                        {sortField === "stores.sales_return_balance_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_balance_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_profit");
                                                        }}
                                                    >
                                                        Sales return profit
                                                        {sortField === "stores.sales_return_profit" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_profit" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_loss");
                                                        }}
                                                    >
                                                        Sales return loss
                                                        {sortField === "stores.sales_return_loss" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_loss" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_paid_count");
                                                        }}
                                                    >
                                                        Sales return paid count
                                                        {sortField === "stores.sales_return_paid_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_paid_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_not_paid_count");
                                                        }}
                                                    >
                                                        Sales return unpaid count
                                                        {sortField === "stores.sales_return_not_paid_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_not_paid_count" && sortCustomer === "" ? (
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
                                                            sort("stores.sales_return_paid_partially_count");
                                                        }}
                                                    >
                                                        Sales return paid partially count
                                                        {sortField === "stores.sales_return_paid_partially_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.sales_return_paid_partially_count" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_count");
                                                        }}
                                                    >
                                                        Qtn. Invoice count
                                                        {sortField === "stores.quotation_invoice_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_count" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_amount");
                                                        }}
                                                    >
                                                        Total Qtn. Invoice amount
                                                        {sortField === "stores.quotation_invoice_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_paid_amount");
                                                        }}
                                                    >
                                                        Qtn. Invoice paid amount
                                                        {sortField === "stores.quotation_invoice_paid_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_paid_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_balance_amount");
                                                        }}
                                                    >
                                                        Qtn. Invoice Credit balance amount
                                                        {sortField === "stores.quotation_invoice_balance_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_balance_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_profit");
                                                        }}
                                                    >
                                                        Qtn. Invoice profit
                                                        {sortField === "stores.quotation_invoice_profit" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_profit" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_loss");
                                                        }}
                                                    >
                                                        Qtn. Invoice loss
                                                        {sortField === "stores.quotation_invoice_loss" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_loss" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_paid_count");
                                                        }}
                                                    >
                                                        Qtn. Invoice paid count
                                                        {sortField === "stores.quotation_invoice_paid_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_paid_count" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_not_paid_count");
                                                        }}
                                                    >
                                                        Qtn. Invoice unpaid count
                                                        {sortField === "stores.quotation_invoice_not_paid_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_not_paid_count" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_invoice_paid_partially_count");
                                                        }}
                                                    >
                                                        Qtn. Invoice paid partially count
                                                        {sortField === "stores.quotation_invoice_paid_partially_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_invoice_paid_partially_count" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_count");
                                                        }}
                                                    >
                                                        Quotation count
                                                        {sortField === "stores.quotation_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_count" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_amount");
                                                        }}
                                                    >
                                                        Quotation amount
                                                        {sortField === "stores.quotation_amount" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_amount" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_profit");
                                                        }}
                                                    >
                                                        Quotation profit
                                                        {sortField === "stores.quotation_profit" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_profit" && sortCustomer === "" ? (
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
                                                            sort("stores.quotation_loss");
                                                        }}
                                                    >
                                                        Quotation loss
                                                        {sortField === "stores.quotation_loss" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_loss" && sortCustomer === "" ? (
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
                                                            sort("stores.delivery_note_count");
                                                        }}
                                                    >
                                                        Delivery note count
                                                        {sortField === "stores.delivery_note_count" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.delivery_note_count" && sortCustomer === "" ? (
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
                                                            sort("created_by_name");
                                                        }}
                                                    >
                                                        Created By
                                                        {sortField === "created_by_name" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by_name" && sortCustomer === "" ? (
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
                                                        {sortField === "created_at" && sortCustomer === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortCustomer === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
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
                                                <th></th>
                                                <th >
                                                    <input
                                                        type="text"
                                                        id="code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("code", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="phone"
                                                        onChange={(e) =>
                                                            searchByFieldValue("phone", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="vat_no"
                                                        onChange={(e) =>
                                                            searchByFieldValue("vat_no", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <Typeahead
                                                        id="customer_id"
                                                        filterBy={() => true}
                                                        labelKey="search_label"
                                                        style={{ minWidth: "300px" }}
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "customer_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        ref={customerSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setCustomerOptions([]);
                                                                customerSearchRef.current?.clear();
                                                            }
                                                        }}
                                                        options={customerOptions}
                                                        placeholder="Customer Name / Mob / VAT # / ID"
                                                        selected={selectedCustomers}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestCustomers(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("credit_balance", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="email"
                                                        onChange={(e) =>
                                                            searchByFieldValue("email", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_paid_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_not_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_paid_partially_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_paid_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_not_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_paid_partially_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_paid_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_not_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_invoice_paid_partially_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>


                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("delivery_note_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <Typeahead
                                                        id="created_by"
                                                        labelKey="name"
                                                        filterBy={() => true}
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
                                                    <DatePicker
                                                        id="created_at"
                                                        value={createdAtValue}
                                                        selected={selectedDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
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
                                            {customerList &&
                                                customerList.map((customer) => (
                                                    <tr key={customer.id}>
                                                        <td>{customer.deleted ? "YES" : "NO"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {!customer.deleted && <><Button className="btn btn-danger btn-sm" onClick={() => {
                                                                confirmDelete(customer.id);
                                                            }}>
                                                                <i className="bi bi-trash"></i>
                                                            </Button>&nbsp;</>}
                                                            {customer.deleted && <><Button className="btn btn-success btn-sm" onClick={() => {
                                                                confirmRestore(customer.id);
                                                            }}>
                                                                <i className="bi bi-arrow-counterclockwise"></i>
                                                            </Button>&nbsp;</>}
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(customer.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(customer.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customer.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.phone}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.vat_no}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                            <OverflowTooltip value={customer.name} />
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.account && <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(customer.account);
                                                            }}>
                                                                <Amount amount={trimTo2Decimals(customer.credit_balance)} />

                                                            </Button>}
                                                            {!customer.account && <Amount amount={trimTo2Decimals(customer.credit_balance)} />}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.email}</td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_paid_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_paid_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_balance_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_profit?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_profit?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_loss?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_loss?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_paid_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_not_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_not_paid_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_paid_partially_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_paid_partially_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_paid_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_paid_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_balance_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_profit?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_profit?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_loss?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_loss?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_paid_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_not_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_not_paid_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].sales_return_paid_partially_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_return_paid_partially_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>


                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_paid_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_paid_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_balance_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_profit?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_profit?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_loss?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_loss?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_paid_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_not_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_not_paid_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_invoice_paid_partially_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_invoice_paid_partially_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_profit?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_profit?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].quotation_loss?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].quotation_loss?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {customer.stores && Object.keys(customer.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && customer.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{customer.stores[key].delivery_note_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].delivery_note_count}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.created_by_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(customer.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(customer.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(customer.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>

                                                            {/*
                                                        <button
                                                            className="btn btn-outline-secondary dropdown-toggle"
                                                            type="button"
                                                            data-bs-toggle="dropdown"
                                                            aria-expanded="false"
                                                        ></button>
                                                        <ul className="dropdown-menu">
                                                            <li>
                                                                <a href="/" className="dropdown-item">
                                                                    <i className="bi bi-download"></i>
                                                                    Download
                                                                </a>
                                                            </li>
                                                        </ul>
                                                       */}
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
    );
}

export default CustomerIndex;
