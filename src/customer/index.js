import React, { useState, useEffect, useRef, useMemo } from "react";
import CustomerCreate from "./create.js";
import CustomerView from "./view.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import PostingIndex from "./../posting/index.js";
import { confirm } from 'react-bootstrap-confirmation';

function CustomerIndex(props) {

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

                console.log("Response:");
                console.log(data);
                store = data.result;
                setStore(store);
            })
            .catch(error => {

            });
    }

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
            "select=id,code,deleted,credit_limit,credit_balance,account,name,email,phone,vat_no,created_by_name,created_at,stores";

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

        let Select = "select=id,additional_keywords,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
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
    const timerRef = useRef(null);

    let [ignoreZeroCreditBalance, setIgnoreZeroCreditBalance] = useState(false);
    let [ignoreZeroQtnCreditBalance, setIgnoreZeroQtnCreditBalance] = useState(false);


    //Table settings
    const defaultColumns = useMemo(() => [
        { key: "deleted", label: "Deleted", fieldName: "deleted", visible: true },
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "code", label: "ID", fieldName: "code", visible: true },
        { key: "name", label: "Name", fieldName: "name", visible: true },
        { key: "sales_amount", label: "Sales Amount", fieldName: "stores.sales_amount", visible: true },
        { key: "sales_paid_amount", label: "Sales Paid Amount", fieldName: "stores.sales_paid_amount", visible: true },
        { key: "credit_balance", label: "Credit Balance", fieldName: "credit_balance", visible: true },
        { key: "credit_limit", label: "Credit Limit", fieldName: "credit_limit", visible: true },
        { key: "quotation_invoice_balance_amount", label: " Qtn. Invoice Credit Balance Amount", fieldName: "stores.quotation_invoice_balance_amount", visible: true },
        { key: "sales_count", label: "Sales count", fieldName: "stores.sales_count", visible: true },
        { key: "sales_balance_amount", label: "Sales Credit Balance", fieldName: "stores.sales_balance_amount", visible: true },
        { key: "phone", label: "Phone", fieldName: "phone", visible: true },
        { key: "vat_no", label: "Vat No.", fieldName: "vat_no", visible: true },
        { key: "sales_paid_count", label: "Sales Paid Count", fieldName: "stores.sales_paid_count", visible: true },
        { key: "sales_not_paid_count", label: "Sales Unpaid Count", fieldName: "stores.sales_not_paid_count", visible: true },
        { key: "email", label: "Email", fieldName: "email", visible: true },
        { key: "sales_profit", label: "Sales Profit", fieldName: "stores.sales_profit", visible: true },
        { key: "sales_loss", label: "Sales Loss", fieldName: "stores.sales_loss", visible: true },
        { key: "sales_paid_partially_count", label: "Sales Paid Partially Count", fieldName: "stores.sales_paid_partially_count", visible: true },
        { key: "sales_return_count", label: "Sales Return Count", fieldName: "stores.sales_return_count", visible: true },
        { key: "sales_return_amount", label: "Sales Return Amount", fieldName: "stores.sales_return_amount", visible: true },
        { key: "sales_return_paid_amount", label: "Sales Return Paid Amount", fieldName: "stores.sales_return_paid_amount", visible: true },
        { key: "sales_return_balance_amount", label: "Sales Return Credit Balance Amount", fieldName: "stores.sales_return_balance_amount", visible: true },
        { key: "sales_return_profit", label: "Sales Return Profit", fieldName: "stores.sales_return_profit", visible: true },
        { key: "sales_return_loss", label: "Sales Return Loss", fieldName: "stores.sales_return_loss", visible: true },
        { key: "sales_return_paid_count", label: "Sales Return Paid Count", fieldName: "stores.sales_return_paid_count", visible: true },
        { key: "sales_return_not_paid_count", label: "Sales Return Unpaid Count", fieldName: "stores.sales_return_not_paid_count", visible: true },
        { key: "sales_return_paid_partially_count", label: "Sales Return Paid Partially Count", fieldName: "stores.sales_return_paid_partially_count", visible: true },
        { key: "quotation_invoice_count", label: "Qtn. Invoice count", fieldName: "stores.quotation_invoice_count", visible: true },
        { key: "quotation_invoice_amount", label: " Total Qtn. Invoice amount", fieldName: "stores.quotation_invoice_amount", visible: true },
        { key: "quotation_invoice_paid_amount", label: "Qtn. Invoice paid amount", fieldName: "stores.quotation_invoice_paid_amount", visible: true },
        { key: "quotation_invoice_profit", label: "Qtn. Invoice Profit", fieldName: "stores.quotation_invoice_profit", visible: true },
        { key: "quotation_invoice_loss", label: "Qtn. Invoice Loss", fieldName: "stores.quotation_invoice_loss", visible: true },
        { key: "quotation_invoice_paid_count", label: "Qtn. Invoice Paid Count", fieldName: "stores.quotation_invoice_paid_count", visible: true },
        { key: "quotation_invoice_not_paid_count", label: "Qtn. Invoice Unpaid Count", fieldName: "stores.quotation_invoice_not_paid_count", visible: true },
        { key: "quotation_invoice_paid_partially_count", label: "Qtn. Invoice Paid Partially Count", fieldName: "stores.quotation_invoice_paid_partially_count", visible: true },
        { key: "quotation_count", label: "Quotation Count", fieldName: "stores.quotation_count", visible: true },
        { key: "quotation_amount", label: "Quotation Amount", fieldName: "stores.quotation_amount", visible: true },
        { key: "quotation_profit", label: "Quotation Profit", fieldName: "stores.quotation_profit", visible: true },
        { key: "quotation_loss", label: "Quotation Loss", fieldName: "stores.quotation_loss", visible: true },
        { key: "delivery_note_count", label: "Delivery Note Count", fieldName: "stores.delivery_note_count", visible: true },
        { key: "created_by_name", label: "Created By", fieldName: "created_by", visible: true },
        { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
        { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
    ], []);


    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);
    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("customer_table_settings");
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
            localStorage.setItem("customer_table_settings", JSON.stringify(defaultColumns));
            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns]);

    function RestoreDefaultSettings() {
        localStorage.setItem("sales_table_settings", JSON.stringify(defaultColumns));
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    // Save column settings to localStorage
    useEffect(() => {
        localStorage.setItem("customer_table_settings", JSON.stringify(columns));
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
                        Customer Settings
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
                                                    id="ignoreZeroCreditBalance"

                                                /> &nbsp;Ignore Zero Credit Balance
                                            </span>
                                            <span style={{ marginLeft: "10px" }}>
                                                <input type="checkbox"
                                                    value={ignoreZeroQtnCreditBalance}
                                                    checked={ignoreZeroQtnCreditBalance}
                                                    onChange={(e) => {
                                                        ignoreZeroQtnCreditBalance = !ignoreZeroQtnCreditBalance;
                                                        setIgnoreZeroQtnCreditBalance(ignoreZeroQtnCreditBalance);
                                                        searchByFieldValue("ignore_zero_qtn_credit_balance", ignoreZeroQtnCreditBalance)
                                                    }}
                                                    className=""
                                                    id="ignoreZeroQtnCreditBalance"

                                                /> &nbsp;Ignore Zero Qtn. Invoice Credit Balance
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
                                                        {col.key === "deleted" && <th key={col.key}>{col.label}</th>}
                                                        {col.key === "actions" && <th key={col.key}>{col.label}</th>}
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
                                                                {sortField === col.fieldName && sortCustomer === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === col.fieldName && sortCustomer === "" ? (
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
                                                            sort("phone");
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
                                                                id="customer_id"
                                                                filterBy={['additional_keywords']}
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
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    timerRef.current = setTimeout(() => {
                                                                        suggestCustomers(searchTerm);
                                                                    }, 100);
                                                                }}
                                                                multiple
                                                            />
                                                        </th>}
                                                        {(col.key === "code" ||
                                                            col.key === "sales_amount" ||
                                                            col.key === "sales_paid_amount" ||
                                                            col.key === "credit_balance" ||
                                                            col.key === "credit_limit" ||
                                                            col.key === "quotation_invoice_balance_amount" ||
                                                            col.key === "sales_count" ||
                                                            col.key === "sales_balance_amount" ||
                                                            col.key === "phone" ||
                                                            col.key === "vat_no" ||
                                                            col.key === "sales_paid_count" ||
                                                            col.key === "sales_not_paid_count" ||
                                                            col.key === "email" ||
                                                            col.key === "sales_profit" ||
                                                            col.key === "sales_loss" ||
                                                            col.key === "sales_paid_partially_count" ||
                                                            col.key === "sales_return_count" ||
                                                            col.key === "sales_return_amount" ||
                                                            col.key === "sales_return_paid_amount" ||
                                                            col.key === "sales_return_balance_amount" ||
                                                            col.key === "sales_return_profit" ||
                                                            col.key === "sales_return_loss" ||
                                                            col.key === "sales_return_paid_count" ||
                                                            col.key === "sales_return_not_paid_count" ||
                                                            col.key === "sales_return_paid_partially_count" ||
                                                            col.key === "quotation_invoice_count" ||
                                                            col.key === "quotation_invoice_amount" ||
                                                            col.key === "quotation_invoice_paid_amount" ||
                                                            col.key === "quotation_invoice_profit" ||
                                                            col.key === "quotation_invoice_loss" ||
                                                            col.key === "quotation_invoice_paid_count" ||
                                                            col.key === "quotation_invoice_not_paid_count" ||
                                                            col.key === "quotation_invoice_paid_partially_count" ||
                                                            col.key === "quotation_count" ||
                                                            col.key === "quotation_amount" ||
                                                            col.key === "quotation_profit" ||
                                                            col.key === "quotation_loss" ||
                                                            col.key === "delivery_note_count" ||
                                                            col.key === "quotation_invoice_not_paid_count"
                                                        ) &&
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id={`customer_search_by_${col.key}`}
                                                                    name={`customer_search_by_${col.key}`}
                                                                    onChange={(e) => {

                                                                        const value = e.target.value;
                                                                        if (typeof value === "number") {
                                                                            searchByFieldValue(col.key, parseFloat(e.target.value))
                                                                        } else if (typeof value === "string") {
                                                                            searchByFieldValue(col.key, e.target.value)
                                                                        }
                                                                        // searchByFieldValue(col.key, e.target.value)
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
                                                        id="customer_id"
                                                        filterBy={['additional_keywords']}
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
                                                            searchByFieldValue("credit_balance", e.target.value)
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
                                                            searchByFieldValue("sales_count", e.target.value)
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
                                                <th></th>*/}
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {customerList &&
                                                customerList.map((customer) => (
                                                    <tr key={customer.id}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "deleted") && <td>{customer.deleted ? "YES" : "NO"}</td>}
                                                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
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
                                                                </td>}
                                                                {(col.key === "name") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                    <OverflowTooltip value={customer.name} />
                                                                </td>}
                                                                {(col.key === "credit_balance") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                    {customer.account && <Button variant="link" onClick={() => {
                                                                        openBalanceSheetDialogue(customer.account);
                                                                    }}>
                                                                        <Amount amount={trimTo2Decimals(customer.credit_balance)} />

                                                                    </Button>}
                                                                    {!customer.account && <Amount amount={trimTo2Decimals(customer.credit_balance)} />}
                                                                </td>}
                                                                {(col.key === "code" ||
                                                                    col.key === "sales_amount" ||
                                                                    col.key === "sales_paid_amount" ||
                                                                    col.key === "credit_limit" ||
                                                                    col.key === "quotation_invoice_balance_amount" ||
                                                                    col.key === "sales_count" ||
                                                                    col.key === "sales_balance_amount" ||
                                                                    col.key === "phone" ||
                                                                    col.key === "vat_no" ||
                                                                    col.key === "sales_paid_count" ||
                                                                    col.key === "sales_not_paid_count" ||
                                                                    col.key === "email" ||
                                                                    col.key === "sales_profit" ||
                                                                    col.key === "sales_loss" ||
                                                                    col.key === "sales_paid_partially_count" ||
                                                                    col.key === "sales_return_count" ||
                                                                    col.key === "sales_return_amount" ||
                                                                    col.key === "sales_return_paid_amount" ||
                                                                    col.key === "sales_return_balance_amount" ||
                                                                    col.key === "sales_return_profit" ||
                                                                    col.key === "sales_return_loss" ||
                                                                    col.key === "sales_return_paid_count" ||
                                                                    col.key === "sales_return_not_paid_count" ||
                                                                    col.key === "sales_return_paid_partially_count" ||
                                                                    col.key === "quotation_invoice_count" ||
                                                                    col.key === "quotation_invoice_amount" ||
                                                                    col.key === "quotation_invoice_paid_amount" ||
                                                                    col.key === "quotation_invoice_profit" ||
                                                                    col.key === "quotation_invoice_loss" ||
                                                                    col.key === "quotation_invoice_paid_count" ||
                                                                    col.key === "quotation_invoice_not_paid_count" ||
                                                                    col.key === "quotation_invoice_paid_partially_count" ||
                                                                    col.key === "quotation_count" ||
                                                                    col.key === "quotation_amount" ||
                                                                    col.key === "quotation_profit" ||
                                                                    col.key === "quotation_loss" ||
                                                                    col.key === "delivery_note_count" ||
                                                                    col.key === "quotation_invoice_not_paid_count" ||
                                                                    col.key === "created_by_name"
                                                                ) &&
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        {customer[col.key] && typeof customer[col.key] === "number" ?
                                                                            <Amount amount={trimTo2Decimals(customer[col.key])} /> : customer[col.key]
                                                                        }

                                                                        {customer.stores && customer.stores[localStorage.getItem("store_id")][col.key] && <>
                                                                            {typeof customer.stores[localStorage.getItem("store_id")][col.key] === "number" ?
                                                                                <Amount amount={trimTo2Decimals(customer.stores[localStorage.getItem("store_id")][col.key])} /> : customer.stores[localStorage.getItem("store_id")][col.key]
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
                                                                        new Date(customer.created_at),
                                                                        "MMM dd yyyy h:mma"
                                                                    )}
                                                                </td>}
                                                            </>);
                                                        })}

                                                        {/*<td>{customer.deleted ? "YES" : "NO"}</td>
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
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                            <OverflowTooltip value={customer.name} />
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
                                                            {customer.account && <Button variant="link" onClick={() => {
                                                                openBalanceSheetDialogue(customer.account);
                                                            }}>
                                                                <Amount amount={trimTo2Decimals(customer.credit_balance)} />

                                                            </Button>}
                                                            {!customer.account && <Amount amount={trimTo2Decimals(customer.credit_balance)} />}
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
                                                                        <b>{customer.stores[key].sales_balance_amount?.toFixed(2)}</b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{customer.stores[key].sales_balance_amount?.toFixed(2)}</b> {"@" + customer.stores[key].store_name}</li>);
                                                                }
                                                                return "";
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{customer.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.phone}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.vat_no}</td>
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
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{customer.email}</td>
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

export default CustomerIndex;
