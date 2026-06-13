import React, { useState, useEffect, forwardRef, useContext, useCallback, useMemo } from "react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "../utils/WebSocketContext.js";

import { trimTo2Decimals } from "../utils/numberUtils";
import eventEmitter from "../utils/eventEmitter.js";

import "./../utils/stickyHeader.css";
import { Button, Modal } from "react-bootstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

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
            listCustomerDeposit();
            listCustomerWithdrawal();
            listQuotation();
            listQtnSalesReturn();
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
        listCustomerDeposit();
        listCustomerWithdrawal();
        listQuotation();
        listQtnSalesReturn();
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
    let [totalAccountedPurchase, setTotalAccountedPurchase] = useState(0.00);
    let [totalAccountedPurchaseCashDiscount, setTotalAccountedPurchaseCashDiscount] = useState(0.00);
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
                setTotalAccountedPurchase(data.meta.accounted_purchase || 0);
                setTotalAccountedPurchaseCashDiscount(data.meta.accounted_purchase_cash_discount || 0);
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
    }, [purchaseStatsOpen, searchParams]);


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
    let [totalAccountedPurchaseReturn, setTotalAccountedPurchaseReturn] = useState(0.00);
    let [totalAccountedPurchaseReturnCashDiscount, setTotalAccountedPurchaseReturnCashDiscount] = useState(0.00);
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
                setTotalAccountedPurchaseReturn(data.meta.accounted_purchase_return || 0);
                setTotalAccountedPurchaseReturnCashDiscount(data.meta.accounted_purchase_return_cash_discount || 0);
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
    }, [purchaseReturnStatsOpen, searchParams]);


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

    //Receivables (customer deposit)
    let [totalDeposit, setTotalDeposit] = useState(0.00);
    let [totalDepositCash, setTotalDepositCash] = useState(0.00);
    let [totalDepositBank, setTotalDepositBank] = useState(0.00);
    let [totalDepositPurchaseFund, setTotalDepositPurchaseFund] = useState(0.00);
    let [totalDepositCustomer, setTotalDepositCustomer] = useState(0.00);
    let [totalDepositVendor, setTotalDepositVendor] = useState(0.00);
    const [receivablesStatsOpen, setReceivablesStatsOpen] = useState(true);

    const listCustomerDeposit = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "select=id,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = receivablesStatsOpen ? "1" : "0";
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }
        fetch("/v1/customer-deposit?" + Select + queryParams + "&page=1&limit=1", requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) return Promise.reject(data && data.errors);
                setTotalDeposit(data.meta.total || 0);
                setTotalDepositCash(data.meta.cash || 0);
                setTotalDepositBank(data.meta.bank || 0);
                setTotalDepositPurchaseFund(data.meta.purchase_fund || 0);
                setTotalDepositCustomer(data.meta.total_customer || 0);
                setTotalDepositVendor(data.meta.total_vendor || 0);
            })
            .catch((error) => { console.log(error); });
    }, [receivablesStatsOpen, searchParams]);

    useEffect(() => {
        if (receivablesStatsOpen) {
            listCustomerDeposit();
        }
    }, [receivablesStatsOpen, listCustomerDeposit]);

    //End Receivables

    //Payables (customer withdrawal)
    let [totalWithdrawal, setTotalWithdrawal] = useState(0.00);
    let [totalWithdrawalCash, setTotalWithdrawalCash] = useState(0.00);
    let [totalWithdrawalBank, setTotalWithdrawalBank] = useState(0.00);
    let [totalWithdrawalVendor, setTotalWithdrawalVendor] = useState(0.00);
    let [totalWithdrawalCustomer, setTotalWithdrawalCustomer] = useState(0.00);
    const [payablesStatsOpen, setPayablesStatsOpen] = useState(true);

    const listCustomerWithdrawal = useCallback(() => {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select = "select=id,store_id";
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = payablesStatsOpen ? "1" : "0";
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }
        fetch("/v1/customer-withdrawal?" + Select + queryParams + "&page=1&limit=1", requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) return Promise.reject(data && data.errors);
                setTotalWithdrawal(data.meta.total || 0);
                setTotalWithdrawalCash(data.meta.cash || 0);
                setTotalWithdrawalBank(data.meta.bank || 0);
                setTotalWithdrawalVendor(data.meta.total_vendor || 0);
                setTotalWithdrawalCustomer(data.meta.total_customer || 0);
            })
            .catch((error) => { console.log(error); });
    }, [payablesStatsOpen, searchParams]);

    useEffect(() => {
        if (payablesStatsOpen) {
            listCustomerWithdrawal();
        }
    }, [payablesStatsOpen, listCustomerWithdrawal]);

    //End Payables

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
    const handleReceivablesSummaryToggle = (isOpen) => { setReceivablesStatsOpen(isOpen); };
    const handlePayablesSummaryToggle = (isOpen) => { setPayablesStatsOpen(isOpen); };

    const qtnInvoiceAccounting = store.settings?.quotation_invoice_accounting === true;
    const disablePurchasesOnAccounts = store.settings?.disable_purchases_on_accounts === true;
    const profitLossRevenueNum = (totalSales || 0) - (totalSalesReturn || 0) + (qtnInvoiceAccounting ? (totalQtnSales || 0) - (totalQtnSalesReturn || 0) : 0);
    const purchaseCashDiscountAdjustment = disablePurchasesOnAccounts ? (totalAccountedPurchaseCashDiscount || 0) : (totalPurchaseCashDiscount || 0);
    const purchaseReturnCashDiscountAdjustment = disablePurchasesOnAccounts ? (totalAccountedPurchaseReturnCashDiscount || 0) : (totalPurchaseReturnCashDiscount || 0);
    const cashDiscountExpenseAdj = (totalCashDiscount || 0) - (totalSalesReturnCashDiscount || 0) + (purchaseReturnCashDiscountAdjustment) - (purchaseCashDiscountAdjustment)
        + (qtnInvoiceAccounting ? (qtnSalesCashDiscount || 0) - (qtnSalesReturnCashDiscount || 0) : 0);
    const profitLossExpenseNum = (disablePurchasesOnAccounts
        ? (totalExpense || 0) - (totalDepositPurchaseFund || 0) + (totalAccountedPurchase || 0) - (totalAccountedPurchaseReturn || 0)
        : (totalExpense || 0) + (totalPurchase || 0) - (totalPurchaseReturn || 0))
        + cashDiscountExpenseAdj;
    const profitLossNum = profitLossRevenueNum - profitLossExpenseNum;
    const vatPercent = store.vat_percent || 15;
    const profitLossVatNum = profitLossNum * vatPercent / (100 + vatPercent);
    const profitLossWithoutVATNum = profitLossNum - profitLossVatNum;

    const statsFilters = {
        ...(dateValue ? { 'Date': dateValue } : {}),
        ...(fromDateValue ? { 'From Date': fromDateValue } : {}),
        ...(toDateValue ? { 'To Date': toDateValue } : {}),
    };

    const defaultSections = useMemo(() => [
        { key: "profit_loss", label: "Profit / Loss Statement", visible: true },
        { key: "overall_summary", label: "Overall Summary", visible: false },
        { key: "sales", label: "Sales Summary", visible: true },
        { key: "sales_return", label: "Sales Return Summary", visible: true },
        { key: "purchase", label: "Purchase Summary", visible: true },
        { key: "purchase_return", label: "Purchase Return Summary", visible: true },
        { key: "expense", label: "Expense Summary", visible: true },
        { key: "quotation", label: "Quotation Summary", visible: true },
        { key: "qtn_sales", label: "Qtn. Sales Summary", visible: true },
        { key: "qtn_sales_return", label: "Qtn. Sales Return Summary", visible: true },
        { key: "receivables", label: "Receivables Summary", visible: true },
        { key: "payables", label: "Payables Summary", visible: true },
    ], []);
    const [sections, setSections] = useState(defaultSections);
    const [showSectionSettings, setShowSectionSettings] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("stats_section_settings");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const allPresent = defaultSections.every(s => parsed.find(p => p.key === s.key));
                if (allPresent) {
                    setSections(parsed);
                }
            } catch (e) {
                localStorage.removeItem("stats_section_settings");
            }
        }
    }, [defaultSections]);

    useEffect(() => {
        localStorage.setItem("stats_section_settings", JSON.stringify(sections));
    }, [sections]);

    const handleToggleSection = (index) => {
        setSections(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], visible: !updated[index].visible };
            return updated;
        });
    };

    const onSectionDragEnd = (result) => {
        if (!result.destination) return;
        setSections(prev => {
            const reordered = Array.from(prev);
            const [moved] = reordered.splice(result.source.index, 1);
            reordered.splice(result.destination.index, 0, moved);
            return reordered;
        });
    };

    const restoreDefaultSections = () => {
        setSections(defaultSections);
        localStorage.setItem("stats_section_settings", JSON.stringify(defaultSections));
    };

    return (
        <>
            <Modal
                show={showSectionSettings}
                onHide={() => setShowSectionSettings(false)}
                centered
                size="md"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-gear-fill" style={{ fontSize: "1.2rem", marginRight: "4px" }} />
                        {" "}Statistics Section Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {showSectionSettings && (
                        <DragDropContext onDragEnd={onSectionDragEnd}>
                            <Droppable droppableId="sections">
                                {(provided) => (
                                    <ul
                                        className="list-group"
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {sections.map((section, index) => (
                                            <Draggable key={section.key} draggableId={section.key} index={index}>
                                                {(provided) => (
                                                    <li
                                                        className="list-group-item d-flex justify-content-between align-items-center"
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <div>
                                                            <input
                                                                style={{ width: "20px", height: "20px" }}
                                                                type="checkbox"
                                                                className="form-check-input me-2"
                                                                checked={section.visible !== false}
                                                                onChange={() => handleToggleSection(index)}
                                                            />
                                                            {section.label}
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
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSectionSettings(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={restoreDefaultSections}>
                        Restore to Default
                    </Button>
                </Modal.Footer>
            </Modal>
            <div className="container-fluid p-0">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h1 className="mb-0">Statistics</h1>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        title="Section Settings"
                        onClick={() => setShowSectionSettings(true)}
                    >
                        <i className="bi bi-gear-fill" />
                    </button>
                </div>
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
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {store.settings?.stats_show_profit_loss_statement !== false && sections.find(s => s.key === "profit_loss")?.visible !== false && (
                        <div className="row mt-3" style={{ order: sections.findIndex(s => s.key === "profit_loss") }}>
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
                                            { label: "Revenue (with VAT)", value: profitLossRevenueNum, info: [
                                                { label: "What it is", value: "Total income from all sales after deducting returns", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Gross Sales", value: `SAR ${trimTo2Decimals(totalSales)}` },
                                                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ SAR ${trimTo2Decimals(totalQtnSales)}` }] : []),
                                                { label: "Sales Returns", value: `− SAR ${trimTo2Decimals(totalSalesReturn)}` },
                                                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Sales Returns", value: `− SAR ${trimTo2Decimals(totalQtnSalesReturn)}` }] : []),
                                                { divider: true, label: "= Net Revenue", value: `SAR ${trimTo2Decimals(profitLossRevenueNum)}`, bold: true, color: "#74c0fc" },
                                            ]},
                                            { label: "Expense (with VAT)", value: profitLossExpenseNum, info: [
                                                { label: "What it is", value: disablePurchasesOnAccounts ? "Total operating cost — on-account mode (accounted purchases only)" : "Total operating cost including all purchases", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Operating Expenses", value: `SAR ${trimTo2Decimals(totalExpense)}` },
                                                ...(disablePurchasesOnAccounts ? [
                                                    { label: "Purchase Return Fund Rcvd", value: `− SAR ${trimTo2Decimals(totalDepositPurchaseFund)}` },
                                                    { label: "Accounted Purchases", value: `+ SAR ${trimTo2Decimals(totalAccountedPurchase)}` },
                                                    { label: "Accounted Pur. Returns", value: `− SAR ${trimTo2Decimals(totalAccountedPurchaseReturn)}` },
                                                ] : [
                                                    { label: "Purchases", value: `+ SAR ${trimTo2Decimals(totalPurchase)}` },
                                                    { label: "Purchase Returns", value: `− SAR ${trimTo2Decimals(totalPurchaseReturn)}` },
                                                ]),
                                                { label: "Sales Cash Discount", value: `+ SAR ${trimTo2Decimals(totalCashDiscount)}` },
                                                { label: disablePurchasesOnAccounts ? "Acct. Pur. Return C.D." : "Pur. Return Cash Discount", value: `+ SAR ${trimTo2Decimals(disablePurchasesOnAccounts ? totalAccountedPurchaseReturnCashDiscount : totalPurchaseReturnCashDiscount)}` },
                                                { label: "Sales Return Cash Discount", value: `− SAR ${trimTo2Decimals(totalSalesReturnCashDiscount)}` },
                                                { label: disablePurchasesOnAccounts ? "Acct. Purchase C.D." : "Purchase Cash Discount", value: `− SAR ${trimTo2Decimals(disablePurchasesOnAccounts ? totalAccountedPurchaseCashDiscount : totalPurchaseCashDiscount)}` },
                                                ...(qtnInvoiceAccounting ? [
                                                    { label: "Qtn. Sales Cash Discount", value: `+ SAR ${trimTo2Decimals(qtnSalesCashDiscount)}` },
                                                    { label: "Qtn. Sales Ret. Cash Discount", value: `− SAR ${trimTo2Decimals(qtnSalesReturnCashDiscount)}` },
                                                ] : []),
                                                { divider: true, label: "= Total Expense", value: `SAR ${trimTo2Decimals(profitLossExpenseNum)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                            { label: "Profit / Loss (with VAT)", value: profitLossNum, colorByValue: true, info: [
                                                { label: "What it is", value: profitLossNum >= 0 ? "Net earnings after all costs (VAT included)" : "Net deficit after all costs (VAT included)", bold: true, color: profitLossNum >= 0 ? "#69db7c" : "#ffa8a8" },
                                                { divider: true, label: "Net Revenue", value: `SAR ${trimTo2Decimals(profitLossRevenueNum)}`, color: "#74c0fc" },
                                                { label: "Total Expense", value: `− SAR ${trimTo2Decimals(profitLossExpenseNum)}`, color: "#ffa8a8" },
                                                { divider: true, label: profitLossNum >= 0 ? "= Net Profit" : "= Net Loss", value: `SAR ${trimTo2Decimals(profitLossNum)}`, bold: true, color: profitLossNum >= 0 ? "#69db7c" : "#ffa8a8" },
                                            ]},
                                            { label: `VAT ${vatPercent}%`, value: profitLossVatNum, info: [
                                                { label: "What it is", value: "VAT portion embedded within the Profit / Loss figure", bold: true },
                                                { label: "Formula", value: `P/L × ${vatPercent} ÷ ${100 + vatPercent}` },
                                                { divider: true, label: "Profit / Loss", value: `SAR ${trimTo2Decimals(profitLossNum)}` },
                                                { label: "VAT Rate", value: `${vatPercent}%` },
                                                { divider: true, label: "= VAT Amount", value: `SAR ${trimTo2Decimals(profitLossVatNum)}`, bold: true },
                                            ]},
                                            { label: "Profit / Loss (without VAT)", value: profitLossWithoutVATNum, colorByValue: true, info: [
                                                { label: "What it is", value: profitLossWithoutVATNum >= 0 ? "Net earnings after removing the VAT component" : "Net deficit after removing the VAT component", bold: true, color: profitLossWithoutVATNum >= 0 ? "#69db7c" : "#ffa8a8" },
                                                { divider: true, label: "P/L (with VAT)", value: `SAR ${trimTo2Decimals(profitLossNum)}` },
                                                { label: `VAT ${vatPercent}%`, value: `− SAR ${trimTo2Decimals(profitLossVatNum)}` },
                                                { divider: true, label: "= P/L (ex-VAT)", value: `SAR ${trimTo2Decimals(profitLossWithoutVATNum)}`, bold: true, color: profitLossWithoutVATNum >= 0 ? "#69db7c" : "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleProfitLossSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "overall_summary")?.visible === true && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "overall_summary") }}>
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
                                            { label: "SALES(with VAT)", value: (totalSales - totalSalesReturn), info: [
                                                { label: "What it is", value: "Net sales revenue after deducting returns (VAT included)", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Gross Sales", value: `SAR ${trimTo2Decimals(totalSales)}` },
                                                { label: "Sales Returns", value: `− SAR ${trimTo2Decimals(totalSalesReturn)}` },
                                                { divider: true, label: "= Net Sales", value: `SAR ${trimTo2Decimals(totalSales - totalSalesReturn)}`, bold: true, color: "#74c0fc" },
                                            ]},
                                            { label: "PURCHASE(with VAT)", value: (totalPurchase - totalPurchaseReturn), info: [
                                                { label: "What it is", value: "Net purchase cost after deducting returns (VAT included)", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Gross Purchases", value: `SAR ${trimTo2Decimals(totalPurchase)}` },
                                                { label: "Purchase Returns", value: `− SAR ${trimTo2Decimals(totalPurchaseReturn)}` },
                                                { divider: true, label: "= Net Purchases", value: `SAR ${trimTo2Decimals(totalPurchase - totalPurchaseReturn)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                            { label: "DIFFERENCE(with VAT)", value: ((totalSales - totalSalesReturn) - (totalPurchase - totalPurchaseReturn)), info: [
                                                { label: "What it is", value: "Net Sales minus Net Purchases — shows gross margin (VAT included)", bold: true },
                                                { divider: true, label: "Net Sales", value: `SAR ${trimTo2Decimals(totalSales - totalSalesReturn)}`, color: "#74c0fc" },
                                                { label: "Net Purchases", value: `− SAR ${trimTo2Decimals(totalPurchase - totalPurchaseReturn)}`, color: "#ffa8a8" },
                                                { divider: true, label: "= Difference", value: `SAR ${trimTo2Decimals((totalSales - totalSalesReturn) - (totalPurchase - totalPurchaseReturn))}`, bold: true },
                                            ]},
                                            { label: "SALES(without VAT)", value: ((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)), info: [
                                                { label: "What it is", value: "Net sales revenue excluding the VAT component", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Sales ex-VAT", value: `SAR ${trimTo2Decimals(totalSales - vatPrice)}` },
                                                { label: "Returns ex-VAT", value: `− SAR ${trimTo2Decimals(totalSalesReturn - salesReturnVatPrice)}` },
                                                { divider: true, label: "= Net Sales ex-VAT", value: `SAR ${trimTo2Decimals((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice))}`, bold: true, color: "#74c0fc" },
                                            ]},
                                            { label: "PURCHASE(without VAT)", value: ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice)), info: [
                                                { label: "What it is", value: "Net purchase cost excluding the VAT component", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Purchases ex-VAT", value: `SAR ${trimTo2Decimals(totalPurchase - purchaseVatPrice)}` },
                                                { label: "Returns ex-VAT", value: `− SAR ${trimTo2Decimals(totalPurchaseReturn - purchaseReturnVatPrice)}` },
                                                { divider: true, label: "= Net Purchases ex-VAT", value: `SAR ${trimTo2Decimals((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                            { label: "DIFFERENCE(without VAT)", value: (((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)) - ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))), info: [
                                                { label: "What it is", value: "Net Sales minus Net Purchases — gross margin excluding VAT", bold: true },
                                                { divider: true, label: "Net Sales ex-VAT", value: `SAR ${trimTo2Decimals((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice))}`, color: "#74c0fc" },
                                                { label: "Net Purchases ex-VAT", value: `− SAR ${trimTo2Decimals((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))}`, color: "#ffa8a8" },
                                                { divider: true, label: "= Difference ex-VAT", value: `SAR ${trimTo2Decimals(((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)) - ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice)))}`, bold: true },
                                            ]},
                                            { label: "VAT", value: ((vatPrice - salesReturnVatPrice) - (purchaseVatPrice - purchaseReturnVatPrice)), info: [
                                                { label: "What it is", value: "Net VAT position: tax collected on sales minus tax paid on purchases", bold: true },
                                                { divider: true, label: "Sales VAT collected", value: `SAR ${trimTo2Decimals(vatPrice)}` },
                                                { label: "Sales Return VAT refunded", value: `− SAR ${trimTo2Decimals(salesReturnVatPrice)}` },
                                                { label: "Purchase VAT paid", value: `− SAR ${trimTo2Decimals(purchaseVatPrice)}` },
                                                { label: "Purchase Return VAT recovered", value: `+ SAR ${trimTo2Decimals(purchaseReturnVatPrice)}` },
                                                { divider: true, label: "= Net VAT", value: `SAR ${trimTo2Decimals((vatPrice - salesReturnVatPrice) - (purchaseVatPrice - purchaseReturnVatPrice))}`, bold: true },
                                            ]},
                                        ]}

                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleOverallSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "sales")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "sales") }}>
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
                                            { label: "Sales", value: totalSales, info: [
                                                { label: "What it is", value: "Total invoiced sales amount, VAT included", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalSales)}`, bold: true },
                                            ]},
                                            { label: "Cash Sales", value: totalCashSales, info: [
                                                { label: "What it is", value: "Sales where the customer paid in cash at point of sale", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalCashSales)}` },
                                            ]},
                                            { label: "Credit Sales", value: totalUnPaidSales, info: [
                                                { label: "What it is", value: "Sales not yet paid — outstanding on customer account", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalUnPaidSales)}` },
                                            ]},
                                            { label: "Bank Account Sales", value: totalBankAccountSales, info: [
                                                { label: "What it is", value: "Sales paid via bank transfer, debit/credit card, or cheque", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalBankAccountSales)}` },
                                            ]},
                                            { label: "Sales paid By Sales Return", value: totalSalesReturnSales, info: [
                                                { label: "What it is", value: "Sales amount offset by customer return credits applied to new orders", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalSalesReturnSales)}` },
                                            ]},
                                            { label: "Sales paid By Purchase", value: totalPurchaseSales, info: [
                                                { label: "What it is", value: "Sales amount settled using vendor / purchase account funds", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseSales)}` },
                                            ]},
                                            { label: "Cash Discount", value: totalCashDiscount, info: [
                                                { label: "What it is", value: "Discount granted to customers for cash or early payment", bold: true },
                                                { label: "Effect", value: "Reduces receivable — recorded as an expense" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalCashDiscount)}` },
                                            ]},
                                            { label: "VAT Collected", value: vatPrice, info: [
                                                { label: "What it is", value: `VAT (${vatPercent}%) collected from customers and payable to tax authority`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount Collected", value: `SAR ${trimTo2Decimals(vatPrice)}` },
                                            ]},
                                            { label: "Net Profit %", value: netProfit && totalSales ? ((netProfit / totalSales) * 100) : "", info: [
                                                { label: "What it is", value: "Net profit as a percentage of total sales — profitability indicator", bold: true, color: "#69db7c" },
                                                { label: "Formula", value: "(Net Profit ÷ Sales) × 100" },
                                                { divider: true, label: "Net Profit", value: `SAR ${trimTo2Decimals(netProfit)}` },
                                                { label: "Total Sales", value: `SAR ${trimTo2Decimals(totalSales)}` },
                                                { divider: true, label: "= Profit %", value: `${trimTo2Decimals(netProfit && totalSales ? (netProfit / totalSales) * 100 : 0)}%`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Paid Sales", value: totalPaidSales, info: [
                                                { label: "What it is", value: "Sales where full or partial payment has been received", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPaidSales)}` },
                                            ]},
                                            { label: "Sales Discount", value: totalDiscount, info: [
                                                { label: "What it is", value: "Invoice-level or line-item discount applied on sales orders", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalDiscount)}` },
                                            ]},
                                            { label: "Shipping/Handling fees", value: totalShippingHandlingFees, info: [
                                                { label: "What it is", value: "Additional charges billed to customers for delivery or handling", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalShippingHandlingFees)}` },
                                            ]},
                                            { label: "Net Profit", value: netProfit, info: [
                                                { label: "What it is", value: "Profit after cost of goods — selling price minus purchase cost", bold: true, color: "#69db7c" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(netProfit)}`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Net Loss", value: loss, info: [
                                                { label: "What it is", value: "Loss when cost of goods exceeds the selling price on some items", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(loss)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "sales_return")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "sales_return") }}>

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
                                            { label: "Sales Return", value: totalSalesReturn, info: [
                                                { label: "What it is", value: "Total value of goods returned by customers (VAT included)", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalSalesReturn)}`, bold: true },
                                            ]},
                                            { label: "Cash Sales Return", value: totalCashSalesReturn, info: [
                                                { label: "What it is", value: "Returns where the refund was paid back in cash", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalCashSalesReturn)}` },
                                            ]},
                                            { label: "Credit Sales Return", value: totalUnPaidSalesReturn, info: [
                                                { label: "What it is", value: "Returns not yet settled — credit remains on customer account", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalUnPaidSalesReturn)}` },
                                            ]},
                                            { label: "Bank Account Sales Return", value: totalBankAccountSalesReturn, info: [
                                                { label: "What it is", value: "Returns refunded via bank transfer, card, or cheque", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalBankAccountSalesReturn)}` },
                                            ]},
                                            { label: "Sales Return paid by Sales", value: totalSalesSalesReturn, info: [
                                                { label: "What it is", value: "Return credit applied directly against a new sale for the same customer", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalSalesSalesReturn)}` },
                                            ]},
                                            { label: "Cash Discount Return", value: totalSalesReturnCashDiscount, info: [
                                                { label: "What it is", value: "Cash discount previously given on the original sale — reversed on return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalSalesReturnCashDiscount)}` },
                                            ]},
                                            { label: "VAT Return", value: salesReturnVatPrice, info: [
                                                { label: "What it is", value: `VAT (${vatPercent}%) refunded to customers on returned goods`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount Refunded", value: `SAR ${trimTo2Decimals(salesReturnVatPrice)}` },
                                            ]},
                                            { label: "Net Profit Return %", value: salesReturnNetProfit && totalSalesReturn ? ((salesReturnNetProfit / totalSalesReturn) * 100) : "", info: [
                                                { label: "What it is", value: "Profit margin on returned items as a % of total sales returns", bold: true },
                                                { label: "Formula", value: "(Net Profit Return ÷ Sales Return) × 100" },
                                                { divider: true, label: "Net Profit Return", value: `SAR ${trimTo2Decimals(salesReturnNetProfit)}` },
                                                { label: "Total Sales Return", value: `SAR ${trimTo2Decimals(totalSalesReturn)}` },
                                                { divider: true, label: "= Profit Return %", value: `${trimTo2Decimals(salesReturnNetProfit && totalSalesReturn ? (salesReturnNetProfit / totalSalesReturn) * 100 : 0)}%`, bold: true },
                                            ]},
                                            { label: "Paid Sales Return", value: totalPaidSalesReturn, info: [
                                                { label: "What it is", value: "Returns where the refund has been fully or partially processed", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPaidSalesReturn)}` },
                                            ]},
                                            { label: "Sales Discount Return", value: totalSalesReturnDiscount, info: [
                                                { label: "What it is", value: "Invoice discount from the original sale that is reversed upon return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalSalesReturnDiscount)}` },
                                            ]},
                                            { label: "Shipping/Handling fees Return", value: totalSalesReturnShippingHandlingFees, info: [
                                                { label: "What it is", value: "Shipping / handling fees from the original sale reversed on return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalSalesReturnShippingHandlingFees)}` },
                                            ]},
                                            { label: "Net Profit Return", value: salesReturnNetProfit, info: [
                                                { label: "What it is", value: "Profit portion recovered from returned items (cost basis)", bold: true, color: "#69db7c" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(salesReturnNetProfit)}`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Net Loss Return", value: salesReturnLoss, info: [
                                                { label: "What it is", value: "Loss component within returned items (below-cost sales reversed)", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(salesReturnLoss)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleSalesReturnSummaryToggle}
                                    />
                                </span>
                            </div>

                        </div>
                    )}
                    {sections.find(s => s.key === "purchase")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "purchase") }}>

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
                                            ...(disablePurchasesOnAccounts ? { "Accounted Purchase(with VAT)": totalAccountedPurchase } : {}),
                                            "Paid purchase": totalPaidPurchase,
                                            "Purchase discount": totalPurchaseDiscount,
                                            "Shipping/Handling fees": totalPurchaseShippingHandlingFees,
                                            // "Return Count": returnCount,
                                            // "Return Paid Amount": returnPaidAmount,
                                        }}
                                        statsWithInfo={[
                                            { label: "Cash purchase", value: totalCashPurchase, info: [
                                                { label: "What it is", value: "Purchases paid immediately in cash to the supplier", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalCashPurchase)}` },
                                            ]},
                                            { label: "Credit purchase", value: totalUnPaidPurchase, info: [
                                                { label: "What it is", value: "Purchases not yet paid — outstanding on vendor account", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalUnPaidPurchase)}` },
                                            ]},
                                            { label: "Bank account purchase", value: totalBankAccountPurchase, info: [
                                                { label: "What it is", value: "Purchases paid via bank transfer, card, or cheque", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalBankAccountPurchase)}` },
                                            ]},
                                            { label: "Purchases paid by sales", value: totalSalesPurchase, info: [
                                                { label: "What it is", value: "Purchases settled using sales revenue collected from customers", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalSalesPurchase)}` },
                                            ]},
                                            { label: "Purchases paid by purchase return", value: totalPurchaseReturnPurchase, info: [
                                                { label: "What it is", value: "Purchases offset by credits from purchase returns to the same vendor", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseReturnPurchase)}` },
                                            ]},
                                            { label: "Cash discount", value: totalPurchaseCashDiscount, info: [
                                                { label: "What it is", value: "Discount received from suppliers for early or cash payment", bold: true },
                                                { label: "Effect", value: "Reduces purchase cost — recorded as income" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseCashDiscount)}` },
                                            ]},
                                            { label: "VAT paid", value: purchaseVatPrice, info: [
                                                { label: "What it is", value: `Input VAT (${vatPercent}%) paid to suppliers — reclaimable from tax authority`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount Paid", value: `SAR ${trimTo2Decimals(purchaseVatPrice)}` },
                                            ]},
                                            { label: "Purchase", value: totalPurchase, info: [
                                                { label: "What it is", value: "Total purchase cost from all suppliers (VAT included)", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalPurchase)}`, bold: true },
                                            ]},
                                            ...(disablePurchasesOnAccounts ? [{ label: "Accounted Purchase(with VAT)", value: totalAccountedPurchase, info: [
                                                { label: "What it is", value: "Purchases with 'on-account' enabled — used in P&L expense calculation when on-account mode is active", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalAccountedPurchase)}`, bold: true },
                                            ]}] : []),
                                            { label: "Paid purchase", value: totalPaidPurchase, info: [
                                                { label: "What it is", value: "Purchases where full or partial payment has been made to the supplier", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPaidPurchase)}` },
                                            ]},
                                            { label: "Purchase discount", value: totalPurchaseDiscount, info: [
                                                { label: "What it is", value: "Invoice-level or line-item discount applied on purchase orders", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseDiscount)}` },
                                            ]},
                                            { label: "Shipping/Handling fees", value: totalPurchaseShippingHandlingFees, info: [
                                                { label: "What it is", value: "Additional freight or handling charges billed by suppliers", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseShippingHandlingFees)}` },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handlePurchaseSummaryToggle}
                                    />
                                </span>
                            </div>

                        </div>
                    )}
                    {sections.find(s => s.key === "purchase_return")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "purchase_return") }}>

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
                                            ...(disablePurchasesOnAccounts ? { "Accounted Purchase Return(with VAT)": totalAccountedPurchaseReturn } : {}),
                                            "Purchase Return paid by purchase": totalPurchasePurchaseReturn,
                                            "Paid Purchase Return": totalPaidPurchaseReturn,
                                            "Purchase Discount Return": totalPurchaseReturnDiscount,
                                            "Shipping/Handling fees": totalPurchaseReturnShippingHandlingFees,
                                        }}
                                        statsWithInfo={[
                                            { label: "Cash Purchase Return", value: totalCashPurchaseReturn, info: [
                                                { label: "What it is", value: "Purchase returns where the supplier refunded in cash", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalCashPurchaseReturn)}` },
                                            ]},
                                            { label: "Credit Purchase Return", value: totalUnPaidPurchaseReturn, info: [
                                                { label: "What it is", value: "Purchase returns not yet settled — credit outstanding with supplier", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalUnPaidPurchaseReturn)}` },
                                            ]},
                                            { label: "Bank Account Purchase Return", value: totalBankAccountPurchaseReturn, info: [
                                                { label: "What it is", value: "Purchase returns refunded by the supplier via bank transfer or card", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalBankAccountPurchaseReturn)}` },
                                            ]},
                                            { label: "Cash Discount Return", value: totalPurchaseReturnCashDiscount, info: [
                                                { label: "What it is", value: "Cash discount originally received from supplier — reversed when goods are returned", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseReturnCashDiscount)}` },
                                            ]},
                                            { label: "VAT Return", value: purchaseReturnVatPrice, info: [
                                                { label: "What it is", value: `Input VAT (${vatPercent}%) recovered from tax authority on returned purchases`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount Recovered", value: `SAR ${trimTo2Decimals(purchaseReturnVatPrice)}` },
                                            ]},
                                            { label: "Purchase Return", value: totalPurchaseReturn, info: [
                                                { label: "What it is", value: "Total value of goods returned to suppliers (VAT included)", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalPurchaseReturn)}`, bold: true },
                                            ]},
                                            ...(disablePurchasesOnAccounts ? [{ label: "Accounted Purchase Return(with VAT)", value: totalAccountedPurchaseReturn, info: [
                                                { label: "What it is", value: "On-account purchase returns — used in P&L when on-account mode is active", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalAccountedPurchaseReturn)}`, bold: true },
                                            ]}] : []),
                                            { label: "Purchase Return paid by purchase", value: totalPurchasePurchaseReturn, info: [
                                                { label: "What it is", value: "Return credit applied directly against a new purchase from the same supplier", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchasePurchaseReturn)}` },
                                            ]},
                                            { label: "Paid Purchase Return", value: totalPaidPurchaseReturn, info: [
                                                { label: "What it is", value: "Purchase returns where the refund has been received or credited", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPaidPurchaseReturn)}` },
                                            ]},
                                            { label: "Purchase Discount Return", value: totalPurchaseReturnDiscount, info: [
                                                { label: "What it is", value: "Invoice discount from the original purchase reversed upon return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseReturnDiscount)}` },
                                            ]},
                                            { label: "Shipping/Handling fees", value: totalPurchaseReturnShippingHandlingFees, info: [
                                                { label: "What it is", value: "Freight / handling charges from original purchase reversed on return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalPurchaseReturnShippingHandlingFees)}` },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handlePurchaseReturnSummaryToggle}
                                    />
                                </span>


                            </div>

                        </div>
                    )}
                    {sections.find(s => s.key === "expense")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "expense") }}>
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
                                            { label: "Total Expense", value: totalExpense, info: [
                                                { label: "What it is", value: "Direct operating expenses (rent, salaries, utilities, etc.) — before purchase and cash discount adjustments", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalExpense)}`, bold: true },
                                            ]},
                                            { label: "Cash Expense", value: totalExpenseCash, info: [
                                                { label: "What it is", value: "Expenses settled by cash payment", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalExpenseCash)}` },
                                            ]},
                                            { label: "Bank Expense", value: totalExpenseBank, info: [
                                                { label: "What it is", value: "Expenses settled via bank transfer, card, or cheque", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalExpenseBank)}` },
                                            ]},
                                            { label: "Purchase Fund", value: totalExpensePurchaseFund, info: [
                                                { label: "What it is", value: "Expenses paid from a dedicated purchase / vendor fund balance", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalExpensePurchaseFund)}` },
                                            ]},
                                            { label: "VAT Paid", value: totalExpenseVat, info: [
                                                { label: "What it is", value: `VAT (${vatPercent}%) charged on expense transactions`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount", value: `SAR ${trimTo2Decimals(totalExpenseVat)}` },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleExpenseSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "quotation")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "quotation") }}>
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
                                            { label: "Quotation", value: totalQuotation, info: [
                                                { label: "What it is", value: "Total value of all quotations issued to customers", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalQuotation)}`, bold: true },
                                            ]},
                                            { label: "Profit", value: quotationProfit, colorByValue: true, info: [
                                                { label: "What it is", value: "Expected profit on quoted items (selling price minus purchase cost)", bold: true, color: "#69db7c" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(quotationProfit)}`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Profit %", value: quotationProfit && totalQuotation ? parseFloat(trimTo2Decimals((quotationProfit / totalQuotation) * 100)) : 0, info: [
                                                { label: "What it is", value: "Expected profit margin as a percentage of total quotation value", bold: true, color: "#69db7c" },
                                                { label: "Formula", value: "(Profit ÷ Quotation) × 100" },
                                                { divider: true, label: "Profit", value: `SAR ${trimTo2Decimals(quotationProfit)}` },
                                                { label: "Total Quotation", value: `SAR ${trimTo2Decimals(totalQuotation)}` },
                                                { divider: true, label: "= Profit %", value: `${trimTo2Decimals(quotationProfit && totalQuotation ? (quotationProfit / totalQuotation) * 100 : 0)}%`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Loss", value: quotationLoss, info: [
                                                { label: "What it is", value: "Expected loss on quoted items where cost exceeds the quoted price", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(quotationLoss)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleQuotationSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "qtn_sales")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "qtn_sales") }}>
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
                                            { label: "Sales", value: totalQtnSales, info: [
                                                { label: "What it is", value: "Total invoiced quotation sales amount (VAT included)", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalQtnSales)}`, bold: true },
                                            ]},
                                            { label: "Cash Sales", value: totalQtnSalesCash, info: [
                                                { label: "What it is", value: "Quotation invoices paid immediately in cash", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesCash)}` },
                                            ]},
                                            { label: "Credit Sales", value: totalQtnSalesUnpaid, info: [
                                                { label: "What it is", value: "Quotation invoices not yet paid — outstanding on customer account", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesUnpaid)}` },
                                            ]},
                                            { label: "Bank Account Sales", value: totalQtnSalesBankAccount, info: [
                                                { label: "What it is", value: "Quotation invoices paid via bank transfer, card, or cheque", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesBankAccount)}` },
                                            ]},
                                            { label: "Sales paid by sales return", value: totalQtnSalesReturnSales, info: [
                                                { label: "What it is", value: "Quotation invoice amount offset by a sales return credit", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesReturnSales)}` },
                                            ]},
                                            { label: "Cash Discount", value: qtnSalesCashDiscount, info: [
                                                { label: "What it is", value: "Cash discount granted to customers on quotation invoices", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesCashDiscount)}` },
                                            ]},
                                            { label: "VAT Collected", value: qtnSalesVatPrice, info: [
                                                { label: "What it is", value: `VAT (${vatPercent}%) collected from customers on quotation invoices`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesVatPrice)}` },
                                            ]},
                                            { label: "Net Profit %", value: qtnSalesNetProfit && totalQtnSales ? parseFloat(trimTo2Decimals((qtnSalesNetProfit / totalQtnSales) * 100)) : 0, info: [
                                                { label: "What it is", value: "Net profit margin on quotation invoices as % of total invoiced value", bold: true, color: "#69db7c" },
                                                { label: "Formula", value: "(Net Profit ÷ Sales) × 100" },
                                                { divider: true, label: "Net Profit", value: `SAR ${trimTo2Decimals(qtnSalesNetProfit)}` },
                                                { label: "Total Sales", value: `SAR ${trimTo2Decimals(totalQtnSales)}` },
                                                { divider: true, label: "= Profit %", value: `${trimTo2Decimals(qtnSalesNetProfit && totalQtnSales ? (qtnSalesNetProfit / totalQtnSales) * 100 : 0)}%`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Paid Sales", value: totalQtnSalesPaid, info: [
                                                { label: "What it is", value: "Quotation invoices fully or partially paid by the customer", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesPaid)}` },
                                            ]},
                                            { label: "Sales Discount", value: qtnSalesDiscount, info: [
                                                { label: "What it is", value: "Invoice or line-item discount applied on quotation invoices", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesDiscount)}` },
                                            ]},
                                            { label: "Shipping/Handling fees", value: qtnSalesShippingHandlingFees, info: [
                                                { label: "What it is", value: "Delivery or handling charges billed on quotation invoices", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesShippingHandlingFees)}` },
                                            ]},
                                            { label: "Net Profit", value: qtnSalesNetProfit, colorByValue: true, info: [
                                                { label: "What it is", value: "Actual profit on quotation invoices after cost of goods", bold: true, color: "#69db7c" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesNetProfit)}`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Net Loss", value: qtnSalesNetLoss, info: [
                                                { label: "What it is", value: "Loss on quotation invoices where cost exceeds the invoiced price", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesNetLoss)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleQtnSalesSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "qtn_sales_return")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "qtn_sales_return") }}>
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
                                            { label: "Sales Return", value: totalQtnSalesReturn, info: [
                                                { label: "What it is", value: "Total value of goods returned against quotation invoices (VAT included)", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalQtnSalesReturn)}`, bold: true },
                                            ]},
                                            { label: "Cash Sales Return", value: totalQtnSalesReturnCash, info: [
                                                { label: "What it is", value: "Quotation invoice returns refunded in cash", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesReturnCash)}` },
                                            ]},
                                            { label: "Credit Sales Return", value: totalQtnSalesReturnUnpaid, info: [
                                                { label: "What it is", value: "Quotation returns not yet refunded — credit on customer account", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesReturnUnpaid)}` },
                                            ]},
                                            { label: "Bank Account Sales Return", value: totalQtnSalesReturnBankAccount, info: [
                                                { label: "What it is", value: "Quotation invoice returns refunded via bank transfer or card", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesReturnBankAccount)}` },
                                            ]},
                                            { label: "Sales Return paid by sales", value: qtnSalesQuotationSalesReturn, info: [
                                                { label: "What it is", value: "Quotation return credit applied directly against a new invoice", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesQuotationSalesReturn)}` },
                                            ]},
                                            { label: "Cash Discount Return", value: qtnSalesReturnCashDiscount, info: [
                                                { label: "What it is", value: "Cash discount from the original quotation invoice reversed on return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesReturnCashDiscount)}` },
                                            ]},
                                            { label: "VAT Return", value: qtnSalesReturnVatPrice, info: [
                                                { label: "What it is", value: `VAT (${vatPercent}%) refunded to customers on returned quotation invoices`, bold: true },
                                                { divider: true, label: "VAT Rate", value: `${vatPercent}%` },
                                                { label: "Amount Refunded", value: `SAR ${trimTo2Decimals(qtnSalesReturnVatPrice)}` },
                                            ]},
                                            { label: "Net Profit Return %", value: qtnSalesReturnNetProfit && totalQtnSalesReturn ? parseFloat(trimTo2Decimals((qtnSalesReturnNetProfit / totalQtnSalesReturn) * 100)) : 0, info: [
                                                { label: "What it is", value: "Profit margin on returned quotation items as % of total returns", bold: true },
                                                { label: "Formula", value: "(Net Profit Return ÷ Sales Return) × 100" },
                                                { divider: true, label: "Net Profit Return", value: `SAR ${trimTo2Decimals(qtnSalesReturnNetProfit)}` },
                                                { label: "Total Sales Return", value: `SAR ${trimTo2Decimals(totalQtnSalesReturn)}` },
                                                { divider: true, label: "= Profit Return %", value: `${trimTo2Decimals(qtnSalesReturnNetProfit && totalQtnSalesReturn ? (qtnSalesReturnNetProfit / totalQtnSalesReturn) * 100 : 0)}%`, bold: true },
                                            ]},
                                            { label: "Paid Sales Return", value: totalQtnSalesReturnPaid, info: [
                                                { label: "What it is", value: "Quotation returns where the refund has been processed", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalQtnSalesReturnPaid)}` },
                                            ]},
                                            { label: "Sales Discount Return", value: qtnSalesReturnDiscount, info: [
                                                { label: "What it is", value: "Invoice discount from the original quotation reversed on return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesReturnDiscount)}` },
                                            ]},
                                            { label: "Shipping/Handling fees Return", value: qtnSalesReturnShippingHandlingFees, info: [
                                                { label: "What it is", value: "Shipping / handling fees from the quotation invoice reversed on return", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesReturnShippingHandlingFees)}` },
                                            ]},
                                            { label: "Net Profit Return", value: qtnSalesReturnNetProfit, colorByValue: true, info: [
                                                { label: "What it is", value: "Profit component recovered from returned quotation items", bold: true, color: "#69db7c" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesReturnNetProfit)}`, bold: true, color: "#69db7c" },
                                            ]},
                                            { label: "Net Loss Return", value: qtnSalesReturnNetLoss, info: [
                                                { label: "What it is", value: "Loss component within returned quotation items", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(qtnSalesReturnNetLoss)}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleQtnSalesReturnSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "receivables")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "receivables") }}>
                            <div className="col">
                                <span className="text-end">
                                    <StatsSummary
                                        title="Receivables Summary"
                                        storageKey="stats_receivables_summary"
                                        stats={{
                                            "Total": totalDeposit,
                                            "Cash": totalDepositCash,
                                            "Bank": totalDepositBank,
                                            "Purchase Fund": totalDepositPurchaseFund,
                                            "Receivable from Customers (Unpaid Sales)": totalDepositCustomer,
                                            "Receivable from Vendors (Purchase Return)": totalDepositVendor,
                                            "Net Receivables": (totalDepositCustomer || 0) + (totalDepositVendor || 0),
                                        }}
                                        statsWithInfo={[
                                            { label: "Total", value: totalDeposit, info: [
                                                { label: "What it is", value: "Total funds received as deposits from customers and vendors", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalDeposit)}`, bold: true },
                                            ]},
                                            { label: "Cash", value: totalDepositCash, info: [
                                                { label: "What it is", value: "Deposits received in cash", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalDepositCash)}` },
                                            ]},
                                            { label: "Bank", value: totalDepositBank, info: [
                                                { label: "What it is", value: "Deposits received via bank transfer or card", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalDepositBank)}` },
                                            ]},
                                            { label: "Purchase Fund", value: totalDepositPurchaseFund, info: [
                                                { label: "What it is", value: "Deposits earmarked specifically to fund purchases", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalDepositPurchaseFund)}` },
                                            ]},
                                            { label: "Receivable from Customers (Unpaid Sales)", value: totalDepositCustomer, info: [
                                                { label: "What it is", value: "Money owed by customers for sales not yet paid — current accounts receivable", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalDepositCustomer)}` },
                                            ]},
                                            { label: "Receivable from Vendors (Purchase Return)", value: totalDepositVendor, info: [
                                                { label: "What it is", value: "Money owed by suppliers for returned goods not yet refunded", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalDepositVendor)}` },
                                            ]},
                                            { label: "Net Receivables", value: (totalDepositCustomer || 0) + (totalDepositVendor || 0), colorByValue: true, info: [
                                                { label: "What it is", value: "Total money owed to the business — from customers and vendors combined", bold: true, color: "#74c0fc" },
                                                { divider: true, label: "From Customers (Unpaid Sales)", value: `SAR ${trimTo2Decimals(totalDepositCustomer)}` },
                                                { label: "From Vendors (Purchase Returns)", value: `+ SAR ${trimTo2Decimals(totalDepositVendor)}` },
                                                { divider: true, label: "= Net Receivables", value: `SAR ${trimTo2Decimals((totalDepositCustomer || 0) + (totalDepositVendor || 0))}`, bold: true, color: "#74c0fc" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handleReceivablesSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    {sections.find(s => s.key === "payables")?.visible !== false && (
                        <div className="row" style={{ order: sections.findIndex(s => s.key === "payables") }}>
                            <div className="col">
                                <span className="text-end">
                                    <StatsSummary
                                        title="Payables Summary"
                                        storageKey="stats_payables_summary"
                                        stats={{
                                            "Total": totalWithdrawal,
                                            "Cash": totalWithdrawalCash,
                                            "Bank": totalWithdrawalBank,
                                            "Payable to Vendors (Unpaid Purchases)": totalWithdrawalVendor,
                                            "Payable to Customers (Sales Return)": totalWithdrawalCustomer,
                                            "Net Payables": (totalWithdrawalVendor || 0) + (totalWithdrawalCustomer || 0),
                                        }}
                                        statsWithInfo={[
                                            { label: "Total", value: totalWithdrawal, info: [
                                                { label: "What it is", value: "Total money withdrawn or disbursed as payables to vendors and customers", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Total", value: `SAR ${trimTo2Decimals(totalWithdrawal)}`, bold: true },
                                            ]},
                                            { label: "Cash", value: totalWithdrawalCash, info: [
                                                { label: "What it is", value: "Payables settled in cash", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalWithdrawalCash)}` },
                                            ]},
                                            { label: "Bank", value: totalWithdrawalBank, info: [
                                                { label: "What it is", value: "Payables settled via bank transfer or card", bold: true },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalWithdrawalBank)}` },
                                            ]},
                                            { label: "Payable to Vendors (Unpaid Purchases)", value: totalWithdrawalVendor, info: [
                                                { label: "What it is", value: "Money owed to suppliers for purchases not yet paid — current accounts payable", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalWithdrawalVendor)}` },
                                            ]},
                                            { label: "Payable to Customers (Sales Return)", value: totalWithdrawalCustomer, info: [
                                                { label: "What it is", value: "Money owed to customers for approved returns not yet refunded", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "Amount", value: `SAR ${trimTo2Decimals(totalWithdrawalCustomer)}` },
                                            ]},
                                            { label: "Net Payables", value: (totalWithdrawalVendor || 0) + (totalWithdrawalCustomer || 0), info: [
                                                { label: "What it is", value: "Total money the business owes — to vendors and customers combined", bold: true, color: "#ffa8a8" },
                                                { divider: true, label: "To Vendors (Unpaid Purchases)", value: `SAR ${trimTo2Decimals(totalWithdrawalVendor)}` },
                                                { label: "To Customers (Sales Returns)", value: `+ SAR ${trimTo2Decimals(totalWithdrawalCustomer)}` },
                                                { divider: true, label: "= Net Payables", value: `SAR ${trimTo2Decimals((totalWithdrawalVendor || 0) + (totalWithdrawalCustomer || 0))}`, bold: true, color: "#ffa8a8" },
                                            ]},
                                        ]}
                                        defaultOpen={true}
                                        filters={statsFilters}
                                        onToggle={handlePayablesSummaryToggle}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
});

export default StatsIndex;
