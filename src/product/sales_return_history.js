import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import SalesReturnCreate from "../sales_return/create.js";
import { Typeahead } from "react-bootstrap-typeahead";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import OrderCreate from "./../order/create.js";
import CustomerCreate from "./../customer/create.js";
import StatsSummary from "../utils/StatsSummary.js";
import Draggable2 from "react-draggable";

const SalesReturnHistory = forwardRef((props, ref) => {
    const [statsOpen, setStatsOpen] = useState(false);
    const dragRef = useRef(null);

    useImperativeHandle(ref, () => ({
        open(model, selectedCustomers) {
            setHistoryList([]);
            setSelectedCustomers([]);
            searchParams["customer_id"] = "";

            product = model;
            setProduct({ ...product });
            if (selectedCustomers?.length > 0) {
                setSelectedCustomers(selectedCustomers)
                searchByMultipleValuesField("customer_id", selectedCustomers);
            } /*else {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    list();
                }, 200);
            }*/

            getStore(localStorage.getItem("store_id"));

            SetShow(true);
        },

    }));

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                SetShow(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
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

    function searchByMultipleValuesField(field, values) {
        if (field === "customer_id") {
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

        let Select = "select=id,code,additional_keywords,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        let result = await fetch(
            `/v1/customer?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
    }

    let [product, setProduct] = useState({});



    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());
    const [showDateRange, setShowDateRange] = useState(false);
    let [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");

    //list
    const [historyList, setHistoryList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);


    //Created At filter


    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortProduct, setSortProduct] = useState("-");

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
            searchParams[field] = "";
            page = 1;
            setPage(page);
            list();
            return;
        }

        if (value) {
            let d = new Date(value);
            value = format(d, "MMM dd yyyy");
            console.log("value2:", value);
            console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
        } else {
            value = "";
        }



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
            searchParams["created_at_from"] = "";
            searchParams["created_at_to"] = "";
            searchParams[field] = value;
        }
        if (field === "created_at_from") {
            searchParams["created_at"] = "";
            searchParams[field] = value;
        } else if (field === "created_at_to") {
            searchParams["created_at"] = "";
            searchParams[field] = value;
        }

        page = 1;
        setPage(page);

        list();
    }


    const list = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "";
        /*
        let Select =
            "select=id,store_id,store_name,customer_id,customer_name,order_id,order_code,quantity,";
            */
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        if (product.product_id) {
            searchParams["product_id"] = product.product_id;
        } else if (product.id) {
            searchParams["product_id"] = product.id;
        }


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


        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        // console.log("queryParams:", queryParams);
        //queryParams = encodeURIComponent(queryParams);

        setIsListLoading(true);
        fetch(
            "/v1/sales-return/history?" +
            Select +
            queryParams +
            "&sort=" +
            sortProduct +
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
                setHistoryList(data.result);

                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                //totalSalesReturn = data.meta.total_sales_return;
                setTotalSalesReturn(data.meta.total_sales_return);

                //totalProfit = data.meta.total_profit;
                setTotalProfit(data.meta.total_profit);

                //totalLoss = data.meta.total_loss;
                setTotalLoss(data.meta.total_loss);

                // totalVatReturn = data.meta.total_vat_return;
                setTotalVatReturn(data.meta.total_vat_return);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }, [page, pageSize, product, sortField, sortProduct, searchParams, statsOpen]);

    function sort(field) {
        sortField = field;
        setSortField(sortField);
        sortProduct = sortProduct === "-" ? "" : "-";
        setSortProduct(sortProduct);
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

    const [show, SetShow] = useState(false);
    useEffect(() => {
        if (show) {
            list();
        }
    }, [show, list]);

    function handleClose() {
        SetShow(false);
    };

    let [totalSalesReturn, setTotalSalesReturn] = useState(0.00);
    let [totalVatReturn, setTotalVatReturn] = useState(0.00);

    const OrderUpdateFormRef = useRef();
    function openOrderUpdateForm(id) {
        showOrderForm = true;
        setShowOrderForm(showOrderForm);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            OrderUpdateFormRef.current?.open(id);
        }, 100);

    }

    const SalesReturnUpdateFormRef = useRef();
    function openSalesReturnUpdateForm(id) {
        showSalesReturnForm = true;
        setShowSalesReturnForm(showSalesReturnForm);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            SalesReturnUpdateFormRef.current?.open(id);
        }, 100);

    }


    let [totalProfit, setTotalProfit] = useState(0.00);
    let [totalLoss, setTotalLoss] = useState(0.00);

    const customerSearchRef = useRef();
    const timerRef = useRef(null);

    let [showOrderForm, setShowOrderForm] = useState(false);
    let [showSalesReturnForm, setShowSalesReturnForm] = useState(false);

    const handleUpdated = () => {
        list();
    };


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                SetShow(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);


    //Table settings
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    const defaultColumns = useMemo(() => [
        { key: "date", label: "Date", fieldName: "date", visible: true },
        { key: "sales_return_code", label: "Sales Return ID", fieldName: "sales_return_code", visible: true },
        { key: "order_code", label: "Sales ID", fieldName: "order_code", visible: true },
        { key: "customer_name", label: "Customer", fieldName: "customer_name", visible: true },
        { key: "quantity", label: "Qty", fieldName: "quantity", visible: true },
        { key: "warehouse_code", label: "Stock Added To", fieldName: "warehouse_code", visible: true },
        { key: "unit_price", label: "Unit Price(without VAT)", fieldName: "unit_price", visible: true },
        { key: "unit_price_with_vat", label: "Unit Price(with VAT)", fieldName: "unit_price_with_vat", visible: true },
        { key: "discount", label: "Discount(without VAT)", fieldName: "discount", visible: true },
        { key: "discount_percent", label: "Discount %", fieldName: "discount_percent", visible: true },
        { key: "price", label: "Price(without VAT)", fieldName: "price", visible: true },
        { key: "vat_price", label: "VAT", fieldName: "vat_price", visible: true },
        { key: "net_price", label: "Net Price(with VAT)", fieldName: "net_price", visible: true },
        { key: "profit", label: "Profit", fieldName: "profit", visible: true },
        { key: "loss", label: "Loss", fieldName: "loss", visible: true },
    ], []);


    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);
    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sales_return_history_table_settings");
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
            localStorage.setItem("sales_return_history_table_settings", JSON.stringify(defaultColumns));
            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns]);

    function RestoreDefaultSettings() {
        localStorage.setItem("sales_return_history_table_settings", JSON.stringify(defaultColumns));
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    const handleToggleColumn = (index) => {
        const updated = [...columns];
        updated[index].visible = !updated[index].visible;
        setColumns(updated);
        localStorage.setItem("sales_return_history_table_settings", JSON.stringify(updated));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(columns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setColumns(reordered);
        localStorage.setItem("sales_return_history_table_settings", JSON.stringify(reordered));
    };


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);





    const handleSummaryToggle = (isOpen) => {
        setStatsOpen(isOpen);
    };

    const CustomerUpdateFormRef = useRef();
    function openCustomerUpdateForm(id) {
        CustomerUpdateFormRef.current?.open(id);
    }

    return (
        <>
            <CustomerCreate ref={CustomerUpdateFormRef} />
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
                        Sales Return History Settings
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

            {showOrderForm && <OrderCreate ref={OrderUpdateFormRef} onUpdated={handleUpdated} />}
            {showSalesReturnForm && <SalesReturnCreate ref={SalesReturnUpdateFormRef} onUpdated={handleUpdated} />}
            <Modal
                show={show}
                size="xl"
                backdrop="static"
                onHide={handleClose}
                animation={false}
                scrollable={true}
                dialogAs={({ children, ...props }) => (
                    <Draggable2 handle=".modal-header" nodeRef={dragRef}>
                        <div
                            ref={dragRef}
                            className="modal-dialog modal-xl"    // ✅ preserve Bootstrap xl class
                            {...props}
                            style={{
                                position: "absolute",
                                top: "10%",
                                left: "20%",
                                transform: "translate(-50%, -50%)",
                                margin: "0",
                                zIndex: 1055,
                                width: "65%",           // Full width inside container
                            }}
                        >
                            <div className="modal-content">{children}</div>
                        </div>
                    </Draggable2>
                )}
            >
                <Modal.Header>
                    <Modal.Title>Sales Return History of {product.name} {product.name_in_arabic ? " / " + product.name_in_arabic : ""}</Modal.Title>
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
                    <div className="container-fluid p-0">
                        <div className="row">
                            <div className="col">
                                <span className="text-end">
                                    <StatsSummary
                                        title="Sales Return History"
                                        stats={{
                                            "Sales Return": totalSalesReturn,
                                            "Net Profit": totalProfit,
                                            "Total Loss": totalLoss,
                                            "VAT Returned": totalVatReturn,
                                        }}
                                        onToggle={handleSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>

                        {/*<div className="row">
                            <div className="col">
                                <h1 className="text-end">
                                    Sales Return: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalSalesReturn}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </Badge>
                                </h1>
                                <h1 className="text-end">
                                    Net Profit: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalProfit}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </Badge>
                                </h1>
                                <h1 className="text-end">
                                    Loss: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalLoss}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </Badge>
                                </h1>
                                <h1 className="text-end">
                                    VAT Returned: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalVatReturn.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </Badge>
                                </h1>
                            </div>
                        </div>*/}

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
                                                    <p className="text-start">No SalesReturn History to display</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="row" style={{ bproduct: "solid 0px" }}>
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
                                                            animation="bproduct"
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
                                                                bproduct: "solid 1px",
                                                                bproductColor: "silver",
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
                                            <div className="col" style={{ bproduct: "solid 0px" }}>
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
                                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                                            <table className="table table-striped table-sm table-bordered">
                                                <thead>
                                                    <tr className="text-center">
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {col.key && <th>
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
                                                                        {sortField === col.fieldName && sortProduct === "-" ? (
                                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                                        ) : null}
                                                                        {sortField === col.fieldName && sortProduct === "" ? (
                                                                            <i className="bi bi-sort-alpha-up"></i>
                                                                        ) : null}
                                                                    </b>
                                                                </th>}
                                                            </>);
                                                        })}

                                                        {/*<th>
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
                                                                {sortField === "date" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-down"></i>
                                                                ) : null}
                                                                {sortField === "date" && sortProduct === "" ? (
                                                                    <i className="bi bi-sort-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>

                                                        {!localStorage.getItem("store_id") ? <th>
                                                            <b
                                                                style={{
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => {
                                                                    sort("store_name");
                                                                }}
                                                            >
                                                                Store
                                                                {sortField === "store_name" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "store_name" && sortProduct === "" ? (
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
                                                                    sort("sales_return_code");
                                                                }}
                                                            >
                                                                Sales Return ID
                                                                {sortField === "sales_return_code" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "sales_return_code" && sortProduct === "" ? (
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
                                                                    sort("order_code");
                                                                }}
                                                            >
                                                                Order ID
                                                                {sortField === "order_code" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "order_code" && sortProduct === "" ? (
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
                                                                    sort("customer_name");
                                                                }}
                                                            >
                                                                Customer
                                                                {sortField === "customer_name" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "customer_name" && sortProduct === "" ? (
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
                                                                    sort("quantity");
                                                                }}
                                                            >
                                                                Quantity
                                                                {sortField === "quantity" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "quantity" && sortProduct === "" ? (
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
                                                                    sort("unit_price");
                                                                }}
                                                            >
                                                                Unit Price(without VAT)
                                                                {sortField === "unit_price" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "unit_price" && sortProduct === "" ? (
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
                                                                    sort("unit_price_with_vat");
                                                                }}
                                                            >
                                                                Unit Price(with VAT)
                                                                {sortField === "unit_price_with_vat" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "unit_price_with_vat" && sortProduct === "" ? (
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
                                                                    sort("discount");
                                                                }}
                                                            >
                                                                Discount
                                                                {sortField === "discount" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "discount" && sortProduct === "" ? (
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
                                                                    sort("discount_percent");
                                                                }}
                                                            >
                                                                Discount %
                                                                {sortField === "discount_percent" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "discount_percent" && sortProduct === "" ? (
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
                                                                    sort("price");
                                                                }}
                                                            >
                                                                Price(without VAT)
                                                                {sortField === "price" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "price" && sortProduct === "" ? (
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
                                                                    sort("vat_price");
                                                                }}
                                                            >
                                                                VAT
                                                                {sortField === "vat_price" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "vat_price" && sortProduct === "" ? (
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
                                                                    sort("net_price");
                                                                }}
                                                            >
                                                                Net Price(with VAT)
                                                                {sortField === "net_price" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "net_price" && sortProduct === "" ? (
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
                                                                    sort("profit");
                                                                }}
                                                            >
                                                                Profit
                                                                {sortField === "profit" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "profit" && sortProduct === "" ? (
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
                                                                    sort("loss");
                                                                }}
                                                            >
                                                                Loss
                                                                {sortField === "loss" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "loss" && sortProduct === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>*/}
                                                    </tr>
                                                </thead>

                                                <thead>
                                                    <tr className="text-center">
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "customer_name") && <th>
                                                                    <Typeahead
                                                                        id="customer_id"
                                                                        labelKey="search_label"
                                                                        filterBy={['additional_keywords']}
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
                                                                </th>}
                                                                {(col.key === "order_code" ||
                                                                    col.key === "sales_return_code" ||
                                                                    col.key === "quantity" ||
                                                                    col.key === "unit_price" ||
                                                                    col.key === "unit_price_with_vat" ||
                                                                    col.key === "discount" ||
                                                                    col.key === "discount_percent" ||
                                                                    col.key === "price" ||
                                                                    col.key === "vat_price" ||
                                                                    col.key === "net_price" ||
                                                                    col.key === "profit" ||
                                                                    col.key === "loss" ||
                                                                    col.key === "warehouse_code"
                                                                ) &&
                                                                    <th>
                                                                        <input
                                                                            type="text"
                                                                            id={`sales_history_search_by_${col.key}`}
                                                                            name={`sales_history_search_by_${col.key}`}
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
                                                                {col.key === "date" && <th>
                                                                    <div style={{ minWidth: "100px" }}>
                                                                        <DatePicker
                                                                            id="date"
                                                                            value={dateValue}
                                                                            selected={selectedDate}
                                                                            className="form-control"
                                                                            dateFormat="MMM dd yyyy"
                                                                            isClearable={true}
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
                                                                            onClick={(e) =>
                                                                                setShowDateRange(!showDateRange)
                                                                            }
                                                                        >
                                                                            {showDateRange ? "Less.." : "More.."}
                                                                        </small>
                                                                        <br />

                                                                        {showDateRange ? (
                                                                            <span className="text-left">
                                                                                From:{" "}
                                                                                <DatePicker
                                                                                    id="date_from"
                                                                                    value={fromDateValue}
                                                                                    selected={selectedFromDate}
                                                                                    className="form-control"
                                                                                    dateFormat="MMM dd yyyy"
                                                                                    isClearable={true}
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
                                                                                    id="date_to"
                                                                                    value={toDateValue}
                                                                                    selected={selectedToDate}
                                                                                    isClearable={true}
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
                                                                    </div>
                                                                </th>}
                                                            </>);
                                                        })}

                                                        {/*<th>
                                                            <div style={{ minWidth: "100px" }}>
                                                                <DatePicker
                                                                    id="date"
                                                                    value={dateValue}
                                                                    selected={selectedDate}
                                                                    className="form-control"
                                                                    dateFormat="MMM dd yyyy"
                                                                    isClearable={true}
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
                                                                    onClick={(e) =>
                                                                        setShowDateRange(!showDateRange)
                                                                    }
                                                                >
                                                                    {showDateRange ? "Less.." : "More.."}
                                                                </small>
                                                                <br />

                                                                {showDateRange ? (
                                                                    <span className="text-left">
                                                                        From:{" "}
                                                                        <DatePicker
                                                                            id="date_from"
                                                                            value={fromDateValue}
                                                                            selected={selectedFromDate}
                                                                            className="form-control"
                                                                            dateFormat="MMM dd yyyy"
                                                                            isClearable={true}
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
                                                                            id="date_to"
                                                                            value={toDateValue}
                                                                            selected={selectedToDate}
                                                                            isClearable={true}
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
                                                            </div>
                                                        </th>
                                                       
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="sales_return_code"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("sales_return_code", e.target.value)
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
                                                        <th>
                                                            <Typeahead
                                                                id="customer_id"
                                                                filterBy={['additional_keywords']}
                                                                labelKey="search_label"
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "customer_id",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={customerOptions}
                                                                placeholder="Customer Name | Mob | VAT # | ID"
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
                                                                id="quantity"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("quantity", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="unit_price"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("unit_price", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="unit_price_with_vat"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("unit_price_with_vat", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="discount"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("discount", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="discount_percent"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("discount_percent", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="price"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("price", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="vat_price"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("vat_price", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="net_price"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("net_price", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>

                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="profit"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("profit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>

                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="loss"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("loss", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>*/}
                                                    </tr>
                                                </thead>

                                                <tbody className="text-center">
                                                    {historyList &&
                                                        historyList.map((history) => (
                                                            <tr key={history.id}>
                                                                {columns.filter(c => c.visible).map((col) => {
                                                                    return (<>
                                                                        {(col.key === "customer_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                            {history.customer_name && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                                openCustomerUpdateForm(history.customer_id);
                                                                            }}><OverflowTooltip value={history.customer_name + (history.customer_name_arabic ? " | " + history.customer_name_arabic : "")} />
                                                                            </span>}
                                                                        </td>}
                                                                        {(col.key === "sales_return_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                            <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                                openSalesReturnUpdateForm(history.sales_return_id);
                                                                            }}> {history.sales_return_code}
                                                                            </span>
                                                                        </td>}
                                                                        {(col.key === "order_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                            <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                                openOrderUpdateForm(history.order_id);
                                                                            }}> {history.order_code}
                                                                            </span>
                                                                        </td>}
                                                                        {(
                                                                            col.key === "quantity" ||
                                                                            col.key === "unit_price" ||
                                                                            col.key === "unit_price_with_vat" ||
                                                                            col.key === "discount" ||
                                                                            col.key === "discount_percent" ||
                                                                            col.key === "price" ||
                                                                            col.key === "vat_price" ||
                                                                            col.key === "net_price" ||
                                                                            col.key === "profit" ||
                                                                            col.key === "loss" ||
                                                                            col.key === "warehouse_code"
                                                                        ) &&
                                                                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                                {col.key === "warehouse_code" ? (
                                                                                    history[col.key] || "Main Store"
                                                                                ) : (
                                                                                    history[col.key] && typeof history[col.key] === "number" ?
                                                                                        <Amount amount={trimTo2Decimals(history[col.key])} /> : history[col.key]
                                                                                )}
                                                                            </td>}
                                                                        {col.key === "date" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                            {format(
                                                                                new Date(history.date),
                                                                                "MMM dd yyyy h:mma"
                                                                            )}
                                                                        </td>}
                                                                    </>);
                                                                })}

                                                                {/* <td>
                                                                    {history.date ? format(
                                                                        new Date(history.date),
                                                                        "MMM dd yyyy h:mma"
                                                                    ) : "Not set"}
                                                                </td>
                                                                {!localStorage.getItem("store_id") ? <td>{history.store_name}</td> : ""}
                                                                <td style={{
                                                                    textDecoration: "underline",
                                                                    color: "blue",
                                                                    cursor: "pointer",
                                                                }}
                                                                    onClick={() => {
                                                                        openSalesReturnUpdateForm(history.sales_return_id);
                                                                    }}>{history.sales_return_code}
                                                                </td>
                                                                <td style={{
                                                                    textDecoration: "underline",
                                                                    color: "blue",
                                                                    cursor: "pointer",
                                                                }}
                                                                    onClick={() => {
                                                                        openOrderUpdateForm(history.order_id);
                                                                    }}>{history.order_code}
                                                                </td>
                                                                <td style={{
                                                                    textDecoration: "underline",
                                                                    color: "blue",
                                                                    cursor: "pointer",
                                                                }}
                                                                    onClick={() => {
                                                                        openCustomerDetailsView(history.customer_id);
                                                                    }}>{history.customer_name}
                                                                </td>
                                                                <td>{history.quantity}{history.unit ? history.unit : ""}</td>
                                                                <td>{history.unit_price ? history.unit_price.toFixed(2) : ""}</td>
                                                                <td>{history.unit_price_with_vat ? history.unit_price_with_vat.toFixed(2) : ""}</td>
                                                                <td>{history.discount ? history.discount.toFixed(2) : ""}</td>
                                                                <td>{history.discount ? history.discount_percent.toFixed(2) : ""}</td>
                                                                <td>{history.price ? history.price.toFixed(2) : ""}</td>
                                                                <td>{history.vat_price ? history.vat_price.toFixed(2) + "   (" + history.vat_percent.toFixed(2) + "%)" : ""}</td>
                                                                <td>{history.net_price ? history.net_price.toFixed(2) : ""}</td>
                                                                <td>{history.profit ? history.profit.toFixed(2) : ""}</td>
                                                                <td>{history.loss ? history.loss.toFixed(2) : ""}</td>
                                                               */}
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
                </Modal.Body>
            </Modal>
        </>);


});

export default SalesReturnHistory;