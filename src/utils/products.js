import React, { useState, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import Cookies from "universal-cookie";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { Typeahead } from "react-bootstrap-typeahead";
import ProductCreate from "./../product/create.js";
import ProductView from "./../product/view.js";
import "react-datepicker/dist/react-datepicker.css";
//import { Button, Spinner, Badge, Tooltip, OverlayTrigger } from "react-bootstrap";
import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";

import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";

import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import OverflowTooltip from "./OverflowTooltip.js";
import Dropdown from 'react-bootstrap/Dropdown';
import StatsSummary from "./StatsSummary.js";
import countryList from 'react-select-country-list'

//function ProductIndex(props) {

const Products = forwardRef((props, ref) => {
    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    let [product, setProduct] = useState({});
    let [quotation, setQuotation] = useState({});
    let [deliveryNote, setDeliveryNote] = useState({});
    let [type, setType] = useState("");


    function ResetSearchParams() {
        for (let key in searchParams) {
            if (searchParams.hasOwnProperty(key)) {
                searchParams[key] = "";
            }
        }
    }

    useImperativeHandle(ref, () => ({
        open(model, productType) {
            ResetSearchParams();

            setProductList([]);
            type = productType;
            setType(type);
            console.log("Model: ", model);
            if (!model)
                return;
            searchParams["linked_products_of_product_id"] = "";
            searchParams["delivery_note_products_of_delivery_note_id"] = "";
            searchParams["quotation_products_of_quotation_id"] = "";

            if (type === "linked_products") {
                product = model;
                setProduct(product);
                searchParams.linked_products_of_product_id = model.product_id;
            } else if (type === "quotation_products") {
                quotation = model;
                setQuotation(quotation);
                searchParams.quotation_products_of_quotation_id = model.id;
            } else if (type === "delivery_note_products") {
                deliveryNote = model;
                setDeliveryNote(deliveryNote);
                searchParams.delivery_note_products_of_delivery_note_id = model.id;
            }

            list();

            SetShow(true);
            setSelectedIds([]);
        },

    }));


    const countryOptions = useMemo(() => countryList().getData(), [])

    const cookies = useMemo(() => new Cookies(), []);

    // const selectedDate = new Date();

    //list
    const [productList, setProductList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(100);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);




    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);
    const [selectedProductCategories, setSelectedProductCategories] = useState([]);
    const [selectedProductBrands, setSelectedProductBrands] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);


    /*useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);*/

    //Search params
    let [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortProduct, setSortProduct] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    async function suggestCategories(searchTerm) {
        console.log("Inside handle suggest Categories");

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };

        if (cookies.get("store_id")) {
            params.store_id = cookies.get("store_id");
        }

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
            "/v1/product-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCategoryOptions(data.result);
    }

    async function suggestBrands(searchTerm) {
        console.log("Inside handle suggest Categories");

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };

        if (cookies.get("store_id")) {
            params.store_id = cookies.get("store_id");
        }

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
            "/v1/product-brand?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setBrandOptions(data.result);
    }


    function searchByFieldValue(field, value) {
        searchParams[field] = value;

        page = 1;
        setPage(page);
        list(); //load  only documents
    }


    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            // setSelectedCreatedByProducts(values);
        } else if (field === "category_id") {
            setSelectedProductCategories(values);
        } else if (field === "brand_id") {
            setSelectedProductBrands(values);
        } else if (field === "country_code") {
            setSelectedCountries(values);
        } else if (field === "product_id") {
            setSelectedProducts(values);
        }

        searchParams[field] = Object.values(values)
            .map(function (model) {
                if (model.id) {
                    return model.id;
                } else if (model.value) {
                    return model.value;
                }
                return "";

            })
            .join(",");

        page = 1;
        setPage(page);

        list(); //load  only documents
    }

    let [stock, setStock] = useState(0.00);
    let [retailStockValue, setRetailStockValue] = useState(0.00);
    let [wholesaleStockValue, setWholesaleStockValue] = useState(0.00);
    let [purchaseStockValue, setPurchaseStockValue] = useState(0.00);

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        /*let Select =
            "select=id,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,created_by_name,created_at,rack,product_stores";
        */
        let Select = "";

        if (cookies.get("store_id")) {
            // Select =
            //"select=id,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,product_stores." + cookies.get("store_id") + ".stock,product_stores." + cookies.get("store_id") + ".purchase_unit_price,product_stores." + cookies.get("store_id") + ".wholesale_unit_price,product_stores." + cookies.get("store_id") + ".retail_unit_price,product_stores." + cookies.get("store_id") + ".store_id";
            Select =
                "select=id,prefix_part_number,brand_name,country_name,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,created_by_name,created_at,rack,product_stores";

        } else {
            Select =
                "select=id,prefix_part_number,brand_name,country_name,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,created_by_name,created_at,rack,product_stores";


            //Select =
            //   "select=id,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,product_stores";
        }


        if (cookies.get("store_id")) {
            searchParams.store_id = cookies.get("store_id");
        }



        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

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



        setIsListLoading(true);
        fetch(
            "/v1/product?" +
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

                setProductList(data.result);
                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);
                console.log("docs loaded");

                stock = data.meta.stock;
                setStock(stock);

                retailStockValue = data.meta.retail_stock_value;
                setRetailStockValue(retailStockValue);

                wholesaleStockValue = data.meta.wholesale_stock_value;
                setWholesaleStockValue(wholesaleStockValue);

                purchaseStockValue = data.meta.purchase_stock_value;
                setPurchaseStockValue(purchaseStockValue);
                console.log("stats loaded");
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
        list(); //load only documents
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        setPageSize(pageSize);
        list(); //load  only documents
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list(); //load  only documents
    }

    const CreateFormRef = useRef();
    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }


    function openCreateForm() {
        let linkedProductID = product.product_id;
        CreateFormRef.current.open(undefined, linkedProductID);
    }


    const [productOptions, setProductOptions] = useState([]);
    //let [selectedProduct, setSelectedProduct] = useState([]);
    // let [selectedProducts, setSelectedProducts] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);
    let [openProductSearchResult, setOpenProductSearchResult] = useState(false);



    const suggestProducts = useCallback(async (searchTerm) => {
        //async function suggestProducts(searchTerm) {
        console.log("Inside handle suggestProducts");
        setProductOptions([]);


        if (!searchTerm) {
            //openProductSearchResult = false;
            console.log("no input");

            setTimeout(() => {
                setOpenProductSearchResult(false);
            }, 300);

            return;
        } else {
            console.log("searchTerm:" + searchTerm + "|");
        }

        var params = {
            search_text: searchTerm,
        };

        if (cookies.get("store_id")) {
            params.store_id = cookies.get("store_id");
        }


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

        let Select = `select=id,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${cookies.get('store_id')}.purchase_unit_price,product_stores.${cookies.get('store_id')}.retail_unit_price,product_stores.${cookies.get('store_id')}.stock`;
        setIsProductsLoading(true);

        let result = await fetch(
            "/v1/product?" + Select + queryString + "&limit=200",
            requestOptions
        )
        let data = await result.json();

        let products = data.result;
        if (!products || products.length === 0) {
            //openProductSearchResult = false;
            setOpenProductSearchResult(false);
            setIsProductsLoading(false);
            return;
        }

        //openProductSearchResult = true;
        setOpenProductSearchResult(true);
        setProductOptions(products);
        setIsProductsLoading(false);

    }, [cookies]);


    const SalesHistoryRef = useRef();
    function openSalesHistory(model) {
        SalesHistoryRef.current.open(model);
    }

    const SalesReturnHistoryRef = useRef();
    function openSalesReturnHistory(model) {
        SalesReturnHistoryRef.current.open(model);
    }


    const PurchaseHistoryRef = useRef();
    function openPurchaseHistory(model) {
        PurchaseHistoryRef.current.open(model);
    }

    const PurchaseReturnHistoryRef = useRef();
    function openPurchaseReturnHistory(model) {
        PurchaseReturnHistoryRef.current.open(model);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model) {
        QuotationHistoryRef.current.open(model);
    }


    const DeliveryNoteHistoryRef = useRef();
    function openDeliveryNoteHistory(model) {
        DeliveryNoteHistoryRef.current.open(model);
    }

    let [statsOpen, setStatsOpen] = useState(false);
    const handleSummaryToggle = (isOpen) => {
        statsOpen = isOpen
        setStatsOpen(statsOpen)

        if (isOpen) {
            list(); // Fetch stats only if it's opened and not fetched before
        }
    };


    //Select Products
    const [selectedIds, setSelectedIds] = useState([]);

    // Handle all select
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(productList.map((p) => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    // Handle individual selection
    const handleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const isAllSelected = selectedIds?.length === productList?.length;

    const handleSendSelected = () => {
        const selectedProducts = productList.filter((p) => selectedIds.includes(p.id));
        props.onSelectProducts(selectedProducts); // Send to parent
        handleClose();
    };





    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {type === "linked_products" ?
                            <div>
                                Select linked products of #{product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number} - {product.name} {product.name_in_arabic ? " / " + product.name_in_arabic : ""}
                            </div> : ""}
                        {type === "quotation_products" ?
                            <div>
                                Select products of Quotation #{quotation.code}
                            </div> : ""}
                        {type === "delivery_note_products" ?
                            <div>
                                Select products of Delivery Note #{deliveryNote.code}
                            </div> : ""}
                    </Modal.Title>

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
                    <>
                        <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
                        <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

                        <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
                        <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />

                        <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />

                        <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

                        <ProductCreate ref={CreateFormRef} refreshList={list} openDetailsView={openDetailsView} showToastMessage={props.showToastMessage} />
                        <ProductView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} showToastMessage={props.showToastMessage} />


                        <div className="container-fluid p-0">

                            <div className="row">
                                <div className="col">
                                    <span className="text-end">
                                        <StatsSummary
                                            title="Products"
                                            stats={{
                                                "Stock": stock,
                                                "Retail stock value": retailStockValue,
                                                "Wholesale stock value": wholesaleStockValue,
                                                "Purchase stock value": purchaseStockValue,
                                            }}
                                            onToggle={handleSummaryToggle}
                                        />
                                    </span>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col">
                                    <h1 className="h3">Products</h1>
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


                                <div className="col text-end">
                                    {/*
                        <Button
                            hide={true.toString()}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={openJsonDialog}
                        >
                            Get JSON for Bar Tender
    </Button>*/}
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
                                                        <p className="text-start">No Product Categories to display</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="row" style={{ bproduct: "solid 0px" }}>
                                                <div className="col text-start" style={{ bproduct: "solid 0px" }}>
                                                    <Button
                                                        onClick={() => {
                                                            setIsRefreshInProcess(true);
                                                            list(); //load  only documents
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
                                                            <button
                                                                style={{ marginBottom: "3px" }}
                                                                className="btn btn-success mt-2"
                                                                disabled={selectedIds.length === 0}
                                                                onClick={handleSendSelected}
                                                            >
                                                                Select {selectedIds.length} Product{selectedIds.length !== 1 ? "s" : ""}
                                                            </button>


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
                                                            <th>Select</th>
                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("part_number");
                                                                    }}
                                                                >
                                                                    Part Number
                                                                    {sortField === "part_number" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "part_number" && sortProduct === "" ? (
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
                                                                    {sortField === "name" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "name" && sortProduct === "" ? (
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
                                                                        sort("ean_12");
                                                                    }}
                                                                >
                                                                    Bar Code
                                                                    {sortField === "ean_12" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "ean_12" && sortProduct === "" ? (
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
                                                            sort("rack");
                                                        }}
                                                    >
                                                        Rack
                                                        {sortField === "rack" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "rack" && sortProduct === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
                                                        ) : null}
                                                    </b>
                                                        </th>*/}

                                                            <th>
                                                                <b
                                                                    style={{
                                                                        textDecoration: "underline",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={() => {
                                                                        sort("stores.purchase_unit_price");
                                                                    }}
                                                                >
                                                                    Purchase Unit Price
                                                                    {sortField === "stores.purchase_unit_price" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase_unit_price" && sortProduct === "" ? (
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
                                                                        sort("stores.wholesale_unit_price");
                                                                    }}
                                                                >
                                                                    Wholesale Unit Price
                                                                    {sortField === "stores.wholesale_unit_price" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.wholesale_unit_price" && sortProduct === "" ? (
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
                                                                        sort("stores.retail_unit_price");
                                                                    }}
                                                                >
                                                                    Retail Unit Price
                                                                    {sortField === "stores.retail_unit_price" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.retail_unit_price" && sortProduct === "" ? (
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
                                                            sort("stores.wholesale_unit_profit");
                                                        }}
                                                    >
                                                        Wholesale Unit Profit
                                                        {sortField === "stores.wholesale_unit_profit" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.wholesale_unit_profit" && sortProduct === "" ? (
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
                                                            sort("stores.wholesale_unit_profit_perc");
                                                        }}
                                                    >
                                                        Wholesale Unit Profit %
                                                        {sortField === "stores.wholesale_unit_profit_perc" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.wholesale_unit_profit_perc" && sortProduct === "" ? (
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
                                                            sort("stores.retail_unit_profit");
                                                        }}
                                                    >
                                                        Retail Unit Profit
                                                        {sortField === "stores.retail_unit_profit" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.retail_unit_profit" && sortProduct === "" ? (
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
                                                            sort("stores.retail_unit_profit_perc");
                                                        }}
                                                    >
                                                        Retail Unit Profit %
                                                        {sortField === "stores.retail_unit_profit_perc" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.retail_unit_profit_perc" && sortProduct === "" ? (
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
                                                                        sort("stores.stock");
                                                                    }}
                                                                >
                                                                    Stock
                                                                    {sortField === "stores.stock" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.stock" && sortProduct === "" ? (
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
                                                                        sort("category_name");
                                                                    }}
                                                                >
                                                                    Categories
                                                                    {sortField === "category_name" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "category_name" && sortProduct === "" ? (
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
                                                                        sort("brand_name");
                                                                    }}
                                                                >
                                                                    Brands
                                                                    {sortField === "brand_name" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "brand_name" && sortProduct === "" ? (
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
                                                                        sort("country_name");
                                                                    }}
                                                                >
                                                                    Countries
                                                                    {sortField === "country_name" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "country_name" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.sales_count" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_count" && sortProduct === "" ? (
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
                                                                        sort("stores.sales");
                                                                    }}
                                                                >
                                                                    Sales amount
                                                                    {sortField === "stores.sales" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales" && sortProduct === "" ? (
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
                                                                        sort("stores.sales_quantity");
                                                                    }}
                                                                >
                                                                    Sales quantity
                                                                    {sortField === "stores.sales_quantity" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_quantity" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.sales_profit" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_profit" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.sales_loss" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_loss" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.sales_return_count" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_return_count" && sortProduct === "" ? (
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
                                                                        sort("stores.sales_return");
                                                                    }}
                                                                >
                                                                    Sales return amount
                                                                    {sortField === "stores.sales_return" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_return" && sortProduct === "" ? (
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
                                                                        sort("stores.sales_return_quantity");
                                                                    }}
                                                                >
                                                                    Sales return quantity
                                                                    {sortField === "stores.sales_return_quantity" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_return_quantity" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.sales_return_profit" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_return_profit" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.sales_return_loss" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.sales_return_loss" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.purchase__count" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase__count" && sortProduct === "" ? (
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
                                                                        sort("stores.purchase");
                                                                    }}
                                                                >
                                                                    Purchase amount
                                                                    {sortField === "stores.purchase" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase" && sortProduct === "" ? (
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
                                                                        sort("stores.purchase_quantity");
                                                                    }}
                                                                >
                                                                    Purchase quantity
                                                                    {sortField === "stores.purchase_quantity" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase_quantity" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.purchase_return_count" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase_return_count" && sortProduct === "" ? (
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
                                                                        sort("stores.purchase_return");
                                                                    }}
                                                                >
                                                                    Purchase return amount
                                                                    {sortField === "stores.purchase_return" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase_return" && sortProduct === "" ? (
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
                                                                        sort("stores.purchase_return_quantity");
                                                                    }}
                                                                >
                                                                    Purchase return quantity
                                                                    {sortField === "stores.purchase_return_quantity" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.purchase_return_quantity" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.quotation_count" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.quotation_count" && sortProduct === "" ? (
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
                                                                        sort("stores.quotation");
                                                                    }}
                                                                >
                                                                    Quotation amount
                                                                    {sortField === "stores.quotation" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.quotation" && sortProduct === "" ? (
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
                                                                        sort("stores.quotation_quantity");
                                                                    }}
                                                                >
                                                                    Quotation quantity
                                                                    {sortField === "stores.quotation_quantity" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.quotation_quantity" && sortProduct === "" ? (
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
                                                                    {sortField === "stores.delivery_note_count" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.delivery_note_count" && sortProduct === "" ? (
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
                                                                        sort("stores.delivery_note_quantity");
                                                                    }}
                                                                >
                                                                    Delivery note quantity
                                                                    {sortField === "stores.delivery_note_quantity" && sortProduct === "-" ? (
                                                                        <i className="bi bi-sort-alpha-up-alt"></i>
                                                                    ) : null}
                                                                    {sortField === "stores.delivery_note_quantity" && sortProduct === "" ? (
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
                                                            sort("created_by_name");
                                                        }}
                                                    >
                                                        Created By
                                                        {sortField === "created_by_name" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "created_by_name" && sortProduct === "" ? (
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
                                                        {sortField === "created_at" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortProduct === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                        </th>
                                                <th>Actions</th>
                                                */}
                                                        </tr>
                                                    </thead>

                                                    <thead>
                                                        <tr className="text-center">
                                                            <th style={{ minWidth: "100px" }}></th>
                                                            <th>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllSelected}
                                                                    onChange={handleSelectAll}
                                                                /> All
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="part_number"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("part_number", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>

                                                            <th>
                                                                {/*<input
                                                        style={{ minWidth: "275px" }}
                                                        type="text"
                                                        id="name"
                                                        onChange={(e) =>
                                                            searchByFieldValue("name", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                    <Typeahead
                                                        id="product_id"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "category_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={categoryOptions}
                                                        placeholder="Select Categories"
                                                        selected={selectedProductCategories}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestCategories(searchTerm);
                                                        }}
                                                        multiple
                                                    />*/}

                                                                <Typeahead
                                                                    id="product_id"
                                                                    size="lg"
                                                                    labelKey="search_label"
                                                                    emptyLabel=""
                                                                    clearButton={false}
                                                                    open={openProductSearchResult}
                                                                    isLoading={isProductsLoading}
                                                                    onChange={(selectedItems) => {

                                                                        /*
                                                                        if (selectedItems.length === 0) {
                                                                            return;
                                                                        }*/

                                                                        searchByMultipleValuesField(
                                                                            "product_id",
                                                                            selectedItems
                                                                        );

                                                                        // addProduct(selectedItems[0]);

                                                                        setOpenProductSearchResult(false);
                                                                    }}
                                                                    options={productOptions}
                                                                    selected={selectedProducts}
                                                                    placeholder="Search By Name | Name in Arabic"
                                                                    highlightOnlyResult={true}
                                                                    onInputChange={(searchTerm, e) => {
                                                                        suggestProducts(searchTerm)
                                                                    }}
                                                                    multiple
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="ean_12"
                                                                    onChange={(e) => {
                                                                        if (e.target.value.length === 13) {
                                                                            e.target.value = e.target.value.slice(0, -1);
                                                                        }
                                                                        searchByFieldValue("ean_12", e.target.value)
                                                                    }}
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            {/*
 
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="rack"
                                                        onChange={(e) =>
                                                            searchByFieldValue("rack", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                    </th>*/}
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="purchase_unit_price"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("purchase_unit_price", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>

                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="wholesale_unit_price"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("wholesale_unit_price", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>

                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="retail_unit_price"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("retail_unit_price", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            {/*
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="wholesale_unit_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("wholesale_unit_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="wholesale_unit_profit_perc"
                                                        onChange={(e) =>
                                                            searchByFieldValue("wholesale_unit_profit_perc", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="retail_unit_profit"
                                                        onChange={(e) =>
                                                            searchByFieldValue("retail_unit_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="retail_unit_profit_perc"
                                                        onChange={(e) =>
                                                            searchByFieldValue("retail_unit_profit_perc", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                    */}
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id="stock"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("stock", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th style={{ minWidth: "250px" }}>
                                                                <Typeahead
                                                                    id="category_id"
                                                                    labelKey="name"
                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "category_id",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={categoryOptions}
                                                                    placeholder="Select Categories"
                                                                    selected={selectedProductCategories}
                                                                    highlightOnlyResult={true}
                                                                    onInputChange={(searchTerm, e) => {
                                                                        suggestCategories(searchTerm);
                                                                    }}
                                                                    multiple
                                                                />
                                                            </th>

                                                            <th style={{ minWidth: "250px" }}>
                                                                <Typeahead
                                                                    id="brand_id"
                                                                    labelKey="name"
                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "brand_id",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={brandOptions}
                                                                    placeholder="Select brands"
                                                                    selected={selectedProductBrands}
                                                                    highlightOnlyResult={true}
                                                                    onInputChange={(searchTerm, e) => {
                                                                        suggestBrands(searchTerm);
                                                                    }}
                                                                    multiple
                                                                />
                                                            </th>

                                                            <th style={{ minWidth: "250px" }}>
                                                                <Typeahead
                                                                    id="country_code"
                                                                    labelKey="label"
                                                                    onChange={(selectedItems) => {
                                                                        searchByMultipleValuesField(
                                                                            "country_code",
                                                                            selectedItems
                                                                        );
                                                                    }}
                                                                    options={countryOptions}
                                                                    placeholder="Select countries"
                                                                    selected={selectedCountries}
                                                                    highlightOnlyResult={true}
                                                                    onInputChange={(searchTerm, e) => {
                                                                        //suggestBrands(searchTerm);
                                                                    }}
                                                                    multiple
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
                                                                        searchByFieldValue("sales", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("sales_quantity", e.target.value)
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
                                                                        searchByFieldValue("sales_return_count", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("sales_return", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("sales_return_quantity", e.target.value)
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
                                                                        searchByFieldValue("purchase_count", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("purchase", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("purchase_quantity", e.target.value)
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
                                                                        searchByFieldValue("purchase_return", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("purchase_return_quantity", e.target.value)
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
                                                                        searchByFieldValue("quotation", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("quotation_quantity", e.target.value)
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
                                                                <input
                                                                    type="text"
                                                                    onChange={(e) =>
                                                                        searchByFieldValue("delivery_note_quantity", e.target.value)
                                                                    }
                                                                    className="form-control"
                                                                />
                                                            </th>
                                                            {/*<th>
                                                    <Typeahead
                                                        id="created_by"
                                                        labelKey="name"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "created_by",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={productOptions}
                                                        placeholder="Select Users"
                                                        selected={selectedCreatedByProducts}
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
                                                <th></th>*/}
                                                        </tr>
                                                    </thead>

                                                    <tbody className="text-center">
                                                        {productList &&
                                                            productList.map((product) => (
                                                                <tr key={product.id}>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}  >
                                                                        <span style={{ marginLeft: "-30px", }}>
                                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                                openUpdateForm(product.id);
                                                                            }}>
                                                                                <i className="bi bi-pencil"></i>
                                                                            </Button>&nbsp;

                                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                                openDetailsView(product.id);
                                                                            }} style={{ marginRight: "5px" }}>
                                                                                <i className="bi bi-eye"></i>
                                                                            </Button>

                                                                            <Dropdown style={{ marginLeft: "70px", height: "0px" }}>
                                                                                <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{ marginTop: "-48px", height: "28px" }}>

                                                                                </Dropdown.Toggle>

                                                                                <Dropdown.Menu>
                                                                                    <Dropdown.Item onClick={() => {
                                                                                        openSalesHistory(product);
                                                                                    }}>
                                                                                        <i className="bi bi-clock-history"></i>
                                                                                        &nbsp;
                                                                                        Sales History
                                                                                    </Dropdown.Item>
                                                                                    <Dropdown.Item onClick={() => {
                                                                                        openSalesReturnHistory(product);
                                                                                    }}>
                                                                                        <i className="bi bi-clock-history"></i>
                                                                                        &nbsp;
                                                                                        Sales Return History
                                                                                    </Dropdown.Item>
                                                                                    <Dropdown.Item onClick={() => {
                                                                                        openPurchaseHistory(product);
                                                                                    }}>
                                                                                        <i className="bi bi-clock-history"></i>
                                                                                        &nbsp;
                                                                                        Purchase History
                                                                                    </Dropdown.Item>
                                                                                    <Dropdown.Item onClick={() => {
                                                                                        openPurchaseReturnHistory(product);
                                                                                    }}>
                                                                                        <i className="bi bi-clock-history"></i>
                                                                                        &nbsp;
                                                                                        Purchase Return History
                                                                                    </Dropdown.Item>
                                                                                    <Dropdown.Item onClick={() => {
                                                                                        openDeliveryNoteHistory(product);
                                                                                    }}>
                                                                                        <i className="bi bi-clock-history"></i>
                                                                                        &nbsp;
                                                                                        Delivery Note History
                                                                                    </Dropdown.Item>
                                                                                    <Dropdown.Item onClick={() => {
                                                                                        openQuotationHistory(product);
                                                                                    }}>
                                                                                        <i className="bi bi-clock-history"></i>
                                                                                        &nbsp;
                                                                                        Quotation History
                                                                                    </Dropdown.Item>

                                                                                </Dropdown.Menu>
                                                                            </Dropdown>


                                                                            {/*
                                                            <button
                                                                className="btn btn-outline-secondary dropdown-toggle"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                                aria-expanded="false"
                                                                style={{ height: "28px" }}
                                                            ></button>
                                                            <ul className="dropdown-menu">
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openSalesHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Sales History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openPurchaseHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Purchase History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openSalesReturnHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Sales Return History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openPurchaseReturnHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Purchase Return History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openQuotationHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Quotation History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openDeliveryNoteHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Delivert Note History
                                                                    </button>
                                                                </li>
                                                            </ul>
                                                            */}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedIds.includes(product.id)}
                                                                            onChange={() => handleSelect(product.id)}
                                                                        />
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >{product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number}</td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start">
                                                                        <OverflowTooltip value={product.name + (product.name_in_arabic ? " | " + product.name_in_arabic : "")} maxWidth={300} />
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >{product.ean_12}</td>
                                                                    {/*<td>{product.rack}</td>*/}
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (
                                                                                    <b>{product.product_stores[key].purchase_unit_price?.toFixed(2)}</b>
                                                                                );
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase_unit_price?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].wholesale_unit_price?.toFixed(2)}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].wholesale_unit_price?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].retail_unit_price?.toFixed(2)}</b>);

                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].retail_unit_price?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].stock}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].stock}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    {/*
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                    if (product.product_stores[key].wholesale_unit_profit <= 0) {
                                                                        return (
                                                                            <OverlayTrigger
                                                                                key="right"
                                                                                placement="right"
                                                                                overlay={
                                                                                    <Tooltip id={`tooltip-right`}>
                                                                                        Wholesale unit profit should be greater than zero.
                                                                                    </Tooltip>
                                                                                }
                                                                            >
                                                                                <span className="badge bg-danger" data-bs-toggle="tooltip" title="Disabled tooltip" ><b> {product.product_stores[key].wholesale_unit_profit?.toFixed(2)}</b></span>
                                                                            </OverlayTrigger>
                                                                        );
                                                                    } else {
                                                                        return (<b>{product.product_stores[key].wholesale_unit_profit?.toFixed(2)}</b>);
                                                                    }
                                                                } else if (!cookies.get("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].wholesale_unit_profit?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                    if (product.product_stores[key].wholesale_unit_profit_perc <= 0) {
                                                                        return (
                                                                            <OverlayTrigger
                                                                                key="right"
                                                                                placement="right"
                                                                                overlay={
                                                                                    <Tooltip id={`tooltip-right`}>
                                                                                        Wholesale unit profit % should be greater than zero.
                                                                                    </Tooltip>
                                                                                }
                                                                            >
                                                                                <span className="badge bg-danger"  ><b> {product.product_stores[key].wholesale_unit_profit_perc?.toFixed(2) + "%"}</b></span>
                                                                            </OverlayTrigger>
                                                                        );
                                                                    } else {
                                                                        return (<b>{product.product_stores[key].wholesale_unit_profit_perc?.toFixed(2) + "%"}</b>);
                                                                    }
                                                                } else if (!cookies.get("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].wholesale_unit_profit_perc?.toFixed(2) + "%"}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                    if (product.product_stores[key].retail_unit_profit <= 0) {
                                                                        return (
                                                                            <OverlayTrigger
                                                                                key="right"
                                                                                placement="right"
                                                                                overlay={
                                                                                    <Tooltip id={`tooltip-right`}>
                                                                                        Reatail unit profit should be greater than zero.
                                                                                    </Tooltip>
                                                                                }
                                                                            >
                                                                                <span className="badge bg-danger" data-bs-toggle="tooltip" title="Disabled tooltip" ><b> {product.product_stores[key].retail_unit_profit?.toFixed(2)}</b></span>
                                                                            </OverlayTrigger>
                                                                        );
                                                                    } else {
                                                                        return (<b>{product.product_stores[key].retail_unit_profit?.toFixed(2)}</b>);
                                                                    }
                                                                } else if (!cookies.get("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].retail_unit_profit.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                    if (product.product_stores[key].retail_unit_profit_perc <= 0) {
                                                                        return (
                                                                            <OverlayTrigger
                                                                                key="right"
                                                                                placement="right"
                                                                                overlay={
                                                                                    <Tooltip id={`tooltip-right`}>
                                                                                        Retail unit profit % should be greater than zero.
                                                                                    </Tooltip>
                                                                                }
                                                                            >
                                                                                <span className="badge bg-danger" data-bs-toggle="tooltip" title="Disabled tooltip" ><b> {product.product_stores[key].retail_unit_profit_perc?.toFixed(2) + "%"}</b></span>
                                                                            </OverlayTrigger>
                                                                        );
                                                                    } else {
                                                                        return (<b>{product.product_stores[key].retail_unit_profit_perc?.toFixed(2) + "%"}</b>);
                                                                    }
                                                                } else if (!cookies.get("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].retail_unit_profit_perc?.toFixed(2) + "%"}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>*/}

                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <ul>
                                                                            {product.category_name &&
                                                                                product.category_name.map((name) => (
                                                                                    <li key={name}  >{name}</li>
                                                                                ))}
                                                                        </ul>
                                                                    </td>

                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <ul>
                                                                            {product.brand_name}
                                                                        </ul>
                                                                    </td>
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        <ul>
                                                                            {product.country_name}
                                                                        </ul>
                                                                    </td>

                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_count}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_quantity}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_profit}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_profit}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_loss}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_loss}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_return_count}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_return_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_return}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_return}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_return_quantity}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_return_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_return_profit}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_return_profit}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].sales_return_loss}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].sales_return_loss}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].purchase_count}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].purchase}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].purchase_quantity}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].purchase_return_count}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase_return_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].purchase_return}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase_return}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].purchase_return_quantity}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].purchase_return_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].quotation_count}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].quotation_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].quotation}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].quotation}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].quotation_quantity}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].quotation_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].delivery_note_count}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].delivery_note_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>
                                                                    <td>
                                                                        {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                            if (cookies.get("store_id") && product.product_stores[key].store_id === cookies.get("store_id")) {
                                                                                return (<b>{product.product_stores[key].delivery_note_quantity}</b>);
                                                                            } else if (!cookies.get("store_id")) {
                                                                                return (<li><b>{product.product_stores[key].delivery_note_quantiy}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                            }
                                                                            return ""
                                                                        })}
                                                                    </td>

                                                                    {/*} <td>{product.created_by_name}</td>
                                                        <td>
                                                            {format(
                                                                new Date(product.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>
                                                            */}
                                                                    {/*
                                                        <td>
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(product.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(product.id);
                                                            }}>
                                                                <i className="bi bi-eye"></i>
                                                            </Button>
                                                            &nbsp;  &nbsp;

                                                            <button
                                                                className="btn btn-outline-secondary dropdown-toggle"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                                aria-expanded="false"
                                                            ></button>
                                                            <ul className="dropdown-menu">
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openSalesHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Sales History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openPurchaseHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Purchase History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openSalesReturnHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Sales Return History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openPurchaseReturnHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Purchase Return History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openQuotationHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Quotation History
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button className="dropdown-item" onClick={() => {
                                                                        openDeliveryNoteHistory(product);
                                                                    }}>
                                                                        <i className="bi bi-clock-history"></i>
                                                                        &nbsp;
                                                                        Delivert Note History
                                                                    </button>
                                                                </li>
                                                            </ul>

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
                </Modal.Body>
            </Modal>
        </>);


});

export default Products;

