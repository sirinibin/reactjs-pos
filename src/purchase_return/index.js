import React, { useState, useEffect, useRef } from "react";
import PurchaseReturnCreate from "./create.js";
import PurchaseReturnView from "./view.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";

function PurchaseReturnIndex(props) {
    const cookies = new Cookies();

    //list
    const [purchasereturnList, setPurchaseReturnList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    const selectedDate = new Date();
    const [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    //Created At filter
    const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);
    const [createdAtValue, setCreatedAtValue] = useState("");
    const [createdAtFromValue, setCreatedAtFromValue] = useState("");
    const [createdAtToValue, setCreatedAtToValue] = useState("");

    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Vendor Auto Suggestion
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);

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

    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortOrder, setSortOrder] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");

        var params = {
            name: searchTerm,
        };
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

        let Select = "select=id,name";
        let result = await fetch(`/v1/vendor?${Select}${queryString}`, requestOptions);
        let data = await result.json();

        setVendorOptions(data.result);
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setVendorOptions([]);

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
                Authorization: cookies.get("access_token"),
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
        value = format(new Date(value), "MMM dd yyyy");

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
            setSelectedCreatedByUsers(values);
        } else if (field === "vendor_id") {
            setSelectedVendors(values);
        } else if (field === "status") {
            setSelectedStatusList(values);
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
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,code,purchase_code,purchase_id,date,net_total,created_by_name,vendor_name,status,created_at";
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        setIsListLoading(true);
        fetch(
            "/v1/purchase-return?" +
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
                setPurchaseReturnList(data.result);

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
        sortOrder = sortOrder === "-" ? "" : "-";
        setSortOrder(sortOrder);
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

    return (
        <>
            <PurchaseReturnCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <PurchaseReturnView ref={DetailsViewRef} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Purchase Returns</h1>
                    </div>

                    <div className="col text-end">
                        {/*
                        <Button
                            hide={true}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={openCreateForm}
                        >
                            <i className="bi bi-plus-lg"></i> Create
                        </Button>
                        */}
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
                                            <p className="text-start">No Purchase Returns to display</p>
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
                                                    <option value="5" selected>
                                                        5
                                                    </option>
                                                    <option value="10" selected>
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
                                        <ReactPaginate
                                            breakLabel="..."
                                            nextLabel="next >"
                                            onPageChange={(event) => {
                                                changePage(event.selected + 1);
                                            }}
                                            pageRangeDisplayed={5}
                                            pageCount={totalPages}
                                            previousLabel="< previous"
                                            renderOnZeroPageCount={null}
                                            className="pagination"
                                            pageClassName="page-item"
                                            pageLinkClassName="page-link"
                                            activeClassName="active"
                                            previousClassName="page-item"
                                            nextClassName="page-item"
                                            previousLinkClassName="page-link"
                                            nextLinkClassName="page-link"
                                            forcePage={page - 1}
                                        />
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
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("code");
                                                        }}
                                                    >
                                                        ID
                                                        {sortField === "code" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("purchase_code");
                                                        }}
                                                    >
                                                        Purchase ID
                                                        {sortField === "code" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("date");
                                                        }}
                                                    >
                                                        Date
                                                        {sortField === "date" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "date" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("net_total");
                                                        }}
                                                    >
                                                        Net Total
                                                        {sortField === "net_total" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-numeric-down"></i>
                                                        ) : null}
                                                        {sortField === "net_total" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-numeric-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("created_by");
                                                        }}
                                                    >
                                                        Created By
                                                        {sortField === "created_by" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("vendor_name");
                                                        }}
                                                    >
                                                        Vendor
                                                        {sortField === "vendor_name" &&
                                                            sortOrder === "-" ? (
                                                            <i class="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "vendor_name" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("status");
                                                        }}
                                                    >
                                                        Status
                                                        {sortField === "status" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "status" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>
                                                    <b
                                                        style={{
                                                            "text-decoration": "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("created_at");
                                                        }}
                                                    >
                                                        Created At
                                                        {sortField === "created_at" && sortOrder === "-" ? (
                                                            <i class="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortOrder === "" ? (
                                                            <i class="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
                                                <th>
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
                                                        id="purchase_code"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_code", e.target.value)
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
                                                            searchByDateField("date_str", date);
                                                        }}
                                                    />
                                                    <small
                                                        style={{
                                                            color: "blue",
                                                            "text-decoration": "underline",
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
                                                                    searchByDateField("to_date", date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
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
                                                        highlightOnlyResult="true"
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestUsers(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <Typeahead
                                                        id="vendor_id"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "vendor_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={vendorOptions}
                                                        placeholder="Select Vendor"
                                                        selected={selectedVendors}
                                                        highlightOnlyResult="true"
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestVendors(searchTerm);
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
                                                        highlightOnlyResult="true"
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
                                                            "text-decoration": "underline",
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
                                            {purchasereturnList &&
                                                purchasereturnList.map((purchasereturn) => (
                                                    <tr>
                                                        <td>{purchasereturn.code}</td>
                                                        <td>{purchasereturn.purchase_code}</td>
                                                        <td>
                                                            {format(new Date(purchasereturn.date), "MMM dd yyyy")}
                                                        </td>
                                                        <td>{purchasereturn.net_total} SAR</td>
                                                        <td>{purchasereturn.created_by_name}</td>
                                                        <td>{purchasereturn.vendor_name}</td>
                                                        <td>
                                                            <span className="badge bg-success">
                                                                {purchasereturn.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {format(
                                                                new Date(purchasereturn.created_at),
                                                                "MMM dd yyyy H:mma"
                                                            )}
                                                        </td>
                                                        <td>
                                                            {/*
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(purchasereturn.purchase_id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>
                                                        */}

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(purchasereturn.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>

                                                            {/*
                                                            <button
                                                                className="btn btn-default btn-sm"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                title="Download"
                                                            >
                                                                <i className="bi bi-download"></i>
                                                            </button>
                                                            

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

                                <ReactPaginate
                                    breakLabel="..."
                                    nextLabel="next >"
                                    onPageChange={(event) => {
                                        changePage(event.selected + 1);
                                    }}
                                    pageRangeDisplayed={5}
                                    pageCount={totalPages}
                                    previousLabel="< previous"
                                    renderOnZeroPageCount={null}
                                    className="pagination"
                                    pageClassName="page-item"
                                    pageLinkClassName="page-link"
                                    activeClassName="active"
                                    previousClassName="page-item"
                                    nextClassName="page-item"
                                    previousLinkClassName="page-link"
                                    nextLinkClassName="page-link"
                                    forcePage={page - 1}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default PurchaseReturnIndex;