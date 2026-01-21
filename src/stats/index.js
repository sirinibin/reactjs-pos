import React, { useState, useEffect, forwardRef, useContext, useCallback } from "react";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "../utils/WebSocketContext.js";
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

        fetch('/v1/store/' + id + "?select=id,name,code,zatca.phase,zatca.connected,settings", requestOptions)
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



    // Add this effect:
    useEffect(() => {
        list();
        listSalesReturn();
        listPurchase();
        listPurchaseReturn();
    }, [list, listSalesReturn, listPurchase, listPurchaseReturn]);


    useEffect(() => {
        if (lastMessage) {
            // const jsonMessage = JSON.parse(lastMessage.data);
            // console.log("Received Message in User list:", jsonMessage);
            // if (jsonMessage.event === "sales_updated") {
            // console.log("Refreshing user list")
            list();
            listSalesReturn();
            listPurchase();
            listPurchaseReturn();
            //}
        }

    }, [lastMessage, list, listSalesReturn, listPurchase, listPurchaseReturn]);


    useEffect(() => {
        const handleSocketOpen = () => {
            //console.log("WebSocket Opened in sales list");
            list();
            listSalesReturn();
            listPurchase();
            listPurchaseReturn();
        };

        eventEmitter.on("socket_connection_open", handleSocketOpen);

        return () => {
            eventEmitter.off("socket_connection_open", handleSocketOpen); // Cleanup
        };
    }, [list, listSalesReturn, listPurchase, listPurchaseReturn]); // Runs only once when component mounts

    // const [overallStatsOpen, setOverallStatsOpen] = useState(true);

    const handleOverallSummaryToggle = (isOpen) => {
        // setOverallStatsOpen(isOpen);
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
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Overall"
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
                                        "info": "SALES(with VAT) - SALES RETURN(with VAT)"
                                    }, {
                                        "label": "PURCHASE(with VAT)",
                                        "value": (totalPurchase - totalPurchaseReturn),
                                        "info": "PURCHASE(with VAT) - PURCHASE RETURN(with VAT)"
                                    },
                                    {
                                        "label": "DIFFERENCE(with VAT)",
                                        "value": ((totalSales - totalSalesReturn) - (totalPurchase - totalPurchaseReturn)),
                                        "info": "OVERALL SALES(with VAT) - OVERALL PURCHASE(with VAT)"
                                    },
                                    {
                                        "label": "SALES(without VAT)",
                                        "value": ((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)),
                                        "info": "SALES(without VAT) - SALES RETURN(without VAT)"
                                    }, {
                                        "label": "PURCHASE(without VAT)",
                                        "value": ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice)),
                                        "info": "PURCHASE(without VAT) - PURCHASE RETURN(without VAT)"
                                    },
                                    {
                                        "label": "DIFFERENCE(without VAT)",
                                        "value": (((totalSales - vatPrice) - (totalSalesReturn - salesReturnVatPrice)) - ((totalPurchase - purchaseVatPrice) - (totalPurchaseReturn - purchaseReturnVatPrice))),
                                        "info": "OVERALL SALES(without VAT) - OVERALL PURCHASE(without VAT)"
                                    },
                                    {
                                        "label": "VAT",
                                        "value": ((vatPrice - salesReturnVatPrice) - (purchaseVatPrice - purchaseReturnVatPrice)),
                                        "info": "(SALES VAT - SALES RETURN VAT) - (PURCHASE VAT - PURCHASE RETURN VAT)"
                                    }
                                ]}

                                defaultOpen={true}

                                onToggle={handleOverallSummaryToggle}
                            />
                        </span>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Sales Stats"
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
                                defaultOpen={true}

                                onToggle={handleSummaryToggle}
                            />
                        </span>
                    </div>
                </div>

                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Sales Return Stats"
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
                                defaultOpen={true}
                                onToggle={handleSalesReturnSummaryToggle}
                            />
                        </span>
                    </div>

                </div>

                <div className="row">

                    <div className="col">
                        <span className="text-end">
                            <StatsSummary
                                title="Purchase Stats"
                                stats={{
                                    "Cash purchase": totalCashPurchase,
                                    "Credit purchase": totalUnPaidPurchase,
                                    "Bank account purchase": totalBankAccountPurchase,
                                    "Purchases paid by sales": totalSalesPurchase,
                                    "Purchases paid by purchase return": totalPurchaseReturnPurchase,
                                    "Cash discount": totalPurchaseCashDiscount,
                                    "VAT paid": purchaseVatPrice,
                                    "Purchase": totalPurchase,
                                    "Paid purchase": totalPaidPurchase,
                                    "Purchase discount": totalPurchaseDiscount,
                                    "Shipping/Handling fees": totalPurchaseShippingHandlingFees,
                                    // "Return Count": returnCount,
                                    // "Return Paid Amount": returnPaidAmount,
                                }}
                                defaultOpen={true}

                                onToggle={handlePurchaseSummaryToggle}
                            />
                        </span>
                    </div>

                </div>

                <div className="row">

                    <div className="col">

                        <span className="text-end">
                            <StatsSummary
                                title="Purchase Return Stats"
                                stats={{
                                    "Cash Purchase Return": totalCashPurchaseReturn,
                                    "Credit Purchase Return": totalUnPaidPurchaseReturn,
                                    "Bank Account Purchase Return": totalBankAccountPurchaseReturn,
                                    "Cash Discount Return": totalPurchaseReturnCashDiscount,
                                    "VAT Return": purchaseReturnVatPrice,
                                    "Purchase Return": totalPurchaseReturn,
                                    "Purchase Return paid by purchase": totalPurchasePurchaseReturn,
                                    "Paid Purchase Return": totalPaidPurchaseReturn,
                                    "Purchase Discount Return": totalPurchaseReturnDiscount,
                                    "Shipping/Handling fees": totalPurchaseReturnShippingHandlingFees,
                                }}
                                defaultOpen={true}
                                onToggle={handlePurchaseReturnSummaryToggle}
                            />
                        </span>


                    </div>

                </div>
            </div>
        </>
    );
});

export default StatsIndex;
