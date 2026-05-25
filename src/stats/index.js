import React, { useState, useEffect, forwardRef, useContext, useCallback } from "react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "../utils/WebSocketContext.js";

import { trimTo2Decimals } from "../utils/numberUtils";
import eventEmitter from "../utils/eventEmitter.js";

import "./../utils/stickyHeader.css";

const StatsIndex = forwardRef((props, ref) => {
    //deploy to master
    const { lastMessage } = useContext(WebSocketContext);
    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());

    let [dateValue, setDateValue] = useState("");
    const [fromDateValue, setFromDateValue] = useState("");
    const [toDateValue, setToDateValue] = useState("");




    useEffect(() => {
        //list();
        if (localStorage.getItem("store_id")) {
            getStore(localStorage.getItem("store_id"));
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [store, setStore] = useState({});





    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/store/' + id + "?select=id,name,code,zatca.phase,zatca.connected,settings,vat_percent", requestOptions)
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
                setStore({ ...store });
            })
            .catch(error => {

            });
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }


    function searchByDateField(field, value) {
        if (!value) {
            searchParams[field] = "";
            list();
            listSalesReturn();
            listPurchase();
            listPurchaseReturn();
            listExpense();
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
        }

        list();
        listSalesReturn();
        listPurchase();
        listPurchaseReturn();
        listExpense();
    }


    //Sales
    const [totalSales, setTotalSales] = useState(0.00);
    const [netProfit, setNetProfit] = useState(0.00);
    const [vatPrice, setVatPrice] = useState(0.00);
    const [totalShippingHandlingFees, setTotalShippingHandlingFees] = useState(0.00);
    const [totalDiscount, setTotalDiscount] = useState(0.00);
    const [totalCashDiscount, setTotalCashDiscount] = useState(0.00);
    const [totalPaidSales, setTotalPaidSales] = useState(0.00);
    const [totalUnPaidSales, setTotalUnPaidSales] = useState(0.00);
    const [totalCashSales, setTotalCashSales] = useState(0.00);
    const [totalBankAccountSales, setTotalBankAccountSales] = useState(0.00);
    const [totalSalesReturnSales, setTotalSalesReturnSales] = useState(0.00);
    const [totalPurchaseSales, setTotalPurchaseSales] = useState(0.00);
    const [loss, setLoss] = useState(0.00);

    const [statsOpen, setStatsOpen] = useState(true);

    const list = useCallback(() => {

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=phone,zatca.compliance_check_last_failed_at,zatca.reporting_passed,zatca.compliance_passed,zatca.reporting_passed_at,zatca.compliane_check_passed_at,zatca.reporting_last_failed_at,zatca.reporting_failed_count,zatca.compliance_check_failed_count,id,code,date,net_total,return_count,return_amount,cash_discount,total_payment_received,payments_count,payment_methods,balance_amount,discount_percent,discount,created_by_name,customer_name,customer_name_arabic,status,payment_status,payment_method,created_at,loss,net_loss,net_profit,store_id,total,customer_id";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        console.log("statsOpen:", statsOpen);
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

        fetch(
            "/v1/order?" +
            Select +
            queryParams +
            "&page=1" +
            "&limit=5",
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


                setTotalSales(data.meta.total_sales);
                setNetProfit(data.meta.net_profit);
                setLoss(data.meta.net_loss);
                setVatPrice(data.meta.vat_price);
                setTotalShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalDiscount(data.meta.discount);
                setTotalCashDiscount(data.meta.cash_discount);
                setTotalPaidSales(data.meta.paid_sales);
                setTotalUnPaidSales(data.meta.unpaid_sales);
                setTotalCashSales(data.meta.cash_sales);
                setTotalBankAccountSales(data.meta.bank_account_sales);
                setTotalPurchaseSales(data.meta.purchase_sales);
                setTotalSalesReturnSales(data.meta.sales_return_sales);
                //setReturnCount(data.meta.return_count);
                //setReturnPaidAmount(data.meta.return_amount);

            })
            .catch((error) => {
                console.log(error);
            });
    }, [statsOpen, searchParams]);


    const handleSummaryToggle = (isOpen) => {
        setStatsOpen(isOpen);
    };

    useEffect(() => {
        if (statsOpen) {
            list();  // Call list() whenever statsOpen changes to true
        }
    }, [statsOpen, list]);

    //End Sales


    //Sales Return
    let [totalSalesReturn, setTotalSalesReturn] = useState(0.00);
    let [salesReturnVatPrice, setSalesReturnVatPrice] = useState(0.00);

    let [totalSalesReturnShippingHandlingFees, setTotalSalesReturnShippingHandlingFees] = useState(0.00);
    let [totalSalesReturnDiscount, setTotalSalesReturnDiscount] = useState(0.00);

    let [totalSalesReturnCashDiscount, setTotalSalesReturnCashDiscount] = useState(0.00);
    let [totalPaidSalesReturn, setTotalPaidSalesReturn] = useState(0.00);
    let [totalUnPaidSalesReturn, setTotalUnPaidSalesReturn] = useState(0.00);

    let [totalCashSalesReturn, setTotalCashSalesReturn] = useState(0.00);
    let [totalBankAccountSalesReturn, setTotalBankAccountSalesReturn] = useState(0.00);
    let [totalSalesSalesReturn, setTotalSalesSalesReturn] = useState(0.00);

    let [salesReturnNetProfit, setSalesReturnNetProfit] = useState(0.00);
    let [salesReturnLoss, setSalesReturnLoss] = useState(0.00);

    const [salesReturnStatsOpen, setSalesReturnStatsOpen] = useState(true);

    const listSalesReturn = useCallback(() => {

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=zatca.compliance_check_last_failed_at,zatca.reporting_passed,zatca.compliance_passed,zatca.reporting_passed_at,zatca.compliane_check_passed_at,zatca.reporting_last_failed_at,zatca.reporting_failed_count,zatca.compliance_check_failed_count,id,code,date,net_total,created_by_name,customer_id,customer_name,customer_name_arabic,status,created_at,net_profit,net_loss,cash_discount,discount,order_code,order_id,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }


        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (salesReturnStatsOpen) {
            searchParams["stats"] = "1";
        } else {
            searchParams["stats"] = "0";
        }


        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/sales-return?" +
            Select +
            queryParams +
            "&page=1" +
            "&limit=5",
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


                // setTotalPages(pageCount);
                //setTotalItems(data.total_count);
                //setOffset((page - 1) * pageSize);
                //setCurrentPageItemsCount(data.result.length);
                setTotalSalesReturn(data.meta.total_sales_return);
                setSalesReturnNetProfit(data.meta.net_profit);
                setSalesReturnLoss(data.meta.net_loss);
                setSalesReturnVatPrice(data.meta.vat_price);
                setTotalSalesReturnShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalSalesReturnDiscount(data.meta.discount);
                setTotalSalesReturnCashDiscount(data.meta.cash_discount);
                setTotalPaidSalesReturn(data.meta.paid_sales_return);
                setTotalUnPaidSalesReturn(data.meta.unpaid_sales_return);
                setTotalCashSalesReturn(data.meta.cash_sales_return);
                setTotalBankAccountSalesReturn(data.meta.bank_account_sales_return);
                setTotalSalesSalesReturn(data.meta.sales_sales_return);
                //setReturnCount(data.meta.return_count);
                //setReturnPaidAmount(data.meta.return_amount);

            })
            .catch((error) => {
                console.log(error);
            });
    }, [salesReturnStatsOpen, searchParams]);


    const handleSalesReturnSummaryToggle = (isOpen) => {
        setSalesReturnStatsOpen(isOpen);
    };

    useEffect(() => {
        if (salesReturnStatsOpen) {
            listSalesReturn();  // Call listSalesReturn() whenever salesReturnStatsOpen changes to true
        }
    }, [salesReturnStatsOpen, listSalesReturn]);

    //End Sales Return


    //Purchase
    let [totalPurchase, setTotalPurchase] = useState(0.00);
    let [purchaseVatPrice, setPurchaseVatPrice] = useState(0.00);
    let [totalPurchaseShippingHandlingFees, setTotalPurchaseShippingHandlingFees] = useState(0.00);
    let [totalPurchaseDiscount, setTotalPurchaseDiscount] = useState(0.00);
    let [totalPurchaseCashDiscount, setTotalPurchaseCashDiscount] = useState(0.00);
    let [totalPaidPurchase, setTotalPaidPurchase] = useState(0.00);
    let [totalUnPaidPurchase, setTotalUnPaidPurchase] = useState(0.00);
    let [totalCashPurchase, setTotalCashPurchase] = useState(0.00);
    let [totalBankAccountPurchase, setTotalBankAccountPurchase] = useState(0.00);
    let [totalSalesPurchase, setTotalSalesPurchase] = useState(0.00);
    let [totalPurchaseReturnPurchase, setTotalPurchaseReturnPurchase] = useState(0.00);

    const [purchaseStatsOpen, setPurchaseStatsOpen] = useState(true);

    const listPurchase = useCallback(() => {

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,date,net_total,return_count,return_amount,cash_discount,discount,vat_price,total,store_id,created_by_name,vendor_id,vendor_name,vendor_name_arabic,vendor_invoice_no,status,created_at,updated_at,net_retail_profit,net_wholesale_profit,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }


        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (purchaseStatsOpen) {
            searchParams["stats"] = "1";
        } else {
            searchParams["stats"] = "0";
        }


        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/purchase?" +
            Select +
            queryParams +
            (store.settings?.disable_purchases_on_accounts ? "&search[enable_on_accounts]=true" : "") +
            "&page=1" +
            "&limit=5",
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


                // setTotalPages(pageCount);
                //setTotalItems(data.total_count);
                //setOffset((page - 1) * pageSize);
                //setCurrentPageItemsCount(data.result.length);
                setTotalPurchase(data.meta.total_purchase);
                setPurchaseVatPrice(data.meta.vat_price);
                setTotalPurchaseShippingHandlingFees(data.meta.shipping_handling_fees);
                setTotalPurchaseDiscount(data.meta.discount);
                setTotalPurchaseCashDiscount(data.meta.cash_discount);
                // setNetRetailProfit(data.meta.net_retail_profit);
                // setNetWholesaleProfit(data.meta.net_wholesale_profit);
                setTotalPaidPurchase(data.meta.paid_purchase);
                setTotalUnPaidPurchase(data.meta.unpaid_purchase);
                setTotalCashPurchase(data.meta.cash_purchase);
                setTotalBankAccountPurchase(data.meta.bank_account_purchase);
                setTotalSalesPurchase(data.meta.sales_purchase);
                setTotalPurchaseReturnPurchase(data.meta.purchase_return_purchase);

                //setReturnCount(data.meta.return_count);
                //setReturnPaidAmount(data.meta.return_amount);

            })
            .catch((error) => {
                console.log(error);
            });
    }, [purchaseStatsOpen, searchParams, store]);


    const handlePurchaseSummaryToggle = (isOpen) => {
        setPurchaseStatsOpen(isOpen);
    };

    useEffect(() => {
        if (purchaseStatsOpen) {
            listPurchase();  // Call listPurchase() whenever purchaseStatsOpen changes to true
        }
    }, [purchaseStatsOpen, listPurchase]);

    //End Purchase


    //Purchase Return
    let [totalPurchaseReturn, setTotalPurchaseReturn] = useState(0.00);
    let [totalPurchasePurchaseReturn, setTotalPurchasePurchaseReturn] = useState(0.00);
    let [purchaseReturnVatPrice, setPurchaseReturnVatPrice] = useState(0.00);
    let [totalPurchaseReturnDiscount, setTotalPurchaseReturnDiscount] = useState(0.00);

    let [totalPaidPurchaseReturn, setTotalPaidPurchaseReturn] = useState(0.00);
    let [totalUnPaidPurchaseReturn, setTotalUnPaidPurchaseReturn] = useState(0.00);
    let [totalCashPurchaseReturn, setTotalCashPurchaseReturn] = useState(0.00);
    let [totalBankAccountPurchaseReturn, setTotalBankAccountPurchaseReturn] = useState(0.00);
    let [totalPurchaseReturnShippingHandlingFees, setTotalPurchaseReturnShippingHandlingFees] = useState(0.00);
    let [totalPurchaseReturnCashDiscount, setTotalPurchaseReturnCashDiscount] = useState(0.00);

    const [purchaseReturnStatsOpen, setPurchaseReturnStatsOpen] = useState(true);

    const listPurchaseReturn = useCallback(() => {

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,code,purchase_code,vat_price,cash_discount,purchase_id,date,net_total,created_by_name,vendor_name,vendor_name_arabic,vendor_id,vendor_invoice_no,status,created_at,total_payment_paid,payments_count,payment_methods,payment_status,balance_amount,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }


        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        if (purchaseReturnStatsOpen) {
            searchParams["stats"] = "1";
        } else {
            searchParams["stats"] = "0";
        }


        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        fetch(
            "/v1/purchase-return?" +
            Select +
            queryParams +
            (store.settings?.disable_purchases_on_accounts ? "&search[enable_on_accounts]=true" : "") +
            "&page=1" +
            "&limit=5",
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


                setTotalPurchaseReturn(data.meta.total_purchase_return);
                setTotalPurchasePurchaseReturn(data.meta.purchase_purchase_return);
                setPurchaseReturnVatPrice(data.meta.vat_price);
                setTotalPurchaseReturnDiscount(data.meta.discount);
                setTotalPurchaseReturnCashDiscount(data.meta.cash_discount);
                setTotalPaidPurchaseReturn(data.meta.paid_purchase_return);
                setTotalUnPaidPurchaseReturn(data.meta.unpaid_purchase_return);
                setTotalCashPurchaseReturn(data.meta.cash_purchase_return);
                setTotalBankAccountPurchaseReturn(data.meta.bank_account_purchase_return);
                setTotalPurchaseReturnShippingHandlingFees(data.meta.shipping_handling_fees);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [purchaseReturnStatsOpen, searchParams, store]);


    const handlePurchaseReturnSummaryToggle = (isOpen) => {
        setPurchaseReturnStatsOpen(isOpen);
    };

    useEffect(() => {
        if (purchaseReturnStatsOpen) {
            listPurchaseReturn();  // Call listPurchaseReturn() whenever purchaseReturnStatsOpen changes to true
        }
    }, [purchaseReturnStatsOpen, listPurchaseReturn]);

    //End Purchase Return


    //Expense
    let [totalExpense, setTotalExpense] = useState(0.00);
    let [totalExpenseCash, setTotalExpenseCash] = useState(0.00);
    let [totalExpenseBank, setTotalExpenseBank] = useState(0.00);
    let [totalExpensePurchaseFund, setTotalExpensePurchaseFund] = useState(0.00);
    let [totalExpenseVat, setTotalExpenseVat] = useState(0.00);
    const [expenseStatsOpen, setExpenseStatsOpen] = useState(true);

    const listExpense = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "select=id,code,date,amount,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        if (expenseStatsOpen) {
            searchParams["stats"] = "1";
        } else {
            searchParams["stats"] = "0";
        }
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }
        fetch(
            "/v1/expense?" + Select + queryParams + "&page=1&limit=5",
            requestOptions
        )
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                setTotalExpense(data.meta.total || 0);
                setTotalExpenseCash(data.meta.cash || 0);
                setTotalExpenseBank(data.meta.bank || 0);
                setTotalExpensePurchaseFund(data.meta.purchase_fund || 0);
                setTotalExpenseVat(data.meta.vat || 0);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [expenseStatsOpen, searchParams]);

    useEffect(() => {
        if (expenseStatsOpen) {
            listExpense();
        }
    }, [expenseStatsOpen, listExpense]);

    //End Expense

    //Quotation + Qtn. Sales
    let [totalQuotation, setTotalQuotation] = useState(0.00);
    let [quotationProfit, setQuotationProfit] = useState(0.00);
    let [quotationLoss, setQuotationLoss] = useState(0.00);
    let [totalQtnSales, setTotalQtnSales] = useState(0.00);
    let [qtnSalesVatPrice, setQtnSalesVatPrice] = useState(0.00);
    let [qtnSalesDiscount, setQtnSalesDiscount] = useState(0.00);
    let [qtnSalesCashDiscount, setQtnSalesCashDiscount] = useState(0.00);
    let [qtnSalesShippingHandlingFees, setQtnSalesShippingHandlingFees] = useState(0.00);
    let [totalQtnSalesPaid, setTotalQtnSalesPaid] = useState(0.00);
    let [totalQtnSalesUnpaid, setTotalQtnSalesUnpaid] = useState(0.00);
    let [totalQtnSalesCash, setTotalQtnSalesCash] = useState(0.00);
    let [totalQtnSalesBankAccount, setTotalQtnSalesBankAccount] = useState(0.00);
    let [totalQtnSalesReturnSales, setTotalQtnSalesReturnSales] = useState(0.00);
    let [qtnSalesNetProfit, setQtnSalesNetProfit] = useState(0.00);
    let [qtnSalesNetLoss, setQtnSalesNetLoss] = useState(0.00);

    const listQuotation = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "select=id,code,date,net_total,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }
        fetch(
            "/v1/quotation?" + Select + queryParams + "&page=1&limit=5",
            requestOptions
        )
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                setTotalQuotation(data.meta.total_quotation || 0);
                setQuotationProfit(data.meta.profit || 0);
                setQuotationLoss(data.meta.loss || 0);
                setTotalQtnSales(data.meta.invoice_total_sales || 0);
                setQtnSalesVatPrice(data.meta.invoice_vat_price || 0);
                setQtnSalesDiscount(data.meta.invoice_discount || 0);
                setQtnSalesCashDiscount(data.meta.invoice_cash_discount || 0);
                setQtnSalesShippingHandlingFees(data.meta.invoice_shipping_handling_fees || 0);
                setTotalQtnSalesPaid(data.meta.invoice_paid_sales || 0);
                setTotalQtnSalesUnpaid(data.meta.invoice_unpaid_sales || 0);
                setTotalQtnSalesCash(data.meta.invoice_cash_sales || 0);
                setTotalQtnSalesBankAccount(data.meta.invoice_bank_account_sales || 0);
                setTotalQtnSalesReturnSales(data.meta.invoice_sales_return_sales || 0);
                setQtnSalesNetProfit(data.meta.invoice_net_profit || 0);
                setQtnSalesNetLoss(data.meta.invoice_net_loss || 0);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [searchParams]);

    useEffect(() => {
        listQuotation();
    }, [listQuotation]);

    //End Quotation + Qtn. Sales

    //Quotation Sales Return
    let [totalQtnSalesReturn, setTotalQtnSalesReturn] = useState(0.00);
    let [qtnSalesReturnVatPrice, setQtnSalesReturnVatPrice] = useState(0.00);
    let [qtnSalesReturnDiscount, setQtnSalesReturnDiscount] = useState(0.00);
    let [qtnSalesReturnCashDiscount, setQtnSalesReturnCashDiscount] = useState(0.00);
    let [qtnSalesReturnShippingHandlingFees, setQtnSalesReturnShippingHandlingFees] = useState(0.00);
    let [totalQtnSalesReturnPaid, setTotalQtnSalesReturnPaid] = useState(0.00);
    let [totalQtnSalesReturnUnpaid, setTotalQtnSalesReturnUnpaid] = useState(0.00);
    let [totalQtnSalesReturnCash, setTotalQtnSalesReturnCash] = useState(0.00);
    let [totalQtnSalesReturnBankAccount, setTotalQtnSalesReturnBankAccount] = useState(0.00);
    let [qtnSalesQuotationSalesReturn, setQtnSalesQuotationSalesReturn] = useState(0.00);
    let [qtnSalesReturnNetProfit, setQtnSalesReturnNetProfit] = useState(0.00);
    let [qtnSalesReturnNetLoss, setQtnSalesReturnNetLoss] = useState(0.00);

    const listQtnSalesReturn = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "select=id,code,date,net_total,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }
        fetch(
            "/v1/quotation-sales-return?" + Select + queryParams + "&page=1&limit=5",
            requestOptions
        )
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                setTotalQtnSalesReturn(data.meta.total_quotation_sales_return || 0);
                setQtnSalesReturnVatPrice(data.meta.vat_price || 0);
                setQtnSalesReturnDiscount(data.meta.discount || 0);
                setQtnSalesReturnCashDiscount(data.meta.cash_discount || 0);
                setQtnSalesReturnShippingHandlingFees(data.meta.shipping_handling_fees || 0);
                setTotalQtnSalesReturnPaid(data.meta.paid_quotation_sales_return || 0);
                setTotalQtnSalesReturnUnpaid(data.meta.unpaid_quotation_sales_return || 0);
                setTotalQtnSalesReturnCash(data.meta.cash_quotation_sales_return || 0);
                setTotalQtnSalesReturnBankAccount(data.meta.bank_account_quotation_sales_return || 0);
                setQtnSalesQuotationSalesReturn(data.meta.quotation_sales_quotation_sales_return || 0);
                setQtnSalesReturnNetProfit(data.meta.net_profit || 0);
                setQtnSalesReturnNetLoss(data.meta.net_loss || 0);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [searchParams]);

    useEffect(() => {
        listQtnSalesReturn();
    }, [listQtnSalesReturn]);

    //End Quotation Sales Return

    useEffect(() => {
        list();
        listSalesReturn();
        listPurchase();
        listPurchaseReturn();
        listExpense();
        listQuotation();
        listQtnSalesReturn();
    }, [list, listSalesReturn, listPurchase, listPurchaseReturn, listExpense, listQuotation, listQtnSalesReturn]);


    useEffect(() => {
        if (lastMessage) {
            list();
            listSalesReturn();
            listPurchase();
            listPurchaseReturn();
            listExpense();
            listQuotation();
            listQtnSalesReturn();
        }

    }, [lastMessage, list, listSalesReturn, listPurchase, listPurchaseReturn, listExpense, listQuotation, listQtnSalesReturn]);


    useEffect(() => {
        const handleSocketOpen = () => {
            list();
            listSalesReturn();
            listPurchase();
            listPurchaseReturn();
            listExpense();
            listQuotation();
            listQtnSalesReturn();
        };

        eventEmitter.on("socket_connection_open", handleSocketOpen);

        return () => {
            eventEmitter.off("socket_connection_open", handleSocketOpen); // Cleanup
        };
    }, [list, listSalesReturn, listPurchase, listPurchaseReturn, listExpense, listQuotation, listQtnSalesReturn]); // Runs only once when component mounts

    // const [overallStatsOpen, setOverallStatsOpen] = useState(true);

    const handleOverallSummaryToggle = (isOpen) => {
        // setOverallStatsOpen(isOpen);
    };

    const handleProfitLossSummaryToggle = (isOpen) => { };

    const handleExpenseSummaryToggle = (isOpen) => {
        setExpenseStatsOpen(isOpen);
    };

    const handleQuotationSummaryToggle = (isOpen) => { };
    const handleQtnSalesSummaryToggle = (isOpen) => { };
    const handleQtnSalesReturnSummaryToggle = (isOpen) => { };

    const qtnInvoiceAccounting = store.settings?.quotation_invoice_accounting === true;
    const disablePurchasesOnAccounts = store.settings?.disable_purchases_on_accounts === true;
    const profitLossRevenueNum = (totalSales || 0) - (totalSalesReturn || 0) + (qtnInvoiceAccounting ? (totalQtnSales || 0) - (totalQtnSalesReturn || 0) : 0);
    const profitLossExpenseNum = (totalExpense || 0) + (totalPurchase || 0) - (totalPurchaseReturn || 0);
    const profitLossNum = profitLossRevenueNum - profitLossExpenseNum;
    const vatPercent = store.vat_percent || 15;
    const profitLossVatNum = profitLossNum * vatPercent / (100 + vatPercent);
    const profitLossWithoutVATNum = profitLossNum - profitLossVatNum;

    const statsFilters = {
        ...(dateValue ? { 'Date': dateValue } : {}),
        ...(fromDateValue ? { 'From Date': fromDateValue } : {}),
        ...(toDateValue ? { 'To Date': toDateValue } : {}),
    };



    return (
        <>
            <div className="container-fluid p-0">
                <h1>Statistics</h1>
                <div className="row">
                    <div className="col-1" style={{ width: "50px" }}>
                        Date:
                    </div>
                    <div id="calendar-portal" className="col-3 date-picker " style={{ minWidth: "125px" }}>

                        <DatePicker
                            id="date_str"
                            autoComplete="off"
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

                        <br />
                        <small
                            style={{
                                color: "blue",
                                textDecoration: "underline",
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
                                    autoComplete="off"
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
                                    id="to_date"
                                    autoComplete="off"
                                    value={toDateValue}
                                    selected={selectedToDate}
                                    className="form-control"
                                    dateFormat="MMM dd yyyy"
                                    isClearable={true}
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
                </div>
                {store.settings?.stats_show_profit_loss_statement !== false && (
                    <div className="row mt-3">
                        <div className="col">
                            <span className="text-end">
                                <StatsSummary
                                    title="Profit / Loss Statement"
                                    stats={{
                                        "Revenue (with VAT)": profitLossRevenueNum,
                                        "Expense (with VAT)": profitLossExpenseNum,
                                        "Profit / Loss (with VAT)": profitLossNum,
                                        [`VAT ${vatPercent}%`]: profitLossVatNum,
                                        "Profit / Loss (without VAT)": profitLossWithoutVATNum,
                                    }}
                                    statsWithInfo={[
                                        { label: "Revenue (with VAT)", value: profitLossRevenueNum, info: qtnInvoiceAccounting ? `Sales - Sales Return + Qtn. Sales - Qtn. Sales Return\n= ${trimTo2Decimals(totalSales)} - ${trimTo2Decimals(totalSalesReturn)} + ${trimTo2Decimals(totalQtnSales)} - ${trimTo2Decimals(totalQtnSalesReturn)} = ${trimTo2Decimals(profitLossRevenueNum)}` : `Sales (with VAT) - Sales Return (with VAT)\n= ${trimTo2Decimals(totalSales)} - ${trimTo2Decimals(totalSalesReturn)} = ${trimTo2Decimals(profitLossRevenueNum)}` },
                                        { label: "Expense (with VAT)", value: profitLossExpenseNum, info: disablePurchasesOnAccounts ? `Expenses + Accounted Purchase(with VAT) - Accounted Purchase Return(with VAT)\n= ${trimTo2Decimals(totalExpense)} + ${trimTo2Decimals(totalPurchase)} - ${trimTo2Decimals(totalPurchaseReturn)} = ${trimTo2Decimals(profitLossExpenseNum)}` : `Expenses + Purchases (with VAT) - Purchase Return (with VAT)\n= ${trimTo2Decimals(totalExpense)} + ${trimTo2Decimals(totalPurchase)} - ${trimTo2Decimals(totalPurchaseReturn)} = ${trimTo2Decimals(profitLossExpenseNum)}` },
                                        { label: "Profit / Loss (with VAT)", value: profitLossNum, colorByValue: true, info: `Revenue - Expense (with VAT)\n= ${trimTo2Decimals(profitLossRevenueNum)} - ${trimTo2Decimals(profitLossExpenseNum)} = ${trimTo2Decimals(profitLossNum)}` },
                                        { label: `VAT ${vatPercent}%`, value: profitLossVatNum, info: `Profit / Loss (with VAT) × ${vatPercent} / ${100 + vatPercent}\n= ${trimTo2Decimals(profitLossNum)} × ${vatPercent} / ${100 + vatPercent} = ${trimTo2Decimals(profitLossVatNum)}` },
                                        { label: "Profit / Loss (without VAT)", value: profitLossWithoutVATNum, colorByValue: true, info: `Profit / Loss (with VAT) - VAT ${vatPercent}%\n= ${trimTo2Decimals(profitLossNum)} - ${trimTo2Decimals(profitLossVatNum)} = ${trimTo2Decimals(profitLossWithoutVATNum)}` },
                                    ]}
                                    defaultOpen={true}
                                    filters={statsFilters}
                                    onToggle={handleProfitLossSummaryToggle}
                                />
                            </span>
                        </div>
                    </div>
                )}
                {store.settings?.stats_show_overall_summary === true && (
                    <div className="row">
                        <div className="col">
                            <span className="text-end">
                                <StatsSummary
                                    title="Overall Summary"
                                    stats={{
                                        "SALES(with VAT)": (totalSales - totalSalesReturn),
                                        "PURCHASE(with VAT)": (totalPurchase - totalPurchaseReturn),
                                        "DIFFERENCE(with VAT)": ((totalSales - totalSalesReturn) - (totalPurchase - totalPurchaseReturn)),

                                        "SALES(without VAT)": ((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)),
                                        "PURCHASE(without VAT)": ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice)),
                                        "DIFFERENCE(without VAT)": (((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)) - ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))),
                                        "VAT": ((vatPrice - salesReturnVatPrice) - (purchaseVatPrice - purchaseReturnVatPrice)),
                                    }}
                                    statsWithInfo={[
                                        {
                                            "label": "SALES(with VAT)",
                                            "value": (totalSales - totalSalesReturn),
                                            "info": `SALES(with VAT) - SALES RETURN(with VAT)\n= ${trimTo2Decimals(totalSales)} - ${trimTo2Decimals(totalSalesReturn)} = ${trimTo2Decimals(totalSales - totalSalesReturn)}`
                                        }, {
                                            "label": "PURCHASE(with VAT)",
                                            "value": (totalPurchase - totalPurchaseReturn),
                                            "info": `PURCHASE(with VAT) - PURCHASE RETURN(with VAT)\n= ${trimTo2Decimals(totalPurchase)} - ${trimTo2Decimals(totalPurchaseReturn)} = ${trimTo2Decimals(totalPurchase - totalPurchaseReturn)}`
                                        },
                                        {
                                            "label": "DIFFERENCE(with VAT)",
                                            "value": ((totalSales - totalSalesReturn) - (totalPurchase - totalPurchaseReturn)),
                                            "info": `OVERALL SALES(with VAT) - OVERALL PURCHASE(with VAT)\n= ${trimTo2Decimals(totalSales - totalSalesReturn)} - ${trimTo2Decimals(totalPurchase - totalPurchaseReturn)} = ${trimTo2Decimals((totalSales - totalSalesReturn) - (totalPurchase - totalPurchaseReturn))}`
                                        },
                                        {
                                            "label": "SALES(without VAT)",
                                            "value": ((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)),
                                            "info": `SALES(without VAT) - SALES RETURN(without VAT)\n= ${trimTo2Decimals(totalSales - vatPrice)} - ${trimTo2Decimals(totalSalesReturn - salesReturnVatPrice)} = ${trimTo2Decimals((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice))}`
                                        }, {
                                            "label": "PURCHASE(without VAT)",
                                            "value": ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice)),
                                            "info": `PURCHASE(without VAT) - PURCHASE RETURN(without VAT)\n= ${trimTo2Decimals(totalPurchase - purchaseVatPrice)} - ${trimTo2Decimals(totalPurchaseReturn - purchaseReturnVatPrice)} = ${trimTo2Decimals((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))}`
                                        },
                                        {
                                            "label": "DIFFERENCE(without VAT)",
                                            "value": (((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)) - ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))),
                                            "info": `OVERALL SALES(without VAT) - OVERALL PURCHASE(without VAT)\n= ${trimTo2Decimals((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice))} - ${trimTo2Decimals((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))} = ${trimTo2Decimals(((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)) - ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice)))}`
                                        },
                                        {
                                            "label": "VAT",
                                            "value": ((vatPrice - salesReturnVatPrice) - (purchaseVatPrice - purchaseReturnVatPrice)),
                                            "info": `(SALES VAT - SALES RETURN VAT) - (PURCHASE VAT - PURCHASE RETURN VAT)\n= (${trimTo2Decimals(vatPrice)} - ${trimTo2Decimals(salesReturnVatPrice)}) - (${trimTo2Decimals(purchaseVatPrice)} - ${trimTo2Decimals(purchaseReturnVatPrice)}) = ${trimTo2Decimals((vatPrice - salesReturnVatPrice) - (purchaseVatPrice - purchaseReturnVatPrice))}`
                                        }
                                    ]}

                                    defaultOpen={true}
                                    filters={statsFilters}
                                    onToggle={handleOverallSummaryToggle}
                                />
                            </span>
                        </div>
                    </div>
                )}
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Sales Summary"
                                stats={{
                                    "Sales": totalSales,
                                    "Cash Sales": totalCashSales,
                                    "Credit Sales": totalUnPaidSales,
                                    "Bank Account Sales": totalBankAccountSales,
                                    "Sales paid By Sales Return": totalSalesReturnSales,
                                    "Sales paid By Purchase": totalPurchaseSales,
                                    "Cash Discount": totalCashDiscount,
                                    "VAT Collected": vatPrice,
                                    "Net Profit %": netProfit && totalSales ? ((netProfit / totalSales) * 100) : "",
                                    "Paid Sales": totalPaidSales,
                                    "Sales Discount": totalDiscount,
                                    "Shipping/Handling fees": totalShippingHandlingFees,
                                    "Net Profit": netProfit,
                                    "Net Loss": loss,
                                    //"Return Count": returnCount,
                                    //"Return Paid Amount": returnPaidAmount,
                                }}
                                statsWithInfo={[
                                    { label: "Sales", value: totalSales, info: `Total sales (with VAT)\n= ${trimTo2Decimals(totalSales)}` },
                                    { label: "Cash Sales", value: totalCashSales, info: `Sales paid in cash\n= ${trimTo2Decimals(totalCashSales)}` },
                                    { label: "Credit Sales", value: totalUnPaidSales, info: `Unpaid / credit sales\n= ${trimTo2Decimals(totalUnPaidSales)}` },
                                    { label: "Bank Account Sales", value: totalBankAccountSales, info: `Sales paid via bank / card\n= ${trimTo2Decimals(totalBankAccountSales)}` },
                                    { label: "Sales paid By Sales Return", value: totalSalesReturnSales, info: `Sales settled by sales return credit\n= ${trimTo2Decimals(totalSalesReturnSales)}` },
                                    { label: "Sales paid By Purchase", value: totalPurchaseSales, info: `Sales settled using purchase funds\n= ${trimTo2Decimals(totalPurchaseSales)}` },
                                    { label: "Cash Discount", value: totalCashDiscount, info: `Cash discount given on sales\n= ${trimTo2Decimals(totalCashDiscount)}` },
                                    { label: "VAT Collected", value: vatPrice, info: `VAT (15%) collected on sales\n= ${trimTo2Decimals(vatPrice)}` },
                                    { label: "Net Profit %", value: netProfit && totalSales ? ((netProfit / totalSales) * 100) : "", info: `(Net Profit / Sales) × 100\n= (${trimTo2Decimals(netProfit)} / ${trimTo2Decimals(totalSales)}) × 100 = ${trimTo2Decimals(netProfit && totalSales ? (netProfit / totalSales) * 100 : 0)}%` },
                                    { label: "Paid Sales", value: totalPaidSales, info: `Total paid sales\n= ${trimTo2Decimals(totalPaidSales)}` },
                                    { label: "Sales Discount", value: totalDiscount, info: `Total discount on sales\n= ${trimTo2Decimals(totalDiscount)}` },
                                    { label: "Shipping/Handling fees", value: totalShippingHandlingFees, info: `Shipping and handling charges\n= ${trimTo2Decimals(totalShippingHandlingFees)}` },
                                    { label: "Net Profit", value: netProfit, info: `Net profit from sales\n= ${trimTo2Decimals(netProfit)}` },
                                    { label: "Net Loss", value: loss, info: `Net loss from sales\n= ${trimTo2Decimals(loss)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handleSummaryToggle}
                            />
                        </span>
                    </div>
                </div>

                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Sales Return Summary"
                                stats={{
                                    "Sales Return": totalSalesReturn,
                                    "Cash Sales Return": totalCashSalesReturn,
                                    "Credit Sales Return": totalUnPaidSalesReturn,
                                    "Bank Account Sales Return": totalBankAccountSalesReturn,
                                    "Sales Return paid by Sales": totalSalesSalesReturn,
                                    "Cash Discount Return": totalSalesReturnCashDiscount,
                                    "VAT Return": salesReturnVatPrice,
                                    "Net Profit Return %": salesReturnNetProfit && totalSalesReturn ? ((salesReturnNetProfit / totalSalesReturn) * 100) : "",
                                    "Paid Sales Return": totalPaidSalesReturn,
                                    "Sales Discount Return": totalSalesReturnDiscount,
                                    "Shipping/Handling fees Return": totalSalesReturnShippingHandlingFees,
                                    "Net Profit Return": salesReturnNetProfit,
                                    "Net Loss Return": salesReturnLoss,
                                }}
                                statsWithInfo={[
                                    { label: "Sales Return", value: totalSalesReturn, info: `Total sales return amount (with VAT)\n= ${trimTo2Decimals(totalSalesReturn)}` },
                                    { label: "Cash Sales Return", value: totalCashSalesReturn, info: `Returns refunded in cash\n= ${trimTo2Decimals(totalCashSalesReturn)}` },
                                    { label: "Credit Sales Return", value: totalUnPaidSalesReturn, info: `Unpaid / credit sales returns\n= ${trimTo2Decimals(totalUnPaidSalesReturn)}` },
                                    { label: "Bank Account Sales Return", value: totalBankAccountSalesReturn, info: `Returns refunded via bank / card\n= ${trimTo2Decimals(totalBankAccountSalesReturn)}` },
                                    { label: "Sales Return paid by Sales", value: totalSalesSalesReturn, info: `Returns settled against new sales\n= ${trimTo2Decimals(totalSalesSalesReturn)}` },
                                    { label: "Cash Discount Return", value: totalSalesReturnCashDiscount, info: `Cash discount reversed on returns\n= ${trimTo2Decimals(totalSalesReturnCashDiscount)}` },
                                    { label: "VAT Return", value: salesReturnVatPrice, info: `VAT (15%) refunded on sales returns\n= ${trimTo2Decimals(salesReturnVatPrice)}` },
                                    { label: "Net Profit Return %", value: salesReturnNetProfit && totalSalesReturn ? ((salesReturnNetProfit / totalSalesReturn) * 100) : "", info: `(Net Profit Return / Sales Return) × 100\n= (${trimTo2Decimals(salesReturnNetProfit)} / ${trimTo2Decimals(totalSalesReturn)}) × 100 = ${trimTo2Decimals(salesReturnNetProfit && totalSalesReturn ? (salesReturnNetProfit / totalSalesReturn) * 100 : 0)}%` },
                                    { label: "Paid Sales Return", value: totalPaidSalesReturn, info: `Total paid sales returns\n= ${trimTo2Decimals(totalPaidSalesReturn)}` },
                                    { label: "Sales Discount Return", value: totalSalesReturnDiscount, info: `Discount reversed on returns\n= ${trimTo2Decimals(totalSalesReturnDiscount)}` },
                                    { label: "Shipping/Handling fees Return", value: totalSalesReturnShippingHandlingFees, info: `Shipping/handling reversed on returns\n= ${trimTo2Decimals(totalSalesReturnShippingHandlingFees)}` },
                                    { label: "Net Profit Return", value: salesReturnNetProfit, info: `Net profit impact from returns\n= ${trimTo2Decimals(salesReturnNetProfit)}` },
                                    { label: "Net Loss Return", value: salesReturnLoss, info: `Net loss impact from returns\n= ${trimTo2Decimals(salesReturnLoss)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handleSalesReturnSummaryToggle}
                            />
                        </span>
                    </div>

                </div>

                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Purchase Summary"
                                stats={{
                                    "Cash purchase": totalCashPurchase,
                                    "Credit purchase": totalUnPaidPurchase,
                                    "Bank account purchase": totalBankAccountPurchase,
                                    "Purchases paid by sales": totalSalesPurchase,
                                    "Purchases paid by purchase return": totalPurchaseReturnPurchase,
                                    "Cash discount": totalPurchaseCashDiscount,
                                    "VAT paid": purchaseVatPrice,
                                    "Purchase": totalPurchase,
                                    ...(disablePurchasesOnAccounts ? { "Accounted Purchase(with VAT)": totalPurchase } : {}),
                                    "Paid purchase": totalPaidPurchase,
                                    "Purchase discount": totalPurchaseDiscount,
                                    "Shipping/Handling fees": totalPurchaseShippingHandlingFees,
                                    // "Return Count": returnCount,
                                    // "Return Paid Amount": returnPaidAmount,
                                }}
                                statsWithInfo={[
                                    { label: "Cash purchase", value: totalCashPurchase, info: `Purchases paid in cash\n= ${trimTo2Decimals(totalCashPurchase)}` },
                                    { label: "Credit purchase", value: totalUnPaidPurchase, info: `Unpaid / credit purchases\n= ${trimTo2Decimals(totalUnPaidPurchase)}` },
                                    { label: "Bank account purchase", value: totalBankAccountPurchase, info: `Purchases paid via bank / card\n= ${trimTo2Decimals(totalBankAccountPurchase)}` },
                                    { label: "Purchases paid by sales", value: totalSalesPurchase, info: `Purchases settled using sales revenue\n= ${trimTo2Decimals(totalSalesPurchase)}` },
                                    { label: "Purchases paid by purchase return", value: totalPurchaseReturnPurchase, info: `Purchases settled using purchase return credit\n= ${trimTo2Decimals(totalPurchaseReturnPurchase)}` },
                                    { label: "Cash discount", value: totalPurchaseCashDiscount, info: `Cash discount received on purchases\n= ${trimTo2Decimals(totalPurchaseCashDiscount)}` },
                                    { label: "VAT paid", value: purchaseVatPrice, info: `VAT (15%) paid on purchases\n= ${trimTo2Decimals(purchaseVatPrice)}` },
                                    { label: "Purchase", value: totalPurchase, info: `Total purchase amount (with VAT)\n= ${trimTo2Decimals(totalPurchase)}` },
                                    ...(disablePurchasesOnAccounts ? [{ label: "Accounted Purchase(with VAT)", value: totalPurchase, info: `Total accounted purchase amount (with VAT)\n= ${trimTo2Decimals(totalPurchase)}` }] : []),
                                    { label: "Paid purchase", value: totalPaidPurchase, info: `Total paid purchases\n= ${trimTo2Decimals(totalPaidPurchase)}` },
                                    { label: "Purchase discount", value: totalPurchaseDiscount, info: `Total discount on purchases\n= ${trimTo2Decimals(totalPurchaseDiscount)}` },
                                    { label: "Shipping/Handling fees", value: totalPurchaseShippingHandlingFees, info: `Shipping and handling on purchases\n= ${trimTo2Decimals(totalPurchaseShippingHandlingFees)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handlePurchaseSummaryToggle}
                            />
                        </span>
                    </div>

                </div>

                <div className="row">

                    <div className="col">

                        <span className="text-end">
                            <StatsSummary
                                title="Purchase Return Summary"
                                stats={{
                                    "Cash Purchase Return": totalCashPurchaseReturn,
                                    "Credit Purchase Return": totalUnPaidPurchaseReturn,
                                    "Bank Account Purchase Return": totalBankAccountPurchaseReturn,
                                    "Cash Discount Return": totalPurchaseReturnCashDiscount,
                                    "VAT Return": purchaseReturnVatPrice,
                                    "Purchase Return": totalPurchaseReturn,
                                    ...(disablePurchasesOnAccounts ? { "Accounted Purchase Return(with VAT)": totalPurchaseReturn } : {}),
                                    "Purchase Return paid by purchase": totalPurchasePurchaseReturn,
                                    "Paid Purchase Return": totalPaidPurchaseReturn,
                                    "Purchase Discount Return": totalPurchaseReturnDiscount,
                                    "Shipping/Handling fees": totalPurchaseReturnShippingHandlingFees,
                                }}
                                statsWithInfo={[
                                    { label: "Cash Purchase Return", value: totalCashPurchaseReturn, info: `Purchase returns refunded in cash\n= ${trimTo2Decimals(totalCashPurchaseReturn)}` },
                                    { label: "Credit Purchase Return", value: totalUnPaidPurchaseReturn, info: `Unpaid / credit purchase returns\n= ${trimTo2Decimals(totalUnPaidPurchaseReturn)}` },
                                    { label: "Bank Account Purchase Return", value: totalBankAccountPurchaseReturn, info: `Returns refunded via bank / card\n= ${trimTo2Decimals(totalBankAccountPurchaseReturn)}` },
                                    { label: "Cash Discount Return", value: totalPurchaseReturnCashDiscount, info: `Cash discount reversed on purchase returns\n= ${trimTo2Decimals(totalPurchaseReturnCashDiscount)}` },
                                    { label: "VAT Return", value: purchaseReturnVatPrice, info: `VAT (15%) recovered on purchase returns\n= ${trimTo2Decimals(purchaseReturnVatPrice)}` },
                                    { label: "Purchase Return", value: totalPurchaseReturn, info: `Total purchase return amount (with VAT)\n= ${trimTo2Decimals(totalPurchaseReturn)}` },
                                    ...(disablePurchasesOnAccounts ? [{ label: "Accounted Purchase Return(with VAT)", value: totalPurchaseReturn, info: `Total accounted purchase return amount (with VAT)\n= ${trimTo2Decimals(totalPurchaseReturn)}` }] : []),
                                    { label: "Purchase Return paid by purchase", value: totalPurchasePurchaseReturn, info: `Returns offset against new purchases\n= ${trimTo2Decimals(totalPurchasePurchaseReturn)}` },
                                    { label: "Paid Purchase Return", value: totalPaidPurchaseReturn, info: `Total paid purchase returns\n= ${trimTo2Decimals(totalPaidPurchaseReturn)}` },
                                    { label: "Purchase Discount Return", value: totalPurchaseReturnDiscount, info: `Discount reversed on purchase returns\n= ${trimTo2Decimals(totalPurchaseReturnDiscount)}` },
                                    { label: "Shipping/Handling fees", value: totalPurchaseReturnShippingHandlingFees, info: `Shipping/handling reversed on purchase returns\n= ${trimTo2Decimals(totalPurchaseReturnShippingHandlingFees)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handlePurchaseReturnSummaryToggle}
                            />
                        </span>


                    </div>

                </div>
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Expense Summary"
                                stats={{
                                    "Total Expense": totalExpense,
                                    "Cash Expense": totalExpenseCash,
                                    "Bank Expense": totalExpenseBank,
                                    "Purchase Fund": totalExpensePurchaseFund,
                                    "VAT Paid": totalExpenseVat,
                                }}
                                statsWithInfo={[
                                    { label: "Total Expense", value: totalExpense, info: `Total expense amount\n= ${trimTo2Decimals(totalExpense)}` },
                                    { label: "Cash Expense", value: totalExpenseCash, info: `Expenses paid in cash\n= ${trimTo2Decimals(totalExpenseCash)}` },
                                    { label: "Bank Expense", value: totalExpenseBank, info: `Expenses paid via bank / card\n= ${trimTo2Decimals(totalExpenseBank)}` },
                                    { label: "Purchase Fund", value: totalExpensePurchaseFund, info: `Expenses paid using purchase funds\n= ${trimTo2Decimals(totalExpensePurchaseFund)}` },
                                    { label: "VAT Paid", value: totalExpenseVat, info: `VAT (15%) paid on expenses\n= ${trimTo2Decimals(totalExpenseVat)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handleExpenseSummaryToggle}
                            />
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Quotation Summary"
                                stats={{
                                    "Quotation": totalQuotation,
                                    "Profit": quotationProfit,
                                    "Profit %": quotationProfit && totalQuotation ? (quotationProfit / totalQuotation) * 100 : "",
                                    "Loss": quotationLoss,
                                }}
                                statsWithInfo={[
                                    { label: "Quotation", value: totalQuotation, info: `Total quotation amount\n= ${trimTo2Decimals(totalQuotation)}` },
                                    { label: "Profit", value: quotationProfit, colorByValue: true, info: `Net profit on quotations\n= ${trimTo2Decimals(quotationProfit)}` },
                                    { label: "Profit %", value: quotationProfit && totalQuotation ? parseFloat(trimTo2Decimals((quotationProfit / totalQuotation) * 100)) : 0, info: `Profit / Quotation × 100\n= ${trimTo2Decimals(quotationProfit)} / ${trimTo2Decimals(totalQuotation)} × 100 = ${trimTo2Decimals(quotationProfit && totalQuotation ? (quotationProfit / totalQuotation) * 100 : 0)}%` },
                                    { label: "Loss", value: quotationLoss, info: `Net loss on quotations\n= ${trimTo2Decimals(quotationLoss)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handleQuotationSummaryToggle}
                            />
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Qtn. Sales Summary"
                                stats={{
                                    "Sales": totalQtnSales,
                                    "Cash Sales": totalQtnSalesCash,
                                    "Credit Sales": totalQtnSalesUnpaid,
                                    "Bank Account Sales": totalQtnSalesBankAccount,
                                    "Sales paid by sales return": totalQtnSalesReturnSales,
                                    "Cash Discount": qtnSalesCashDiscount,
                                    "VAT Collected": qtnSalesVatPrice,
                                    "Net Profit %": qtnSalesNetProfit && totalQtnSales ? ((qtnSalesNetProfit / totalQtnSales) * 100) : "",
                                    "Paid Sales": totalQtnSalesPaid,
                                    "Sales Discount": qtnSalesDiscount,
                                    "Shipping/Handling fees": qtnSalesShippingHandlingFees,
                                    "Net Profit": qtnSalesNetProfit,
                                    "Net Loss": qtnSalesNetLoss,
                                }}
                                statsWithInfo={[
                                    { label: "Sales", value: totalQtnSales, info: `Total quotation sales amount\n= ${trimTo2Decimals(totalQtnSales)}` },
                                    { label: "Cash Sales", value: totalQtnSalesCash, info: `Quotation sales paid in cash\n= ${trimTo2Decimals(totalQtnSalesCash)}` },
                                    { label: "Credit Sales", value: totalQtnSalesUnpaid, info: `Unpaid / credit quotation sales\n= ${trimTo2Decimals(totalQtnSalesUnpaid)}` },
                                    { label: "Bank Account Sales", value: totalQtnSalesBankAccount, info: `Quotation sales paid via bank / card\n= ${trimTo2Decimals(totalQtnSalesBankAccount)}` },
                                    { label: "Sales paid by sales return", value: totalQtnSalesReturnSales, info: `Quotation sales offset by sales returns\n= ${trimTo2Decimals(totalQtnSalesReturnSales)}` },
                                    { label: "Cash Discount", value: qtnSalesCashDiscount, info: `Cash discount on quotation sales\n= ${trimTo2Decimals(qtnSalesCashDiscount)}` },
                                    { label: "VAT Collected", value: qtnSalesVatPrice, info: `VAT collected on quotation sales\n= ${trimTo2Decimals(qtnSalesVatPrice)}` },
                                    { label: "Net Profit %", value: qtnSalesNetProfit && totalQtnSales ? parseFloat(trimTo2Decimals((qtnSalesNetProfit / totalQtnSales) * 100)) : 0, info: `Net Profit / Sales × 100\n= ${trimTo2Decimals(qtnSalesNetProfit)} / ${trimTo2Decimals(totalQtnSales)} × 100 = ${trimTo2Decimals(qtnSalesNetProfit && totalQtnSales ? (qtnSalesNetProfit / totalQtnSales) * 100 : 0)}%` },
                                    { label: "Paid Sales", value: totalQtnSalesPaid, info: `Total paid quotation sales\n= ${trimTo2Decimals(totalQtnSalesPaid)}` },
                                    { label: "Sales Discount", value: qtnSalesDiscount, info: `Total sales discount on quotation sales\n= ${trimTo2Decimals(qtnSalesDiscount)}` },
                                    { label: "Shipping/Handling fees", value: qtnSalesShippingHandlingFees, info: `Shipping / handling fees on quotation sales\n= ${trimTo2Decimals(qtnSalesShippingHandlingFees)}` },
                                    { label: "Net Profit", value: qtnSalesNetProfit, colorByValue: true, info: `Net profit on quotation sales\n= ${trimTo2Decimals(qtnSalesNetProfit)}` },
                                    { label: "Net Loss", value: qtnSalesNetLoss, info: `Net loss on quotation sales\n= ${trimTo2Decimals(qtnSalesNetLoss)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handleQtnSalesSummaryToggle}
                            />
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Qtn. Sales Return Summary"
                                stats={{
                                    "Sales Return": totalQtnSalesReturn,
                                    "Cash Sales Return": totalQtnSalesReturnCash,
                                    "Credit Sales Return": totalQtnSalesReturnUnpaid,
                                    "Bank Account Sales Return": totalQtnSalesReturnBankAccount,
                                    "Sales Return paid by sales": qtnSalesQuotationSalesReturn,
                                    "Cash Discount Return": qtnSalesReturnCashDiscount,
                                    "VAT Return": qtnSalesReturnVatPrice,
                                    "Net Profit Return %": qtnSalesReturnNetProfit && totalQtnSalesReturn ? ((qtnSalesReturnNetProfit / totalQtnSalesReturn) * 100) : "",
                                    "Paid Sales Return": totalQtnSalesReturnPaid,
                                    "Sales Discount Return": qtnSalesReturnDiscount,
                                    "Shipping/Handling fees Return": qtnSalesReturnShippingHandlingFees,
                                    "Net Profit Return": qtnSalesReturnNetProfit,
                                    "Net Loss Return": qtnSalesReturnNetLoss,
                                }}
                                statsWithInfo={[
                                    { label: "Sales Return", value: totalQtnSalesReturn, info: `Total quotation sales return amount\n= ${trimTo2Decimals(totalQtnSalesReturn)}` },
                                    { label: "Cash Sales Return", value: totalQtnSalesReturnCash, info: `Quotation sales returns refunded in cash\n= ${trimTo2Decimals(totalQtnSalesReturnCash)}` },
                                    { label: "Credit Sales Return", value: totalQtnSalesReturnUnpaid, info: `Unpaid / credit quotation sales returns\n= ${trimTo2Decimals(totalQtnSalesReturnUnpaid)}` },
                                    { label: "Bank Account Sales Return", value: totalQtnSalesReturnBankAccount, info: `Returns refunded via bank / card\n= ${trimTo2Decimals(totalQtnSalesReturnBankAccount)}` },
                                    { label: "Sales Return paid by sales", value: qtnSalesQuotationSalesReturn, info: `Returns offset against quotation sales\n= ${trimTo2Decimals(qtnSalesQuotationSalesReturn)}` },
                                    { label: "Cash Discount Return", value: qtnSalesReturnCashDiscount, info: `Cash discount on quotation sales returns\n= ${trimTo2Decimals(qtnSalesReturnCashDiscount)}` },
                                    { label: "VAT Return", value: qtnSalesReturnVatPrice, info: `VAT on quotation sales returns\n= ${trimTo2Decimals(qtnSalesReturnVatPrice)}` },
                                    { label: "Net Profit Return %", value: qtnSalesReturnNetProfit && totalQtnSalesReturn ? parseFloat(trimTo2Decimals((qtnSalesReturnNetProfit / totalQtnSalesReturn) * 100)) : 0, info: `Net Profit Return / Sales Return × 100\n= ${trimTo2Decimals(qtnSalesReturnNetProfit)} / ${trimTo2Decimals(totalQtnSalesReturn)} × 100 = ${trimTo2Decimals(qtnSalesReturnNetProfit && totalQtnSalesReturn ? (qtnSalesReturnNetProfit / totalQtnSalesReturn) * 100 : 0)}%` },
                                    { label: "Paid Sales Return", value: totalQtnSalesReturnPaid, info: `Total paid quotation sales returns\n= ${trimTo2Decimals(totalQtnSalesReturnPaid)}` },
                                    { label: "Sales Discount Return", value: qtnSalesReturnDiscount, info: `Sales discount on quotation sales returns\n= ${trimTo2Decimals(qtnSalesReturnDiscount)}` },
                                    { label: "Shipping/Handling fees Return", value: qtnSalesReturnShippingHandlingFees, info: `Shipping / handling fees on returns\n= ${trimTo2Decimals(qtnSalesReturnShippingHandlingFees)}` },
                                    { label: "Net Profit Return", value: qtnSalesReturnNetProfit, colorByValue: true, info: `Net profit on quotation sales returns\n= ${trimTo2Decimals(qtnSalesReturnNetProfit)}` },
                                    { label: "Net Loss Return", value: qtnSalesReturnNetLoss, info: `Net loss on quotation sales returns\n= ${trimTo2Decimals(qtnSalesReturnNetLoss)}` },
                                ]}
                                defaultOpen={true}
                                filters={statsFilters}
                                onToggle={handleQtnSalesReturnSummaryToggle}
                            />
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
});

export default StatsIndex;
