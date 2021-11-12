import React, { useState, useEffect } from "react";
import QuotationCreate from './create.js';
import QuotationView from './view.js';
import QuotationUpdate from './update.js';
import Cookies from 'universal-cookie';
import { Typeahead } from 'react-bootstrap-typeahead';
import { format } from 'date-fns';
import DatePicker from "react-datepicker";
import 'react-datepicker/dist/react-datepicker.css'
import Pagination from 'react-bootstrap/Pagination';
import ReactPaginate from 'react-paginate';


function QuotationIndex() {

    const cookies = new Cookies();

    //pagination
    const [pageSize, SetPageSize] = useState(10);
    let [page, SetPage] = useState(1);
    const [totalPages, SetTotalPages] = useState(0);
    const [totalItems, SetTotalItems] = useState(1);
    const [currentPageItemsCount, SetCurrentPageItemsCount] = useState(0);
    const [offset, SetOffset] = useState(0);
    const [paginationItemsContent, SetPaginationItemsContent] = useState([]);
    let [pageNumbers, SetPageNumbers] = useState([]);


    //Date filter
    const [showDateRange, SetShowDateRange,] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dateValue, SetDateValue] = useState("");
    const [fromDateValue, SetFromDateValue] = useState("");
    const [toDateValue, SetToDateValue] = useState("");

    //Created At filter
    const [showCreatedAtDateRange, SetShowCreatedAtDateRange,] = useState(false);
    const [createdAtValue, SetCreatedAtValue] = useState("");
    const [createdAtFromValue, SetCreatedAtFromValue] = useState("");
    const [createdAtToValue, SetCreatedAtToValue] = useState("");

    const [errors, SetErrors] = useState({});
    const [isListLoading, SetListLoading] = useState(false);

    const [quotationList, SetQuotationList] = useState([]);
    //Customer Auto Suggestion
    const [customerOptions, SetCustomerOptions] = useState([]);
    const [selectedCustomers, SetSelectedCustomers] = useState([]);

    //Created By User Auto Suggestion
    const [userOptions, SetUserOptions] = useState([]);
    const [selectedUsers, SetSelectedUsers] = useState([]);

    //Status Auto Suggestion
    const [statusOptions, SetStatusOptions] = useState([
        {
            "id": "sent",
            "name": "Sent"
        },
        {
            "id": "pending",
            "name": "Pending"
        },
        {
            "id": "accepted",
            "name": "Accepted"
        },
        {
            "id": "rejected",
            "name": "Rejected"
        },
        {
            "id": "cancelled",
            "name": "Cancelled"
        },
        {
            "id": "deleted",
            "name": "Deleted"
        },
    ]);
    const [selectedStatusList, SetSelectedStatusList] = useState([]);


    useEffect(() => {
        list();
    }, []);

    const [paginationItems, SetPaginationItems] = useState([]);


    /*
    useEffect(() => {
        console.log("inside use effect of paginationItems");
    }, [paginationItems]);
    */

    let [searchParams, SetSearchParams] = useState({});
    let [sortField, SetSortField] = useState("date");
    let [sortOrder, SetSortOrder] = useState("-");


    let active = 2;
    //let items = [];
    /*
    for (let number = 1; number <= totalPages; number++) {
        paginationItems.push(
            <Pagination.Item key={number} active={number === active}>
                {number}
            </Pagination.Item>,
        );
    }
    */


    function LoadPagination() {
        console.log("Inside load pagination");
        //SetPaginationItems([]);
        for (let number = 1; number <= totalPages; number++) {
            paginationItems.push(
                <Pagination.Item key={number} active={number === active}>
                    {number}
                </Pagination.Item>,
            );
        }

    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object).map(function (key) {
            return "search[" + key + "]" + '=' + object[key]
        }).join('&');
    }

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        let result = await fetch('/v1/customer?' + Select + queryString, requestOptions);
        let data = await result.json();

        SetCustomerOptions(data.result);
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        SetCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        let Select = "select=id,name";
        let result = await fetch('/v1/user?' + Select + queryString, requestOptions);
        let data = await result.json();

        SetUserOptions(data.result);
    }



    function handleSearch(id, value) {
        console.log("Inside handle Submit");


        if (id === "customer_id") {
            searchParams[id] = Object.values(value).map(function (customer) {
                return customer.id;
            }).join(",");

        } else if (id === "created_by") {
            searchParams[id] = Object.values(value).map(function (user) {
                return user.id;
            }).join(",");

        } else if (id === "status") {
            searchParams[id] = Object.values(value).map(function (status) {
                return status.id;
            }).join(",");
        } else if (id === "date_str") {
            value = format(new Date(value), 'MMM dd yyyy');
            SetDateValue(value);
            SetFromDateValue("");
            SetToDateValue("");
            searchParams["from_date"] = "";
            searchParams["to_date"] = "";
            searchParams[id] = value;
        } else if (id === "from_date") {
            value = format(new Date(value), 'MMM dd yyyy');
            SetFromDateValue(value);
            SetDateValue("");
            searchParams["date"] = "";
            searchParams[id] = value;
        } else if (id === "to_date") {
            value = format(new Date(value), 'MMM dd yyyy');
            SetToDateValue(value);
            SetDateValue("");
            searchParams["date"] = "";
            searchParams[id] = value;
        } else if (id === "created_at") {
            value = format(new Date(value), 'MMM dd yyyy');
            SetCreatedAtValue(value);
            SetCreatedAtFromValue("");
            SetCreatedAtToValue("");
            searchParams["created_at_from"] = "";
            searchParams["created_at_to"] = "";
            searchParams[id] = value;
        } else if (id === "created_at_from") {
            value = format(new Date(value), 'MMM dd yyyy');
            SetCreatedAtFromValue(value);
            SetCreatedAtValue("");
            searchParams["created_at"] = "";
            searchParams[id] = value;
        } else if (id === "created_at_to") {
            value = format(new Date(value), 'MMM dd yyyy');
            SetCreatedAtToValue(value);
            SetCreatedAtValue("");
            searchParams["created_at"] = "";
            searchParams[id] = value;
        } else if (id === "sort") {
            sortField = value;
            SetSortField(value);
            if (sortOrder === "-") {
                sortOrder = "";
                SetSortOrder("");
            } else {
                sortOrder = "-";
                SetSortOrder("-");
            }
        } else if (id === "page") {
            page = value;
            SetPage(page);
        } else if (id) {
            searchParams[id] = value;
        }

        var queryString = ObjectToSearchQueryParams(searchParams);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }


        list(queryString);
    }
    function list(params = "") {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },

        };

        SetListLoading(true);

        let Select = "select=id,code,date,net_total,created_by_name,customer_name,status,created_at";
        console.log("sortField:" + sortField);


        console.log("sortOrder:" + sortOrder);
        fetch('/v1/quotation?' + Select + params + "&sort=" + sortOrder + sortField + "&page=" + page + "&limit=" + pageSize, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                SetErrors({});

                SetListLoading(false);
                SetQuotationList(data.result);
                let pageCount = parseInt((data.total_count + pageSize - 1) / pageSize);

                SetTotalPages(pageCount);
                SetTotalItems(data.total_count);
                SetOffset(((page - 1) * pageSize));
                SetCurrentPageItemsCount(data.result.length);
            })
            .catch(error => {
                SetListLoading(false);
                SetErrors(error);
            });
    }


    return (<div className="container-fluid p-0">
        <div className="row">
            <div className="col">
                <h1 className="h3">Quotations</h1>
            </div>

            <div className="col text-end">
                <QuotationCreate showCreateButton={"true"} />
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
                            {totalItems == 0 &&
                                <div className="col">
                                    <p className="text-start">No Records to display</p>
                                </div>
                            }
                        </div>
                        <div className="row">
                            <div className="col text-start">
                                <button className="btn btn-primary" onClick={() => { handleSearch(); }}><i className="fa fa-refresh" ></i></button>
                            </div>
                        </div>
                        <ReactPaginate
                            breakLabel="..."
                            nextLabel="next >"
                            onPageChange={(event) => { handleSearch('page', (event.selected + 1)); }}
                            pageRangeDisplayed={5}
                            pageCount={totalPages}
                            previousLabel="< previous"
                            renderOnZeroPageCount={null}
                            className="pagination"
                            pageClassName="page-item"
                            pageLinkClassName="page-link"
                            activeClassName="active"
                            previousClassName="page-item"
                            nextClassName="page-item"
                            previousLinkClassName="page-link"
                            nextLinkClassName="page-link"
                        />
                        <div className="row">
                            {totalItems > 0 &&
                                <>

                                    <div className="col text-start">
                                        <p className="text-start">showing {offset + 1}-{offset + currentPageItemsCount} of {totalItems}</p>
                                    </div>

                                    <div className="col text-end">
                                        <p className="text-end">page {page} of {totalPages}</p>
                                    </div>
                                </>
                            }
                        </div>

                        <table className="table table-striped table-sm table-bordered">
                            <thead>
                                <tr className="text-center">
                                    <th >
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'code'); }}>
                                            ID
                                            {sortField == "code" && sortOrder == "-" ?
                                                <i class="bi bi-sort-alpha-up-alt"></i> : null
                                            }
                                            {sortField == "code" && sortOrder == "" ?
                                                <i class="bi bi-sort-alpha-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th >
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'date'); }}>
                                            Date
                                            {sortField == "date" && sortOrder == "-" ?
                                                <i class="bi bi-sort-down"></i> : null
                                            }
                                            {sortField == "date" && sortOrder == "" ?
                                                <i class="bi bi-sort-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th >
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'net_total'); }}>
                                            Net Total
                                            {sortField == "net_total" && sortOrder == "-" ?
                                                <i class="bi bi-sort-numeric-down"></i> : null
                                            }
                                            {sortField == "net_total" && sortOrder == "" ?
                                                <i class="bi bi-sort-numeric-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th >
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'created_by'); }}>
                                            Created By
                                            {sortField == "created_by" && sortOrder == "-" ?
                                                <i class="bi bi-sort-alpha-up-alt"></i> : null
                                            }
                                            {sortField == "created_by" && sortOrder == "" ?
                                                <i class="bi bi-sort-alpha-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th>
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'customer_name'); }}>
                                            Customer
                                            {sortField == "customer_name" && sortOrder == "-" ?
                                                <i class="bi bi-sort-alpha-up-alt"></i> : null
                                            }
                                            {sortField == "customer_name" && sortOrder == "" ?
                                                <i class="bi bi-sort-alpha-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th >
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'status'); }}>
                                            Status
                                            {sortField == "status" && sortOrder == "-" ?
                                                <i class="bi bi-sort-alpha-up-alt"></i> : null
                                            }
                                            {sortField == "status" && sortOrder == "" ?
                                                <i class="bi bi-sort-alpha-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th >
                                        <a style={{ "text-decoration": "underline" }} onClick={() => { handleSearch('sort', 'created_at'); }}>
                                            Created At
                                            {sortField == "created_at" && sortOrder == "-" ?
                                                <i class="bi bi-sort-down"></i> : null
                                            }
                                            {sortField == "created_at" && sortOrder == "" ?
                                                <i class="bi bi-sort-up"></i> : null
                                            }
                                        </a>
                                    </th>
                                    <th >Actions</th>
                                    {/*
                                    <th style={{ width: "2 %" }}>#</th>
                                    <th style={{ width: "16 %" }}>Date</th>
                                    <th style={{ width: "16 %" }}>Net Total</th>
                                    <th style={{ width: "40 %" }}>Created By</th>
                                    <th style={{ width: "40 %" }}>Customer</th>
                                    <th style={{ width: "6 %" }}>Status</th>
                                    <th style={{ width: "40 %" }}>Actions</th>
                                    */}
                                </tr>
                            </thead>

                            <thead>

                                <tr className="text-center">

                                    <th>
                                        <input type="text" id="code" onChange={(e) => handleSearch("code", e.target.value)} className="form-control" />
                                    </th>
                                    <th >
                                        <DatePicker id="date_str" value={dateValue} selected={selectedDate} className="form-control" dateFormat="MMM dd yyyy" onChange={(date) => handleSearch("date_str", date)} />
                                        <a style={{ color: "blue", "text-decoration": "underline" }} onClick={(e) => SetShowDateRange(!showDateRange)}>{showDateRange ? "Less.." : "More.."}</a><br />

                                        {showDateRange ?

                                            <span className="text-left">
                                                From: <DatePicker id="from_date" value={fromDateValue} selected={selectedDate} className="form-control" dateFormat="MMM dd yyyy" onChange={(date) => handleSearch("from_date", date)} />
                                               To: <DatePicker id="to_date" value={toDateValue} selected={selectedDate} className="form-control" dateFormat="MMM dd yyyy" onChange={(date) => handleSearch("to_date", date)} />
                                            </span>

                                            : null}


                                    </th>
                                    <th>
                                        <input type="text" id="net_total" onChange={(e) => handleSearch("net_total", e.target.value)} className="form-control" />
                                    </th>
                                    <th>
                                        <Typeahead
                                            id="created_by"
                                            labelKey="name"

                                            onChange={(selectedItems) => { SetSelectedUsers(selectedItems); handleSearch("created_by", selectedItems); }}
                                            options={userOptions}
                                            placeholder="Select Users"
                                            selected={selectedUsers}
                                            highlightOnlyResult="true"
                                            onInputChange={(searchTerm, e) => { suggestUsers(searchTerm); }}
                                            multiple
                                        />
                                    </th>
                                    <th>
                                        <Typeahead
                                            id="customer_id"
                                            labelKey="name"

                                            onChange={(selectedItems) => { SetSelectedCustomers(selectedItems); handleSearch("customer_id", selectedItems); }}
                                            options={customerOptions}
                                            placeholder="Select customers"
                                            selected={selectedCustomers}
                                            highlightOnlyResult="true"
                                            onInputChange={(searchTerm, e) => { suggestCustomers(searchTerm); }}
                                            multiple
                                        />
                                    </th>
                                    <th>
                                        <Typeahead
                                            id="status"
                                            labelKey="name"
                                            onChange={(selectedItems) => { SetSelectedStatusList(selectedItems); handleSearch("status", selectedItems); }}
                                            options={statusOptions}
                                            placeholder="Select Status"
                                            selected={selectedStatusList}
                                            highlightOnlyResult="true"
                                            multiple
                                        />
                                    </th>
                                    <th >
                                        <DatePicker id="created_at" value={createdAtValue} selected={selectedDate} className="form-control" dateFormat="MMM dd yyyy" onChange={(date) => handleSearch("created_at", date)} />
                                        <a style={{ color: "blue", "text-decoration": "underline" }} onClick={(e) => SetShowCreatedAtDateRange(!showCreatedAtDateRange)}>{showCreatedAtDateRange ? "Less.." : "More.."}</a><br />

                                        {showCreatedAtDateRange ?

                                            <span className="text-left">
                                                From: <DatePicker id="created_at_from" value={createdAtFromValue} selected={selectedDate} className="form-control" dateFormat="MMM dd yyyy" onChange={(date) => handleSearch("created_at_from", date)} />
                                               To: <DatePicker id="created_at_to" value={createdAtToValue} selected={selectedDate} className="form-control" dateFormat="MMM dd yyyy" onChange={(date) => handleSearch("created_at_to", date)} />
                                            </span>

                                            : null}


                                    </th>
                                    <th></th>

                                </tr>

                            </thead>

                            <tbody className="text-center">
                                {
                                    quotationList && quotationList.map((quotation) =>
                                        < tr >
                                            <td>{quotation.code}</td>
                                            <td>{format(new Date(quotation.date), 'MMM dd yyyy')}</td>
                                            <td>{quotation.net_total} SAR</td>
                                            <td>{quotation.created_by_name}</td>
                                            <td>{quotation.customer_name}</td>
                                            <td>
                                                <span className="badge bg-success">{quotation.status}</span>
                                            </td>
                                            <td>{format(new Date(quotation.created_at), 'MMM dd yyyy H:mma')}</td>
                                            <td>


                                                <QuotationUpdate showUpdateButton={"true"} />

                                                <QuotationView showViewButton={"true"} />

                                                <button
                                                    className="btn btn-default btn-sm"
                                                    data-bs-toggle="tooltip"
                                                    data-bs-placement="top"
                                                    title="Download"
                                                >
                                                    <i className="bi bi-download"></i>
                                                </button>

                                                <button
                                                    className="btn btn-outline-secondary dropdown-toggle"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-expanded="false"
                                                ></button>
                                                <ul className="dropdown-menu">
                                                    <li>
                                                        <a href="/" className="dropdown-item" >
                                                            <i className="bi bi-download"></i>
Download</a>

                                                    </li>
                                                    <li>
                                                        <a href="/" className="dropdown-item" >
                                                            <i className="bi bi-trash"></i>
Delete</a>

                                                    </li>
                                                </ul>
                                            </td>
                                        </tr>
                                    )
                                }
                            </tbody >
                        </table >

                        <ReactPaginate
                            breakLabel="..."
                            nextLabel="next >"
                            onPageChange={(event) => { handleSearch('page', (event.selected + 1)); }}
                            pageRangeDisplayed={5}
                            pageCount={totalPages}
                            previousLabel="< previous"
                            renderOnZeroPageCount={null}
                            className="pagination"
                            pageClassName="page-item"
                            pageLinkClassName="page-link"
                            activeClassName="active"
                            previousClassName="page-item"
                            nextClassName="page-item"
                            previousLinkClassName="page-link"
                            nextLinkClassName="page-link"
                        />
                    </div >
                </div >
            </div >
        </div >
    </div >);
}

export default QuotationIndex;