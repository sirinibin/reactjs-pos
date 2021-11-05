import React, { useState, useEffect } from "react";
import QuotationCreate from './create.js';
import QuotationView from './view.js';
import QuotationUpdate from './update.js';
import Cookies from 'universal-cookie';
import { Typeahead } from 'react-bootstrap-typeahead';


function QuotationIndex() {

    const cookies = new Cookies();

    const [errors, SetErrors] = useState({});
    const [isListLoading, SetListLoading] = useState(false);

    const [quotationList, SetQuotationList] = useState([]);
    //Customer Auto Suggestion
    const [customerOptions, SetCustomerOptions] = useState([]);
    const [selectedCustomers, SetSelectedCustomers] = useState([]);

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

    let [searchParams, SetSearchParams] = useState({});

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object).map(function (key) {
            return "search[" + key + "]" + '=' + object[key]
        }).join('&');
    }

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
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
        let result = await fetch('/v1/customer?' + Select + queryString, requestOptions);
        let data = await result.json();

        SetCustomerOptions(data.result);
    }



    function handleSearch(id, value) {
        console.log("Inside handle Submit");


        if (id === "customer_id") {
            searchParams[id] = Object.values(value).map(function (customer) {
                return customer.id;
            }).join(",");

        } else if (id === "status") {
            searchParams[id] = Object.values(value).map(function (status) {
                return status.id;
            }).join(",");
        } else if (id) {
            searchParams[id] = value;
        } else {
            return;
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

        let Select = "select=id,code,status,created_at,net_total,customer_id,customer.id,customer.name";

        fetch('/v1/quotation?' + Select + params, requestOptions)
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
                        <p className="text-end">page 1 of 10</p>

                        <table className="table table-striped table-sm table-bordered">
                            <thead>
                                <tr className="text-center">
                                    <th style={{ width: "10 %" }}>#</th>
                                    <th style={{ width: "16 %" }}>Date</th>
                                    <th style={{ width: "16 %" }}>Net Total</th>
                                    <th style={{ width: "40 %" }}>Customer</th>
                                    <th style={{ width: "6 %" }}>Status</th>
                                    <th style={{ width: "40 %" }}>Actions</th>
                                </tr>
                            </thead>

                            <thead>

                                <tr className="text-center">

                                    <th>
                                        <input type="text" id="code" onChange={(e) => handleSearch("code", e.target.value)} className="form-control" />
                                    </th>
                                    <th>
                                        <input type="text" id="created_at" onChange={(e) => handleSearch("created_at", e.target.value)} className="form-control" />
                                    </th>
                                    <th>
                                        <input type="text" id="net_total" onChange={(e) => handleSearch("net_total", e.target.value)} className="form-control" />
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
                                    <th></th>

                                </tr>

                            </thead>

                            <tbody className="text-center">
                                {
                                    quotationList && quotationList.map((quotation) =>
                                        < tr >
                                            <td>{quotation.code}</td>
                                            <td>{quotation.created_at}</td>
                                            <td>{quotation.net_total} SAR</td>
                                            <td>{quotation.customer.name}</td>
                                            <td>
                                                <span className="badge bg-success">{quotation.status}</span>
                                            </td>
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

                        <nav aria-label="Page navigation example">
                            <ul className="pagination">
                                <li className="page-item disabled">
                                    <a href="/" className="page-link"  >Previous</a>
                                </li>
                                <li className="page-item active">
                                    <a href="/" className="page-link"  >1</a>
                                </li>
                                <li className="page-item">
                                    <a href="/" className="page-link"  >2</a>
                                </li>
                                <li className="page-item">
                                    <a href="/" className="page-link"  >3</a>
                                </li>
                                <li className="page-item">
                                    <a href="/" className="page-link"  >Next</a>
                                </li>
                            </ul>
                        </nav>
                    </div >
                </div >
            </div >
        </div >
    </div >);
}

export default QuotationIndex;