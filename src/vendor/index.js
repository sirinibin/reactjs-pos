import React, { useState, useEffect, useRef } from "react";
import VendorCreate from "./create.js";
import VendorView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import PostingIndex from "./../posting/index.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";

function VendorIndex(props) {


    const selectedDate = new Date();

    //list
    const [vendorList, setVendorList] = useState([]);

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
    let [sortVendor, setSortVendor] = useState("-");

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
        } else if (field === "vendor_id") {
            setSelectedVendors(values);
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
            "select=id,code,name,credit_balance,account,phone,vat_no,created_by_name,created_at,stores";

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
            "/v1/vendor?" +
            Select +
            queryParams +
            "&sort=" +
            sortVendor +
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

                console.log("data.result:", data.result);
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setVendorList(data.result);

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
        sortVendor = sortVendor === "-" ? "" : "-";
        setSortVendor(sortVendor);
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
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }

    //Vendor Auto Suggestion
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");

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
        let result = await fetch(`/v1/vendor?${Select}${queryString}`, requestOptions);
        let data = await result.json();

        setVendorOptions(data.result);
    }

    const AccountBalanceSheetRef = useRef();
    function openBalanceSheetDialogue(account) {
        AccountBalanceSheetRef.current.open(account);
    }

    return (
        <>
            <PostingIndex ref={AccountBalanceSheetRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <VendorView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />


            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Vendors</h1>
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
                                            <p className="text-start">No Vendors to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bvendor: "solid 0px" }}>
                                    <div className="col text-start" style={{ bvendor: "solid 0px" }}>
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
                                                    animation="bvendor"
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
                                                        bvendor: "solid 1px",
                                                        bvendorColor: "silver",
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
                                    <div className="col" style={{ bvendor: "solid 0px" }}>
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
                                                        {sortField === "code" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortVendor === "" ? (
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
                                                        {sortField === "phone" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "phone" && sortVendor === "" ? (
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
                                                        {sortField === "vat_no" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "vat_no" && sortVendor === "" ? (
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
                                                        {sortField === "name" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "name" && sortVendor === "" ? (
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
                                                        {sortField === "credit_balance" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "credit_balance" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_count");
                                                        }}
                                                    >
                                                        Purchase count
                                                        {sortField === "stores.purchase_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_amount");
                                                        }}
                                                    >
                                                        Purchase amount
                                                        {sortField === "stores.purchase_amount" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_amount" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_paid_amount");
                                                        }}
                                                    >
                                                        Purchase paid amount
                                                        {sortField === "stores.purchase_paid_amount" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_paid_amount" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_balance_amount");
                                                        }}
                                                    >
                                                        Purchase balance amount
                                                        {sortField === "stores.purchase_balance_amount" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_balance_amount" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_retail_profit");
                                                        }}
                                                    >
                                                        Purchase expected retail profit
                                                        {sortField === "stores.purchase_retail_profit" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_retail_profit" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_retail_loss");
                                                        }}
                                                    >
                                                        Purchase expected retail loss
                                                        {sortField === "stores.purchase_retail_loss" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_retail_loss" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_wholesale_profit");
                                                        }}
                                                    >
                                                        Purchase expected wholesale profit
                                                        {sortField === "stores.purchase_wholesale_profit" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_wholesale_profit" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_wholesale_loss");
                                                        }}
                                                    >
                                                        Purchase expected wholesale loss
                                                        {sortField === "stores.purchase_wholesale_loss" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_wholesale_loss" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_paid_count");
                                                        }}
                                                    >
                                                        Purchase paid count
                                                        {sortField === "stores.purchase_paid_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_paid_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_not_paid_count");
                                                        }}
                                                    >
                                                        Purchase unpaid count
                                                        {sortField === "stores.purchase_not_paid_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_not_paid_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_paid_partially_count");
                                                        }}
                                                    >
                                                        Purchase paid partially count
                                                        {sortField === "stores.purchase_paid_partially_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_paid_partially_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_count");
                                                        }}
                                                    >
                                                        Purchase return count
                                                        {sortField === "stores.purchase_return_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_amount");
                                                        }}
                                                    >
                                                        Purchase return amount
                                                        {sortField === "stores.purchase_return_amount" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_amount" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_paid_amount");
                                                        }}
                                                    >
                                                        Purchase return paid amount
                                                        {sortField === "stores.purchase_return_paid_amount" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_paid_amount" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_balance_amount");
                                                        }}
                                                    >
                                                        Purchase return balance amount
                                                        {sortField === "stores.purchase_return_balance_amount" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_balance_amount" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_paid_count");
                                                        }}
                                                    >
                                                        Purchase return paid count
                                                        {sortField === "stores.purchase_return_paid_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_paid_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_not_paid_count");
                                                        }}
                                                    >
                                                        Purchase return unpaid count
                                                        {sortField === "stores.purchase_return_not_paid_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_not_paid_count" && sortVendor === "" ? (
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
                                                            sort("stores.purchase_return_paid_partially_count");
                                                        }}
                                                    >
                                                        Purchase return paid partially count
                                                        {sortField === "stores.purchase_return_paid_partially_count" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.purchase_return_paid_partially_count" && sortVendor === "" ? (
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
                                                        {sortField === "created_by_name" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by_name" && sortVendor === "" ? (
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
                                                        {sortField === "created_at" && sortVendor === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortVendor === "" ? (
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
                                                        style={{ minWidth: "300px" }}
                                                        id="vendor_id"
                                                        labelKey="search_label"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "vendor_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={vendorOptions}
                                                        placeholder="Vendor Name / Mob / VAT # / ID"
                                                        selected={selectedVendors}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestVendors(searchTerm);
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
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_paid_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_retail_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_retail_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_wholesale_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_wholesale_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_not_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_paid_partially_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_paid_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_not_paid_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_paid_partially_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
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
                                            {vendorList &&
                                                vendorList.map((vendor) => (
                                                    <tr key={vendor.id}>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >

                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(vendor.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(vendor.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{vendor.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{vendor.phone}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{vendor.vat_no}</td>
                                                        <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >

                                                            <OverflowTooltip value={vendor.name} />
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.account && <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(vendor.account);
                                                            }}>

                                                                <Amount amount={trimTo2Decimals(vendor.credit_balance)} />

                                                            </Button>}
                                                            {!vendor.account && <Amount amount={trimTo2Decimals(vendor.credit_balance)} />}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_paid_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_paid_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_balance_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_retail_profit?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_retail_profit?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_retail_loss?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_retail_loss?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_wholesale_profit?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_wholesale_profit?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_wholesale_loss?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_wholesale_loss?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_paid_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_not_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_not_paid_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_paid_partially_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_paid_partially_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_paid_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_paid_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_balance_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_paid_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_not_paid_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_not_paid_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {vendor.stores && Object.keys(vendor.stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && vendor.stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>{vendor.stores[key].purchase_return_paid_partially_count}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_return_paid_partially_count}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{vendor.created_by_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(vendor.created_at),
                                                                "MMM dd yyyy H:mma"
                                                            )}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >

                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(vendor.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(vendor.id);
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

export default VendorIndex;
