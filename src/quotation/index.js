import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import QuotationCreate from "./create.js";
import QuotationView from "./view.js";

import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";
import { WebSocketContext } from "./../utils/WebSocketContext.js";
import eventEmitter from "./../utils/eventEmitter";
import Preview from "./../order/preview.js"

function QuotationIndex(props) {
  const { lastMessage } = useContext(WebSocketContext);


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
  const selectedDate = new Date();
  let [dateValue, setDateValue] = useState("");
  let [fromDateValue, setFromDateValue] = useState("");
  let [toDateValue, setToDateValue] = useState("");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
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
      "select=id,type,payment_status,code,date,net_total,created_by_name,customer_name,status,created_at,profit,loss";
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

  const PreviewRef = useRef();
  function openPreview(model) {
    PreviewRef.current.open(model, undefined, "quotation");
  }


  function sendWhatsAppMessage(model) {
    PreviewRef.current.open(model, "whatsapp", "quotation");
  }

  return (
    <>
      <Preview ref={PreviewRef} />
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
          </div>

        </div>

        <div className="row">
          <div className="col">
            <h1 className="h3">Quotations</h1>
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
                        <th>Actions</th>
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
                              sort("payment_status");
                            }}
                          >
                            Payment status
                            {sortField === "payment_status" && sortOrder === "-" ? (
                              <i className="bi bi-sort-numeric-down"></i>
                            ) : null}
                            {sortField === "payment_status" && sortOrder === "" ? (
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
                            filterBy={() => true}
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
                              suggestCustomers(searchTerm);
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
                          <select
                            onChange={(e) => {
                              searchByFieldValue("payment_status", e.target.value);

                            }}
                          >
                            <option value="" >All</option>
                            <option value="credit" >Credit</option>
                            <option value="paid">Paid</option>
                          </select>
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
                            filterBy={() => true}
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
                            filterBy={() => true}
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
                        <th></th>
                      </tr>
                    </thead>

                    <tbody className="text-center">
                      {quotationList &&
                        quotationList.map((quotation) => (
                          <tr key={quotation.code}>
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
                              &nbsp;

                              <Button className="btn btn-primary btn-sm" onClick={() => {
                                openPreview(quotation);
                              }}>
                                <i className="bi bi-printer"></i>
                              </Button>
                              &nbsp;

                              <Button className={`btn ${!quotation.customer_name && !quotation.phone ? "btn-secondary" : "btn-success"} btn-sm`} disabled={!quotation.customer_name && !quotation.phone} style={{}} onClick={() => {
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
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >  {quotation.type}</td>
                            <td style={{ width: "auto", whiteSpace: "nowrap" }} >  {quotation.payment_status}</td>
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

export default QuotationIndex;
