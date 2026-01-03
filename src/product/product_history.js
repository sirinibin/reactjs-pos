import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useMemo } from "react";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OrderCreate from "../order/create.js";
import StockTransferCreate from "../stock_transfer/create.js";
import SalesReturnCreate from "../sales_return/create.js";
import PurchaseCreate from "../purchase/create.js";
import PurchaseReturnCreate from "../purchase_return/create.js";
import QuotationCreate from "../quotation/create.js";
import QuotationSalesReturnCreate from "../quotation_sales_return/create.js";
import DeliveryNoteCreate from "../delivery_note/create.js";
import CustomerCreate from "../customer/create.js";
import VendorCreate from "../vendor/create.js";
import { Typeahead } from "react-bootstrap-typeahead";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils.js";
import StatsSummary from "../utils/StatsSummary.js";
import Draggable2 from "react-draggable";

const ProductHistory = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(model, selectedCustomers, selectedVendors) {
            setSelectedCustomers([]);
            searchParams["customer_id"] = "";

            setSelectedVendors([]);
            searchParams["vendor_id"] = "";

            product = model;
            setProduct({ ...product });
            if (selectedCustomers?.length > 0) {
                setSelectedCustomers(selectedCustomers)
                searchByMultipleValuesField("customer_id", selectedCustomers);
            } else if (selectedVendors?.length > 0) {
                setSelectedVendors(selectedVendors)
                searchByMultipleValuesField("vendor_id", selectedVendors);
            } else {
                list();
            }

            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },

    }));

    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const vendorSearchRef = useRef();

    let [referenceType, setReferenceType] = useState("");


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
    let [sortField, setSortField] = useState("date");
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
            "/v1/product/history/" + searchParams["product_id"] + "?" +
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

                //sales 
                totalSales = data.meta.total_sales;
                setTotalSales(totalSales);

                totalSalesProfit = data.meta.total_sales_profit;
                setTotalSalesProfit(totalSalesProfit);

                totalSalesLoss = data.meta.total_sales_loss;
                setTotalSalesLoss(totalSalesLoss);

                totalSalesVat = data.meta.total_sales_vat;
                setTotalSalesVat(totalSalesVat);

                //sales return
                totalSalesReturn = data.meta.total_sales_return;
                setTotalSalesReturn(totalSalesReturn);

                totalSalesReturnProfit = data.meta.total_sales_return_profit;
                setTotalSalesReturnProfit(totalSalesReturnProfit);

                totalSalesReturnLoss = data.meta.total_sales_return_loss;
                setTotalSalesReturnLoss(totalSalesReturnLoss);

                totalSalesReturnVat = data.meta.total_sales_return_vat;
                setTotalSalesReturnVat(totalSalesReturnVat);

                //purchase
                totalPurchase = data.meta.total_purchase;
                setTotalPurchase(totalPurchase);

                totalPurchaseVat = data.meta.total_purchase_vat;
                setTotalPurchaseVat(totalPurchaseVat);

                //purchase return
                totalPurchaseReturn = data.meta.total_purchase_return;
                setTotalPurchaseReturn(totalPurchaseReturn);

                totalPurchaseReturnVat = data.meta.total_purchase_return_vat;
                setTotalPurchaseReturnVat(totalPurchaseReturnVat);

                //quotation
                totalQuotation = data.meta.total_quotation;
                setTotalQuotation(totalQuotation);

                totalQuotationProfit = data.meta.total_quotation_profit;
                setTotalQuotationProfit(totalQuotationProfit);

                totalQuotationLoss = data.meta.total_quotation_loss;
                setTotalQuotationLoss(totalQuotationLoss);

                totalQuotationVat = data.meta.total_quotation_vat;
                setTotalQuotationVat(totalQuotationVat);


                //quotation sales
                totalQuotationSales = data.meta.total_quotation_sales;
                setTotalQuotationSales(totalQuotationSales);

                totalQuotationSalesProfit = data.meta.total_quotation_sales_profit;
                setTotalQuotationSalesProfit(totalQuotationSalesProfit);

                totalQuotationSalesLoss = data.meta.total_quotation_sales_loss;
                setTotalQuotationSalesLoss(totalQuotationSalesLoss);

                totalQuotationSalesVat = data.meta.total_quotation_sales_vat;
                setTotalQuotationSalesVat(totalQuotationSalesVat);

                //quotation sales return
                totalQuotationSalesReturn = data.meta.total_quotation_sales_return;
                setTotalQuotationSalesReturn(totalQuotationSalesReturn);

                totalQuotationSalesReturnProfit = data.meta.total_quotation_sales_return_profit;
                setTotalQuotationSalesReturnProfit(totalQuotationSalesReturnProfit);

                totalQuotationSalesReturnLoss = data.meta.total_quotation_sales_return_loss;
                setTotalQuotationSalesReturnLoss(totalQuotationSalesReturnLoss);

                totalQuotationSalesReturnVat = data.meta.total_quotation_sales_return_vat;
                setTotalQuotationSalesReturnVat(totalQuotationSalesReturnVat);

                //delivery note 
                totalDeliveryNoteQuantity = data.meta.total_delivery_note_quantity;
                setTotalDeliveryNoteQuantity(totalDeliveryNoteQuantity);

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

    //sales
    let [totalSales, setTotalSales] = useState(0.00);
    let [totalSalesProfit, setTotalSalesProfit] = useState(0.00);
    let [totalSalesVat, setTotalSalesVat] = useState(0.00);
    let [totalSalesLoss, setTotalSalesLoss] = useState(0.00);

    //sales return
    let [totalSalesReturn, setTotalSalesReturn] = useState(0.00);
    let [totalSalesReturnProfit, setTotalSalesReturnProfit] = useState(0.00);
    let [totalSalesReturnVat, setTotalSalesReturnVat] = useState(0.00);
    let [totalSalesReturnLoss, setTotalSalesReturnLoss] = useState(0.00);

    //purchase
    let [totalPurchase, setTotalPurchase] = useState(0.00);
    let [totalPurchaseVat, setTotalPurchaseVat] = useState(0.00);


    //purchase return
    let [totalPurchaseReturn, setTotalPurchaseReturn] = useState(0.00);
    let [totalPurchaseReturnVat, setTotalPurchaseReturnVat] = useState(0.00);

    //quotation
    let [totalQuotation, setTotalQuotation] = useState(0.00);
    let [totalQuotationProfit, setTotalQuotationProfit] = useState(0.00);
    let [totalQuotationVat, setTotalQuotationVat] = useState(0.00);
    let [totalQuotationLoss, setTotalQuotationLoss] = useState(0.00);

    //quotation sales
    let [totalQuotationSales, setTotalQuotationSales] = useState(0.00);
    let [totalQuotationSalesProfit, setTotalQuotationSalesProfit] = useState(0.00);
    let [totalQuotationSalesVat, setTotalQuotationSalesVat] = useState(0.00);
    let [totalQuotationSalesLoss, setTotalQuotationSalesLoss] = useState(0.00);

    //quotation sales return
    let [totalQuotationSalesReturn, setTotalQuotationSalesReturn] = useState(0.00);
    let [totalQuotationSalesReturnProfit, setTotalQuotationSalesReturnProfit] = useState(0.00);
    let [totalQuotationSalesReturnVat, setTotalQuotationSalesReturnVat] = useState(0.00);
    let [totalQuotationSalesReturnLoss, setTotalQuotationSalesReturnLoss] = useState(0.00);

    //delivery note
    let [totalDeliveryNoteQuantity, setTotalDeliveryNoteQuantity] = useState(0.00);

    let [showOrderForm, setShowOrderForm] = useState(false);
    let [showSalesReturnForm, setShowSalesReturnForm] = useState(false);
    let [showPurchaseForm, setShowPurchaseForm] = useState(false);
    let [showPurchaseReturnForm, setShowPurchaseReturnForm] = useState(false);
    let [showQuotationForm, setShowQuotationForm] = useState(false);
    let [showQuotationSalesReturnForm, setShowQuotationSalesReturnForm] = useState(false);
    let [showDeliveryNoteForm, setShowDeliveryNoteForm] = useState(false);
    let [showStockTransferForm, setShowStockTransferForm] = useState(false);

    const OrderUpdateFormRef = useRef();
    const SalesReturnUpdateFormRef = useRef();
    const PurchaseUpdateFormRef = useRef();
    const PurchaseReturnUpdateFormRef = useRef();
    const QuotationUpdateFormRef = useRef();
    const QuotationSalesReturnUpdateFormRef = useRef();
    const DeliveryNoteUpdateFormRef = useRef();
    const StockTransferUpdateFormRef = useRef();

    async function openReferenceUpdateForm(history) {
        if (history.reference_type === "sales") {
            showOrderForm = true;
            setShowOrderForm(showOrderForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                OrderUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "sales_return") {
            showSalesReturnForm = true;
            setShowSalesReturnForm(showSalesReturnForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                SalesReturnUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "purchase") {
            showPurchaseForm = true;
            setShowPurchaseForm(showPurchaseForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                PurchaseUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "purchase_return") {
            showPurchaseReturnForm = true;
            setShowPurchaseReturnForm(showPurchaseReturnForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                PurchaseReturnUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "quotation") {
            showQuotationForm = true;
            setShowQuotationForm(showQuotationForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                QuotationUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "quotation_invoice") {
            showQuotationForm = true;
            setShowQuotationForm(showQuotationForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                QuotationUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "quotation_sales_return") {
            showQuotationSalesReturnForm = true;
            setShowQuotationSalesReturnForm(showQuotationSalesReturnForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                QuotationSalesReturnUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "delivery_note") {
            showDeliveryNoteForm = true;
            setShowDeliveryNoteForm(showDeliveryNoteForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                DeliveryNoteUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        } else if (history.reference_type === "stock_transfer") {
            showStockTransferForm = true;
            setShowStockTransferForm(showStockTransferForm);
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                StockTransferUpdateFormRef.current?.open(history.reference_id);
            }, 100);
        }

    }


    const CustomerUpdateFormRef = useRef();
    function openCustomerUpdateForm(id) {
        CustomerUpdateFormRef.current.open(id);
    }

    const VendorUpdateFormRef = useRef();
    function openVendorUpdateForm(id) {
        VendorUpdateFormRef.current.open(id);
    }

    function searchByMultipleValuesField(field, values) {
        if (field === "customer_id") {
            setSelectedCustomers(values);
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

    const handleUpdated = () => {
        list();
    };

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


    const customerSearchRef = useRef();
    const timerRef = useRef(null);

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
        { key: "reference_type", label: "Type", fieldName: "reference_type", visible: true },
        { key: "reference_code", label: "ID", fieldName: "reference_code", visible: true },
        { key: "customer_name", label: "Customer", fieldName: "customer_name", visible: true },
        { key: "vendor_name", label: "Vendor", fieldName: "vendor_name", visible: true },
        { key: "stock", label: "Stock", fieldName: "stock", visible: true },
        { key: "warehouse_code", label: "Main Store/Warehouse", fieldName: "warehouse_code", visible: true },
        { key: "quantity", label: "Qty", fieldName: "quantity", visible: true },
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
        const saved = localStorage.getItem("product_history_table_settings");
        if (saved) setColumns(JSON.parse(saved));
        /*
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


        if (missingOrUpdated) {
            localStorage.setItem("product_history_table_settings", JSON.stringify(defaultColumns));
            setColumns(defaultColumns);
        }*/

        //2nd

    }, []);

    function RestoreDefaultSettings() {
        localStorage.setItem("product_history_table_settings", JSON.stringify(defaultColumns));
        setColumns(defaultColumns);

        setShowSuccess(true);
        setSuccessMessage("Successfully restored to default settings!")
    }

    const handleToggleColumn = (index) => {
        const updated = [...columns];
        updated[index].visible = !updated[index].visible;
        setColumns(updated);
        localStorage.setItem("product_history_table_settings", JSON.stringify(updated));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(columns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setColumns(reordered);
        localStorage.setItem("product_history_table_settings", JSON.stringify(reordered));
    };

    const [statsOpen, setStatsOpen] = useState(false);

    const handleSummaryToggle = (isOpen) => {
        setStatsOpen(isOpen);
    };

    function getTypeLabel(type) {
        if (type === "sales") {
            return "Sales";
        } else if (type === "sales_return") {
            return "Sales Return";
        } else if (type === "purchase") {
            return "Purchase";
        } else if (type === "purchase_return") {
            return "Purchase Return";
        } else if (type === "quotation") {
            return "Quotation";
        } else if (type === "quotation_invoice") {
            return "Qtn. Sales";
        } else if (type === "quotation_sales_return") {
            return "Qtn. Sales Return";
        } else if (type === "delivery_note") {
            return "Delivery Note";
        } else if (type === "stock_adjustment_by_adding") {
            return "Stock Adjustment By Adding";
        } else if (type === "stock_adjustment_by_removing") {
            return "Stock Adjustment By Removing";
        } if (type === "stock_transfer") {
            return "Stock Transfer";
        }
    }

    const dragRef = useRef(null);

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
                        Product History Settings
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
            {showPurchaseForm && <PurchaseCreate ref={PurchaseUpdateFormRef} onUpdated={handleUpdated} />}
            {showPurchaseReturnForm && <PurchaseReturnCreate ref={PurchaseReturnUpdateFormRef} onUpdated={handleUpdated} />}
            {showQuotationForm && <QuotationCreate ref={QuotationUpdateFormRef} onUpdated={handleUpdated} />}
            {showQuotationSalesReturnForm && <QuotationSalesReturnCreate ref={QuotationSalesReturnUpdateFormRef} onUpdated={handleUpdated} />}
            {showDeliveryNoteForm && <DeliveryNoteCreate ref={DeliveryNoteUpdateFormRef} onUpdated={handleUpdated} />}
            {showStockTransferForm && <StockTransferCreate ref={StockTransferUpdateFormRef} onUpdated={handleUpdated} />}

            <CustomerCreate ref={CustomerUpdateFormRef} />
            <VendorCreate ref={VendorUpdateFormRef} />
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
                    <Modal.Title>History of {product.name} {product.name_in_arabic ? " / " + product.name_in_arabic : ""}</Modal.Title>

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
                                        title="Product History"
                                        stats={{
                                            "Sales": totalSales,
                                            "Sales Net Profit": totalSalesProfit,
                                            "Sales Net Loss": totalSalesLoss,
                                            "Sales VAT Collected": totalSalesVat,

                                            "Sales Return": totalSalesReturn,
                                            "Sales Return Net Profit": totalSalesReturnProfit,
                                            "Sales Return Net Loss": totalSalesReturnLoss,
                                            "Sales Return VAT": totalSalesReturnVat,

                                            "Purchase": totalPurchase,
                                            "Purchase VAT": totalPurchaseVat,
                                            "Purchase Return": totalPurchaseReturn,
                                            "Purchase Return VAT": totalPurchaseReturnVat,

                                            "Quotation": totalQuotation,
                                            "Quotation Net Profit": totalQuotationProfit,
                                            "Quotation Net Loss": totalQuotationLoss,
                                            "Quotation VAT Collected": totalQuotationVat,

                                            "Quotation Sales": totalQuotationSales,
                                            "Quotation Sales Net Profit": totalQuotationSalesProfit,
                                            "Quotation Sales Net Loss": totalQuotationSalesLoss,
                                            "Quotation Sales VAT Collected": totalQuotationSalesVat,

                                            "Quotation Sales Return": totalQuotationSalesReturn,
                                            "Quotation Sales Return Net Profit": totalQuotationSalesReturnProfit,
                                            "Quotation Sales Return Net Loss": totalQuotationSalesReturnLoss,
                                            "Quotation Sales Return VAT Collected": totalQuotationSalesReturnVat,

                                            "Delivery Note Quantity": totalDeliveryNoteQuantity,
                                        }}
                                        onToggle={handleSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>

                        {/*<div className="row">

                            <div className="col">
                                <h1 className="text-end">
                                    Sales: <Badge bg="secondary">
                                        <NumberFormat
                                            value={totalSales}
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
                                                    <p className="text-start">No History to display</p>
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
                                                                Discount(without VAT)
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
                                                                {col.key === "reference_type" && <th>
                                                                    <select
                                                                        value={referenceType}
                                                                        onChange={(e) => {
                                                                            referenceType = e.target.value;
                                                                            setReferenceType(referenceType);
                                                                            searchByFieldValue("reference_type", e.target.value);

                                                                        }}
                                                                    >
                                                                        <option value="" >All</option>
                                                                        <option value="sales" >Sales</option>
                                                                        <option value="sales_return" >Sales Return</option>
                                                                        <option value="purchase" >Purchase</option>
                                                                        <option value="purchase_return" >Purchase Return</option>
                                                                        <option value="quotation" >Quotation</option>
                                                                        <option value="quotation_invoice" >Qtn. Sales</option>
                                                                        <option value="quotation_sales_return" >Qtn. Sales Return</option>
                                                                        <option value="delivery_note">Delivery Note</option>
                                                                        <option value="stock_adjustment_by_adding">Stock Adjustment By Adding</option>
                                                                        <option value="stock_adjustment_by_removing">Stock Adjustment By Removing</option>
                                                                        <option value="stock_transfer" >Stock Transfer</option>
                                                                    </select>
                                                                </th>}
                                                                {(col.key === "reference_code" ||
                                                                    col.key === "quantity" ||
                                                                    col.key === "stock" ||
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
                                                                            id={`product_history_search_by_${col.key}`}
                                                                            name={`product_history_search_by_${col.key}`}
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
                                                                        {(col.key === "vendor_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                            {history.vendor_name && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                                openVendorUpdateForm(history.vendor_id);
                                                                            }}><OverflowTooltip value={history.vendor_name + (history.vendor_name_arabic ? " | " + history.vendor_name_arabic : "")} />
                                                                            </span>}
                                                                        </td>}
                                                                        {(col.key === "reference_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                            {history.reference_type !== "stock_adjustment_by_adding" && history.reference_type !== "stock_adjustment_by_removing" ? <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                                openReferenceUpdateForm(history);
                                                                            }}> {history.reference_code}
                                                                            </span> : history.reference_code}
                                                                        </td>}
                                                                        {(col.key === "reference_type") && <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-start" >
                                                                            {getTypeLabel(history.reference_type)}
                                                                        </td>}
                                                                        {(col.key === "unit_price" || col.key === "unit_price_with_vat") && <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                            {history[col.key] && typeof history[col.key] === "number" ?
                                                                                <Amount amount={trimTo2Decimals(history[col.key])} decimals={2} /> : history[col.key]
                                                                            }
                                                                        </td>}
                                                                        {(
                                                                            col.key === "quantity" ||
                                                                            col.key === "stock" ||
                                                                            col.key === "discount" ||
                                                                            col.key === "discount_percent" ||
                                                                            col.key === "price" ||
                                                                            col.key === "vat_price" ||
                                                                            col.key === "net_price" ||
                                                                            col.key === "profit" ||
                                                                            col.key === "loss"

                                                                        ) &&
                                                                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                                                {history[col.key] && typeof history[col.key] === "number" ?
                                                                                    <Amount amount={trimTo2Decimals(history[col.key])} /> : history[col.key]
                                                                                }
                                                                            </td>}
                                                                        {col.key === "warehouse_code" &&
                                                                            <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                                {(() => {
                                                                                    const type = history.reference_type;
                                                                                    const warehouse = history["warehouse_code"] || "Main Store";
                                                                                    const from_warehouse_code = history["from_warehouse_code"] || "Main Store";
                                                                                    const to_warehouse_code = history["to_warehouse_code"] || "Main Store";

                                                                                    if (
                                                                                        type === "sales" ||
                                                                                        type === "purchase_return" ||
                                                                                        type === "quotation_sales" ||
                                                                                        type === "stock_adjustment_by_removing"
                                                                                    ) {
                                                                                        return `Stock Removed from ${warehouse}`;
                                                                                    }
                                                                                    if (
                                                                                        type === "sales_return" ||
                                                                                        type === "purchase" ||
                                                                                        type === "quotation_sales_return" ||
                                                                                        type === "stock_adjustment_by_adding"
                                                                                    ) {
                                                                                        return `Stock Added to ${warehouse}`;
                                                                                    }

                                                                                    if (
                                                                                        type === "sales_return" ||
                                                                                        type === "purchase" ||
                                                                                        type === "quotation_sales_return" ||
                                                                                        type === "stock_adjustment_by_adding"
                                                                                    ) {
                                                                                        return `Stock Added to ${warehouse}`;
                                                                                    }
                                                                                    if (type === "stock_transfer") {
                                                                                        return `Stock Transferred from ${from_warehouse_code} to ${to_warehouse_code}`;
                                                                                    }
                                                                                    // For any other type, display nothing
                                                                                    return "";
                                                                                })()}
                                                                            </td>
                                                                        }
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
                                                                <td>{history.unit_price?.toFixed(2)}</td>
                                                                <td>{history.unit_price_with_vat?.toFixed(2)}</td>
                                                                <td>{history.discount?.toFixed(2)}</td>
                                                                <td>{history.discount_percent?.toFixed(2)}</td>
                                                                <td>{history.price ? history.price?.toFixed(2) : ""}</td>
                                                                <td>{history.vat_price ? history.vat_price?.toFixed(2) + "   (" + history.vat_percent?.toFixed(2) + "%)" : ""}</td>
                                                                <td>{history.net_price ? history.net_price?.toFixed(2) : ""}</td>
                                                                <td>{history.profit?.toFixed(2) + " "}</td>
                                                                <td>{history.loss?.toFixed(2) + " "}</td>*/}
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

export default ProductHistory;

