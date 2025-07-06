import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import QuotationCreate from "./create.js";
import QuotationView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Modal, Alert } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";
import ReportPreview from "./../order/report.js";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import OrderCreate from "./../order/create.js";
import OrderPreview from "./../order/preview.js"
import OrderPrint from "./../order/print.js"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import QuotationSalesReturnCreate from "./../quotation_sales_return/create.js";
import QuotationSalesReturnIndex from "./../quotation_sales_return/index.js";

const shortLocale = {
  ...enUS,
  formatDistance: (token, count) => {
    const format = {
      xSeconds: `${count}s`,
      xMinutes: `${count}m`,
      xHours: `${count}h`,
      xDays: `${count}d`,
      xMonths: `${count}mo`,
      xYears: `${count}y`,
    };
    return format[token] || "";
  },
};

const TimeAgo = ({ date }) => {
  return <span>{formatDistanceToNowStrict(new Date(date), { locale: shortLocale })} ago</span>;
};


function QuotationIndex(props) {
  const { lastMessage } = useContext(WebSocketContext);

  const ReportPreviewRef = useRef();
  function openReportPreview(modelName) {
    ReportPreviewRef.current.open(modelName);
  }


  let [totalQuotation, setTotalQuotation] = useState(0.00);
  let [profit, setProfit] = useState(0.00);
  let [loss, setLoss] = useState(0.00);

  //list
  const [quotationList, setQuotationList] = useState([]);

  //pagination
  const [pageSize, setPageSize] = useState(20);
  let [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(1);
  const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
  const [offset, setOffset] = useState(0);

  //Date filter
  const [showDateRange, setShowDateRange] = useState(false);
  let [selectedDate, setSelectedDate] = useState(new Date());
  let [selectedFromDate, setSelectedFromDate] = useState(new Date());
  let [selectedToDate, setSelectedToDate] = useState(new Date());

  let [dateValue, setDateValue] = useState("");
  let [fromDateValue, setFromDateValue] = useState("");
  let [toDateValue, setToDateValue] = useState("");

  let [selectedCreatedAtDate, setSelectedCreatedAtDate] = useState(new Date());
  let [selectedCreatedAtFromDate, setSelectedCreatedAtFromDate] = useState(new Date());
  let [selectedCreatedAtToDate, setSelectedCreatedAtToDate] = useState(new Date());

  //Created At filter
  const [showCreatedAtDateRange, setShowCreatedAtDateRange] = useState(false);
  const [createdAtValue, setCreatedAtValue] = useState("");
  const [createdAtFromValue, setCreatedAtFromValue] = useState("");
  const [createdAtToValue, setCreatedAtToValue] = useState("");

  //loader flag
  const [isListLoading, setIsListLoading] = useState(false);
  const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

  //Customer Auto Suggestion
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  //Created By User Auto Suggestion
  const [userOptions, setUserOptions] = useState([]);
  const [selectedCreatedByUsers, setSelectedCreatedByUsers] = useState([]);

  //Status Auto Suggestion
  const statusOptions = [
    {
      id: "sent",
      name: "Sent",
    },
    {
      id: "pending",
      name: "Pending",
    },
    {
      id: "accepted",
      name: "Accepted",
    },
    {
      id: "rejected",
      name: "Rejected",
    },
    {
      id: "cancelled",
      name: "Cancelled",
    },
    {
      id: "deleted",
      name: "Deleted",
    },
  ];

  const [selectedStatusList, setSelectedStatusList] = useState([]);

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

        console.log("Response:");
        console.log(data);
        store = data.result;
        setStore(store);
      })
      .catch(error => {

      });
  }

  //Search params
  const [searchParams, setSearchParams] = useState({});
  let [sortField, setSortField] = useState("created_at");
  let [sortOrder, setSortOrder] = useState("-");

  function ObjectToSearchQueryParams(object) {
    return Object.keys(object)
      .map(function (key) {
        return `search[${key}]=${object[key]}`;
      })
      .join("&");
  }

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

  async function suggestUsers(searchTerm) {
    console.log("Inside handle suggestUsers");
    setCustomerOptions([]);

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
      console.log("Value:", value);
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

  function searchByMultipleValuesField(field, values) {
    if (field === "created_by") {
      setSelectedCreatedByUsers(values);
    } else if (field === "customer_id") {
      setSelectedCustomers(values);
    } else if (field === "status") {
      setSelectedStatusList(values);
    } else if (field === "payment_status") {
      setSelectedPaymentStatusList(values);
    } else if (field === "payment_methods") {
      setSelectedPaymentMethodList(values);
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



  const [invoiceTotalSales, setInvoiceTotalSales] = useState(0.00);
  const [invoiceNetProfit, setInvoiceNetProfit] = useState(0.00);
  const [invoiceVatPrice, setInvoiceVatPrice] = useState(0.00);
  const [invoiceTotalShippingHandlingFees, setInvoiceTotalShippingHandlingFees] = useState(0.00);
  const [invoiceTotalDiscount, setInvoiceTotalDiscount] = useState(0.00);
  const [invoiceTotalCashDiscount, setInvoiceTotalCashDiscount] = useState(0.00);
  const [invoiceTotalPaidSales, setInvoiceTotalPaidSales] = useState(0.00);
  const [invoiceTotalUnPaidSales, setInvoiceTotalUnPaidSales] = useState(0.00);
  const [invoiceTotalCashSales, setInvoiceTotalCashSales] = useState(0.00);
  const [invoiceTotalBankAccountSales, setInvoiceTotalBankAccountSales] = useState(0.00);
  const [invoiceLoss, setInvoiceLoss] = useState(0.00);

  let [statsOpen, setStatsOpen] = useState(false);


  const list = useCallback(() => {
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("access_token"),
      },
    };
    let Select =
      "select=id,order_code,order_id,reported_to_zatca,reported_to_zatca_at,type,payment_status,payment_methods,total_payment_received,balance_amount,code,date,net_total,created_by_name,customer_name,status,cash_discount,discount_with_vat,created_at,net_profit,net_loss,return_count,return_amount";

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



    setIsListLoading(true);
    fetch(
      "/v1/quotation?" +
      Select +
      queryParams +
      "&sort=" +
      sortOrder +
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
        setQuotationList(data.result);

        let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

        setTotalPages(pageCount);
        setTotalItems(data.total_count);
        setOffset((page - 1) * pageSize);
        setCurrentPageItemsCount(data.result.length);

        setTotalQuotation(data.meta.total_quotation);
        setProfit(data.meta.profit);
        setLoss(data.meta.loss);

        //invoice meta

        setInvoiceTotalSales(data.meta.invoice_total_sales);
        setInvoiceNetProfit(data.meta.invoice_net_profit);
        setInvoiceLoss(data.meta.invoice_net_loss);
        setInvoiceVatPrice(data.meta.invoice_vat_price);
        setInvoiceTotalShippingHandlingFees(data.meta.invoice_shipping_handling_fees);
        setInvoiceTotalDiscount(data.meta.invoice_discount);
        setInvoiceTotalCashDiscount(data.meta.invoice_cash_discount);
        setInvoiceTotalPaidSales(data.meta.invoice_paid_sales);
        setInvoiceTotalUnPaidSales(data.meta.invoice_unpaid_sales);
        setInvoiceTotalCashSales(data.meta.invoice_cash_sales);
        setInvoiceTotalBankAccountSales(data.meta.invoice_bank_account_sales);
      })
      .catch((error) => {
        setIsListLoading(false);
        setIsRefreshInProcess(false);
        console.log(error);
      });
  }, [sortOrder, sortField, page, pageSize, statsOpen, searchParams]);

  const handleSummaryToggle = (isOpen) => {
    statsOpen = isOpen
    setStatsOpen(statsOpen)
  };


  useEffect(() => {
    if (statsOpen) {
      list();  // Call list() whenever statsOpen changes to true
    }
  }, [statsOpen, list]);


  useEffect(() => {
    if (lastMessage) {
      const jsonMessage = JSON.parse(lastMessage.data);
      console.log("Received Message in User list:", jsonMessage);
      if (jsonMessage.event === "quotation_updated") {
        list();
      }
    }
  }, [lastMessage, list]);

  useEffect(() => {
    const handleSocketOpen = () => {
      //console.log("WebSocket Opened in sales list");
      list();
    };

    eventEmitter.on("socket_connection_open", handleSocketOpen);

    return () => {
      eventEmitter.off("socket_connection_open", handleSocketOpen); // Cleanup
    };
  }, [list]); // Runs only once when component mounts

  function sort(field) {
    sortField = field;
    setSortField(sortField);
    sortOrder = sortOrder === "-" ? "" : "-";
    setSortOrder(sortOrder);
    list();
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      list();
    }, 300);

    // Cleanup to avoid memory leaks
    return () => clearTimeout(timer);
  }, [pageSize, list]);


  function changePageSize(size) {
    setPageSize(parseInt(size));
  }

  function changePage(newPage) {
    page = parseInt(newPage);
    setPage(page);
    list();
  }

  function openUpdateForm(id) {
    CreateFormRef.current.open(id);
  }

  const DetailsViewRef = useRef();
  function openDetailsView(id) {
    DetailsViewRef.current.open(id);
  }

  const CreateFormRef = useRef();
  function openCreateForm() {
    CreateFormRef.current.open();
  }


  function sendWhatsAppMessage(model) {
    showOrderPreview = true;
    setShowOrderPreview(showOrderPreview);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      PreviewRef.current.open(model, "whatsapp", "whatsapp_quotation");
    }, 100);
  }


  //Payment Status Auto Suggestion
  const paymentStatusOptions = [
    {
      id: "paid",
      name: "Paid",
    },
    {
      id: "not_paid",
      name: "Not Paid",
    },
    {
      id: "paid_partially",
      name: "Paid partially",
    },
  ];
  const [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);

  const paymentMethodOptions = [
    {
      id: "cash",
      name: "Cash",
    },
    {
      id: "debit_card",
      name: "Debit Card",
    },
    {
      id: "credit_card",
      name: "Credit Card",
    },
    {
      id: "bank_card",
      name: "Bank Card",
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
    },
    {
      id: "bank_cheque",
      name: "Bank Cheque",
    },
  ];
  const [selectedPaymentMethodList, setSelectedPaymentMethodList] = useState([]);

  const customerSearchRef = useRef();
  const timerRef = useRef(null);


  const SalesUpdateFormRef = useRef();
  function openSalesUpdateForm(id) {
    SalesUpdateFormRef.current.open(id);
  }


  //Printing
  const [selectedQuotation, setSelectedQuotation] = useState({});
  let [showPrintTypeSelection, setShowPrintTypeSelection] = useState(false);

  const printButtonRef = useRef();
  const printA4ButtonRef = useRef();

  const PreviewRef = useRef();
  const openPreview = useCallback((quotation) => {
    setShowOrderPreview(true);
    setShowPrintTypeSelection(false);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      PreviewRef.current?.open(quotation, undefined, "quotation");
    }, 100);

  }, []);


  let [showOrderPreview, setShowOrderPreview] = useState(false);

  const openPrintTypeSelection = useCallback((quotation) => {
    setSelectedQuotation(quotation);
    if (store.settings?.enable_invoice_print_type_selection) {
      // showPrintTypeSelection = true;
      setShowOrderPreview(true);
      setShowPrintTypeSelection(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        printButtonRef.current?.focus();
      }, 100);
    } else {
      openPreview(quotation);
    }
  }, [openPreview, store]);



  const PrintRef = useRef();
  const openPrint = useCallback((quotation) => {
    // document.removeEventListener('keydown', handleEnterKey);
    setShowPrintTypeSelection(false);
    PrintRef.current?.open(quotation, "quotation");
  }, []);



  //Table settings
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const defaultColumns = useMemo(() => [
    { key: "actions", label: "Actions", fieldName: "actions", visible: true },
    { key: "id", label: "ID", fieldName: "code", visible: true },
    { key: "date", label: "Date", fieldName: "date", visible: true },
    { key: "customer", label: "Customer", fieldName: "customer_name", visible: true },
    { key: "net_total", label: "Net Total", fieldName: "net_total", visible: true },
    { key: "amount_paid", label: "Amount Paid", fieldName: "total_payment_received", visible: true },
    { key: "credit_balance", label: "Credit Balance", fieldName: "balance_amount", visible: true },
    { key: "reported_to_zatca", label: "Reported to Zatca", fieldName: "reported_to_zatca", visible: true },
    { key: "type", label: "Type", fieldName: "type", visible: true },
    { key: "order_code", label: "Sales ID", fieldName: "order_code", visible: true },
    { key: "payment_status", label: "Payment Status", fieldName: "payment_status", visible: true },
    { key: "payment_methods", label: "Payment Methods", fieldName: "payment_methods", visible: true },
    { key: "cash_discount", label: "Cash Discount", fieldName: "cash_discount", visible: true },
    { key: "discount", label: "Discount", fieldName: "discount", visible: true },
    { key: "net_profit", label: "Net Profit", fieldName: "net_profit", visible: true },
    { key: "net_loss", label: "Net Loss", fieldName: "net_loss", visible: true },
    { key: "return_count", label: "Return Count", fieldName: "return_count", visible: true },
    { key: "return_paid_amount", label: "Return Paid Amount", fieldName: "return_amount", visible: true },
    { key: "status", label: "Status", fieldName: "status", visible: true },
    { key: "created_by", label: "Created By", fieldName: "created_by", visible: true },
    { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
    { key: "actions_end", label: "Actions", fieldName: "actions_end", visible: true },
  ], []);


  const [columns, setColumns] = useState(defaultColumns);
  const [showSettings, setShowSettings] = useState(false);
  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("quotation_table_settings");
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
      localStorage.setItem("quotation_table_settings", JSON.stringify(defaultColumns));
      setColumns(defaultColumns);
    }

    //2nd

  }, [defaultColumns]);

  function RestoreDefaultSettings() {
    localStorage.setItem("quotation_table_settings", JSON.stringify(defaultColumns));
    setColumns(defaultColumns);

    setShowSuccess(true);
    setSuccessMessage("Successfully restored to default settings!")
  }

  // Save column settings to localStorage
  useEffect(() => {
    localStorage.setItem("quotation_table_settings", JSON.stringify(columns));
  }, [columns]);

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


  //Quotation Sales Return
  const QuotationSalesReturnCreateRef = useRef();
  function openQuotationSalesReturnCreateForm(id) {
    QuotationSalesReturnCreateRef.current.open(undefined, id);
  }

  let [showQuotationSalesReturns, setShowQuotationSalesReturns] = useState(false);
  function openQuotationSalesReturnsDialogue(quotation) {
    setSelectedQuotation(quotation);
    showQuotationSalesReturns = true;
    setShowQuotationSalesReturns(true);
  }

  function handleQuotationSalesReturnsClose() {
    showQuotationSalesReturns = false;
    setShowQuotationSalesReturns(false);
  }

  const QuotationSalesReturnListRef = useRef();

  return (
    <>

      <Modal show={showQuotationSalesReturns} size="lg" onHide={handleQuotationSalesReturnsClose} animation={false} scrollable={true}>
        <Modal.Header>
          <Modal.Title>Qtn. Sales Returns of Qtn. Sale Order #{selectedQuotation?.code}</Modal.Title>

          <div className="col align-self-end text-end">
            <button
              type="button"
              className="btn-close"
              onClick={handleQuotationSalesReturnsClose}
              aria-label="Close"
            ></button>

          </div>
        </Modal.Header>
        <Modal.Body>
          <QuotationSalesReturnIndex ref={QuotationSalesReturnListRef} showToastMessage={props.showToastMessage} order={selectedQuotation} refreshSalesList={list} />
        </Modal.Body>
      </Modal>

      <QuotationSalesReturnCreate ref={QuotationSalesReturnCreateRef} showToastMessage={props.showToastMessage} refreshSalesList={list} />

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
            Quotation Settings
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

      <OrderPrint ref={PrintRef} />
      {showOrderPreview && <OrderPreview ref={PreviewRef} />}
      <Modal show={showPrintTypeSelection} onHide={() => {
        showPrintTypeSelection = false;
        setShowPrintTypeSelection(showPrintTypeSelection);
      }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Print Type</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex justify-content-around">
          <Button variant="secondary" ref={printButtonRef} onClick={() => {
            openPrint(selectedQuotation);
          }} onKeyDown={(e) => {
            if (timerRef.current) clearTimeout(timerRef.current);

            if (e.key === "ArrowRight") {
              timerRef.current = setTimeout(() => {
                printA4ButtonRef.current.focus();
              }, 100);
            }
          }}>
            <i className="bi bi-printer"></i> Print
          </Button>

          <Button variant="primary" ref={printA4ButtonRef} onClick={() => {
            openPreview(selectedQuotation);
          }}
            onKeyDown={(e) => {
              if (timerRef.current) clearTimeout(timerRef.current);

              if (e.key === "ArrowLeft") {
                timerRef.current = setTimeout(() => {
                  printButtonRef.current.focus();
                }, 100);
              }
            }}
          >
            <i className="bi bi-printer"></i> Print A4 Invoice
          </Button>
        </Modal.Body>
      </Modal>
      <OrderCreate ref={SalesUpdateFormRef} />
      <ReportPreview ref={ReportPreviewRef} searchParams={searchParams} sortOrder={sortOrder} sortField={sortField} />
      <QuotationCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
      <QuotationView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />
      <div className="container-fluid p-0">
        <div className="row">

          <div className="col">
            <span className="text-end">
              <StatsSummary
                title="Quotation"
                stats={{
                  "Quotation": totalQuotation,
                  "Profit": profit,
                  "Profit %": profit && totalQuotation ? (profit / totalQuotation) * 100 : "",
                  "Loss": loss,
                }}
                onToggle={handleSummaryToggle}
              />
            </span>
            <span className="text-end">
              <StatsSummary
                title="Qtn. Sales"
                stats={{
                  "Sales": invoiceTotalSales,
                  "Cash Sales": invoiceTotalCashSales,
                  "Credit Sales": invoiceTotalUnPaidSales,
                  "Bank Account Sales": invoiceTotalBankAccountSales,
                  "Cash Discount": invoiceTotalCashDiscount,
                  "VAT Collected": invoiceVatPrice,
                  "Net Profit %": invoiceNetProfit && invoiceTotalSales ? ((invoiceNetProfit / invoiceTotalSales) * 100) : "",
                  "Paid Sales": invoiceTotalPaidSales,
                  "Sales Discount": invoiceTotalDiscount,
                  "Shipping/Handling fees": invoiceTotalShippingHandlingFees,
                  "Net Profit": invoiceNetProfit,
                  "Net Loss": invoiceLoss,
                }}

                onToggle={handleSummaryToggle}
              />
            </span>

          </div>

          {/*<div className="col">

          </div>*/}

        </div>

        <div className="row">
          <div className="col">
            <h1 className="h3">Quotations</h1>
          </div>

          <div className="col text-end">
            <Button variant="primary" onClick={() => {
              openReportPreview("quotation_invoice_report");
            }} style={{ marginRight: "8px" }} className="btn btn-primary mb-3">
              <i className="bi bi-printer"></i>&nbsp;
              Print Sales Report
            </Button>

            <Button variant="primary" onClick={() => {
              openReportPreview("quotation_report");
            }} style={{ marginRight: "8px" }} className="btn btn-primary mb-3">
              <i className="bi bi-printer"></i>&nbsp;
              Print Quotation Report
            </Button>

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
                      <p className="text-start">No Quotations to display</p>
                    </div>
                  )}
                </div>
                <div className="row" style={{ border: "solid 0px" }}>
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
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
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
                            border: "solid 1px",
                            borderColor: "silver",
                            width: "55px",
                          }}
                        >
                          <option value="5">
                            5
                          </option>
                          <option value="10">
                            10
                          </option>
                          <option value="20">20</option>
                          <option value="40">40</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>

                <br />
                <div className="row">
                  <div className="col" style={{ border: "solid 0px" }}>
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
                <div className="table-responsive" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}>
                  <table className="table table-striped table-sm table-bordered">
                    <thead>
                      <tr className="text-center">
                        {columns.filter(c => c.visible).map((col) => {
                          return (<>
                            {col.key === "actions" && <th key={col.key}>{col.label}</th>}
                            {col.key === "zatca.reporting_passed" && store.zatca?.phase === "2" && store.zatca?.connected && <th>
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
                                {sortField === col.fieldName && sortOrder === "-" ? (
                                  <i className="bi bi-sort-alpha-up-alt"></i>
                                ) : null}
                                {sortField === col.fieldName && sortOrder === "" ? (
                                  <i className="bi bi-sort-alpha-up"></i>
                                ) : null}
                              </b>
                            </th>}
                            {col.key !== "actions" && col.key !== "zatca.reporting_passed" && <th>
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
                                {sortField === col.fieldName && sortOrder === "-" ? (
                                  <i className="bi bi-sort-alpha-up-alt"></i>
                                ) : null}
                                {sortField === col.fieldName && sortOrder === "" ? (
                                  <i className="bi bi-sort-alpha-up"></i>
                                ) : null}
                              </b>
                            </th>}
                          </>);
                        })}
                      </tr>
                      <tr className="text-center sub-header">
                        {columns.filter(c => c.visible).map((col) => {
                          return (<>
                            {(col.key === "actions" || col.key === "actions_end") && <th></th>}
                            {col.key !== "actions" &&
                              col.key !== "date" &&
                              col.key !== "reported_to_zatca" &&
                              col.key !== "payment_status" &&
                              col.key !== "payment_methods" &&
                              col.key !== "created_by" &&
                              col.key !== "created_at" &&
                              col.key !== "actions_end" &&
                              col.key !== "customer" &&
                              col.key !== "type" &&
                              col.key !== "status" &&
                              <th><input
                                type="text"
                                id={"quotation_" + col.fieldName}
                                name={"quotation_" + col.fieldName}
                                onChange={(e) =>
                                  searchByFieldValue(col.fieldName, e.target.value)
                                }
                                className="form-control"
                              /></th>}
                            {col.key === "status" && <th>
                              <Typeahead
                                id="status"
                                labelKey="name"

                                onChange={(selectedItems) => {
                                  searchByMultipleValuesField(
                                    "status",
                                    selectedItems
                                  );
                                }}
                                options={statusOptions}
                                placeholder="Select Status"
                                selected={selectedStatusList}
                                highlightOnlyResult={true}
                                multiple
                              />
                            </th>}

                            {col.key === "type" && <th>
                              <select
                                onChange={(e) => {
                                  searchByFieldValue("type", e.target.value);

                                }}
                              >
                                <option value="" >All</option>
                                <option value="quotation" >Quotation</option>
                                <option value="invoice">Invoice</option>
                              </select>
                            </th>}
                            {col.key === "payment_methods" && <th>
                              <Typeahead
                                id="payment_methods"

                                labelKey="name"
                                onChange={(selectedItems) => {
                                  searchByMultipleValuesField(
                                    "payment_methods",
                                    selectedItems
                                  );
                                }}
                                options={paymentMethodOptions}
                                placeholder="Select payment methods"
                                selected={selectedPaymentMethodList}
                                highlightOnlyResult={true}
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
                            {col.key === "payment_status" && <th>
                              <Typeahead
                                id="payment_status"
                                labelKey="name"
                                onChange={(selectedItems) => {
                                  searchByMultipleValuesField(
                                    "payment_status",
                                    selectedItems
                                  );
                                }}
                                options={paymentStatusOptions}
                                placeholder="Select Payment Status"
                                selected={selectedPaymentStatusList}
                                highlightOnlyResult={true}
                                multiple
                              />
                            </th>}
                            {col.key === "reported_to_zatca" && store.zatca?.phase === "2" && store.zatca?.connected && <th>
                              <select
                                onChange={(e) => {
                                  searchByFieldValue("reported_to_zatca", e.target.value);
                                }}
                              >
                                <option value="" SELECTED>ALL</option>
                                <option value="1">REPORTED</option>
                                <option value="0">NOT REPORTED</option>
                              </select>
                            </th>}
                            {col.key === "customer" && <th>
                              <Typeahead
                                id="customer_id"
                                filterBy={['additional_keywords']}
                                labelKey="search_label"
                                style={{ minWidth: "300px" }}
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
                                onInputChange={(searchTerm, e) => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    suggestCustomers(searchTerm);
                                  }, 100);
                                }}
                                ref={customerSearchRef}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setCustomerOptions([]);
                                    customerSearchRef.current?.clear();
                                  }
                                }}
                                multiple
                              />
                            </th>}
                            {col.key === "date" && <th>
                              <div id="calendar-portal" className="date-picker " style={{ minWidth: "125px" }}>
                                <DatePicker
                                  id="date_str"
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
                            </th>}
                          </>);
                        })}

                        {/*<th>Actions</th>
                        <th>
                          <b
                            style={{
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              sort("code");
                            }}
                          >
                            ID
                            {sortField === "code" && sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "code" && sortOrder === "" ? (
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
                              sort("date");
                            }}
                          >
                            Date
                            {sortField === "date" && sortOrder === "-" ? (
                              <i className="bi bi-sort-down"></i>
                            ) : null}
                            {sortField === "date" && sortOrder === "" ? (
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
                              sort("customer_name");
                            }}
                          >
                            Customer
                            {sortField === "customer_name" &&
                              sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "customer_name" && sortOrder === "" ? (
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
                              sort("net_total");
                            }}
                          >
                            Net Total
                            {sortField === "net_total" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "net_total" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                              sort("total_payment_received");
                            }}
                          >
                            Amount Paid
                            {sortField === "total_payment_received" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "total_payment_received" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                              sort("balance_amount");
                            }}
                          >
                            Credit Balance
                            {sortField === "balance_amount" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "balance_amount" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
                            ) : null}
                          </b>
                        </th>

                        {store.zatca?.phase === "2" && store.zatca?.connected ? <th>
                          <b
                            style={{
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              sort("reported_to_zatca");
                            }}
                          >
                            Reported to Zatca
                            {sortField === "reported_to_zatca" && sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "reported_to_zatca" && sortOrder === "" ? (
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
                              sort("type");
                            }}
                          >
                            Type
                            {sortField === "type" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "type" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                            Sales ID
                            {sortField === "order_code" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "order_code" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                              sort("payment_status");
                            }}
                          >
                            Payment Status
                            {sortField === "payment_status" && sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "payment_status" && sortOrder === "" ? (
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
                              sort("payment_methods");
                            }}
                          >
                            Payment Methods
                            {sortField === "payment_methods" && sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "payment_methods" && sortOrder === "" ? (
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
                              sort("cash_discount");
                            }}
                          >
                            Cash Discount
                            {sortField === "cash_discount" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "cash_discount" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                            {sortField === "discount" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "discount" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                            Expected Profit
                            {sortField === "profit" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "profit" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                            Expected Loss
                            {sortField === "loss" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "loss" && sortOrder === "" ? (
                              <i className="bi bi-sort-numeric-up"></i>
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
                              sort("created_by");
                            }}
                          >
                            Created By
                            {sortField === "created_by" && sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "created_by" && sortOrder === "" ? (
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
                              sort("status");
                            }}
                          >
                            Status
                            {sortField === "status" && sortOrder === "-" ? (
                              <i className="bi bi-sort-alpha-up-alt"></i>
                            ) : null}
                            {sortField === "status" && sortOrder === "" ? (
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
                            {sortField === "created_at" && sortOrder === "-" ? (
                              <i className="bi bi-sort-down"></i>
                            ) : null}
                            {sortField === "created_at" && sortOrder === "" ? (
                              <i className="bi bi-sort-up"></i>
                            ) : null}
                          </b>
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <thead>
                      <tr className="text-center">
                        <th></th>
                        <th>
                          <input
                            type="text"
                            id="code"
                            onChange={(e) =>
                              searchByFieldValue("code", e.target.value)
                            }
                            className="form-control"
                          />
                        </th>
                        <th>
                          <DatePicker
                            id="date_str"
                            value={dateValue}
                            selected={selectedDate}
                            className="form-control"
                            dateFormat="MMM dd yyyy"
                            onChange={(date) => {
                              if (!date) {
                                setDateValue("");
                                searchByDateField("date_str", "");
                                return;
                              }
                              searchByDateField("date_str", date);
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
                                id="from_date"
                                value={fromDateValue}
                                selected={selectedDate}
                                className="form-control"
                                dateFormat="MMM dd yyyy"
                                onChange={(date) => {
                                  if (!date) {
                                    setFromDateValue("");
                                    searchByDateField("from_date", "");
                                    return;
                                  }
                                  searchByDateField("from_date", date);
                                }}
                              />
                              To:{" "}
                              <DatePicker
                                id="to_date"
                                value={toDateValue}
                                selected={selectedDate}
                                className="form-control"
                                dateFormat="MMM dd yyyy"
                                onChange={(date) => {
                                  if (!date) {
                                    setToDateValue("");
                                    searchByDateField("to_date", "");
                                    return;
                                  }
                                  searchByDateField("to_date", date);
                                }}
                              />
                            </span>
                          ) : null}
                        </th>
                        <th>
                          <Typeahead
                            id="customer_id"
                            filterBy={['additional_keywords']}
                            labelKey="search_label"
                            style={{ minWidth: "300px" }}
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
                            onInputChange={(searchTerm, e) => {
                              if (timerRef.current) clearTimeout(timerRef.current);
                              timerRef.current = setTimeout(() => {
                                suggestCustomers(searchTerm);
                              }, 100);
                            }}
                            ref={customerSearchRef}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setCustomerOptions([]);
                                customerSearchRef.current?.clear();
                              }
                            }}
                            multiple
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            id="net_total"
                            onChange={(e) =>
                              searchByFieldValue("net_total", e.target.value)
                            }
                            className="form-control"
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            id="sales_total_payment_received"
                            name="sales_total_payment_received"
                            onChange={(e) =>
                              searchByFieldValue("total_payment_received", e.target.value)
                            }
                            className="form-control"
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            id="sales_balance_amount"
                            name="sales_balance_amount"
                            onChange={(e) =>
                              searchByFieldValue("balance_amount", e.target.value)
                            }
                            className="form-control"
                          />
                        </th>

                        {store.zatca?.phase === "2" && store.zatca?.connected ? <th>
                          <select
                            onChange={(e) => {
                              searchByFieldValue("reported_to_zatca", e.target.value);
                            }}
                          >
                            <option value="" SELECTED>ALL</option>
                            <option value="1">REPORTED</option>
                            <option value="0">NOT REPORTED</option>
                          </select>
                        </th> : ""}
                        <th>
                          <select
                            onChange={(e) => {
                              searchByFieldValue("type", e.target.value);

                            }}
                          >
                            <option value="" >All</option>
                            <option value="quotation" >Quotation</option>
                            <option value="invoice">Invoice</option>
                          </select>
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
                            id="payment_status"

                            labelKey="name"
                            onChange={(selectedItems) => {
                              searchByMultipleValuesField(
                                "payment_status",
                                selectedItems
                              );
                            }}
                            options={paymentStatusOptions}
                            placeholder="Select Payment Status"
                            selected={selectedPaymentStatusList}
                            highlightOnlyResult={true}
                            multiple
                          />
                        </th>
                        <th>
                          <Typeahead
                            id="payment_methods"

                            labelKey="name"
                            onChange={(selectedItems) => {
                              searchByMultipleValuesField(
                                "payment_methods",
                                selectedItems
                              );
                            }}
                            options={paymentMethodOptions}
                            placeholder="Select payment methods"
                            selected={selectedPaymentMethodList}
                            highlightOnlyResult={true}
                            multiple
                          />
                        </th>

                        <th>
                          <input
                            type="text"
                            id="sales_cash_discount"
                            name="sales_cash_discount"
                            onChange={(e) =>
                              searchByFieldValue("cash_discount", e.target.value)
                            }
                            className="form-control"
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            id="sales_discount"
                            name="sales_discount"
                            onChange={(e) =>
                              searchByFieldValue("discount", e.target.value)
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
                            options={userOptions}
                            placeholder="Select Users"
                            selected={selectedCreatedByUsers}
                            highlightOnlyResult={true}
                            onInputChange={(searchTerm, e) => {
                              suggestUsers(searchTerm);
                            }}
                            multiple
                          />
                        </th>

                        <th>
                          <Typeahead
                            id="status"
                            labelKey="name"

                            onChange={(selectedItems) => {
                              searchByMultipleValuesField(
                                "status",
                                selectedItems
                              );
                            }}
                            options={statusOptions}
                            placeholder="Select Status"
                            selected={selectedStatusList}
                            highlightOnlyResult={true}
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
                                    setCreatedAtToValue("");
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
                      {quotationList &&
                        quotationList.map((quotation) => (
                          <tr key={quotation.code}>
                            {columns.filter(c => c.visible).map((col) => {
                              return (<>
                                {(col.key === "actions" || col.key === "actions_end") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Button className="btn btn-light btn-sm" onClick={() => {
                                    openUpdateForm(quotation.id);
                                  }}>
                                    <i className="bi bi-pencil"></i>
                                  </Button>&nbsp;
                                  <Button className="btn btn-primary btn-sm" onClick={() => {
                                    openDetailsView(quotation.id);
                                  }}>
                                    <i className="bi bi-eye"></i>
                                  </Button>&nbsp;
                                  <Button className="btn btn-primary btn-sm" onClick={() => {
                                    openPrintTypeSelection(quotation);
                                  }}>
                                    <i className="bi bi-printer"></i>
                                  </Button>
                                  &nbsp;
                                  <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                    sendWhatsAppMessage(quotation);
                                  }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                      <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                    </svg>
                                  </Button>
                                  &nbsp;
                                  <Button
                                    disabled={quotation.type === "quotation"}
                                    className="btn btn-dark btn-sm"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="top"
                                    title="Create Sales Return"
                                    onClick={() => {
                                      openQuotationSalesReturnCreateForm(quotation.id);
                                    }}
                                  >
                                    <i className="bi bi-arrow-left"></i> Return
                                  </Button>
                                </td>}
                                {(col.fieldName === "code") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.code}
                                </td>}
                                {(col.fieldName === "order_code") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.order_code && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                    openSalesUpdateForm(quotation.order_id);
                                  }}>{quotation.order_code}</span>}
                                </td>}
                                {(col.fieldName === "date" || col.fieldName === "created_at") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {format(new Date(quotation[col.key]), "MMM dd yyyy h:mma")}
                                </td>}
                                {(col.fieldName === "customer_name") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <OverflowTooltip value={quotation.customer_name} />
                                </td>}
                                {(col.fieldName === "net_total") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Amount amount={trimTo2Decimals(quotation.net_total)} />
                                </td>}
                                {(col.fieldName === "total_payment_received") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Amount amount={trimTo2Decimals(quotation.total_payment_received)} />
                                </td>}
                                {(col.fieldName === "balance_amount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Amount amount={trimTo2Decimals(quotation.balance_amount)} />
                                </td>}
                                {(col.fieldName === "reported_to_zatca" && store.zatca?.phase === "2" && store.zatca?.connected) && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.type === "invoice" && <>
                                    {quotation.reported_to_zatca ? <span>&nbsp;<span className="badge bg-success">
                                      Reported
                                      {quotation.reported_to_zatca && quotation.reported_to_zatca_at ? <span>&nbsp;<TimeAgo date={quotation.reported_to_zatca_at} />&nbsp;</span> : ""}
                                      &nbsp;</span></span> : ""}
                                    {!quotation.reported_to_zatca ? <span className="badge bg-warning">
                                      Not Reported
                                      &nbsp;</span> : ""}
                                  </>}
                                </td>}
                                {(col.fieldName === "payment_status") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.payment_status === "paid" ?
                                    <span className="badge bg-success">
                                      Paid
                                    </span> : ""}
                                  {quotation.payment_status === "paid_partially" ?
                                    <span className="badge bg-warning">
                                      Paid Partially
                                    </span> : ""}
                                  {quotation.payment_status === "not_paid" ?
                                    <span className="badge bg-danger">
                                      Not Paid
                                    </span> : ""}
                                </td>}
                                {(col.fieldName === "payment_methods") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.payment_methods &&
                                    quotation.payment_methods.map((name) => (
                                      <span className="badge bg-info">{name}</span>
                                    ))}
                                </td>}
                                {(col.fieldName === "status") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <span className="badge bg-success">
                                    {quotation.status}
                                  </span>
                                </td>}
                                {(col.fieldName === "type") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.type}
                                </td>}

                                {(col.fieldName === "cash_discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Amount amount={trimTo2Decimals(quotation.cash_discount)} />
                                </td>}
                                {(col.fieldName === "discount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {trimTo2Decimals(quotation.discount)}
                                </td>}
                                {(col.fieldName === "net_profit") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Amount amount={trimTo2Decimals(quotation.net_profit)} />
                                </td>}
                                {(col.fieldName === "net_loss") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Amount amount={trimTo2Decimals(quotation.net_loss)} />
                                </td>}
                                {(col.fieldName === "return_count") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Button variant="link" onClick={() => {
                                    openQuotationSalesReturnsDialogue(quotation);
                                  }}>
                                    {quotation.return_count}
                                  </Button>
                                </td>}
                                {(col.fieldName === "return_amount") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  <Button variant="link" onClick={() => {
                                    openQuotationSalesReturnsDialogue(quotation);
                                  }}>
                                    {quotation.return_amount}
                                  </Button>
                                </td>}
                                {(col.fieldName === "created_by") && <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                                  {quotation.created_by_name}
                                </td>}
                              </>)
                            })}

                            {/*<td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              <Button className="btn btn-light btn-sm" onClick={() => {
                                openUpdateForm(quotation.id);
                              }}>
                                <i className="bi bi-pencil"></i>
                              </Button>

                              <Button className="btn btn-primary btn-sm" onClick={() => {
                                openDetailsView(quotation.id);
                              }}>
                                <i className="bi bi-eye"></i>
                              </Button>
                              &nbsp;

                              <Button className="btn btn-primary btn-sm" onClick={() => {

                                openPrintTypeSelection(quotation);
                              }}>
                                <i className="bi bi-printer"></i>
                              </Button>
                              &nbsp;

                              <Button className={`btn btn-success btn-sm`} style={{}} onClick={() => {
                                sendWhatsAppMessage(quotation);
                              }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                                  <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                                </svg>
                              </Button>
                              &nbsp;

                            </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.code}</td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              {format(new Date(quotation.date), "MMM dd yyyy h:mma")}
                            </td>
                            <td className="text-start" style={{ width: "auto", whiteSpace: "nowrap" }} >
                              <OverflowTooltip value={quotation.customer_name} />
                            </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} > <Amount amount={quotation.net_total} /> </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              <Amount amount={trimTo2Decimals(quotation.total_payment_received)} />
                            </td>
                            <td><Amount amount={trimTo2Decimals(quotation.balance_amount)} /></td>

                            {store.zatca?.phase === "2" && store.zatca?.connected ? <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                              {quotation.type === "invoice" && <>
                                {quotation.reported_to_zatca ? <span>&nbsp;<span className="badge bg-success">
                                  Reported
                                  {quotation.reported_to_zatca && quotation.reported_to_zatca_at ? <span>&nbsp;<TimeAgo date={quotation.reported_to_zatca_at} />&nbsp;</span> : ""}
                                  &nbsp;</span></span> : ""}
                                {!quotation.reported_to_zatca ? <span className="badge bg-warning">
                                  Not Reported
                                  &nbsp;</span> : ""}
                              </>}
                            </td> : ""}
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >  {quotation.type}</td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              {quotation.order_code && <span style={{ cursor: "pointer", color: "blue" }} onClick={() => {
                                openSalesUpdateForm(quotation.order_id);
                              }}>{quotation.order_code}</span>}
                            </td>

                            <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                              {quotation.payment_status === "paid" ?
                                <span className="badge bg-success">
                                  Paid
                                </span> : ""}
                              {quotation.payment_status === "paid_partially" ?
                                <span className="badge bg-warning">
                                  Paid Partially
                                </span> : ""}
                              {quotation.payment_status === "not_paid" ?
                                <span className="badge bg-danger">
                                  Not Paid
                                </span> : ""}
                            </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }}>
                              {quotation.payment_methods &&
                                quotation.payment_methods.map((name) => (
                                  <span className="badge bg-info">{name}</span>
                                ))}
                            </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} ><Amount amount={trimTo2Decimals(quotation.cash_discount)} /> </td>
                            <td>{trimTo2Decimals(quotation.discount_with_vat)} </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.profit ? <Amount amount={trimTo2Decimals(quotation.profit)} /> : 0.00} </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.loss ? <Amount amount={trimTo2Decimals(quotation.loss)} /> : 0.00} </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >{quotation.created_by_name}</td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              <span className="badge bg-success">
                                {quotation.status}
                              </span>
                            </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              {format(
                                new Date(quotation.created_at),
                                "MMM dd yyyy h:mma"
                              )}
                            </td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                              <Button className="btn btn-light btn-sm" onClick={() => {
                                openUpdateForm(quotation.id);
                              }}>
                                <i className="bi bi-pencil"></i>
                              </Button>

                              <Button className="btn btn-primary btn-sm" onClick={() => {
                                openDetailsView(quotation.id);
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
        </div >
      </div >
    </>
  );
}

export default QuotationIndex;
