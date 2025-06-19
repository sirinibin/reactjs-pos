import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import BalanceSheetPrintPreview from './printPreview.js';
import Amount from "../utils/amount.js";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import OrderCreate from "../order/create.js";
import SalesReturnCreate from "../sales_return/create.js";
import QuotationSalesReturnCreate from "../quotation_sales_return/create.js";
import PurchaseCreate from "../purchase/create.js";
import PurchaseReturnCreate from "../purchase_return/create.js";
import CustomerDepositCreate from "../customer_deposit/create.js";
import CustomerWithdrawalCreate from "../customer_withdrawal/create.js";
import ExpenseCreate from "../expense/create.js";
import CapitalCreate from "../capital/create.js";
import DividentCreate from "../divident/create.js";
import QuotationCreate from "../quotation/create.js";




const PostingIndex = forwardRef((props, ref) => {



    let [selectedAccount, setSelectedAccount] = useState(null);
    let [showAccountBalanceSheet, setShowAccountBalanceSheet] = useState(false);
    function handleAccountBalanceSheetClose() {
        showAccountBalanceSheet = false;
        setShowAccountBalanceSheet(false);
        //list();
    }

    useImperativeHandle(ref, () => ({
        open(account) {
            searchParams = {};
            showAccountBalanceSheet = true;
            setShowAccountBalanceSheet(true);
            selectedAccount = account;
            setSelectedAccount(selectedAccount);

            dateValue = "";
            fromDateValue = "";
            toDateValue = "";

            setDateValue(dateValue);
            setFromDateValue(fromDateValue);
            setToDateValue(toDateValue);
            getStore(localStorage.getItem("store_id"));
            list();
        },
    }));

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

    //Date filter
    const [showDateRange, setShowDateRange] = useState(false);
    //const selectedDate = new Date();
    let [selectedDate, setSelectedDate] = useState(new Date());
    let [selectedFromDate, setSelectedFromDate] = useState(new Date());
    let [selectedToDate, setSelectedToDate] = useState(new Date());
    let [dateValue, setDateValue] = useState("");
    let [fromDateValue, setFromDateValue] = useState("");
    let [toDateValue, setToDateValue] = useState("");

    //list
    const [postingList, setPostingList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(10);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(null);
    const [totalItems, setTotalItems] = useState();
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);


    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);



    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        moveToLastPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages]);


    function moveToLastPage() {
        if (totalPages) {
            sortField = "posts.date"
            setSortField(sortField)
            sortPosting = ""
            setSortPosting(sortPosting)
            page = totalPages;
            setPage(page);
            list();
        }
    }


    //Search params
    let [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("posts.date");
    let [sortPosting, setSortPosting] = useState("-");

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
            page = 1;
            searchParams[field] = "";
            setPage(page);
            list();
            return;
        }

        let d = new Date(value);
        d = new Date(d.toUTCString());

        value = format(d, "MMM dd yyyy");

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

    const [selectedDebitAccounts, setSelectedDebitAccounts] = useState([]);
    const [selectedCreditAccounts, setSelectedCreditAccounts] = useState([]);

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            //setSelectedCreatedByExpenses(values);
        } else if (field === "category_id") {
            //setSelectedExpenseCategories(values);
        } else if (field === "account_id") {
            //setSelectedAccounts(values);
        } else if (field === "debit_account_id") {
            setSelectedDebitAccounts(values);
        } else if (field === "credit_account_id") {
            setSelectedCreditAccounts(values);
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

    let [debitTotal, setDebitTotal] = useState(0.00);
    let [creditTotal, setCreditTotal] = useState(0.00);

    let [debitBalance, setDebitBalance] = useState(0.00);
    let [creditBalance, setCreditBalance] = useState(0.00);

    let [debitBalanceBoughtDown, setDebitBalanceBoughtDown] = useState(0.00);
    let [creditBalanceBoughtDown, setCreditBalanceBoughtDown] = useState(0.00);

    let [allPostings, setAllPostings] = useState([]);
    let [fettingAllRecordsInProgress, setFettingAllRecordsInProgress] = useState(false);

    async function GetAllPostings() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,date,store_id,account_id,account_name,account_number,reference_id,reference_model,reference_code,posts,debit_total_credit_total,created_at";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        if (selectedAccount) {
            searchParams.account_id = selectedAccount.id;
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        console.log("Timezone:", parseFloat(diff / 60));
        searchParams["timezone_offset"] = parseFloat(diff / 60);
        searchParams["stats"] = "1";

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        let size = 1000;

        let postings = [];
        var pageNo = 1;

        // makeSalesReportFilename();

        for (; true;) {

            fettingAllRecordsInProgress = true;
            setFettingAllRecordsInProgress(true);
            let res = await fetch(
                "/v1/posting?" +
                Select +
                queryParams +
                "&sort=" +
                sortPosting +
                sortField +
                "&page=" +
                pageNo +
                "&limit=" +
                size,
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

                    // setIsListLoading(false);
                    if (!data.result || data.result.length === 0) {
                        return [];
                    }


                    // console.log("Orders:", orders);

                    return data.result;


                })
                .catch((error) => {
                    console.log(error);
                    return [];
                    //break;

                });
            if (res.length === 0) {
                break;
            }
            postings = postings.concat(res);
            pageNo++;
        }

        allPostings = postings;
        setAllPostings(allPostings);

        console.log("allPostings:", allPostings);
        fettingAllRecordsInProgress = false;
        setFettingAllRecordsInProgress(false);

    }

    function RemoveOpeningBalance(posting) {
        if (debitBalance > 0) {
            if (debitBalanceBoughtDown > 0) {
                debitBalance += debitBalanceBoughtDown;
            }

            if (creditBalanceBoughtDown > 0) {
                debitBalance -= creditBalanceBoughtDown;
            }
            setDebitBalance(debitBalance);
        }

        if (creditBalance > 0) {
            if (debitBalanceBoughtDown > 0) {
                creditBalance -= debitBalanceBoughtDown;
            }

            if (creditBalanceBoughtDown > 0) {
                creditBalance += creditBalanceBoughtDown;
            }
            setCreditBalance(creditBalance);
        }

        if (debitBalanceBoughtDown > 0) {
            debitTotal -= debitBalanceBoughtDown;
            setDebitTotal(debitTotal);
        }

        if (creditBalanceBoughtDown > 0) {
            creditTotal -= creditBalanceBoughtDown;
            setCreditTotal(creditTotal);
        }

        //  alert(selectedAccount.type)
        for (let i = 0; i < posting?.length; i++) {
            for (let j = 0; j < posting[i].posts?.length; j++) {
                if (debitBalanceBoughtDown > 0) {
                    posting[i].posts[j].balance -= debitBalanceBoughtDown;
                } else if (creditBalanceBoughtDown > 0) {
                    if (selectedAccount.type === "revenue" || selectedAccount.type === "capital") {
                        posting[i].posts[j].balance -= creditBalanceBoughtDown;
                    } else {
                        posting[i].posts[j].balance += creditBalanceBoughtDown;
                    }
                }
            }
        }

        return posting;
    }

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,date,store_id,account_id,account_name,account_number,reference_id,reference_model,reference_code,posts,debit_total,credit_total,created_at";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        if (selectedAccount) {
            searchParams.account_id = selectedAccount.id;
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

        // console.log("queryParams:", queryParams);
        //queryParams = encodeURIComponent(queryParams);

        setIsListLoading(true);
        fetch(
            "/v1/posting?" +
            Select +
            queryParams +
            "&sort=" +
            sortPosting +
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

                if (data.meta.account) {
                    selectedAccount = data.meta.account;
                    setSelectedAccount({ ...selectedAccount });
                }

                if (data.result) {
                    setPostingList(data.result);
                    selectedAccount.posting = data.result;
                    setSelectedAccount({ ...selectedAccount });
                }




                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                setTotalPages(pageCount);
                setTotalItems(data.total_count);
                setOffset((page - 1) * pageSize);
                setCurrentPageItemsCount(data.result.length);

                debitTotal = data.meta.debit_total;
                setDebitTotal(debitTotal);

                creditTotal = data.meta.credit_total;
                setCreditTotal(creditTotal);



                if (data.meta.debit_balance) {
                    debitBalance = data.meta.debit_balance;
                    setDebitBalance(debitBalance);
                } else {
                    debitBalance = 0.00;
                    setDebitBalance(0.00);
                }


                if (data.meta.credit_balance) {
                    creditBalance = data.meta.credit_balance;
                    setCreditBalance(creditBalance);
                } else {
                    creditBalance = 0.00;
                    setCreditBalance(0.00);
                }

                if (data.meta.debit_balance_bought_down) {
                    debitBalanceBoughtDown = data.meta.debit_balance_bought_down;
                    setDebitBalanceBoughtDown(debitBalanceBoughtDown);
                } else {
                    debitBalanceBoughtDown = 0.00;
                    setDebitBalanceBoughtDown(0.00);
                }

                if (data.meta.credit_balance_bought_down) {
                    creditBalanceBoughtDown = data.meta.credit_balance_bought_down;
                    setCreditBalanceBoughtDown(creditBalanceBoughtDown);
                } else {
                    creditBalanceBoughtDown = 0.00;
                    setCreditBalanceBoughtDown(0.00);
                }



                if (ignoreOpeningBalance) {
                    selectedAccount.posting = RemoveOpeningBalance(selectedAccount.posting);
                    setPostingList([...selectedAccount.posting]);
                }
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
        sortPosting = sortPosting === "-" ? "" : "-";
        setSortPosting(sortPosting);
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

    const [accountOptions, setAccountOptions] = useState([]);

    async function suggestAccounts(searchTerm) {
        console.log("Inside handle suggestAccounts");

        var params = {
            search: searchTerm,
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

        let Select = "select=id,name,phone,number,search_label,open,balance,debit_total,credit_total";
        let result = await fetch(
            `/v1/account?${Select}${queryString}`,
            requestOptions
        );
        let data = await result.json();

        setAccountOptions(data.result);
    }

    const PreviewRef = useRef();
    async function openPreview(account) {
        console.log("Opening account: ", account);
        await GetAllPostings();
        account.posts = allPostings;
        account.debitBalance = debitBalance;
        account.creditBalance = creditBalance;
        account.debitBalanceBoughtDown = debitBalanceBoughtDown;
        account.creditBalanceBoughtDown = creditBalanceBoughtDown;
        account.creditTotal = creditTotal;
        account.debitTotal = debitTotal;

        account.dateRangeStr = "";

        account.dateValue = dateValue;
        account.fromDateValue = fromDateValue;
        account.toDateValue = toDateValue;

        if (ignoreOpeningBalance) {
            list();
            account.posts = RemoveOpeningBalance(allPostings);
        }

        account.ignoreOpeningBalance = ignoreOpeningBalance;


        /*
        if (dateValue) {
            account.dateRangeStr = "Date: " + format(new Date(dateValue), "MMM dd yyyy h:mma")
        } else if (fromDateValue && toDateValue) {
            account.dateRangeStr = "Date From: " + format(new Date(fromDateValue), "MMM dd yyyy h:mma") + " To:" + format(new Date(toDateValue), "MMM dd yyyy h:mma")
        } else if (fromDateValue) {
            account.dateRangeStr = "Date From: " + format(new Date(fromDateValue), "MMM dd yyyy h:mma")
        } else if (toDateValue) {
            account.dateRangeStr = "Date Upto: " + format(new Date(toDateValue), "MMM dd yyyy h:mma")
        }
        */

        PreviewRef.current.open(account);
    }

    async function sendWhatsAppMessage(account) {
        console.log("Opening account: ", account);
        await GetAllPostings();
        account.posts = allPostings;
        account.debitBalance = debitBalance;
        account.creditBalance = creditBalance;
        account.debitBalanceBoughtDown = debitBalanceBoughtDown;
        account.creditBalanceBoughtDown = creditBalanceBoughtDown;
        account.creditTotal = creditTotal;
        account.debitTotal = debitTotal;

        console.log(" account.posts", account.posts);
        console.log("opening")

        account.dateRangeStr = "";

        account.dateValue = dateValue;
        account.fromDateValue = fromDateValue;
        account.toDateValue = toDateValue;
        PreviewRef.current.open(account, "whatsapp");
    }

    /*
    function toTitleCaseFromUnderscore(str) {
        let newStr = str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        if (newStr === "Customer Deposit") {
            return "Customer Receivable"
        } else if (newStr === "Customer Withdrawal") {
            return "Customer Payable"
        }
        return newStr;
    }
        */

    const SalesUpdateFormRef = useRef();
    const SalesReturnUpdateFormRef = useRef();
    const QuotationSalesReturnUpdateFormRef = useRef();
    const PurchaseUpdateFormRef = useRef();
    const PurchaseReturnUpdateFormRef = useRef();
    const CustomerReceivableUpdateFormRef = useRef();
    const CustomerPayableUpdateFormRef = useRef();
    const ExpenseUpdateFormRef = useRef();
    const CapitalUpdateFormRef = useRef();
    const DividentUpdateFormRef = useRef();
    const QuotationUpdateFormRef = useRef();

    let [showUpdateForm, setShowUpdateForm] = useState(false);
    const timerRef = useRef(null);
    function openUpdateForm(id, referenceModel) {

        showUpdateForm = true;
        setShowUpdateForm(showUpdateForm);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (referenceModel === "sales") {
                SalesUpdateFormRef.current.open(id);
            } else if (referenceModel === "sales_return") {
                SalesReturnUpdateFormRef.current.open(id);
            } else if (referenceModel === "purchase") {
                PurchaseUpdateFormRef.current.open(id);
            } else if (referenceModel === "purchase_return") {
                PurchaseReturnUpdateFormRef.current.open(id);
            } else if (referenceModel === "customer_deposit") {
                CustomerReceivableUpdateFormRef.current.open(id);
            } else if (referenceModel === "customer_withdrawal") {
                CustomerPayableUpdateFormRef.current.open(id);
            } else if (referenceModel === "vendor_deposit") {
                CustomerReceivableUpdateFormRef.current.open(id);
            } else if (referenceModel === "vendor_withdrawal") {
                CustomerPayableUpdateFormRef.current.open(id);
            } else if (referenceModel === "expense") {
                ExpenseUpdateFormRef.current.open(id);
            } else if (referenceModel === "capital") {
                CapitalUpdateFormRef.current.open(id);
            } else if (referenceModel === "drawing") {
                DividentUpdateFormRef.current.open(id);
            } else if (referenceModel === "quotation_sales") {
                QuotationUpdateFormRef.current.open(id);
            } else if (referenceModel === "quotation_sales_return") {
                QuotationSalesReturnUpdateFormRef.current.open(id);
            }
        }, 50);

    }
    const handleUpdated = () => {
        list();
    };

    let [ignoreOpeningBalance, setIgnoreOpeningBalance] = useState(false)

    return (
        <>
            {showUpdateForm && <>
                <OrderCreate ref={SalesUpdateFormRef} onUpdated={handleUpdated} />
                <QuotationCreate ref={QuotationUpdateFormRef} onUpdated={handleUpdated} />
                <SalesReturnCreate ref={SalesReturnUpdateFormRef} onUpdated={handleUpdated} />
                <QuotationSalesReturnCreate ref={QuotationSalesReturnUpdateFormRef} onUpdated={handleUpdated} />
                <PurchaseCreate ref={PurchaseUpdateFormRef} onUpdated={handleUpdated} />
                <PurchaseReturnCreate ref={PurchaseReturnUpdateFormRef} onUpdated={handleUpdated} />
                <CustomerDepositCreate ref={CustomerReceivableUpdateFormRef} onUpdated={handleUpdated} />
                <CustomerWithdrawalCreate ref={CustomerPayableUpdateFormRef} onUpdated={handleUpdated} />
                <ExpenseCreate ref={ExpenseUpdateFormRef} onUpdated={handleUpdated} />
                <CapitalCreate ref={CapitalUpdateFormRef} onUpdated={handleUpdated} />
                <DividentCreate ref={DividentUpdateFormRef} onUpdated={handleUpdated} /></>}

            <BalanceSheetPrintPreview ref={PreviewRef} />
            <Modal show={showAccountBalanceSheet} fullscreen onHide={handleAccountBalanceSheetClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Balance sheet of {selectedAccount?.name + " A/c (#" + selectedAccount?.number + ")"} {selectedAccount?.vat_no ? "  VAT #" + selectedAccount.vat_no : ""} </Modal.Title>

                    <div className="col align-self-end text-end">
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={() => {
                            openPreview(selectedAccount);
                        }} >
                            <i className="bi bi-display"></i>
                            {fettingAllRecordsInProgress ? "Preparing.." : " Print Preview"}
                        </Button>

                        &nbsp;&nbsp;
                        <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                            sendWhatsAppMessage(selectedAccount);
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                            </svg>
                        </Button>

                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleAccountBalanceSheetClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>


                    {/*
            <div className="container-fluid p-0">
                <div className="row">
                    
                    <div className="col">
                        <h1 className="text-end">
                            Total: <Badge bg="secondary">
                                <NumberFormat
                                    value={totalExpenses}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    suffix={" SAR"}
                                    renderText={(value, props) => value}
                                />
                            </Badge>
                        </h1>
                    </div>

                </div>
            </div>
           */}

                    <div className="container-fluid p-0">
                        <div className="row">
                            <div className="col">
                                <h1 className="h3">{/*Postings*/}</h1>
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
                                                    <p className="text-start">No postings to display</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="row" style={{ bexpense: "solid 0px" }}>
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
                                                            animation="bexpense"
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
                                                                bexpense: "solid 1px",
                                                                bexpenseColor: "silver",
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
                                            <div className="col" style={{ bexpense: "solid 0px" }}>
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
                                        <div className="row">
                                            <div className="col text-start">
                                                <p className="text-start">


                                                    <span style={{ marginLeft: "10px" }}>
                                                        <input type="checkbox"
                                                            value={ignoreOpeningBalance}
                                                            checked={ignoreOpeningBalance}
                                                            onChange={(e) => {
                                                                ignoreOpeningBalance = !ignoreOpeningBalance;
                                                                setIgnoreOpeningBalance(ignoreOpeningBalance);
                                                                list();
                                                            }}
                                                            className=""
                                                            id="ignoreOpeningBalance"

                                                        /> &nbsp;Ignore Opening Balance
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                                            <table className="table table-striped table-sm table-bordered">
                                                <thead>
                                                    <tr className="text-center">
                                                        {/*
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("account_name");
                                                        }}
                                                    >
                                                        Account
                                                        {sortField === "account_name" && sortPosting === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "account_name" && sortPosting === "" ? (
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
                                                                    sort("posts.date");
                                                                }}
                                                            >
                                                                Date
                                                                {sortField === "posts.date" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-down"></i>
                                                                ) : null}
                                                                {sortField === "posts.date" && sortPosting === "" ? (
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
                                                                    sort("reference_code");
                                                                }}
                                                            >
                                                                ID
                                                                {sortField === "reference_code" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "reference_code" && sortPosting === "" ? (
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
                                                                    sort("posts.debit");
                                                                }}
                                                            >
                                                                Debit
                                                                {sortField === "posts.debit" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "posts.debit" && sortPosting === "" ? (
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
                                                                    sort("posts.credit");
                                                                }}
                                                            >
                                                                Credit
                                                                {sortField === "posts.credit" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "posts.credit" && sortPosting === "" ? (
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
                                                                    sort("posts.balance");
                                                                }}
                                                            >
                                                                Balance
                                                                {sortField === "posts.balance" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "posts.balance" && sortPosting === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>
                                                        {/*<th>
                                                            <b
                                                                style={{
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => {
                                                                    sort("reference_model");
                                                                }}
                                                            >
                                                                Type
                                                                {sortField === "reference_model" && sortPosting === "-" ? (
                                                                    <i className="bi bi-sort-alpha-up-alt"></i>
                                                                ) : null}
                                                                {sortField === "reference_model" && sortPosting === "" ? (
                                                                    <i className="bi bi-sort-alpha-up"></i>
                                                                ) : null}
                                                            </b>
                                                        </th>*/}




                                                        {/*
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
                                                        {sortField === "created_at" && sortPosting === "-" ? (
                                                            <i className="bi bi-sort-down"></i>
                                                        ) : null}
                                                        {sortField === "created_at" && sortPosting === "" ? (
                                                            <i className="bi bi-sort-up"></i>
                                                        ) : null}
                                                    </b>
                                                </th>
                                                        */}

                                                    </tr>
                                                </thead>

                                                <thead>
                                                    <tr className="text-center">

                                                        {/*
                                                <th style={{ minWidth: "250px" }}>
                                                    <Typeahead
                                                        id="account_id"
                                                        
                                                        labelKey="search_label"
                                                        onChange={(selectedItems) => {
                                                            searchByMultipleValuesField(
                                                                "account_id",
                                                                selectedItems
                                                            );
                                                        }}
                                                        options={accountOptions}
                                                        placeholder="Name / mob / acc no."
                                                        selected={selectedAccounts}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            suggestAccounts(searchTerm);
                                                        }}
                                                        multiple
                                                    />
                                                </th>
                                                    */}

                                                        <th style={{ width: "80px" }}>
                                                            <DatePicker
                                                                id="balance_sheet_date"
                                                                value={dateValue}
                                                                selected={selectedDate}
                                                                isClearable={true}
                                                                className="form-control"
                                                                dateFormat="MMM dd yyyy"
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
                                                                onClick={(e) => setShowDateRange(!showDateRange)}
                                                            >
                                                                {showDateRange ? "Less.." : "More.."}
                                                            </small>
                                                            <br />

                                                            {showDateRange ? (
                                                                <span className="text-left">
                                                                    From:{" "}
                                                                    <DatePicker
                                                                        id="balance_sheet_from_date"
                                                                        value={fromDateValue}
                                                                        selected={selectedFromDate}
                                                                        isClearable={true}
                                                                        className="form-control"
                                                                        dateFormat="MMM dd yyyy"
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
                                                                        id="balance_sheet_to_date"
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
                                                        </th>
                                                        <th style={{ width: "80px" }}>
                                                            <input
                                                                type="text"
                                                                id="reference_code"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("reference_code", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>

                                                        <th style={{ width: "130px" }}>
                                                            <Typeahead
                                                                id="account_id"

                                                                labelKey="search_label"
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "debit_account_id",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={accountOptions}
                                                                placeholder="Debit A/c name / acc no. / phone"
                                                                selected={selectedDebitAccounts}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm, e) => {
                                                                    suggestAccounts(searchTerm);
                                                                }}
                                                                multiple
                                                            />
                                                            <br />

                                                            <input
                                                                type="text"
                                                                id="debit"
                                                                placeholder="Debit amount"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("debit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th style={{ width: "130px" }}>
                                                            <Typeahead
                                                                id="account_id"

                                                                labelKey="search_label"
                                                                onChange={(selectedItems) => {
                                                                    searchByMultipleValuesField(
                                                                        "credit_account_id",
                                                                        selectedItems
                                                                    );
                                                                }}
                                                                options={accountOptions}
                                                                placeholder="Credit A/c name / acc no. / phone"
                                                                selected={selectedCreditAccounts}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm, e) => {
                                                                    suggestAccounts(searchTerm);
                                                                }}
                                                                multiple
                                                            />
                                                            <br />
                                                            <input
                                                                type="text"
                                                                id="credit"
                                                                placeholder="Credit amount"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("credit", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />
                                                        </th>
                                                        <th style={{ width: "80px" }}>
                                                            <input
                                                                type="text"
                                                                id="balance"
                                                                placeholder="Balance amount"
                                                                onChange={(e) =>
                                                                    searchByFieldValue("balance", e.target.value)
                                                                }
                                                                className="form-control"
                                                            />

                                                            {/*<select className="form-control" onChange={(e) =>
                                                                searchByFieldValue("reference_model", e.target.value)
                                                            }>
                                                                <option value="">All</option>
                                                                <option value="sales">Sales</option>
                                                                <option value="sales_return">Sales Return</option>
                                                                <option value="purchase">Purchase</option>
                                                                <option value="purchase_return">Purchase Return</option>
                                                                <option value="capital">Capital</option>
                                                                <option value="drawing">Drawing</option>
                                                                <option value="expense">Expense</option>
                                                                <option value="customer_deposit">Customer Receivable</option>
                                                                <option value="customer_withdrawal">Customer Payable</option>
                                                            </select>*/}

                                                        </th>

                                                        {/*
                                                <th style={{ minWidth: "150px" }}>
                                                    <DatePicker
                                                        id="created_at"
                                                        value={createdAtValue}
                                                        selected={selectedDate}
                                                        className="form-control"
                                                        dateFormat="MMM dd yyyy"
                                                        onChange={(date) => {
                                                            if (!date) {
                                                               
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
                                                                   
                                                                        searchByDateField("created_at_to", "");
                                                                        return;
                                                                    }
                                                                    searchByDateField("created_at_to", date);
                                                                }}
                                                            />
                                                        </span>
                                                    ) : null}
                                                </th>
                                                            */}
                                                    </tr>
                                                </thead>

                                                <tbody className="text-center">
                                                    {selectedAccount && (debitBalanceBoughtDown > 0 || creditBalanceBoughtDown > 0) && !ignoreOpeningBalance ? <tr>
                                                        <td></td>
                                                        <td></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{debitBalanceBoughtDown > 0 ? "To Opening Balance  " : ""} {debitBalanceBoughtDown > 0 ? <Amount amount={debitBalanceBoughtDown} /> : ""}</b></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{creditBalanceBoughtDown > 0 ? "By Opening Balance  " : ""} {creditBalanceBoughtDown > 0 ? <Amount amount={creditBalanceBoughtDown} /> : ""} </b></td>
                                                        <td colSpan={2}></td>
                                                    </tr> : ""}

                                                    {postingList &&
                                                        postingList?.map((posting) => (
                                                            posting.posts?.map((post, index) => (
                                                                <tr key={`${posting.id}-${index}`}>
                                                                    {/* Date column */}
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {format(new Date(post.date), "MMM dd yyyy h:mma")}
                                                                    </td>

                                                                    {/* Reference code - show only in first row of group (optional) */}
                                                                    <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                        {posting.reference_code && (
                                                                            <span
                                                                                style={{ cursor: "pointer", color: "blue" }}
                                                                                onClick={() => openUpdateForm(posting.reference_id, posting.reference_model)}
                                                                            >
                                                                                {posting.reference_code}
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    {/* Debit side */}
                                                                    < td className="p-1 ps-3 w-40" style={{ minWidth: "300px", maxWidth: "300px" }}>
                                                                        <div className="d-flex justify-content-between align-items-center w-100">
                                                                            {post.debit_or_credit === "debit" && (
                                                                                <div className="d-flex me-2" style={{ maxWidth: '70%' }}>
                                                                                    <span className="text-nowrap me-1">To</span>
                                                                                    <span className="text-truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        <OverflowTooltip value={post.account_name} />
                                                                                    </span>
                                                                                    <span className="ms-1 text-nowrap">
                                                                                        A/c #{post.account_number} Dr.
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <span className="text-nowrap ms-auto">
                                                                                {post.debit ? <Amount amount={post.debit} /> : <span style={{ visibility: 'hidden' }}><Amount amount={0} /></span>}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Credit side */}
                                                                    <td className="p-1 ps-3 w-40" style={{ minWidth: "300px", maxWidth: "300px" }}>
                                                                        <div className="d-flex justify-content-between align-items-center w-100">
                                                                            {post.debit_or_credit === "credit" && (
                                                                                <div className="d-flex me-2" style={{ maxWidth: '70%' }}>
                                                                                    <span className="text-nowrap me-1">By</span>
                                                                                    <span className="text-truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        <OverflowTooltip value={post.account_name} />
                                                                                    </span>
                                                                                    <span className="ms-1 text-nowrap">
                                                                                        A/c #{post.account_number} Cr.
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <span className="text-nowrap ms-auto">
                                                                                {post.credit ? <Amount amount={post.credit} /> : <span style={{ visibility: 'hidden' }}><Amount amount={0} /></span>}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Balance for this post */}
                                                                    <td className="text-end" style={{ whiteSpace: "nowrap" }}>
                                                                        <Amount amount={post.balance} />
                                                                    </td>
                                                                </tr>
                                                            ))

                                                        ))}

                                                    {/*postingList &&
                                                        postingList.map((posting) => (
                                                            <tr key={posting.id}>
                                                                <td style={{ width: "auto", whiteSpace: "nowrap" }} >{format(new Date(posting.posts[0]?.date), "MMM dd yyyy h:mma")}</td>
                                                                <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                                                    {posting.reference_code && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                                                        openUpdateForm(posting.reference_id, posting.reference_model);
                                                                    }}>{posting.reference_code}</span>}
                                                                </td>
                                                                <td className="p-1 ps-3 w-40" style={{ minWidth: "300px", maxWidth: "300px" }}>
                                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                                        {posting.posts[0].debit_or_credit === "debit" && (
                                                                            <div className="d-flex me-2" style={{ maxWidth: '70%' }}>
                                                                                <span className="text-nowrap me-1">To</span>
                                                                                <span className="text-truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                    <OverflowTooltip value={posting.posts[0].account_name} />
                                                                                </span>
                                                                                <span className="ms-1 text-nowrap">
                                                                                    A/c #{posting.posts[0].account_number} Dr.
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <span className="text-nowrap ms-auto">
                                                                            {posting.posts[0].debit
                                                                                ? <Amount amount={posting.posts[0].debit} />
                                                                                : <span style={{ visibility: 'hidden' }}><Amount amount={0} /></span>}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="p-1 ps-3 w-40" style={{ minWidth: "300px", maxWidth: "300px" }}>
                                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                                        {posting.posts[0].debit_or_credit === "credit" && (
                                                                            <div className="d-flex me-2" style={{ maxWidth: '70%' }}>
                                                                                <span className="text-nowrap me-1">By</span>
                                                                                <span className="text-truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                    <OverflowTooltip value={posting.posts[0].account_name} />
                                                                                </span>
                                                                                <span className="ms-1 text-nowrap">
                                                                                    A/c #{posting.posts[0].account_number} Cr.
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <span className="text-nowrap ms-auto">
                                                                            {posting.posts[0].credit
                                                                                ? <Amount amount={posting.posts[0].credit} />
                                                                                : <span style={{ visibility: 'hidden' }}><Amount amount={0} /></span>}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                {/*<td colSpan={3}>
                                                                    {posting.posts &&
                                                                        posting.posts.map((post, key) => (
                                                                            <tr key={key} style={{ border: "solid 1px" }}>
                                                                                <td style={{ border: "solid 1px", minWidth: "248px" }}>{format(new Date(post.date), "MMM dd yyyy h:mma")}</td>
                                                                                <td colSpan={2} style={{ border: "solid 0px" }}>
                                                                                    <td style={{ border: "solid 0px", borderRight: "solid 0px", minWidth: "304px", paddingLeft: "5px" }}>
                                                                                        <td style={{ textAlign: "left", border: "solid 0px", minWidth: "207px" }}>
                                                                                            {post.debit_or_credit === "debit" ? "To " + post.account_name + " A/c #" + post.account_number + " Dr." : ""}
                                                                                        </td>
                                                                                        <td style={{ textAlign: "right", border: "solid 0px", minWidth: "97px" }}>
                                                                                            {post.debit ? <Amount amount={post.debit} /> : ""}
                                                                                        </td>
                                                                                    </td>
                                                                                    <td style={{ border: "solid 0px", paddingLeft: "5px", borderLeft: "solid 1px" }}>
                                                                                        <td style={{ textAlign: "left", border: "solid 0px", minWidth: "203px" }}>
                                                                                            {post.debit_or_credit === "credit" ? "By " + post.account_name + " A/c #" + post.account_number + "  Cr." : ""}
                                                                                        </td>
                                                                                        <td style={{ textAlign: "right", border: "solid 0px", minWidth: "95px" }}>
                                                                                            {post.credit ? <Amount amount={post.credit} /> : ""}
                                                                                        </td>
                                                                                    </td>

                                                                                </td>

                                                                            </tr>))}


                                                                </td>
                                                                <td style={{ width: "auto", whiteSpace: "nowrap" }} className="text-end" >  <Amount amount={posting.posts[0]?.balance} /></td>
                                                                {/*<td style={{ width: "auto", whiteSpace: "nowrap" }} >{toTitleCaseFromUnderscore(posting.reference_model)}</td>*/}



                                                    {/*  </tr>
                                                        ))}*/}

                                                    {selectedAccount ? <tr>
                                                        <td ></td>
                                                        <td className="text-end">Amount</td>
                                                        <td style={{ textAlign: "right" }}><b>{<Amount amount={debitTotal} />}</b></td>
                                                        <td style={{ textAlign: "right" }}><b>{<Amount amount={creditTotal} />}</b></td>
                                                        <td colSpan={2}></td>
                                                    </tr> : ""}
                                                    {selectedAccount && <tr>
                                                        <td ></td>
                                                        <td className="text-end">Due Amount</td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{debitBalance > 0 ? "To Closing Balance  " : ""} {debitBalance > 0 ? <Amount amount={selectedAccount.type === "liability" && store?.settings?.show_minus_on_liability_balance_in_balance_sheet ? debitBalance * (-1) : debitBalance} /> : ""} </b></td>
                                                        <td style={{ textAlign: "right", color: "red" }}><b>{creditBalance > 0 ? "By Closing Balance  " : ""} {creditBalance > 0 ? <Amount amount={selectedAccount.type === "liability" && store?.settings?.show_minus_on_liability_balance_in_balance_sheet ? creditBalance * (-1) : creditBalance} /> : ""}  </b></td>
                                                        <td colSpan={2}></td>
                                                    </tr>}
                                                    {selectedAccount && !store?.settings?.hide_total_amount_row_in_balance_sheet && < tr >
                                                        <td ></td>
                                                        <td className="text-end">Total Amount</td>
                                                        <td style={{ textAlign: "right" }}><b>{creditTotal > debitTotal ? <Amount amount={creditTotal} /> : <Amount amount={debitTotal} />}</b></td>
                                                        <td style={{ textAlign: "right" }}><b>{creditTotal > debitTotal ? <Amount amount={creditTotal} /> : <Amount amount={debitTotal} />}</b></td>
                                                        <td colSpan={2}></td>
                                                    </tr>}
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
                </Modal.Body >
            </Modal >
        </>
    );
});

export default PostingIndex;
