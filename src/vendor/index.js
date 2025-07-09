import React, { useState, useEffect, useRef, useMemo } from "react";
import VendorCreate from "./create.js";
import VendorView from "./view.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import PostingIndex from "./../posting/index.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { confirm } from 'react-bootstrap-confirmation';

function VendorIndex(props) {
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
        getStore(localStorage.getItem("store_id"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

                store = data.result;
                setStore(store);
            })
            .catch(error => {

            });
    }

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
            "select=id,code,credit_limit,email,deleted,name,credit_balance,account,phone,vat_no,created_by_name,created_at,stores";

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

        let Select = "select=id,additional_keywords,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(`/v1/vendor?${Select}${queryString}`, requestOptions);
        let data = await result.json();

        setVendorOptions(data.result);
    }

    const AccountBalanceSheetRef = useRef();
    function openBalanceSheetDialogue(account) {
        AccountBalanceSheetRef.current.open(account);
    }


    function restoreVendor(id) {
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
            "/v1/vendor/restore/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Vendor restored successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }


    function deleteVendor(id) {
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
            "/v1/vendor/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Vendor deleted successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }

    const confirmDelete = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to delete this vendor?');
        console.log(result);
        if (result) {
            deleteVendor(id);
        }
    };

    const confirmRestore = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to restore this vendor?');
        console.log(result);
        if (result) {
            restoreVendor(id);
        }
    };

    let [deleted, setDeleted] = useState(false);

    const vendorSearchRef = useRef();
    const timerRef = useRef(null);

    let [ignoreZeroCreditBalance, setIgnoreZeroCreditBalance] = useState(false);


    //Table settings
    const defaultColumns = useMemo(() => [
        { key: "deleted", label: "Deleted", fieldName: "deleted", visible: true },
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "code", label: "ID", fieldName: "code", visible: true },
        { key: "name", label: "Name", fieldName: "name", visible: true },
        { key: "purchase_amount", label: "Total Purchase Amount", fieldName: "stores.purchase_amount", visible: true },
        { key: "purchase_paid_amount", label: "Purchase Paid Amount", fieldName: "stores.purchase_paid_amount", visible: true },
        { key: "credit_balance", label: "Credit Balance", fieldName: "credit_balance", visible: true },
        { key: "credit_limit", label: "Credit Limit", fieldName: "credit_limit", visible: true },
        { key: "purchase_count", label: "Purchase Count", fieldName: "stores.purchase_count", visible: true },
        { key: "purchase_balance_amount", label: "Purchase Credit Balance Amount", fieldName: "stores.purchase_balance_amount", visible: true },
        { key: "phone", label: "Phone", fieldName: "phone", visible: true },
        { key: "email", label: "Email", fieldName: "email", visible: true },
        { key: "vat_no", label: "Vat No.", fieldName: "vat_no", visible: true },
        { key: "purchase_paid_count", label: "Purchase Paid Count", fieldName: "stores.purchase_paid_count", visible: true },
        { key: "purchase_not_paid_count", label: "Purchase Unpaid Count", fieldName: "stores.purchase_not_paid_count", visible: true },
        { key: "purchase_paid_partially_count", label: "Purchase Paid Partially Count", fieldName: "stores.purchase_paid_partially_count", visible: true },
        { key: "purchase_return_count", label: "Purchase Return Count", fieldName: "stores.purchase_return_count", visible: true },
        { key: "purchase_return_amount", label: "Purchase Return Amount", fieldName: "stores.purchase_return_amount", visible: true },
        { key: "purchase_return_paid_amount", label: "Purchase Return Paid Amount", fieldName: "stores.purchase_return_paid_amount", visible: true },
        { key: "purchase_return_balance_amount", label: "Purchase Return Credit Balance Amount", fieldName: "stores.purchase_return_balance_amount", visible: true },
        { key: "purchase_return_paid_count", label: "Purchase Return Paid Count", fieldName: "stores.purchase_return_paid_count", visible: true },
        { key: "purchase_return_not_paid_count", label: "Purchase Return Unpaid Count", fieldName: "stores.purchase_return_not_paid_count", visible: true },
        { key: "purchase_return_paid_partially_count", label: "Purchase Return Paid Partially Count", fieldName: "stores.purchase_return_paid_partially_count", visible: true },
        { key: "created_by_name", label: "Created By", fieldName: "created_by", visible: true },
        { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
        { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
    ], []);


    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);
    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("vendor_table_settings");
        if (saved) setColumns(JSON.parse(saved));

        let missingOrUpdated = false;
        for (let i = 0; i < defaultColumns.length; i++) {
            if (!saved)
                break;

            const savedCol = JSON.parse(saved)?.find(col => col.fieldName === defaultColumns[i].fieldName);

            missingOrUpdated = !savedCol || savedCol.label !== defaultColumns[i].label || savedCol.key !== defaultColumns[i].key;

            if (missingOrUpdated) {
                break
            }
        }

        /*
        for (let i = 0; i < saved.length; i++) {
            const savedCol = defaultColumns.find(col => col.fieldName === saved[i].fieldName);
 
            missingOrUpdated = !savedCol || savedCol.label !== saved[i].label || savedCol.key !== saved[i].key;
 
            if (missingOrUpdated) {
                break
            }
        }*/

        if (missingOrUpdated) {
            localStorage.setItem("vendor_table_settings", JSON.stringify(defaultColumns));
            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns]);

    function RestoreDefaultSettings() {
        localStorage.setItem("vendor_table_settings", JSON.stringify(defaultColumns));
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    // Save column settings to localStorage
    useEffect(() => {
        localStorage.setItem("vendor_table_settings", JSON.stringify(columns));
    }, [columns]);

    const handleToggleColumn = (index) => {
        const updated = [...columns];
        updated[index].visible = !updated[index].visible;
        setColumns(updated);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(columns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setColumns(reordered);
    };

    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    let [selectedCreatedAtDate, setSelectedCreatedAtDate] = useState(new Date());
    let [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(new Date());
    let [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(new Date());

    return (
        <>

            {/* ⚙️ Settings Modal */}
            <Modal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i
                            className="bi bi-gear-fill"
                            style={{ fontSize: "1.2rem", marginRight: "4px" }}
                            title="Table Settings"

                        />
                        Vendor Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Column Settings */}
                    {showSettings && (
                        <>
                            <h6 className="mb-2">Customize Columns</h6>
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="columns">
                                    {(provided) => (
                                        <ul
                                            className="list-group"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {columns.map((col, index) => (
                                                <Draggable
                                                    key={col.key}
                                                    draggableId={col.key}
                                                    index={index}
                                                >
                                                    {(provided) => (
                                                        <li
                                                            className="list-group-item d-flex justify-content-between align-items-center"
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}                                                        >
                                                            <div>
                                                                <input
                                                                    style={{ width: "20px", height: "20px" }}
                                                                    type="checkbox"
                                                                    className="form-check-input me-2"
                                                                    checked={col.visible}
                                                                    onChange={() => {
                                                                        handleToggleColumn(index);
                                                                    }}
                                                                />
                                                                {col.label}
                                                            </div>
                                                            <span style={{ cursor: "grab" }}>☰</span>
                                                        </li>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSettings(false)}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            RestoreDefaultSettings();
                            // Save to localStorage here if needed
                            //setShowSettings(false);
                        }}
                    >
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>
            <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Success</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="success">
                        {successMessage}
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSuccess(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

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
                                    <div className="col text-end">
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => {
                                                setShowSettings(!showSettings);
                                            }}
                                        >
                                            <i
                                                className="bi bi-gear-fill"
                                                style={{ fontSize: "1.2rem" }}
                                                title="Table Settings"
                                            />
                                        </button>
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
                                <div className="row">
                                    <div className="col text-start">
                                        <p className="text-start">
                                            <span style={{ marginLeft: "10px" }}>
                                                <input type="checkbox"
                                                    value={ignoreZeroCreditBalance}
                                                    checked={ignoreZeroCreditBalance}
                                                    onChange={(e) => {
                                                        ignoreZeroCreditBalance = !ignoreZeroCreditBalance;
                                                        setIgnoreZeroCreditBalance(ignoreZeroCreditBalance);
                                                        searchByFieldValue("ignore_zero_credit_balance", ignoreZeroCreditBalance)
                                                    }}
                                                    className=""
                                                    id="ignoreOpeningBalance"

                                                /> &nbsp;Ignore Zero Credit Balance
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="table-responsive" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {(col.key === "deleted" || col.key === "actions") && <th key={col.key}>{col.label}</th>}
                                                        {col.key !== "actions" && col.key !== "deleted" && <th>
                                                            <b
                                                                style={{
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => {
                                                                    sort(col.fieldName);
                                                                }}
                                                            >
                                                                {col.label}
                                                                {sortField === col.fieldName && sortVendor === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === col.fieldName && sortVendor === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>}
                                                    </>);
                                                })}

                                                {/*<th>Deleted</th>
                                                <th>Actions</th>
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
                                                            sort("stores.purchase_amount");
                                                        }}
                                                    >
                                                        Total Purchase amount
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
                                                <th>Actions</th>*/}
                                            </tr>
                                        </thead>

                                        <thead>
                                            <tr className="text-center">
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {(col.key === "deleted") && <th>
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
                                                        </th>}
                                                        {(col.key === "actions" || col.key === "actions_end") && <th></th>}
                                                        {(col.key === "name") && <th>
                                                            <Typeahead
                                                                style={{ minWidth: "300px" }}
                                                                id="vendor_id"
                                                                filterBy={['additional_keywords']}
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
                                                                ref={vendorSearchRef}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Escape") {
                                                                        setVendorOptions([]);
                                                                        vendorSearchRef.current?.clear();
                                                                    }
                                                                }}
                                                                onInputChange={(searchTerm, e) => {
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    timerRef.current = setTimeout(() => {
                                                                        suggestVendors(searchTerm);
                                                                    }, 100);
                                                                }}
                                                                multiple
                                                            />
                                                        </th>}
                                                        {(col.key === "code" ||
                                                            col.key === "purchase_amount" ||
                                                            col.key === "purchase_paid_amount" ||
                                                            col.key === "credit_balance" ||
                                                            col.key === "credit_limit" ||
                                                            col.key === "purchase_count" ||
                                                            col.key === "purchase_balance_amount" ||
                                                            col.key === "phone" ||
                                                            col.key === "email" ||
                                                            col.key === "vat_no" ||
                                                            col.key === "purchase_paid_count" ||
                                                            col.key === "purchase_not_paid_count" ||
                                                            col.key === "purchase_paid_partially_count" ||
                                                            col.key === "purchase_return_count" ||
                                                            col.key === "purchase_return_amount" ||
                                                            col.key === "purchase_return_paid_amount" ||
                                                            col.key === "purchase_return_balance_amount" ||
                                                            col.key === "purchase_return_paid_count" ||
                                                            col.key === "purchase_return_not_paid_count" ||
                                                            col.key === "purchase_return_paid_partially_count"
                                                        ) &&
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id={`vendor_search_by_${col.key}`}
                                                                    name={`vendor_search_by_${col.key}`}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (typeof value === "number") {
                                                                            searchByFieldValue(col.key, parseFloat(e.target.value))
                                                                        } else if (typeof value === "string") {
                                                                            searchByFieldValue(col.key, e.target.value)
                                                                        }
                                                                    }}
                                                                    className="form-control"
                                                                />
                                                            </th>}
                                                        {col.key === "created_by_name" && <th>
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
                                                        </th>}
                                                        {col.key === "created_at" && <th>
                                                            <DatePicker
                                                                id="created_at"
                                                                value={createdAtValue}
                                                                selected={selectedCreatedAtDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        //  createdAtValue = "";
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
                                                                        isClearable={true}
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
                                                                        isClearable={true}
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
                                                                    />
                                                                </span>
                                                            ) : null}
                                                        </th>}
                                                    </>);
                                                })}

                                                {/*<th>
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
                                                <th>
                                                    <Typeahead
                                                        style={{ minWidth: "300px" }}
                                                        id="vendor_id"
                                                        filterBy={['additional_keywords']}
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
                                                        ref={vendorSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setVendorOptions([]);
                                                                vendorSearchRef.current?.clear();
                                                            }
                                                        }}
                                                        onInputChange={(searchTerm, e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                suggestVendors(searchTerm);
                                                            }, 100);
                                                        }}
                                                        multiple
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
                                                            searchByFieldValue("purchase_balance_amount", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

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
                                                <th></th>*/}
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {vendorList &&
                                                vendorList.map((vendor) => (
                                                    <tr key={vendor.id}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "deleted") && <td>{vendor.deleted ? "YES" : "NO"}</td>}
                                                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                    {!vendor.deleted && <><Button className="btn btn-danger btn-sm" onClick={() => {
                                                                        confirmDelete(vendor.id);
                                                                    }}>
                                                                        <i className="bi bi-trash"></i>
                                                                    </Button>&nbsp;</>}
                                                                    {vendor.deleted && <><Button className="btn btn-success btn-sm" onClick={() => {
                                                                        confirmRestore(vendor.id);
                                                                    }}>
                                                                        <i className="bi bi-arrow-counterclockwise"></i>
                                                                    </Button>&nbsp;</>}
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
                                                                </td>}
                                                                {(col.key === "name") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                    <OverflowTooltip value={vendor.name} />
                                                                </td>}
                                                                {(col.key === "credit_balance") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                    {vendor.account && <Button variant="link" onClick={() => {
                                                                        openBalanceSheetDialogue(vendor.account);
                                                                    }}>
                                                                        <Amount amount={trimTo2Decimals(vendor.credit_balance)} />

                                                                    </Button>}
                                                                    {!vendor.account && <Amount amount={trimTo2Decimals(vendor.credit_balance)} />}
                                                                </td>}
                                                                {(col.key === "code" ||
                                                                    col.key === "purchase_amount" ||
                                                                    col.key === "purchase_paid_amount" ||
                                                                    col.key === "credit_limit" ||
                                                                    col.key === "purchase_count" ||
                                                                    col.key === "purchase_balance_amount" ||
                                                                    col.key === "phone" ||
                                                                    col.key === "vat_no" ||
                                                                    col.key === "purchase_paid_count" ||
                                                                    col.key === "purchase_not_paid_count" ||
                                                                    col.key === "email" ||
                                                                    col.key === "purchase_paid_partially_count" ||
                                                                    col.key === "purchase_return_count" ||
                                                                    col.key === "purchase_return_amount" ||
                                                                    col.key === "purchase_return_paid_amount" ||
                                                                    col.key === "purchase_return_balance_amount" ||
                                                                    col.key === "purchase_return_profit" ||
                                                                    col.key === "purchase_return_loss" ||
                                                                    col.key === "purchase_return_paid_count" ||
                                                                    col.key === "purchase_return_not_paid_count" ||
                                                                    col.key === "purchase_return_paid_partially_count" ||
                                                                    col.key === "delivery_note_count" ||
                                                                    col.key === "created_by_name"
                                                                ) &&
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        {vendor[col.key] && typeof vendor[col.key] === "number" ?
                                                                            <Amount amount={trimTo2Decimals(vendor[col.key])} /> : vendor[col.key]
                                                                        }
                                                                        {vendor.stores && vendor.stores[localStorage.getItem("store_id")][col.key] && <>
                                                                            {typeof vendor.stores[localStorage.getItem("store_id")][col.key] === "number" ?
                                                                                <Amount amount={trimTo2Decimals(vendor.stores[localStorage.getItem("store_id")][col.key])} /> : vendor.stores[localStorage.getItem("store_id")][col.key]
                                                                            }
                                                                        </>}

                                                                        {/*
                                                                                                                              
                                                                                                                                {customer.stores && customer.stores[localStorage.getItem("store_id")][col.key] && typeof customer.stores[localStorage.getItem("store_id")][col.key] === "string" &&
                                                                                                                                    customer.stores[localStorage.getItem("store_id")][col.key] + "str2"
                                                                                                                                }
                                                        
                                                                                                                              
                                                        
                                                                                                                                {customer[col.key] && typeof customer[col.key] === "number" &&
                                                                                                                                    <Amount amount={trimTo2Decimals(customer[col.key])} /> + "-N"
                                                                                                                                }
                                                                                                                                    */}
                                                                    </td>}

                                                                {col.key === "created_at" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {format(
                                                                        new Date(vendor.created_at),
                                                                        "MMM dd yyyy h:mma"
                                                                    )}
                                                                </td>}
                                                            </>);
                                                        })}

                                                        {/*<td>{vendor.deleted ? "YES" : "NO"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {!vendor.deleted && <><Button className="btn btn-danger btn-sm" onClick={() => {
                                                                confirmDelete(vendor.id);
                                                            }}>
                                                                <i className="bi bi-trash"></i>
                                                            </Button>&nbsp;</>}
                                                            {vendor.deleted && <><Button className="btn btn-success btn-sm" onClick={() => {
                                                                confirmRestore(vendor.id);
                                                            }}>
                                                                <i className="bi bi-arrow-counterclockwise"></i>
                                                            </Button>&nbsp;</>}

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
                                                        <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <OverflowTooltip value={vendor.name} />
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
                                                                        <b>{vendor.stores[key].purchase_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{vendor.stores[key].purchase_balance_amount?.toFixed(2)}</b> {"@" + vendor.stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>


                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{vendor.code}</td>


                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{vendor.phone}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{vendor.vat_no}</td>




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

                                                           
                                                        </td>*/}
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
