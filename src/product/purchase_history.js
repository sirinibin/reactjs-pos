import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Badge } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import NumberFormat from "react-number-format";
import PurchaseView from "../purchase/view.js";
import VendorView from "../vendor/view.js";
import { Typeahead } from "react-bootstrap-typeahead";

//function ProductIndex(props) {

const PurchaseHistory = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(model, selectedVendors) {
            product = model;
            setProduct({ ...product });
            if (selectedVendors?.length > 0) {
                setSelectedVendors(selectedVendors)
                searchByMultipleValuesField("vendor_id", selectedVendors);
            } else {
                list();
            }

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

                console.log("Response:");
                console.log(data);
                store = data.result;

                setStore(store);
            })
            .catch(error => {

            });
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

        list();
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


    function list() {
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
            "/v1/purchase/history?" +
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

                totalPurchase = data.meta.total_purchase;
                setTotalPurchase(totalPurchase);

                totalRetailProfit = data.meta.total_retail_profit;
                setTotalRetailProfit(totalRetailProfit);

                totalWholesaleProfit = data.meta.total_wholesale_profit;
                setTotalWholesaleProfit(totalWholesaleProfit);

                totalRetailLoss = data.meta.total_retail_loss;
                setTotalRetailLoss(totalRetailLoss);

                totalWholesaleLoss = data.meta.total_wholesale_loss;
                setTotalWholesaleLoss(totalWholesaleLoss);

                totalVat = data.meta.total_vat;
                setTotalVat(totalVat);

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

    function handleClose() {
        SetShow(false);
    };

    let [totalPurchase, setTotalPurchase] = useState(0.00);
    let [totalRetailProfit, setTotalRetailProfit] = useState(0.00);
    let [totalWholesaleProfit, setTotalWholesaleProfit] = useState(0.00);
    let [totalVat, setTotalVat] = useState(0.00);
    let [totalRetailLoss, setTotalRetailLoss] = useState(0.00);
    let [totalWholesaleLoss, setTotalWholesaleLoss] = useState(0.00);

    const PurchaseDetailsViewRef = useRef();
    function openPurchaseDetailsView(id) {
        PurchaseDetailsViewRef.current.open(id);
    }


    const VendorDetailsViewRef = useRef();
    function openVendorDetailsView(id) {
        VendorDetailsViewRef.current.open(id);
    }


    const vendorSearchRef = useRef();
    const timerRef = useRef(null);

    return (
        <>
            <PurchaseView ref={PurchaseDetailsViewRef} />
            <VendorView ref={VendorDetailsViewRef} />
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Purchase History of {product.name}  {product.name_in_arabic ? " / " + product.name_in_arabic : ""}</Modal.Title>

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
                                <h1 className="text-end">
                                    Purchase: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalPurchase}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </Badge>
                                </h1>
                                <h1 className="text-end">
                                    VAT Collected: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalVat.toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={" "}
                                            renderText={(value, props) => value}
                                        />
                                    </Badge>
                                </h1>
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
                                                    <p className="text-start">No Purchase History to display</p>
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
                                                                Unit Price
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
                                                        </th>
                                                        <th>
                                                            <b
                                                                style={{
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => {
                                                                    sort("retain_profit");
                                                                }}
                                                            >
                                                                Retail Profit
                                                                {sortField === "retail_profit" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "retail_profit" && sortProduct === "" ? (
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
                                                                Wholesale Profit
                                                                {sortField === "wholesale_profit" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "wholesale_profit" && sortProduct === "" ? (
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
                                                                    sort("retail_loss");
                                                                }}
                                                            >
                                                                Retail Loss
                                                                {sortField === "retail_loss" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "retail_loss" && sortProduct === "" ? (
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
                                                                    sort("wholesale_loss");
                                                                }}
                                                            >
                                                                Wholesale Loss
                                                                {sortField === "wholesale_loss" && sortProduct === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "wholesale_loss" && sortProduct === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>

                                                    </tr>
                                                </thead>

                                                <thead>
                                                    <tr className="text-center">
                                                        <th>
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
                                                        {!localStorage.getItem("store_id") ? <th>
                                                            <input
                                                                type="text"
                                                                id="store_name"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("store_name", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th> : ""}
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
                                                                id="retail_profit"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("retail_profit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>

                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="wholesale_profit"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("wholesale_profit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="retail_loss"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("retail_loss", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>

                                                        <th>
                                                            <input
                                                                type="text"
                                                                id="wholesale_loss"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("wholesale_loss", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody className="text-center">
                                                    {historyList &&
                                                        historyList.map((history) => (
                                                            <tr key={history.id}>
                                                                <td>
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
                                                                        openPurchaseDetailsView(history.purchase_id);
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
                                                                <td>{history.unit_price.toFixed(2)}</td>
                                                                <td>{history.discount.toFixed(2)}</td>
                                                                <td>{history.discount_percent.toFixed(2)}</td>
                                                                <td>{history.price.toFixed(2) + " "}</td>
                                                                <td>{history.vat_price.toFixed(2) + "   (" + history.vat_percent.toFixed(2) + "%)"}</td>
                                                                <td>{history.net_price.toFixed(2) + " "}</td>
                                                                <td>{history.retail_profit.toFixed(2) + " "}</td>
                                                                <td>{history.wholesale_profit.toFixed(2) + " "}</td>
                                                                <td>{history.retail_loss.toFixed(2) + " "}</td>
                                                                <td>{history.wholesale_loss.toFixed(2) + " "}</td>

                                                                {/* <td>   
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
                                                      
                                                                </td>
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

export default PurchaseHistory;

