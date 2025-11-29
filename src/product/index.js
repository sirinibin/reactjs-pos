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
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import SalesHistory from "./sales_history.js";
import ProductHistory from "./product_history.js";
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
import ImageViewerModal from './../utils/ImageViewerModal';
import Products from "../utils/products.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

function ProductIndex(props) {
    const countryOptions = useMemo(() => countryList().getData(), [])

    let [enableSelection, setEnableSelection] = useState(false);


    /*
    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());*/

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
    //    const [selectedCreatedByProducts, setSelectedCreatedByProducts] = useState([]);

    //Created By Product Auto Suggestion
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);
    const [selectedProductCategories, setSelectedProductCategories] = useState([]);
    const [selectedProductBrands, setSelectedProductBrands] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);


    useEffect(() => {
        if (props.enableSelection) {
            setEnableSelection(props.enableSelection);
        } else {
            setEnableSelection(false);
        }


        searchParams["linked_products_of_product_id"] = "";

        if (props.type === "linked_products") {
            if (props.model?.product_id) {
                searchParams.linked_products_of_product_id = props.model.product_id;
            } else if (props.model?.id) {
                searchParams.linked_products_of_product_id = props.model.id;
            }
        }

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

        setUserOptions(data.result);
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
            setSelectedCreatedByUsers(values);
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

    let [sales, setSales] = useState(0.00);
    let [salesReturn, setSalesReturn] = useState(0.00);
    let [salesProfit, setSalesProfit] = useState(0.00);
    let [salesReturnProfit, setSalesReturnProfit] = useState(0.00);

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
                "select=id,is_set,deleted,deleted_at,prefix_part_number,brand_name,country_name,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,category_id,created_by_name,created_at,rack,product_stores";

        }


        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        if (selectedWarehouse.warehouse_code) {
            searchParams.warehouse_code = selectedWarehouse.warehouse_code;
        } else {
            searchParams.warehouse_code = "";
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

                sales = data.meta.sales;
                setSales(sales);

                salesProfit = data.meta.sales_profit;
                setSalesProfit(salesProfit);

                salesReturn = data.meta.sales_return;
                setSalesReturn(salesReturn);

                salesReturnProfit = data.meta.sales_return_profit;
                setSalesReturnProfit(salesReturnProfit);

            })
            .catch((error) => {
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                console.log(error);
            });
    }

    function sort(field) {
        if (selectedWarehouse.warehouse_code) {
            if (field === "stores.stock") {
                field = "stores.warehouse_stocks." + selectedWarehouse.warehouse_code;
            } else if (field === "stores.sales_count") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_count";
            } else if (field === "stores.sales_quantity") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_quantity";
            } else if (field === "stores.sales") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales";
            } else if (field === "stores.sales_profit") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_profit";
            } else if (field === "stores.sales_loss") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_loss";
            } else if (field === "stores.sales_return_count") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_return_count";
            } else if (field === "stores.sales_return_quantity") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_return_quantity";
            } else if (field === "stores.sales_return") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_return";
            } else if (field === "stores.sales_return_profit") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_return_profit";
            } else if (field === "stores.sales_return_loss") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".sales_return_loss";
            } else if (field === "stores.purchase_return_count") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".purchase_return_count";
            } else if (field === "stores.purchase_return_quantity") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".purchase_return_quantity";
            } else if (field === "stores.purchase_return") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".purchase_return";
            } else if (field === "stores.purchase_count") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".purchase_count";
            } else if (field === "stores.purchase_quantity") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".purchase_quantity";
            } else if (field === "stores.purchase") {
                field = "stores.product_warehouses." + selectedWarehouse.warehouse_code + ".purchase";
            }
        }


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
            partNoLabel = option.prefix_part_number + "-" + option.part_number;
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

    const latestRequestRef = useRef(0);

    const suggestProducts = useCallback(async (searchTerm, searchBy) => {
        const requestId = Date.now();
        latestRequestRef.current = requestId;

        setProductOptions([]);

        if (!searchTerm) {
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

        let Select = `select=id,rack,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.warehouse_stocks`;

        // Fetch page 1 and page 2 in parallel
        const urls = [
            `/v1/product?${Select}${queryString}&limit=200&page=1&sort=-country_name`,
            `/v1/product?${Select}${queryString}&limit=200&page=2&sort=-country_name`
        ];

        const [result1, result2] = await Promise.all([
            fetch(urls[0], requestOptions),
            fetch(urls[1], requestOptions)
        ]);

        const data1 = await result1.json();
        const data2 = await result2.json();

        // Only update if this is the latest request
        if (latestRequestRef.current !== requestId) return;

        // Combine results from both pages
        let products = [
            ...(data1.result || []),
            ...(data2.result || [])
        ];

        if (!products || products.length === 0) {
            if (searchBy === "name") {
                setOpenProductSearchResultByName(false);
            } else if (searchBy === "part_number") {
                setOpenProductSearchResultByPartNo(false);
            } else if (searchBy === "all") {
                setOpenProductSearchResult(false);
            }
            return;
        }

        const filtered = products.filter((opt) => customFilter(opt, searchTerm));

        const sorted = filtered.sort((a, b) => {
            const aHasCountry = a.country_name && a.country_name.trim() !== "";
            const bHasCountry = b.country_name && b.country_name.trim() !== "";

            if (aHasCountry && bHasCountry) {
                return a.country_name.localeCompare(b.country_name);
            }
            if (aHasCountry && !bHasCountry) {
                return -1;
            }
            if (!aHasCountry && bHasCountry) {
                return 1;
            }

            const words = searchTerm.toLowerCase().split(" ").filter(Boolean);
            const aPercent = percentOccurrence(words, a);
            const bPercent = percentOccurrence(words, b);

            if (aPercent !== bPercent) {
                return bPercent - aPercent;
            }
            return 0;
        });

        if (searchBy === "name") {
            setOpenProductSearchResultByName(true);
            setProductOptionsByName(sorted);
        } else if (searchBy === "part_number") {
            setOpenProductSearchResultByPartNo(true);
            setProductOptionsByPartNo(sorted);
        } else if (searchBy === "all") {
            setOpenProductSearchResult(true);
            setProductOptions(sorted);
        }
    }, [customFilter]);

    // Helper to calculate percentage of occurrence of search words
    const percentOccurrence = (words, product) => {
        let partNoLabel = product.prefix_part_number ? product.prefix_part_number + "-" + product.part_number : "";
        const fields = [
            partNoLabel,
            product.prefix_part_number,
            product.part_number,
            product.name,
            product.name_in_arabic,
            product.country_name,
            product.brand_name,
            ...(Array.isArray(product.additional_keywords) ? product.additional_keywords : []),
        ];
        const searchable = fields.join(" ").toLowerCase();
        const searchableWords = searchable.split(/\s+/).filter(Boolean);
        let totalMatches = 0;
        words.forEach(word => {
            if (word) {
                const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]/]/g, '\\$&')}\\b`, 'gi');
                //  const regex = new RegExp(`\\b${word}\\b`, 'gi');
                const matches = searchable.match(regex);
                totalMatches += matches ? matches.length : 0;
            }
        });
        // Percentage: matches / total words in searchable fields
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };

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

    const ProductsRef = useRef();
    function openLinkedProducts(model) {
        ProductsRef.current.open(false, "linked_products", model);
    }

    const ProductHistoryRef = useRef();
    function openProductHistory(model) {
        ProductHistoryRef.current.open(model);
    }

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

    const imageViewerRef = useRef();
    let [productImages, setProductImages] = useState([]);

    async function openProductImages(id) {
        let product = await getProductObj(id);
        productImages = product?.images;
        setProductImages(productImages);
        imageViewerRef.current.open(0);
    }



    async function getProductObj(id) {
        const requestOptions = {
            method: "GET",
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

        try {
            const response = await fetch(`/v1/product/${id}?select=id,images,store_id&${queryParams}`, requestOptions);
            const isJson = response.headers.get("content-type")?.includes("application/json");
            const data = isJson ? await response.json() : null;

            if (!response.ok) {
                const error = data?.errors || "Unknown error";
                throw error;
            }

            return data.result;  // ✅ return the result here
        } catch (error) {
            return null;  // ✅ explicitly return null or a fallback if there's an error
        }
    }
    const SHORTCUTS = {
        DEFAULT: {
            linkedProducts: "Ctrl + Shift + 1",
            productHistory: "Ctrl + Shift + 2",
            salesHistory: "Ctrl + Shift + 3",
            salesReturnHistory: "Ctrl + Shift + 4",
            purchaseHistory: "Ctrl + Shift + 5",
            purchaseReturnHistory: "Ctrl + Shift + 6",
            deliveryNoteHistory: "Ctrl + Shift + 7",
            quotationHistory: "Ctrl + Shift + 8",
            quotationSalesHistory: "Ctrl + Shift + 9",
            quotationSalesReturnHistory: "Ctrl + Shift + Z",
            images: "Ctrl + Shift + F",
        },
        LGK: {
            linkedProducts: "F10",
            productHistory: "Ctrl + Shift + B",
            salesHistory: "F4",
            salesReturnHistory: "F9",
            purchaseHistory: "F6",
            purchaseReturnHistory: "F8",
            deliveryNoteHistory: "F3",
            quotationHistory: "F2",
            quotationSalesHistory: "Ctrl + Shift + P",
            quotationSalesReturnHistory: "Ctrl + Shift + Z",
            images: "Ctrl + Shift + F",
        },
        MBDI: {
            linkedProducts: "F10",
            productHistory: "Ctrl + Shift + 6",
            salesHistory: "F4",
            salesReturnHistory: "F9",
            purchaseHistory: "F6",
            purchaseReturnHistory: "F8",
            deliveryNoteHistory: "F3",
            quotationHistory: "F2",
            quotationSalesHistory: "Ctrl + Shift + 7",
            quotationSalesReturnHistory: "Ctrl + Shift + 8",
            images: "Ctrl + Shift + 9",
        },
    };

    function getShortcut(key) {
        const code = (store && store.code) ? store.code : "DEFAULT";
        return (SHORTCUTS[code] && SHORTCUTS[code][key]) || SHORTCUTS.DEFAULT[key] || "";
    }
    // ...existing code...
    function RunKeyActions(event, product) {
        // detect mac
        const isMac = (typeof navigator !== "undefined") && (
            (navigator.userAgentData && navigator.userAgentData.platform === "macOS") ||
            (navigator.platform && /mac/i.test(navigator.platform)) ||
            /Mac/i.test(navigator.userAgent)
        );
        const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

        // LGK store uses original simple mapping
        if (store?.code === "LGK") {
            if (event.key === "F10") {
                openLinkedProducts(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'b') {
                openProductHistory(product);
            } else if (event.key === "F4") {
                openSalesHistory(product);
            } else if (event.key === "F9") {
                openSalesReturnHistory(product);
            } else if (event.key === "F6") {
                openPurchaseHistory(product);
            } else if (event.key === "F8") {
                openPurchaseReturnHistory(product);
            } else if (event.key === "F3") {
                openDeliveryNoteHistory(product);
            } else if (event.key === "F2") {
                openQuotationHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
                openQuotationSalesHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'z') {
                openQuotationSalesReturnHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'f') {
                openProductImages(product.product_id);
            }
            return;
        } else if (store?.code === "MBDI") {
            if (event.key === "F10") {
                openLinkedProducts(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '6') {
                openProductHistory(product);
            } else if (event.key === "F4") {
                openSalesHistory(product);
            } else if (event.key === "F9") {
                openSalesReturnHistory(product);
            } else if (event.key === "F6") {
                openPurchaseHistory(product);
            } else if (event.key === "F8") {
                openPurchaseReturnHistory(product);
            } else if (event.key === "F3") {
                openDeliveryNoteHistory(product);
            } else if (event.key === "F2") {
                openQuotationHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '7') {
                openQuotationSalesHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '8') {
                openQuotationSalesReturnHistory(product);
            } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '9') {
                openProductImages(product.product_id);
            }
            return;
        }

        // Default: require Ctrl/Cmd + Shift for letter shortcuts and numeric mapping
        if (!isCmdOrCtrl || !event.shiftKey) return;

        const rawKey = event.key || "";
        const key = rawKey.toString().toLowerCase();
        const code = event.code || "";
        const keyCode = event.which || event.keyCode || 0;
        const location = event.location || 0; // 3 === Numpad

        // handle letter shortcuts first (Ctrl/Cmd + Shift + <letter>)
        if (key === "b") {
            try { event.preventDefault(); } catch (e) { }
            openProductHistory(product);
            return;
        }
        if (key === "p") {
            try { event.preventDefault(); } catch (e) { }
            openQuotationSalesHistory(product);
            return;
        }
        if (key === "z") {
            try { event.preventDefault(); } catch (e) { }
            openQuotationSalesReturnHistory(product);
            return;
        }
        if (key === "f") {
            try { event.preventDefault(); } catch (e) { }
            openProductImages(product.product_id);
            return;
        }

        // numeric mapping (supports top-row, numpad, shifted symbols and keyCode fallbacks)
        const codeToDigit = {
            Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
            Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
            Numpad1: "1", Numpad2: "2", Numpad3: "3", Numpad4: "4", Numpad5: "5",
            Numpad6: "6", Numpad7: "7", Numpad8: "8", Numpad9: "9", Numpad0: "0"
        };

        const symbolToDigit = {
            "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
            "^": "6", "&": "7", "*": "8", "(": "9", ")": "0"
        };

        let digit = null;

        if (code && codeToDigit[code]) {
            digit = codeToDigit[code];
        } else if (rawKey && symbolToDigit[rawKey]) {
            digit = symbolToDigit[rawKey];
        } else if (/^[0-9]$/.test(key)) {
            digit = key;
        } else if (keyCode >= 48 && keyCode <= 57) {
            digit = String(keyCode - 48);
        } else if (keyCode >= 96 && keyCode <= 105) {
            digit = String(keyCode - 96);
        } else if (location === 3 && /^[0-9]$/.test(key)) {
            digit = key;
        }

        if (digit) {
            try { event.preventDefault(); } catch (e) { /* ignore */ }

            switch (digit) {
                case "1": openLinkedProducts(product); return;
                case "2": openProductHistory(product); return;
                case "3": openSalesHistory(product); return;
                case "4": openSalesReturnHistory(product); return;
                case "5": openPurchaseHistory(product); return;
                case "6": openPurchaseReturnHistory(product); return;
                case "7": openDeliveryNoteHistory(product); return;
                case "8": openQuotationHistory(product); return;
                case "9": openQuotationSalesHistory(product); return;
                case "0": openQuotationSalesReturnHistory(product); return;
                default: break;
            }
        }

        return;
    }


    //Table settings
    const defaultColumns = useMemo(() => [
        { key: "deleted", label: "Deleted", fieldName: "deleted", visible: true },
        { key: "select", label: "Select", fieldName: "select", visible: true },
        { key: "actions", label: "Actions", fieldName: "actions", visible: true },
        { key: "part_number", label: "Part Number", fieldName: "part_number", visible: true },
        { key: "name", label: "Name", fieldName: "name", visible: true },
        { key: "barcode", label: "Barcode", fieldName: "ean_12", visible: true },
        { key: "purchase_unit_price", label: "Purchase Unit Price", fieldName: "stores.purchase_unit_price", visible: true },
        { key: "wholesale_unit_price", label: "Wholesale Unit Price", fieldName: "stores.wholesale_unit_price", visible: true },
        { key: "retail_unit_price", label: "Retail Unit Price", fieldName: "stores.retail_unit_price", visible: true },
        { key: "stock", label: "Stock", fieldName: "stores.stock", visible: true },
        // { key: "warehouse_code", label: "Store/Warehouse", fieldName: "warehouse_code", visible: true },
        { key: "set", label: "Set", fieldName: "is_set", visible: true },
        { key: "categories", label: "Categories", fieldName: "category_name", visible: true },
        { key: "brand", label: "Brands", fieldName: "brand_name", visible: true },
        { key: "country", label: "Countries", fieldName: "country_name", visible: true },
        { key: "rack", label: "Rack", fieldName: "rack", visible: true },
        { key: "sales_count", label: "Sales Count", fieldName: "stores.sales_count", visible: true },
        { key: "sales", label: "Sales Amount", fieldName: "stores.sales", visible: true },
        { key: "sales_quantity", label: "Sales Qty", fieldName: "stores.sales_quantity", visible: true },
        { key: "sales_profit", label: "Sales Profit", fieldName: "stores.sales_profit", visible: true },
        { key: "sales_loss", label: "Sales Loss", fieldName: "stores.sales_loss", visible: true },
        { key: "sales_return_count", label: "Sales Return Count", fieldName: "stores.sales_return_count", visible: true },
        { key: "sales_return", label: "Sales Return Amount", fieldName: "stores.sales_return", visible: true },
        { key: "sales_return_quantity", label: "Sales Return Qty", fieldName: "stores.sales_return_quantity", visible: true },
        { key: "sales_return_profit", label: "Sales Return Profit", fieldName: "stores.sales_return_profit", visible: true },
        { key: "sales_return_loss", label: "Sales Return Loss", fieldName: "stores.sales_return_loss", visible: true },
        { key: "purchase_count", label: "Purchase Count", fieldName: "stores.purchase_count", visible: true },
        { key: "purchase", label: "Purchase Amount", fieldName: "stores.purchase", visible: true },
        { key: "purchase_quantity", label: "Purchase Qty", fieldName: "stores.purchase_quantity", visible: true },
        { key: "purchase_return_count", label: "Purchase Return Count", fieldName: "stores.purchase_return_count", visible: true },
        { key: "purchase_return", label: "Purchase Return Amount", fieldName: "stores.purchase_returnt", visible: true },
        { key: "purchase_return_quantity", label: "Purchase Return Qty", fieldName: "stores.purchase_return_quantity", visible: true },
        { key: "quotation_count", label: "Quotation Count", fieldName: "stores.quotation_count", visible: true },
        { key: "quotation", label: "Quotation Amount", fieldName: "stores.quotation", visible: true },
        { key: "quotation_quantity", label: "Quotation Sales Qty", fieldName: "stores.quotation_sales_quantity", visible: true },
        { key: "quotation_sales_count", label: "Quotation Sales Count", fieldName: "stores.quotation_sales_count", visible: true },
        { key: "quotation_sales", label: "Quotation Sales Amount", fieldName: "stores.quotation_sales", visible: true },
        { key: "quotation_sales_quantity", label: "Quotation Qty", fieldName: "stores.quotation_quantity", visible: true },
        { key: "quotation_sales_return_count", label: "Quotation Sales Return Count", fieldName: "stores.quotation_sales_return_count", visible: true },
        { key: "quotation_sales_return", label: "Quotation Sales Return Amount", fieldName: "stores.quotation_sales_return_amount", visible: true },
        { key: "quotation_sales_return_quantity", label: "Quotation Sales Return Qty", fieldName: "stores.quotation_sales_return_quantity", visible: true },
        { key: "delivery_note_count", label: "Delivery Note Count", fieldName: "stores.delivery_note_count", visible: true },
        { key: "delivery_note_quantity", label: "Delivery Note Qty", fieldName: "stores.delivery_note_quantity", visible: true },
        { key: "created_by", label: "Created By", fieldName: "created_by", visible: true },
        { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
        { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
    ], []);


    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);
    // Load settings from localStorage
    useEffect(() => {
        let saved = "";
        if (enableSelection === true) {
            saved = localStorage.getItem("select_product_table_settings");
        } else {
            saved = localStorage.getItem("product_table_settings");
        }

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
            if (enableSelection === true) {
                localStorage.setItem("select_product_table_settings", JSON.stringify(defaultColumns));
            } else {
                localStorage.setItem("product_table_settings", JSON.stringify(defaultColumns));
            }
            setColumns(defaultColumns);
        }

        //2nd

    }, [defaultColumns, enableSelection]);

    function RestoreDefaultSettings() {
        if (enableSelection === true) {
            localStorage.setItem("select_product_table_settings", JSON.stringify(defaultColumns));
        } else {
            localStorage.setItem("product_table_settings", JSON.stringify(defaultColumns));
        }
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    // Save column settings to localStorage
    useEffect(() => {
        if (enableSelection === true) {
            localStorage.setItem("select_product_table_settings", JSON.stringify(columns));
        } else {
            localStorage.setItem("product_table_settings", JSON.stringify(columns));
        }
    }, [columns, enableSelection]);

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


    //Created By User Auto Suggestion
    const [userOptions, setUserOptions] = useState([]);
    const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);

    let [selectedCreatedAtDate, setSelectedCreatedAtDate] = useState(new Date());
    let [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(new Date());
    let [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(new Date());




    //Product Search Settings
    const [showProductSearchSettings, setShowProductSearchSettings] = useState(false);

    // Initial column config

    const defaultSearchProductsColumns = useMemo(() => [
        { key: "select", label: "Select", fieldName: "select", width: 3, visible: true },
        { key: "part_number", label: "Part Number", fieldName: "part_number", width: 12, visible: true },
        { key: "name", label: "Name", fieldName: "name", width: 26, visible: true },
        { key: "unit_price", label: "S.Unit Price", fieldName: "unit_price", width: 10, visible: true },
        { key: "stock", label: "Stock", fieldName: "stock", width: 13, visible: true },
        { key: "photos", label: "Photos", fieldName: "photos", width: 5, visible: true },
        { key: "brand", label: "Brand", fieldName: "brand", width: 8, visible: true },
        { key: "purchase_price", label: "P.Unit Price", fieldName: "purchase_price", width: 10, visible: true },
        { key: "country", label: "Country", fieldName: "country", width: 8, visible: true },
        { key: "rack", label: "Rack", fieldName: "rack", width: 5, visible: true },
    ], []);



    const [searchProductsColumns, setSearchProductsColumns] = useState(defaultSearchProductsColumns);

    const visibleColumns = searchProductsColumns.filter(c => c.visible);

    const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0);

    const getColumnWidth = (col) => `${(col.width / totalWidth) * 100}%`;

    const handleSearchToggleColumn = (index) => {
        const updated = [...searchProductsColumns];
        updated[index].visible = !updated[index].visible;
        setSearchProductsColumns(updated);
        if (enableSelection === true) {
            localStorage.setItem("select_product_search_settings", JSON.stringify(updated));
        } else {
            localStorage.setItem("product_search_settings", JSON.stringify(updated));
        }
    };

    const onDragEndSearch = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(searchProductsColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSearchProductsColumns(reordered);
        if (enableSelection === true) {
            localStorage.setItem("select_product_search_settings", JSON.stringify(reordered));
        } else {
            localStorage.setItem("product_search_settings", JSON.stringify(reordered));
        }
    };



    function RestoreSearchDefaultSettings() {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));
        if (enableSelection === true) {
            localStorage.setItem("select_product_search_settings", JSON.stringify(clonedDefaults));
        } else {
            localStorage.setItem("product_search_settings", JSON.stringify(clonedDefaults));
        }
        setSearchProductsColumns(clonedDefaults);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!");
    }


    // Load settings from localStorage
    useEffect(() => {
        const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));

        let saved = "";
        if (enableSelection === true) {
            saved = localStorage.getItem("select_product_search_settings");
        } else {
            saved = localStorage.getItem("product_search_settings");
        }

        if (saved) {
            setSearchProductsColumns(JSON.parse(saved));
        } else {
            setSearchProductsColumns(clonedDefaults.map(col => ({ ...col })));
        }

        let missingOrUpdated = false;
        for (let i = 0; i < clonedDefaults.length; i++) {
            if (!saved) break;

            const savedCol = JSON.parse(saved)?.find(col => col.fieldName === clonedDefaults[i].fieldName);
            missingOrUpdated = !savedCol || savedCol.label !== clonedDefaults[i].label || savedCol.key !== clonedDefaults[i].key;
            if (missingOrUpdated) break;
        }

        if (missingOrUpdated) {

            if (enableSelection === true) {
                localStorage.setItem("select_product_search_settings", JSON.stringify(clonedDefaults));
            } else {
                localStorage.setItem("product_search_settings", JSON.stringify(clonedDefaults));
            }
            setSearchProductsColumns(clonedDefaults);
        }
    }, [defaultSearchProductsColumns, enableSelection]);


    // Skip the first run so we don't overwrite saved settings during initial hydration
    /*
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        if (enableSelection === true) {
            localStorage.setItem("select_product_search_settings", JSON.stringify(searchProductsColumns));
        } else {
            localStorage.setItem("product_search_settings", JSON.stringify(searchProductsColumns));
        }
    }, [searchProductsColumns, enableSelection]);*/

    //Select products

    const [choosenProducts, setChoosenProducts] = useState([]);
    const handleSelect = (product) => {
        setChoosenProducts((prev) => {
            const exists = prev.some((p) => p.id === product.id);
            if (exists) {
                return prev.filter((p) => p.id !== product.id); // remove
            } else {
                return [...prev, product]; // add
            }
        });
    };

    const isAllSelected = productList?.every((p) =>
        choosenProducts.some((cp) => cp.id === p.id)
    );

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Add all products from current page
            const newSelections = productList.filter(
                (p) => !choosenProducts.some((cp) => cp.id === p.id)
            );
            setChoosenProducts((prev) => [...prev, ...newSelections]);
        } else {
            // Remove all current page products
            setChoosenProducts((prev) =>
                prev.filter((cp) => !productList.some((p) => p.id === cp.id))
            );
        }
    };

    const handleSendSelected = () => {
        if (props.onSelectProducts) {
            props.onSelectProducts(choosenProducts);
        }
        // handleClose();
    };

    const [warehouseList, setWarehouseList] = useState([]);

    const loadWarehouses = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,name,code,created_by_name,created_at";

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/warehouse?" +
            Select +
            queryParams +
            "&sort=name" +
            "&page=1" +
            "&limit=100",
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


                setWarehouseList(data.result);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [searchParams]);

    useEffect(() => {
        loadWarehouses();
    }, [loadWarehouses]);

    let [selectedWarehouse, setSelectedWarehouse] = useState({});

    return (
        <>

            <Modal
                show={showProductSearchSettings}
                onHide={() => setShowProductSearchSettings(false)}
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
                        Product Search Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Column Settings */}
                    {showProductSearchSettings && (
                        <>
                            <h6 className="mb-2">Customize Columns</h6>
                            <DragDropContext onDragEnd={onDragEndSearch}>
                                <Droppable droppableId="columns">
                                    {(provided) => (
                                        <ul
                                            className="list-group"
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {searchProductsColumns.map((col, index) => {
                                                return (
                                                    <>
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
                                                                                handleSearchToggleColumn(index);
                                                                            }}
                                                                        />
                                                                        {col.label}
                                                                    </div>
                                                                    <span style={{ cursor: "grab" }}>☰</span>
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    </>)
                                            })}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowProductSearchSettings(false)}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            RestoreSearchDefaultSettings();
                            // Save to localStorage here if needed
                            //setShowSettings(false);
                        }}
                    >
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>

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
                        Products Settings
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
                                            {columns.map((col, index) => {
                                                return (
                                                    <>
                                                        {((col.key === "select" && enableSelection) || col.key !== "select") && <Draggable
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
                                                        </Draggable>}
                                                    </>)
                                            })}
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

            <Products ref={ProductsRef} showToastMessage={props.showToastMessage} />
            <ImageViewerModal ref={imageViewerRef} images={productImages} />

            <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />

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
                <div className="row align-items-center" style={{
                    marginTop: "-8px",
                    flexWrap: "nowrap",
                    gap: "4px",
                    alignItems: "center",
                }}>
                    <div className="col-auto" style={{
                        paddingRight: "4px",
                        marginBottom: "0px",
                        minWidth: "120px",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                    }}>
                        <label htmlFor="warehouse_id" style={{
                            fontWeight: "bold",
                            marginRight: "4px",
                            marginBottom: "0px",
                            whiteSpace: "nowrap",
                        }}>
                            Store/Warehouse:
                        </label>
                    </div>
                    <div className="col-auto" style={{
                        paddingLeft: "0px",
                        minWidth: "120px",
                    }}>
                        <select
                            id="warehouse_id"
                            name="warehouse_id"
                            className="form-control"
                            style={{
                                marginBottom: "0px",
                                paddingTop: "2px",
                                paddingBottom: "2px",
                                fontSize: "1rem",
                                minWidth: "120px",
                            }}
                            value={
                                selectedWarehouse.warehouse_id
                                    ? selectedWarehouse.warehouse_id
                                    : selectedWarehouse.warehouse_code === "main_store"
                                        ? "main_store"
                                        : ""
                            }
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                if (selectedValue === "") {
                                    selectedWarehouse.warehouse_id = null;
                                    selectedWarehouse.warehouse_code = "";
                                } else if (selectedValue === "main_store") {
                                    selectedWarehouse.warehouse_id = null;
                                    selectedWarehouse.warehouse_code = "main_store";
                                } else {
                                    const wh = warehouseList.find(w => w.id === selectedValue);
                                    if (wh) {
                                        selectedWarehouse.warehouse_id = wh.id;
                                        selectedWarehouse.warehouse_code = wh.code;
                                    }
                                }

                                //  alert(selectedWarehouse.warehouse_code)

                                // setSelectedWarehouse(selectedWarehouse);

                                setSelectedWarehouse({ ...selectedWarehouse });
                                list();

                            }}
                        >
                            <option value="">All</option>
                            <option value="main_store">Main Store</option>
                            {warehouseList.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name} ({warehouse.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            {/* Warehouse/Store
                            <div className="">
                                <select
                                    id={`from_warehouse_id`}
                                    name={`from_warehouse_id`}
                                    className="form-control"
                                    value={selectedWarehouse.warehouse_id || "main_store"}
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;

                                        if (selectedValue === "main_store") {
                                            selectedWarehouse.warehouse_id = null;
                                            selectedWarehouse.warehouse_code = "";
                                        } else {
                                            const selectedWarehouse = warehouseList.find(w => w.id === selectedValue);
                                            if (selectedWarehouse) {
                                                selectedWarehouse.warehouse_id = selectedWarehouse.id;
                                                selectedWarehouse.warehouse_code = selectedWarehouse.code;
                                            }
                                        }

                                        setSelectedWarehouse({ ...selectedWarehouse });
                                        //setFormData({ ...formData });
                                        //checkWarnings();
                                    }}
                                >
                                    <option value="main_store">Main Store</option>
                                    {warehouseList.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name} ({warehouse.code})
                                        </option>
                                    ))}
                                </select>

                            </div>*/}

                            <StatsSummary
                                title="Products"
                                stats={{
                                    "Stock": stock,
                                    "Retail stock value": retailStockValue,
                                    "Wholesale stock value": wholesaleStockValue,
                                    "Purchase stock value": purchaseStockValue,
                                    "Sales": sales,
                                    "Sales Return": salesReturn,
                                    "Sales Profit": salesProfit,
                                    "Sales Return Profit": salesReturnProfit,
                                }}
                                onToggle={handleSummaryToggle}
                            />
                        </span>
                    </div>
                </div >

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
                                            <p className="text-start">No Producs to display</p>
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
                                                if (selectedProducts[selectedProducts?.length - 1]) {
                                                    RunKeyActions(e, selectedProducts[selectedProducts?.length - 1]);
                                                }

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
                                                const requestId = Date.now();
                                                latestRequestRef.current = requestId;

                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                timerRef.current = setTimeout(() => {
                                                    if (latestRequestRef.current !== requestId) return;

                                                    suggestProducts(searchTerm, "all")
                                                }, 350);
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
                                                                border: "solid 0px",
                                                                borderBottom: '1px solid #ddd',
                                                                pointerEvents: "auto" // <-- allow click here
                                                            }}>
                                                                {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                                    return (<>
                                                                        {col.key === "select" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}></div>}
                                                                        {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Part Number</div>}
                                                                        {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Name</div>}
                                                                        {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>S.Unit Price</div>}
                                                                        {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Stock</div>}
                                                                        {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Photos</div>}
                                                                        {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Brand</div>}
                                                                        {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>P.Unit Price</div>}
                                                                        {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Country</div>}
                                                                        {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Rack</div>}
                                                                    </>)
                                                                })}
                                                                {/* Settings icon on right */}
                                                                <div
                                                                    style={{
                                                                        position: "absolute",
                                                                        right: "8px",
                                                                        top: "50%",
                                                                        transform: "translateY(-50%)",
                                                                        cursor: "pointer",
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowProductSearchSettings(true);
                                                                    }}
                                                                >
                                                                    <i className="bi bi-gear-fill" />
                                                                </div>
                                                            </div>
                                                        </MenuItem>

                                                        {/* Rows */}
                                                        {results.map((option, index) => {
                                                            const onlyOneResult = results.length === 1;
                                                            const isActive = state.activeIndex === index || onlyOneResult;
                                                            let checked = isProductAdded(option.id);
                                                            return (
                                                                <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                                                    <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                        {searchProductsColumns.filter(c => c.visible).map((col) => {
                                                                            return (<>
                                                                                {col.key === "select" &&
                                                                                    <div
                                                                                        className="form-check"
                                                                                        style={{ ...columnStyle, width: getColumnWidth(col) }}
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                            checked = !checked;

                                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                                            timerRef.current = setTimeout(() => {

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
                                                                                            }, 100);

                                                                                        }}
                                                                                    >
                                                                                        <input
                                                                                            className="form-check-input"
                                                                                            type="checkbox"
                                                                                            value={checked}
                                                                                            checked={checked}
                                                                                            onClick={e => {
                                                                                                e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                                                                            }}
                                                                                            onChange={e => {
                                                                                                e.preventDefault();      // Prevent default selection behavior
                                                                                                e.stopPropagation();

                                                                                                checked = !checked;

                                                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                                                timerRef.current = setTimeout(() => {

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
                                                                                                }, 100);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                }
                                                                                {col.key === "part_number" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {highlightWords(
                                                                                            option.prefix_part_number
                                                                                                ? `${option.prefix_part_number}-${option.part_number}`
                                                                                                : option.part_number,
                                                                                            searchWords,
                                                                                            isActive
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "name" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {highlightWords(
                                                                                            option.name_in_arabic
                                                                                                ? `${option.name} - ${option.name_in_arabic}`
                                                                                                : option.name,
                                                                                            searchWords,
                                                                                            isActive
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "unit_price" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (
                                                                                            <>
                                                                                                <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+
                                                                                            </>
                                                                                        )}
                                                                                        {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && (
                                                                                            <>
                                                                                                |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} />
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "stock" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {(() => {
                                                                                            const storeId = localStorage.getItem("store_id");
                                                                                            const productStore = option.product_stores?.[storeId];
                                                                                            const totalStock = productStore?.stock ?? 0;
                                                                                            const warehouseStocks = productStore?.warehouse_stocks ?? {};

                                                                                            // Build warehouse stock details string
                                                                                            const warehouseDetails = Object.entries(warehouseStocks)
                                                                                                .map(([key, value]) => {
                                                                                                    // Format warehouse name (capitalize and replace underscores)
                                                                                                    let name = key === "main_store" ? "MS" : key.replace(/^w/, "W").toUpperCase();
                                                                                                    return `${name}:${value}`;
                                                                                                })
                                                                                                .join(", ");

                                                                                            // Final display string
                                                                                            return (
                                                                                                <span>
                                                                                                    {totalStock}
                                                                                                    {warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ""}
                                                                                                </span>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "photos" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        <button
                                                                                            type="button"
                                                                                            className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault();
                                                                                                e.stopPropagation();
                                                                                                openProductImages(option.id);
                                                                                            }}
                                                                                        >
                                                                                            <i className="bi bi-images" aria-hidden="true" />
                                                                                        </button>
                                                                                    </div>
                                                                                }
                                                                                {col.key === "brand" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {highlightWords(option.brand_name, searchWords, isActive)}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "purchase_price" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && (
                                                                                            <>
                                                                                                <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+
                                                                                            </>
                                                                                        )}
                                                                                        {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && (
                                                                                            <>
                                                                                                |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} />
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "country" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {highlightWords(option.country_name, searchWords, isActive)}
                                                                                    </div>
                                                                                }
                                                                                {col.key === "rack" &&
                                                                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                                                                        {highlightWords(option.rack, searchWords, isActive)}
                                                                                    </div>
                                                                                }
                                                                            </>)
                                                                        })}
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
                                                {enableSelection && <Button className="btn btn-success btn-sm" onClick={handleSendSelected}>
                                                    Select {choosenProducts.length} products
                                                </Button>}
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
                                                {columns.filter(c => c.visible).map((col) => {
                                                    return (<>
                                                        {col.key === "deleted" && <th key={col.key}>{col.label}</th>}
                                                        {col.key === "actions" && <th key={col.key}>{col.label}</th>}
                                                        {col.key === "select" && enableSelection && <th key={col.key}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllSelected}
                                                                onChange={handleSelectAll}
                                                            /> All
                                                        </th>}
                                                        {col.key !== "actions" && col.key !== "deleted" && col.key !== "select" && <th>
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
                                                {/*<th>Deleted</th>
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
                                                <th>SET</th>
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
                                                */}
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
                                                        {col.key === "select" && enableSelection && <th></th>}
                                                        {(col.key === "part_number") && <th>
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
                                                        </th>}
                                                        {(col.key === "name") && <th>
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
                                                                    }, 400);
                                                                }}
                                                                ignoreDiacritics={true}

                                                                multiple
                                                            />
                                                        </th>}
                                                        {(col.key === "barcode") && <th>
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
                                                        </th>}
                                                        {(col.key === "purchase_unit_price" ||
                                                            col.key === "wholesale_unit_price" ||
                                                            col.key === "retail_unit_price" ||
                                                            col.key === "rack" ||
                                                            col.key === "stock" ||
                                                            col.key === "sales_count" ||
                                                            col.key === "sales" ||
                                                            col.key === "sales_quantity" ||
                                                            col.key === "sales_profit" ||
                                                            col.key === "sales_loss" ||
                                                            col.key === "sales_return_count" ||
                                                            col.key === "sales_return" ||
                                                            col.key === "sales_return_quantity" ||
                                                            col.key === "sales_return_profit" ||
                                                            col.key === "sales_return_loss" ||
                                                            col.key === "purchase_count" ||
                                                            col.key === "purchase" ||
                                                            col.key === "purchase_quantity" ||
                                                            col.key === "purchase_return_count" ||
                                                            col.key === "purchase_return" ||
                                                            col.key === "purchase_return_quantity" ||
                                                            col.key === "quotation_count" ||
                                                            col.key === "quotation" ||
                                                            col.key === "quotation_quantity" ||
                                                            col.key === "quotation_sales_count" ||
                                                            col.key === "quotation_sales" ||
                                                            col.key === "quotation_sales_quantity" ||
                                                            col.key === "quotation_sales_return_count" ||
                                                            col.key === "quotation_sales_return" ||
                                                            col.key === "quotation_sales_return_quantity" ||
                                                            col.key === "delivery_note_count" ||
                                                            col.key === "delivery_note_quantity"
                                                        ) &&
                                                            <th>
                                                                <input
                                                                    type="text"
                                                                    id={`product_search_by_${col.key}`}
                                                                    name={`product_search_by_${col.key}`}
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

                                                        {(col.fieldName === "is_set") && <th>
                                                            <select
                                                                onChange={(e) => {
                                                                    searchByFieldValue("is_set", e.target.value);
                                                                }}
                                                            >
                                                                <option value="" >ALL</option>
                                                                <option value="0" >NO</option>
                                                                <option value="1">YES</option>
                                                            </select>
                                                        </th>}
                                                        {(col.fieldName === "category_name") && <th>
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
                                                        </th>}
                                                        {(col.fieldName === "brand_name") && <th>
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
                                                        </th>}
                                                        {(col.fieldName === "country_name") && <th>
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
                                                        </th>}

                                                        {col.key === "created_by" && <th>
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
                                                <th>
                                                    <select
                                                        onChange={(e) => {
                                                            searchByFieldValue("is_set", e.target.value);
                                                            if (e.target.value === "1") {
                                                                // deleted = true;
                                                                // setDeleted(deleted);
                                                            } else {
                                                                //deleted = false;
                                                                //setDeleted(deleted);
                                                            }
                                                        }}
                                                    >
                                                        <option value="" >ALL</option>
                                                        <option value="0" >NO</option>
                                                        <option value="1">YES</option>
                                                    </select>
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
                                                <th></th>*/}
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {productList &&
                                                productList.map((product) => (
                                                    <tr key={product.id}>
                                                        {columns.filter(c => c.visible).map((col) => {
                                                            return (<>
                                                                {(col.key === "deleted") && <td>{product.deleted ? "YES" : "NO"}</td>}
                                                                {(col.key === "select" && enableSelection) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={choosenProducts.some((p) => p.id === product.id)}
                                                                        onChange={() => handleSelect(product)}
                                                                    />
                                                                </td>}
                                                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }}  >
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
                                                                        </Button>&nbsp;
                                                                        <Button className="btn btn-outline-primary btn-sm" onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            openProductImages(product.id)
                                                                        }}>
                                                                            <i class="bi bi-images"></i>
                                                                        </Button>

                                                                        <Dropdown drop="down" style={{ marginLeft: "130px", marginTop: "-27px" }} >
                                                                            <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{ height: "27px" }}>

                                                                            </Dropdown.Toggle>

                                                                            <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                                                                <Dropdown.Item onClick={() => openLinkedProducts(product)}>
                                                                                    <i className="bi bi-link"></i>&nbsp;
                                                                                    Linked Products ({getShortcut('linkedProducts')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openProductHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    History ({getShortcut('productHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openSalesHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Sales History ({getShortcut('salesHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openSalesReturnHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Sales Return History ({getShortcut('salesReturnHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openPurchaseHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Purchase History ({getShortcut('purchaseHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Purchase Return History ({getShortcut('purchaseReturnHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Delivery Note History ({getShortcut('deliveryNoteHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openQuotationHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Quotation History ({getShortcut('quotationHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Qtn. Sales History ({getShortcut('quotationSalesHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Qtn. Sales Return History ({getShortcut('quotationSalesReturnHistory')})
                                                                                </Dropdown.Item>

                                                                                <Dropdown.Item onClick={() => openProductImages(product.product_id)}>
                                                                                    <i className="bi bi-clock-history"></i>&nbsp;
                                                                                    Images ({getShortcut('images')})
                                                                                </Dropdown.Item>
                                                                            </Dropdown.Menu>
                                                                        </Dropdown>
                                                                    </span>
                                                                </td>}
                                                                {(col.key === "part_number") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="bold-stronger" >{product.prefix_part_number ? product.prefix_part_number + "-" : ""}{product.part_number}</td>}
                                                                {(col.key === "name") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start">
                                                                    <OverflowTooltip value={product.name + (product.name_in_arabic ? " | " + product.name_in_arabic : "")} maxWidth={300} />
                                                                </td>}
                                                                {(col.key === "barcode" || col.key === "rack") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                    {product[col.fieldName]}
                                                                </td>}
                                                                {(col.key === "purchase_unit_price" ||
                                                                    col.key === "wholesale_unit_price" ||
                                                                    col.key === "retail_unit_price" ||
                                                                    col.key === "delivery_note_count" ||
                                                                    col.key === "delivery_note_quantity"
                                                                ) &&
                                                                    <td>
                                                                        <b>
                                                                            {product.product_stores[localStorage.getItem("store_id")] ? product.product_stores[localStorage.getItem("store_id")][col.key]?.toFixed(2) : ""}
                                                                        </b>
                                                                    </td>}
                                                                {col.key === "stock" &&
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {(() => {
                                                                            const storeId = localStorage.getItem("store_id");
                                                                            const productStore = product.product_stores?.[storeId];

                                                                            //selectedWarehouse.warehouse_code
                                                                            const totalStock = productStore?.stock ?? 0;
                                                                            let warehouseStocks = productStore?.warehouse_stocks;
                                                                            if (!warehouseStocks) {
                                                                                warehouseStocks = { "main_store": totalStock };
                                                                            }

                                                                            for (const wh of warehouseList) {
                                                                                if (!warehouseStocks.hasOwnProperty(wh.code)) {
                                                                                    warehouseStocks[wh.code] = 0;
                                                                                }
                                                                            }

                                                                            // Always show Main Store first, then others
                                                                            const orderedEntries = [];
                                                                            if (warehouseStocks?.hasOwnProperty("main_store")) {
                                                                                orderedEntries.push(["main_store", warehouseStocks["main_store"]]);
                                                                            }

                                                                            if (warehouseStocks)
                                                                                Object.entries(warehouseStocks).forEach(([key, value]) => {
                                                                                    if (key !== "main_store") {
                                                                                        orderedEntries.push([key, value]);
                                                                                    }
                                                                                });

                                                                            const details = orderedEntries
                                                                                .map(([key, value]) => {
                                                                                    let name = key === "main_store" ? "Main Store" : key.replace(/^wh/, "WH").toUpperCase();
                                                                                    return `${name}: ${value}`;
                                                                                })
                                                                                .join(", ");

                                                                            return (
                                                                                <OverlayTrigger
                                                                                    placement="top"
                                                                                    overlay={
                                                                                        <Tooltip id={`stock-tooltip-${product.id}`}>
                                                                                            ({details})

                                                                                        </Tooltip>
                                                                                    }
                                                                                >
                                                                                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                                                                                        <b>{selectedWarehouse.warehouse_code ? warehouseStocks[selectedWarehouse.warehouse_code] : ""}</b>
                                                                                        <b>{!selectedWarehouse.warehouse_code ? totalStock : ""}</b>
                                                                                    </span>
                                                                                </OverlayTrigger>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                }
                                                                {(col.key === "sales" ||
                                                                    col.key === "sales_count" ||
                                                                    col.key === "sales_quantity" ||
                                                                    col.key === "sales_profit" ||
                                                                    col.key === "sales_loss" ||
                                                                    col.key === "sales_return_count" ||
                                                                    col.key === "sales_return" ||
                                                                    col.key === "sales_return_quantity" ||
                                                                    col.key === "sales_return_profit" ||
                                                                    col.key === "sales_return_loss" ||
                                                                    col.key === "purchase_count" ||
                                                                    col.key === "purchase" ||
                                                                    col.key === "purchase_quantity" ||
                                                                    col.key === "purchase_return_count" ||
                                                                    col.key === "purchase_return" ||
                                                                    col.key === "purchase_return_quantity" ||
                                                                    col.key === "quotation_count" ||
                                                                    col.key === "quotation" ||
                                                                    col.key === "quotation_quantity" ||
                                                                    col.key === "quotation_sales_count" ||
                                                                    col.key === "quotation_sales" ||
                                                                    col.key === "quotation_sales_quantity" ||
                                                                    col.key === "quotation_sales_return_count" ||
                                                                    col.key === "quotation_sales_return" ||
                                                                    col.key === "quotation_sales_return_quantity"
                                                                ) &&
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {(() => {
                                                                            const storeId = localStorage.getItem("store_id");
                                                                            const productStore = product.product_stores?.[storeId] ? product.product_stores?.[storeId] : {};

                                                                            //selectedWarehouse.warehouse_code
                                                                            const totalValue = productStore[col.key] ? productStore[col.key] : 0;
                                                                            let productWarehouses = productStore?.product_warehouses;
                                                                            if (!productWarehouses) {
                                                                                productWarehouses = { "main_store": totalValue };
                                                                            }

                                                                            for (const wh of warehouseList) {
                                                                                if (!wh.code)
                                                                                    continue;

                                                                                if (!productWarehouses.hasOwnProperty(wh.code)) {
                                                                                    if (!productWarehouses[wh.code]) {
                                                                                        productWarehouses[wh.code] = { [col.key]: 0 };
                                                                                    } else {
                                                                                        productWarehouses[wh.code][col.key] = 0;
                                                                                    }
                                                                                }
                                                                            }

                                                                            // Always show Main Store first, then others
                                                                            const orderedEntries = [];
                                                                            if (productWarehouses?.hasOwnProperty("main_store")) {
                                                                                orderedEntries.push(["main_store", productWarehouses["main_store"][col.key] ? productWarehouses["main_store"][col.key] : 0]);
                                                                            }

                                                                            if (productWarehouses)
                                                                                Object.entries(productWarehouses).forEach(([key, value]) => {
                                                                                    if (key !== "main_store" && key && value) {
                                                                                        //  console.log("key:" + key + ", field:" + col.key + ", V:" + value[col.key] + ",P.no:" + product.part_number);
                                                                                        orderedEntries.push([key, value[col.key] ? value[col.key] : 0]);
                                                                                    }
                                                                                });

                                                                            const details = orderedEntries
                                                                                .map(([key, value]) => {
                                                                                    let name = key === "main_store" ? "Main Store" : key.replace(/^wh/, "WH").toUpperCase();

                                                                                    return `${name}: ${value ? value : 0}`;
                                                                                })
                                                                                .join(", ");

                                                                            return (
                                                                                <OverlayTrigger
                                                                                    placement="top"
                                                                                    overlay={
                                                                                        <Tooltip id={`stock-tooltip-${product.id}`}>
                                                                                            ({details})

                                                                                        </Tooltip>
                                                                                    }
                                                                                >
                                                                                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }}>
                                                                                        <b>{selectedWarehouse.warehouse_code ? productWarehouses[selectedWarehouse.warehouse_code][col.key] : ""}</b>
                                                                                        <b>{!selectedWarehouse.warehouse_code ? totalValue : ""}</b>
                                                                                    </span>
                                                                                </OverlayTrigger>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                }
                                                                {(col.fieldName === "is_set") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                    {product.is_set ? "YES" : "NO"}
                                                                </td>}
                                                                {(col.fieldName === "category_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <ul>
                                                                        {product.category_name &&
                                                                            product.category_name.map((name) => (
                                                                                <li key={name}  >{name}</li>
                                                                            ))}
                                                                    </ul>
                                                                </td>}
                                                                {(col.fieldName === "brand_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <ul>
                                                                        {product.brand_name}
                                                                    </ul>
                                                                </td>}
                                                                {(col.fieldName === "country_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    <ul>
                                                                        {product.country_name}
                                                                    </ul>
                                                                </td>}
                                                                {col.key === "created_by" && <td>
                                                                    {product.created_by_name}
                                                                </td>}
                                                                {col.key === "created_at" && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                    {format(
                                                                        new Date(product.created_at),
                                                                        "MMM dd yyyy h:mma"
                                                                    )}
                                                                </td>}
                                                            </>);
                                                        })}

                                                        {/*<td>{product.deleted ? "YES" : "NO"}</td>
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
                                                                            openLinkedProducts(product);
                                                                        }}>
                                                                            <i className="bi bi-link"></i>
                                                                            &nbsp;
                                                                            Linked Products (F10)
                                                                        </Dropdown.Item>

                                                                        <Dropdown.Item onClick={() => {
                                                                            openSalesHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Sales History (F4)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openSalesReturnHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Sales Return History (F9)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openPurchaseHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Purchase History (F6)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openPurchaseReturnHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Purchase Return History (F8)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openDeliveryNoteHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Delivery Note History (F3)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openQuotationHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Quotation History  (F2)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openQuotationSalesHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Qtn. Sales History  (CTR + SHIFT + P)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openQuotationSalesReturnHistory(product);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Qtn. Sales Return History (CTR + SHIFT + Z)
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item onClick={() => {
                                                                            openProductImages(product.id);
                                                                        }}>
                                                                            <i className="bi bi-clock-history"></i>
                                                                            &nbsp;
                                                                            Images  (CTR + SHIFT + F)
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
                                                        <td>{product.rack}</td>
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
                                                        <td>{product.is_set ? "YES" : "NO"}</td>
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
            </div >
        </>
    );
}

export default ProductIndex;
