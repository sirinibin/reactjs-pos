import React, { useState, useRef, forwardRef, useEffect, useMemo, useCallback } from "react";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import PurchaseReturnCreate from "../purchase_return/create.js";
import PurchaseCreate from "../purchase/create.js";
import { Typeahead } from "react-bootstrap-typeahead";
import VendorCreate from "./../vendor/create.js";
import StatsSummary from "../utils/StatsSummary.js";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import SuccessModal from '../utils/SuccessModal.js';
import { useTableSettings } from '../utils/useTableSettings.js';
import PaginationControls from '../utils/PaginationControls.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';

const PurchaseReturnHistory = forwardRef((props, ref) => {
    const [statsOpen, setStatsOpen] = useState(false);
    const [show, setShow] = useState(false);

    /*
    useImperativeHandle(ref, () => ({
        open(model, selectedVendors) {
            setHistoryList([]);
            setSelectedVendors([]);
            searchParams["vendor_id"] = "";

            product = model;
            setProduct({ ...product });
            if (selectedVendors?.length > 0) {
                setSelectedVendors(selectedVendors)
                searchByMultipleValuesField("vendor_id", selectedVendors);
            } 

            getStore(localStorage.getItem("store_id"));
            setShow(true);
        },

    }));*/

    useEffect(() => {
        setHistoryList([]);
        setHistoryList([]);
        setSelectedVendors([]);
        searchParams["vendor_id"] = "";

        setProduct(props.model);
        if (props.selectedVendors?.length > 0) {
            setSelectedVendors(props.selectedVendors)
            searchByMultipleValuesField("vendor_id", props.selectedVendors);
        }

        getStore(localStorage.getItem("store_id"));
        setShow(true);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setShow(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);


    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (error) { }
    }

    function searchByMultipleValuesField(field, values) {
        if (field === "vendor_id") {
            setSelectedVendors(values);
        }

        searchParams[field] = Object.values(values)
            .map(function (model) {
                return model.id;
            })
            .join(",");

        page = 1;
        setPage(page);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            list();
        }, 200);
    }



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
        let result = await fetch(
            `/v1/vendor?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        setVendorOptions(data.result);
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
            "/v1/purchase-return/history?" +
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

                // totalPurchaseReturn = data.meta.total_purchase_return;
                setTotalPurchaseReturn(data.meta.total_purchase_return);

                //totalVatReturn = data.meta.total_vat_return;
                setTotalVatReturn(data.meta.total_vat_return);

                setTotalQuantity(data.meta.total_quantity);

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
        // list();
    }


    useEffect(() => {
        if (show) {
            list();
        } else {
            setHistoryList([]);
            // setSelectedVendors([]);
        }
    }, [list, show]);


    let [totalPurchaseReturn, setTotalPurchaseReturn] = useState(0.00);
    let [totalVatReturn, setTotalVatReturn] = useState(0.00);
    let [totalQuantity, setTotalQuantity] = useState(0.00);

    let [showPurchaseForm, setShowPurchaseForm] = useState(false);
    let [showPurchaseReturnForm, setShowPurchaseReturnForm] = useState(false);

    const PurchaseReturnUpdateFormRef = useRef();
    function openPurchaseReturnUpdateForm(id) {
        showPurchaseReturnForm = true;
        setShowPurchaseReturnForm(showPurchaseReturnForm);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PurchaseReturnUpdateFormRef.current.open(id);
        }, 100);
    }

    const PurchaseUpdateFormRef = useRef();
    function openPurchaseUpdateForm(id) {
        showPurchaseForm = true;
        setShowPurchaseForm(showPurchaseForm);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            PurchaseUpdateFormRef.current.open(id);
        }, 100);


    }


    const vendorSearchRef = useRef();
    const timerRef = useRef(null);

    const handleUpdated = () => {
        list();
    };


    //Table settings
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    const defaultColumns = useMemo(() => [
        { key: "date", label: "Date", fieldName: "date", visible: true },
        { key: "purchase_return_code", label: "Purchase Return ID", fieldName: "purchase_return_code", visible: true },
        { key: "purchase_code", label: "Purchase ID", fieldName: "purchase_code", visible: true },
        { key: "vendor_name", label: "Vendor", fieldName: "vendor_name", visible: true },
        { key: "quantity", label: "Qty", fieldName: "quantity", visible: true },
        { key: "warehouse_code", label: "Stock Removed From", fieldName: "warehouse_code", visible: true },
        { key: "unit_price", label: "Unit Price(without VAT)", fieldName: "unit_price", visible: true },
        { key: "unit_price_with_vat", label: "Unit Price(with VAT)", fieldName: "unit_price_with_vat", visible: true },
        { key: "discount", label: "Discount(without VAT)", fieldName: "discount", visible: true },
        { key: "discount_percent", label: "Discount %", fieldName: "discount_percent", visible: true },
        { key: "price", label: "Price(without VAT)", fieldName: "price", visible: true },
        { key: "vat_price", label: "VAT", fieldName: "vat_price", visible: true },
        { key: "net_price", label: "Net Price(with VAT)", fieldName: "net_price", visible: true },
    ], []);


    const { columns, showSettings, setShowSettings, handleToggleColumn, onDragEnd, restoreDefaults } = useTableSettings({ storageKey: "purchase_return_history_table_settings", defaultColumns });

    function RestoreDefaultSettings() {
        restoreDefaults();
        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!");
    }



    const handleSummaryToggle = (isOpen) => {
        setStatsOpen(isOpen);
    };


    const VendorUpdateFormRef = useRef();
    function openVendorUpdateForm(id) {
        VendorUpdateFormRef.current.open(id);
    }

    return (
        <>
            <VendorCreate ref={VendorUpdateFormRef} />
            {/* ⚙️ Settings Modal */}
            <TableSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                title="Purchase Return History Settings"
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onDragEnd={onDragEnd}
                onRestoreDefaults={RestoreDefaultSettings}
            />
            <SuccessModal show={showSuccess} message={successMessage} onClose={() => setShowSuccess(false)} />

            {showPurchaseReturnForm && <PurchaseReturnCreate ref={PurchaseReturnUpdateFormRef} onUpdated={handleUpdated} />}
            {showPurchaseForm && <PurchaseCreate ref={PurchaseUpdateFormRef} onUpdated={handleUpdated} />}
            {/*<Modal
                show={show}
                size="xl"
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
                    <Modal.Title>Purchase Return History of {product.name} {product.name_in_arabic ? " / " + product.name_in_arabic : ""}</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>*/}
            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Purchase Return History Summary"
                                filters={{
                                    ...(fromDateValue ? { 'From Date': fromDateValue } : {}),
                                    ...(toDateValue ? { 'To Date': toDateValue } : {}),
                                    ...(selectedVendors.length > 0 ? { 'Vendor': selectedVendors.map(v => v.name).join(', ') } : {}),
                                }}
                                stats={{
                                    "Purchase Return": totalPurchaseReturn,
                                    "VAT Returned": totalVatReturn,
                                    "Total Quantity": totalQuantity,
                                }}
                                onToggle={handleSummaryToggle}
                            />
                        </span>
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
                                            <p className="text-start">No PurchaseReturn History to display</p>
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

                                <PaginationControls
                                    showSizePicker={false}
                                    showCount={false}
                                    totalPages={totalPages}
                                    page={page}
                                    totalItems={totalItems}
                                    offset={offset}
                                    currentPageItemsCount={currentPageItemsCount}
                                    pageSize={pageSize}
                                    onPageChange={changePage}
                                    onPageSizeChange={changePageSize}
                                    pageSizes={[5, 20, 40, 50, 100, 200, 300, 500, 1000, 1500]}
                                />
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
                                                                    sort("purchase_return_code");
                                                                }}
                                                            >
                                                                Purchase Return ID
                                                                {sortField === "purchase_return_code" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "purchase_return_code" && sortProduct === "" ? (
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
                                                                    sort("purchase_code");
                                                                }}
                                                            >
                                                                Purchase ID
                                                                {sortField === "purchase_code" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "purchase_code" && sortProduct === "" ? (
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
                                                                    sort("vendor_name");
                                                                }}
                                                            >
                                                                Vendor
                                                                {sortField === "vendor_name" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "vendor_name" && sortProduct === "" ? (
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
                                                                Price
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
                                                                Net Price
                                                                {sortField === "net_price" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "net_price" && sortProduct === "" ? (
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
                                                        {(col.key === "vendor_name") && <th>
                                                            <Typeahead
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
                                                                placeholder="Vendor Name | Mob | VAT # | ID"
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
                                                        {(col.key === "purchase_code" ||
                                                            col.key === "purchase_return_code" ||
                                                            col.key === "quantity" ||
                                                            col.key === "unit_price" ||
                                                            col.key === "unit_price_with_vat" ||
                                                            col.key === "discount" ||
                                                            col.key === "discount_percent" ||
                                                            col.key === "price" ||
                                                            col.key === "vat_price" ||
                                                            col.key === "net_price" ||
                                                            col.key === "warehouse_code"
                                                        ) &&
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id={`purchase_return_history_search_by_${col.key}`}
                                                                    name={`purchase_return_history_search_by_${col.key}`}
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
                                                                id="purchase_return_code"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("purchase_return_code", e.target.value)
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
                                                            <Typeahead
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
                                                                placeholder="Vendor Name | Mob | VAT # | ID"
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
                                                        </th>*/}
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {historyList &&
                                                historyList.map((history) => (
                                                    <tr key={history.id}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "vendor_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                    {history.vendor_name && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                        openVendorUpdateForm(history.vendor_id);
                                                                    }}><OverflowTooltip value={history.vendor_name + (history.vendor_name_arabic ? " | " + history.vendor_name_arabic : "")} />
                                                                    </span>}
                                                                </td>}
                                                                {(col.key === "purchase_return_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                    <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                        openPurchaseReturnUpdateForm(history.purchase_return_id);
                                                                    }}> {history.purchase_return_code}
                                                                    </span>
                                                                </td>}
                                                                {(col.key === "purchase_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                    <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                        openPurchaseUpdateForm(history.purchase_id);
                                                                    }}> {history.purchase_code}
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
                                                                            history.is_service ? "—" : (history[col.key] || "Main Store")
                                                                        ) : (
                                                                            history[col.key] && typeof history[col.key] === "number" ?
                                                                                <Amount amount={trimTo2Decimals(history[col.key])} /> : history[col.key]
                                                                        )
                                                                        }
                                                                    </td>}
                                                                {col.key === "date" && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {format(
                                                                        new Date(history.date),
                                                                        "MMM dd yyyy h:mma"
                                                                    )}
                                                                </td>}
                                                            </>);
                                                        })}
                                                        {/*<td>
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
                                                                        openPurchaseReturnUpdateForm(history.purchase_return_id);
                                                                    }}>{history.purchase_return_code}
                                                                </td>
                                                                <td style={{
                                                                    textDecoration: "underline",
                                                                    color: "blue",
                                                                    cursor: "pointer",
                                                                }}
                                                                    onClick={() => {
                                                                        openPurchaseUpdateForm(history.purchase_id);
                                                                    }}>{history.purchase_code}
                                                                </td>
                                                                <td style={{
                                                                    textDecoration: "underline",
                                                                    color: "blue",
                                                                    cursor: "pointer",
                                                                }}
                                                                    onClick={() => {
                                                                        openVendorDetailsView(history.vendor_id);
                                                                    }}>{history.vendor_name}
                                                                </td>
                                                                <td>{history.quantity}{history.unit ? history.unit : ""}</td>
                                                                <td>{history.unit_price?.toFixed(2)}</td>
                                                                <td>{history.unit_price_with_vat?.toFixed(2)}</td>
                                                                <td>{history.discount?.toFixed(2)}</td>
                                                                <td>{history.discount_percent?.toFixed(2)}</td>
                                                                <td>{history.price.toFixed(2) + " "}</td>
                                                                <td>{history.vat_price.toFixed(2) + "   (" + history.vat_percent.toFixed(2) + "%)"}</td>
                                                                <td>{history.net_price.toFixed(2) + " "}</td>*/}

                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                <PaginationControls
                                    showSizePicker={false}
                                    totalPages={totalPages}
                                    page={page}
                                    totalItems={totalItems}
                                    offset={offset}
                                    currentPageItemsCount={currentPageItemsCount}
                                    pageSize={pageSize}
                                    onPageChange={changePage}
                                    onPageSizeChange={changePageSize}
                                    pageSizes={[5, 20, 40, 50, 100, 200, 300, 500, 1000, 1500]}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/*</Modal.Body>
            </Modal>*/}
        </>);


});

export default PurchaseReturnHistory;

