import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ProductCreate from "./create.js";
import ProductJson from "./json.js";
import ProductView from "./view.js";
import { confirm } from 'react-bootstrap-confirmation';

import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
//import { Button, Spinner, Badge, Tooltip, OverlayTrigger } from "react-bootstrap";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import SalesHistory from "./sales_history.js";
import SalesReturnHistory from "./sales_return_history.js";

import PurchaseHistory from "./purchase_history.js";
import PurchaseReturnHistory from "./purchase_return_history.js";

import QuotationHistory from "./quotation_history.js";
import QuotationSalesReturnHistory from "./quotation_sales_return_history.js";
import DeliveryNoteHistory from "./delivery_note_history.js";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Dropdown from 'react-bootstrap/Dropdown';
import StatsSummary from "../utils/StatsSummary.js";
import countryList from 'react-select-country-list'
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

function ProductIndex(props) {
    const countryOptions = useMemo(() => countryList().getData(), [])




    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());

    //list
    const [productList, setProductList] = useState([]);

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

    //Created By Product Auto Suggestion
    //const [productOptions, setProductOptions] = useState([]);
    const [selectedCreatedByProducts, setSelectedCreatedByProducts] = useState([]);

    //Created By Product Auto Suggestion
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);
    const [selectedProductCategories, setSelectedProductCategories] = useState([]);
    const [selectedProductBrands, setSelectedProductBrands] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);


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

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

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

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

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
            "/v1/product-brand?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setBrandOptions(data.result);
    }



    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggest Users");

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

        setProductOptions(data.result);
    }


    function searchByFieldValue(field, value) {
        searchParams[field] = value;

        page = 1;
        setPage(page);
        list(); //load  only documents
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


    function searchByMultipleValuesField(field, values, searchBy) {
        if (field === "created_by") {
            setSelectedCreatedByProducts(values);
        } else if (field === "category_id") {
            setSelectedProductCategories(values);
        } else if (field === "brand_id") {
            setSelectedProductBrands(values);
        } else if (field === "country_code") {
            setSelectedCountries(values);
        } else if (field === "product_id") {
            if (searchBy === "name") {
                setSelectedProductsByName(values);
            } else if (searchBy === "part_number") {
                setSelectedProductsByPartNo(values);
            } else if (searchBy === "all") {
                setSelectedProducts(values);
            }

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
                Authorization: localStorage.getItem("access_token"),
            },
        };
        /*let Select =
            "select=id,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,created_by_name,created_at,rack,product_stores";
        */
        let Select = "";

        if (localStorage.getItem("store_id")) {
            // Select =
            //"select=id,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,product_stores." + localStorage.getItem("store_id") + ".stock,product_stores." + localStorage.getItem("store_id") + ".purchase_unit_price,product_stores." + localStorage.getItem("store_id") + ".wholesale_unit_price,product_stores." + localStorage.getItem("store_id") + ".retail_unit_price,product_stores." + localStorage.getItem("store_id") + ".store_id";
            Select =
                "select=id,deleted,deleted_at,prefix_part_number,brand_name,country_name,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,category_id,created_by_name,created_at,rack,product_stores";

        } else {
            Select =
                "select=id,deleted,deleted_at,prefix_part_number,brand_name,country_name,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,category_id,created_by_name,created_at,rack,product_stores";


            //Select =
            //   "select=id,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,product_stores";
        }


        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
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


        // console.log("queryParams:", queryParams);
        //queryParams = encodeURIComponent(queryParams);

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
        CreateFormRef.current.open();
    }


    const ProductJsonDialogRef = useRef();
    /*
    function openJsonDialog() {
        let jsonContent = getProductsJson();
        ProductJsonDialogRef.current.open(jsonContent);
    }
    */


    /*
    function getProductsJson() {
        let jsonContent = [];
        for (let i = 0; i < productList.length; i++) {

            let price = getProductPrice(productList[i]);

            jsonContent.push({
                storename:       localStorage.getItem("store_name"),
                productname: productList[i].name,
                ean_12: productList[i].ean_12,
                rack: productList[i].rack,
                price: price.retail_unit_price,
                purchase_unit_price_secret: price.purchase_unit_price_secret,
            });
        }
        console.log("jsonContent:", jsonContent);
        return jsonContent;
    }
    */

    /*
    function getProductPrice(product) {
        let store_id = localStorage.getItem("store_id");
        let vat_percent = 0.15;
       

        if (!store_id || !product.stores) {
            return {
                retail_unit_price: "0.00",
                purchase_unit_price_secret: "",
            };
        }

        for (let i = 0; i < product.stores.length; i++) {
            if (product.stores[i].store_id === store_id) {
                let res = {
                    retail_unit_price: "0.00",
                    purchase_unit_price_secret: "",
                };

                if (product.stores[i].retail_unit_price) {
                    res.retail_unit_price = parseFloat(product.stores[i].retail_unit_price + parseFloat(product.stores[i].retail_unit_price * vat_percent)).toFixed(2);
                }

                if (product.stores[i].purchase_unit_price_secret) {
                    res.purchase_unit_price_secret = product.stores[i].purchase_unit_price_secret;
                }
                return res;
            }
        }
        return {
            retail_unit_price: "0.00",
            purchase_unit_price_secret: "",
        };
    }
    */

    const [productOptions, setProductOptions] = useState([]);
    let [selectedProducts, setSelectedProducts] = useState([]);
    // const [isProductsLoading, setIsProductsLoading] = useState(false);
    let [openProductSearchResult, setOpenProductSearchResult] = useState(false);

    const [productOptionsByPartNo, setProductOptionsByPartNo] = useState([]);
    let [selectedProductsByPartNo, setSelectedProductsByPartNo] = useState([]);
    let [openProductSearchResultByPartNo, setOpenProductSearchResultByPartNo] = useState(false);

    const [productOptionsByName, setProductOptionsByName] = useState([]);
    let [selectedProductsByName, setSelectedProductsByName] = useState([]);
    let [openProductSearchResultByName, setOpenProductSearchResultByName] = useState(false);

    const customFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

        const q = normalize(query);
        const qWords = q.split(" ");

        let partNoLabel = "";
        if (option.prefix_part_number) {
            partNoLabel = option.prefix_part_number + " - " + option.part_number;
        }

        const fields = [
            partNoLabel,
            option.prefix_part_number,
            option.part_number,
            option.name,
            option.name_in_arabic,
            option.country_name,
            option.brand_name,
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];

        const searchable = normalize(fields.join(" "));

        return qWords.every((word) => searchable.includes(word));
    }, []);

    const suggestProducts = useCallback(async (searchTerm, searchBy) => {
        //async function suggestProducts(searchTerm) {
        console.log("Inside handle suggestProducts");
        setProductOptions([]);


        if (!searchTerm) {
            //openProductSearchResult = false;
            console.log("no input");

            setTimeout(() => {
                if (searchBy === "name") {
                    setOpenProductSearchResultByName(false);
                } else if (searchBy === "part_number") {
                    setOpenProductSearchResultByPartNo(false);
                } else if (searchBy === "all") {
                    setOpenProductSearchResult(false);
                }
            }, 300);

            return;
        } else {
            console.log("searchTerm:" + searchTerm + "|");
        }

        var params = {
            search_text: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }


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

        let Select = `select=id,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock`;

        if (searchBy === "name") {
            // setIsProductsLoading(true);
        } else if (searchBy === "part_number") {
            //setIsProductsLoadingByPartNo(true);
        }



        let result = await fetch(
            "/v1/product?" + Select + queryString + "&limit=50&sort=-country_name",
            requestOptions
        )
        let data = await result.json();

        let products = data.result;
        if (!products || products.length === 0) {
            //openProductSearchResult = false;

            if (searchBy === "name") {
                setOpenProductSearchResultByName(false);
            } else if (searchBy === "part_number") {
                setOpenProductSearchResultByPartNo(false);
            } else if (searchBy === "all") {
                setOpenProductSearchResult(false);
            }


            return;
        }

        //openProductSearchResult = true;

        const filtered = products.filter((opt) => customFilter(opt, searchTerm));

        const sorted = filtered.sort((a, b) => {
            const aHasCountry = a.country_name && a.country_name.trim() !== "";
            const bHasCountry = b.country_name && b.country_name.trim() !== "";

            // If both have country, sort by country_name ascending
            if (aHasCountry && bHasCountry) {
                return a.country_name.localeCompare(b.country_name);
            }

            // If only a has country, it comes before b
            if (aHasCountry && !bHasCountry) {
                return -1;
            }

            // If only b has country, it comes before a
            if (!aHasCountry && bHasCountry) {
                return 1;
            }

            // Both have no country, keep original order or sort as needed
            return 0;
        });




        if (searchBy === "name") {
            setOpenProductSearchResultByName(true);
            setProductOptionsByName(sorted);
            // setIsProductsLoading(false);
        } else if (searchBy === "part_number") {
            setOpenProductSearchResultByPartNo(true);
            setProductOptionsByPartNo(sorted);

        } else if (searchBy === "all") {
            setOpenProductSearchResult(true);
            setProductOptions(sorted);
        }


    }, [customFilter]);

    /*
    const debouncedSuggestProducts = useMemo(
        () => debounce((searchTerm) => {
            console.log("Inside debounce", searchTerm);
            suggestProducts(searchTerm);
        }, 400),
        [suggestProducts]
    );

    // Then in your input change handler:
    const handleSuggestProducts = (searchTerm) => {
        debouncedSuggestProducts(searchTerm);
    };
    */

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
        QuotationHistoryRef.current.open(model, [], "quotation");
    }

    function openQuotationSalesHistory(model) {
        QuotationHistoryRef.current.open(model, [], "invoice");
    }



    const QuotationSalesReturnHistoryRef = useRef();
    function openQuotationSalesReturnHistory(model) {
        QuotationSalesReturnHistoryRef.current.open(model);
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


    function restoreProduct(id) {
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
            "/v1/product/restore/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Product restored successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }


    function deleteProduct(id) {
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
            "/v1/product/" + id + "?" + queryParams,
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

                if (props.showToastMessage) props.showToastMessage("Product deleted successfully!", "success");
                list();
            })
            .catch((error) => {

                console.log(error);
            });
    }

    const confirmDelete = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to delete this product?');
        console.log(result);
        if (result) {
            deleteProduct(id);
        }
    };

    const confirmRestore = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure, you want to restore this product?');
        console.log(result);
        if (result) {
            restoreProduct(id);
        }
    };

    let [deleted, setDeleted] = useState(false);


    const productSearchRef = useRef();
    const productSearchByPartNoRef = useRef();
    const productSearchByNameRef = useRef();
    const countrySearchRef = useRef();
    const brandSearchRef = useRef();
    const categorySearchRef = useRef();

    const timerRef = useRef(null);

    function getProductIndex(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].id === productID) {
                return i;
            }
        }
        return false;
    }


    function isProductAdded(productID) {
        for (var i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].id === productID) {
                return true;
            }
        }
        return false;
    }


    function removeProduct(product) {
        let index = selectedProducts.indexOf(product);
        if (index === -1) {
            index = getProductIndex(product.id);
        }


        if (index > -1) {
            selectedProducts.splice(index, 1);
        }
        setSelectedProducts([...selectedProducts]);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            list();
        }, 100);
    }


    return (
        <>
            <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
            <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

            <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
            <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />

            <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />

            <QuotationSalesReturnHistory ref={QuotationSalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

            <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

            <ProductCreate ref={CreateFormRef} refreshList={list} openDetailsView={openDetailsView} showToastMessage={props.showToastMessage} />
            <ProductView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} showToastMessage={props.showToastMessage} />
            <ProductJson ref={ProductJsonDialogRef} />

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
                                    <div className="col-md-12">
                                        <Typeahead
                                            id="product_search"
                                            ref={productSearchRef}
                                            filterBy={() => true}
                                            size="lg"
                                            labelKey="search_label"
                                            emptyLabel="No products found"
                                            clearButton={true}
                                            open={openProductSearchResult}
                                            isLoading={false}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") {
                                                    // setProductOptions([]);
                                                    setOpenProductSearchResult(false);
                                                    // productSearchRef.current?.clear();
                                                }
                                            }}
                                            onChange={(selectedItems) => {

                                                /*
                                                if (selectedItems.length === 0) {
                                                    return;
                                                }*/

                                                searchByMultipleValuesField(
                                                    "product_id",
                                                    selectedItems,
                                                    "all"
                                                );

                                                // addProduct(selectedItems[0]);

                                                setOpenProductSearchResult(false);
                                            }}
                                            options={productOptions}
                                            selected={selectedProducts}
                                            placeholder="Part No. | Name | Name in Arabic | Brand | Country"
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm, e) => {
                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                timerRef.current = setTimeout(() => {
                                                    suggestProducts(searchTerm, "all")
                                                }, 100);
                                            }}
                                            ignoreDiacritics={true}
                                            multiple
                                            renderMenu={(results, menuProps, state) => {
                                                const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                                return (
                                                    <Menu {...menuProps}>
                                                        {/* Header */}
                                                        <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                            <div style={{
                                                                background: '#f8f9fa',
                                                                zIndex: 2,
                                                                display: 'flex',
                                                                fontWeight: 'bold',
                                                                padding: '4px 8px',
                                                                borderBottom: '1px solid #ddd',
                                                            }}>
                                                                <div style={{ width: '3%' }}></div>
                                                                <div style={{ width: '18%' }}>Part Number</div>
                                                                <div style={{ width: '45%' }}>Name</div>
                                                                <div style={{ width: '9%' }}>Unit Price</div>
                                                                <div style={{ width: '5%' }}>Stock</div>
                                                                <div style={{ width: '10%' }}>Brand</div>
                                                                <div style={{ width: '10%' }}>Country</div>
                                                            </div>
                                                        </MenuItem>

                                                        {/* Rows */}
                                                        {results.map((option, index) => {
                                                            const isActive = state.activeIndex === index;
                                                            let checked = isProductAdded(option.id);
                                                            return (
                                                                <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                                    <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                        <div
                                                                            style={{ ...columnStyle, width: '3%' }}
                                                                            onClick={e => {
                                                                                e.stopPropagation();     // Stop click bubbling to parent MenuItem

                                                                                checked = !checked

                                                                                if (checked) {
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        selectedProducts.push(option);
                                                                                        setSelectedProducts([...selectedProducts]);
                                                                                        searchByMultipleValuesField(
                                                                                            "product_id",
                                                                                            selectedProducts,
                                                                                            "all"
                                                                                        );
                                                                                    }, 100);

                                                                                } else {
                                                                                    timerRef.current = setTimeout(() => {
                                                                                        removeProduct(option);
                                                                                    }, 100);

                                                                                }
                                                                            }}
                                                                        >
                                                                            <input

                                                                                type="checkbox"
                                                                                value={checked}
                                                                                checked={checked}
                                                                                onClick={e => {
                                                                                    e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                }}
                                                                                onChange={e => {
                                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                                    e.preventDefault();      // Prevent default selection behavior
                                                                                    e.stopPropagation();

                                                                                    checked = !checked

                                                                                    if (checked) {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            selectedProducts.push(option);
                                                                                            setSelectedProducts([...selectedProducts]);
                                                                                            searchByMultipleValuesField(
                                                                                                "product_id",
                                                                                                selectedProducts,
                                                                                                "all"
                                                                                            );
                                                                                        }, 100);

                                                                                    } else {
                                                                                        timerRef.current = setTimeout(() => {
                                                                                            removeProduct(option);
                                                                                        }, 100);

                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div style={{ ...columnStyle, width: '18%' }}>
                                                                            {highlightWords(
                                                                                option.prefix_part_number
                                                                                    ? `${option.prefix_part_number} - ${option.part_number}`
                                                                                    : option.part_number,
                                                                                searchWords,
                                                                                isActive
                                                                            )}
                                                                        </div>
                                                                        <div style={{ ...columnStyle, width: '45%' }}>
                                                                            {highlightWords(
                                                                                option.name_in_arabic
                                                                                    ? `${option.name} - ${option.name_in_arabic}`
                                                                                    : option.name,
                                                                                searchWords,
                                                                                isActive
                                                                            )}
                                                                        </div>
                                                                        <div style={{ ...columnStyle, width: '9%' }}>
                                                                            {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (
                                                                                <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />
                                                                            )}
                                                                        </div>
                                                                        <div style={{ ...columnStyle, width: '5%' }}>
                                                                            {option.product_stores?.[localStorage.getItem("store_id")]?.stock ?? ''}
                                                                        </div>
                                                                        <div style={{ ...columnStyle, width: '10%' }}>
                                                                            {highlightWords(option.brand_name, searchWords, isActive)}
                                                                        </div>
                                                                        <div style={{ ...columnStyle, width: '10%' }}>
                                                                            {highlightWords(option.country_name, searchWords, isActive)}
                                                                        </div>
                                                                    </div>
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Menu>
                                                );
                                            }}
                                        />
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
                                <div className="table-responsive" style={{ overflowX: "auto", overflowY: "auto", minHeight: "500px", maxHeight: "500px" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                <th>Deleted</th>
                                                <th style={{}}>Actions</th>
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
                                                            sort("stores.quotation_sales_count");
                                                        }}
                                                    >
                                                        Qtn. Sales count
                                                        {sortField === "stores.quotation_sales_count" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_sales_count" && sortProduct === "" ? (
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
                                                            sort("stores.quotation_sales");
                                                        }}
                                                    >
                                                        Qtn. Sales amount
                                                        {sortField === "stores.quotation_sales" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_sales" && sortProduct === "" ? (
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
                                                            sort("stores.quotation_sales_quantity");
                                                        }}
                                                    >
                                                        Qtn. Sales quantity
                                                        {sortField === "stores.quotation_sales_quantity" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_sales_quantity" && sortProduct === "" ? (
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
                                                            sort("stores.quotation_sales_return_count");
                                                        }}
                                                    >
                                                        Qtn. Sales Return count
                                                        {sortField === "stores.quotation_sales_return_count" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_sales_return_count" && sortProduct === "" ? (
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
                                                            sort("stores.quotation_sales_return");
                                                        }}
                                                    >
                                                        Qtn. Sales Return amount
                                                        {sortField === "stores.quotation_sales_return" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_sales_return" && sortProduct === "" ? (
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
                                                            sort("stores.quotation_sales_return_quantity");
                                                        }}
                                                    >
                                                        Qtn. Sales Return quantity
                                                        {sortField === "stores.quotation_sales_return_quantity" && sortProduct === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "stores.quotation_sales_return_quantity" && sortProduct === "" ? (
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
                                                <th style={{ minWidth: "100px" }}></th>

                                                <th style={{ minWidth: "250px" }}>
                                                    <Typeahead
                                                        id="product_search_by_part_no"
                                                        filterBy={() => true}
                                                        size="lg"
                                                        ref={productSearchByPartNoRef}
                                                        labelKey="search_label"
                                                        emptyLabel="No products found"
                                                        open={openProductSearchResultByPartNo}
                                                        isLoading={false}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setProductOptionsByPartNo([]);
                                                                setOpenProductSearchResultByPartNo(false);
                                                                productSearchByPartNoRef.current?.clear();
                                                            }
                                                        }}
                                                        onChange={(selectedItems) => {

                                                            /*
                                                            if (selectedItems.length === 0) {
                                                                return;
                                                            }*/

                                                            searchByMultipleValuesField(
                                                                "product_id",
                                                                selectedItems,
                                                                "part_number"
                                                            );

                                                            // addProduct(selectedItems[0]);

                                                            setOpenProductSearchResultByPartNo(false);
                                                        }}
                                                        options={productOptionsByPartNo}
                                                        selected={selectedProductsByPartNo}
                                                        placeholder="Search By Part #"
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                suggestProducts(searchTerm, "part_number")
                                                            }, 100);
                                                        }}
                                                        ignoreDiacritics={true}

                                                        multiple
                                                    />

                                                    {/*<input
                                                        type="text"
                                                        id="product_search_by_part_number"
                                                        name="product_search_by_part_number"
                                                        onChange={(e) =>
                                                            searchByFieldValue("part_number", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />*/}
                                                </th>

                                                <th style={{ minWidth: "250px" }}>
                                                    <Typeahead
                                                        id="product_search_by_name"
                                                        ref={productSearchByNameRef}
                                                        filterBy={() => true}
                                                        size="lg"
                                                        labelKey="search_label"
                                                        emptyLabel="No products found"
                                                        clearButton={true}
                                                        open={openProductSearchResultByName}
                                                        isLoading={false}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setProductOptionsByName([]);
                                                                setOpenProductSearchResultByName(false);
                                                                productSearchByNameRef.current?.clear();
                                                            }
                                                        }}
                                                        onChange={(selectedItems) => {

                                                            /*
                                                            if (selectedItems.length === 0) {
                                                                return;
                                                            }*/

                                                            searchByMultipleValuesField(
                                                                "product_id",
                                                                selectedItems,
                                                                "name"
                                                            );

                                                            // addProduct(selectedItems[0]);

                                                            setOpenProductSearchResultByName(false);
                                                        }}
                                                        options={productOptionsByName}
                                                        selected={selectedProductsByName}
                                                        placeholder="Search By Name | Name in Arabic"
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                suggestProducts(searchTerm, "name")
                                                            }, 100);
                                                        }}
                                                        ignoreDiacritics={true}

                                                        multiple
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="product_search_by_ean_12"
                                                        name="product_search_by_part_number_ean_12"
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
                                                        id="product_search_by_purchase_unit_price"
                                                        name="product_search_by_purchase_unit_price"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_unit_price", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="product_search_by_wholesale_unit_price"
                                                        name="product_search_by_wholesale_unit_price"
                                                        onChange={(e) =>
                                                            searchByFieldValue("wholesale_unit_price", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="product_search_by_retail_unit_price"
                                                        name="product_search_by_retail_unit_price"
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
                                                        id="product_search_by_stock"
                                                        name="product_search_by_stock"
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
                                                        ref={categorySearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setCategoryOptions([]);
                                                                categorySearchRef.current?.clear();
                                                            }
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
                                                        ref={brandSearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                setBrandOptions([]);
                                                                brandSearchRef.current?.clear();
                                                            }
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
                                                        ref={countrySearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                countrySearchRef.current?.clear();
                                                            }
                                                        }}
                                                        onInputChange={(searchTerm, e) => {
                                                            //suggestBrands(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        type="text"
                                                        id="product_search_by_sales_count"
                                                        name="product_search_by_sales_count"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales"
                                                        name="product_search_by_sales"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_quantity"
                                                        name="product_search_by_sales_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_profit"
                                                        name="product_search_by_sales_profit"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_loss"
                                                        name="product_search_by_sales_loss"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_return_count"
                                                        name="product_search_by_sales_return_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_count"
                                                        name="product_search_by_sales_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_return_quantity"
                                                        name="product_search_by_sales_return_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_return_profit"
                                                        name="product_search_by_sales_return_profit"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_profit", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_sales_return_loss"
                                                        name="product_search_by_sales_return_loss"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("sales_return_loss", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_purchase_count"
                                                        name="product_search_by_purchase_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_purchase"
                                                        name="product_search_by_purchase"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_purchase_quantity"
                                                        name="product_search_by_purchase_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>

                                                <th>
                                                    <input
                                                        id="product_search_by_purchase_return_count"
                                                        name="product_search_by_purchase_return_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_purchase_return"
                                                        name="product_search_by_purchase_return"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_purchase_return_quantity"
                                                        name="product_search_by_purchase_return_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("purchase_return_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_count"
                                                        name="product_search_by_quotation_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation"
                                                        name="product_search_by_quotation"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_quantity"
                                                        name="product_search_by_quotation_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_sales_count"
                                                        name="product_search_by_quotation_sales_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_sales_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_sales"
                                                        name="product_search_by_quotation_sales"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_sales", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_sales_quantity"
                                                        name="product_search_by_quotation_sales_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_sales_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_sales_return_count"
                                                        name="product_search_by_quotation_sales_return_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_sales_return_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_sales_return"
                                                        name="product_search_by_quotation_sales_return"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_sales_return", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_quotation_sales_quantity"
                                                        name="product_search_by_quotation_sales_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("quotation_sales_quantity", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_delivery_note_count"
                                                        name="product_search_by_delivery_note_count"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("delivery_note_count", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        id="product_search_by_delivery_note_quantity"
                                                        name="product_search_by_delivery_note_quantity"
                                                        type="text"
                                                        onChange={(e) =>
                                                            searchByFieldValue("delivery_note_quantity", e.target.value)
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
                                                        isClearable={true}
                                                        onChange={(date) => {
                                                            if (!date) {
                                                                setCreatedAtValue("");
                                                                searchByDateField("created_at", "");
                                                                return;
                                                            }
                                                            searchByDateField("created_at", date);
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
                                                                selected={selectedFromDate}
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
                                                                    selectedFromDate = date;
                                                                    setSelectedFromDate(date);
                                                                }}
                                                            />
                                                            To:{" "}
                                                            <DatePicker
                                                                id="created_at_to"
                                                                value={createdAtToValue}
                                                                selected={selectedToDate}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
                                                                isClearable={true}
                                                                onChange={(date) => {
                                                                    if (!date) {
                                                                        setCreatedAtFromValue("");
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                    selectedToDate = date;
                                                                    setSelectedToDate(date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {productList &&
                                                productList.map((product) => (
                                                    <tr key={product.id}>
                                                        <td>{product.deleted ? "YES" : "NO"}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}  >
                                                            <span style={{ marginLeft: "-40px" }}>
                                                                {!product.deleted && <Button className="btn btn-danger btn-sm" onClick={() => {
                                                                    confirmDelete(product.id);
                                                                }}>
                                                                    <i className="bi bi-trash"></i>
                                                                </Button>}
                                                                {product.deleted && <Button className="btn btn-success btn-sm" onClick={() => {
                                                                    confirmRestore(product.id);
                                                                }}>
                                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                                </Button>}

                                                                <Button className="btn btn-light btn-sm" onClick={() => {
                                                                    openUpdateForm(product.id);
                                                                }}>
                                                                    <i className="bi bi-pencil"></i>
                                                                </Button>&nbsp;

                                                                <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                    openDetailsView(product.id);
                                                                }} style={{}}>
                                                                    <i className="bi bi-eye"></i>
                                                                </Button>

                                                                <Dropdown drop="down" style={{ marginLeft: "100px", marginTop: "-27px" }} >
                                                                    <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{ height: "27px" }}>

                                                                    </Dropdown.Toggle>

                                                                    <Dropdown.Menu >
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
                                                                        <Dropdown.Item onClick={() => {
                                                                            openQuotationSalesHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Qtn. Sales History
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openQuotationSalesReturnHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Qtn. Sales Return History
                                                                        </Dropdown.Item>

                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </span>
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} className="bold-stronger" >{product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start">

                                                            <OverflowTooltip value={product.name + (product.name_in_arabic ? " | " + product.name_in_arabic : "")} maxWidth={300} />
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{product.ean_12}</td>
                                                        {/*<td>{product.rack}</td>*/}
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (
                                                                        <b>
                                                                            {product.product_stores[key].purchase_unit_price?.toFixed(2)}

                                                                        </b>
                                                                    );
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase_unit_price?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>
                                                                        {product.product_stores[key].wholesale_unit_price?.toFixed(2)}

                                                                    </b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].wholesale_unit_price?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>
                                                                        {product.product_stores[key].retail_unit_price?.toFixed(2)}
                                                                    </b>);

                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].retail_unit_price?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].stock}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].stock}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        {/*
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
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
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].wholesale_unit_profit?.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
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
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].wholesale_unit_profit_perc?.toFixed(2) + "%"}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
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
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].retail_unit_profit.toFixed(2)}</b> {"@" + product.product_stores[key].store_name}</li>);
                                                                }

                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
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
                                                                } else if (!localStorage.getItem("store_id")) {
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
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_profit}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_profit}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_loss}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_loss}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_return_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_return_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_return}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_return}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_return_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_return_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_return_profit}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_return_profit}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].sales_return_loss}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].sales_return_loss}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].purchase_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].purchase}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].purchase_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].purchase_return_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase_return_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].purchase_return}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase_return}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].purchase_return_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].purchase_return_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_sales_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_sales_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_sales}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_sales}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_sales_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_sales_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_sales_return_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_sales_return_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_sales_return}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_sales_return}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].quotation_sales_return_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].quotation_sales_return_quantity}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].delivery_note_count}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].delivery_note_count}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>
                                                        <td>
                                                            {product.product_stores && Object.keys(product.product_stores).map((key, index) => {
                                                                if (localStorage.getItem("store_id") && product.product_stores[key].store_id === localStorage.getItem("store_id")) {
                                                                    return (<b>{product.product_stores[key].delivery_note_quantity}</b>);
                                                                } else if (!localStorage.getItem("store_id")) {
                                                                    return (<li><b>{product.product_stores[key].delivery_note_quantiy}</b> {"@" + product.product_stores[key].sales_name}</li>);
                                                                }
                                                                return ""
                                                            })}
                                                        </td>

                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >{product.created_by_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {format(
                                                                new Date(product.created_at),
                                                                "MMM dd yyyy h:mma"
                                                            )}
                                                        </td>


                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
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

export default ProductIndex;
