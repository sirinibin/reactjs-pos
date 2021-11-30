import React, { useState, useEffect, useRef } from "react";
import ProductCreate from "./create.js";
import ProductView from "./view.js";
import ProductUpdate from "./update.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";

function ProductIndex(props) {

    const cookies = new Cookies();

    const selectedDate = new Date();

    //list
    const [productList, setProductList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
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
    const [productOptions, setProductOptions] = useState([]);
    const [selectedCreatedByProducts, setSelectedCreatedByProducts] = useState([]);

    //Created By Product Auto Suggestion
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [selectedProductCategories, setSelectedProductCategories] = useState([]);


    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortProduct, setSortProduct] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
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
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
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
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setProductOptions(data.result);
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;

        page = 1;
        setPage(page);
        list();
    }

    function searchByDateField(field, value) {
        value = format(new Date(value), "MMM dd yyyy");

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

    function searchByMultipleValuesField(field, values) {
        if (field === "created_by") {
            setSelectedCreatedByProducts(values);
        } else if (field === "category_id") {
            setSelectedProductCategories(values);
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

    function list() {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };
        let Select =
            "select=id,item_code,name,category_name,created_by_name,created_at";
        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

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

    const UpdateFormRef = useRef();
    function openUpdateForm(id) {
        UpdateFormRef.current.open(id);
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }



    return (
        <>
            <ProductCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <ProductUpdate ref={UpdateFormRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <ProductView ref={DetailsViewRef} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Products</h1>
                    </div>

                    <div className="col text-end">
                        <Button
                            hide={true}
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
                                            <p className="text-start">No Product Categories to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bproduct: "solid 0px" }}>
                                    <div className="col text-start" style={{ bproduct: "solid 0px" }}>
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
                                                        bproduct: "solid 1px",
                                                        bproductColor: "silver",
                                                        width: "55px",
                                                    }}
                                                >
                                                    <option value="5" selected>
                                                        5
                                                    </option>
                                                    <option value="10" selected>
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
                                    <div className="col" style={{ bproduct: "solid 0px" }}>
                                        <ReactPaginate
                                            breakLabel="..."
                                            nextLabel="next >"
                                            onPageChange={(event) => {
                                                changePage(event.selected + 1);
                                            }}
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
                                            forcePage={page - 1}
                                        />
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
                                <table className="table table-striped table-sm table-bproducted">
                                    <thead>
                                        <tr className="text-center">
                                            <th>
                                                <b
                                                    style={{
                                                        "text-decoration": "underline",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => {
                                                        sort("item_code");
                                                    }}
                                                >
                                                    Item Code
                                                    {sortField === "item_code" && sortProduct === "-" ? (
                                                        <i class="bi bi-sort-alpha-up-alt"></i>
                                                    ) : null}
                                                    {sortField === "item_code" && sortProduct === "" ? (
                                                        <i class="bi bi-sort-alpha-up"></i>
                                                    ) : null}
                                                </b>
                                            </th>
                                            <th>
                                                <b
                                                    style={{
                                                        "text-decoration": "underline",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => {
                                                        sort("name");
                                                    }}
                                                >
                                                    Name
                                                    {sortField === "name" && sortProduct === "-" ? (
                                                        <i class="bi bi-sort-alpha-up-alt"></i>
                                                    ) : null}
                                                    {sortField === "name" && sortProduct === "" ? (
                                                        <i class="bi bi-sort-alpha-up"></i>
                                                    ) : null}
                                                </b>
                                            </th>
                                            <th>
                                                <b
                                                    style={{
                                                        "text-decoration": "underline",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => {
                                                        sort("category_name");
                                                    }}
                                                >
                                                    Categories
                                                    {sortField === "category_name" && sortProduct === "-" ? (
                                                        <i class="bi bi-sort-alpha-up-alt"></i>
                                                    ) : null}
                                                    {sortField === "category_name" && sortProduct === "" ? (
                                                        <i class="bi bi-sort-alpha-up"></i>
                                                    ) : null}
                                                </b>
                                            </th>

                                            <th>
                                                <b
                                                    style={{
                                                        "text-decoration": "underline",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => {
                                                        sort("created_by_name");
                                                    }}
                                                >
                                                    Created By
                                                    {sortField === "created_by_name" && sortProduct === "-" ? (
                                                        <i class="bi bi-sort-alpha-up-alt"></i>
                                                    ) : null}
                                                    {sortField === "created_by_name" && sortProduct === "" ? (
                                                        <i class="bi bi-sort-alpha-up"></i>
                                                    ) : null}
                                                </b>
                                            </th>
                                            <th>
                                                <b
                                                    style={{
                                                        "text-decoration": "underline",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => {
                                                        sort("created_at");
                                                    }}
                                                >
                                                    Created At
                                                    {sortField === "created_at" && sortProduct === "-" ? (
                                                        <i class="bi bi-sort-down"></i>
                                                    ) : null}
                                                    {sortField === "created_at" && sortProduct === "" ? (
                                                        <i class="bi bi-sort-up"></i>
                                                    ) : null}
                                                </b>
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <thead>
                                        <tr className="text-center">
                                            <th>
                                                <input
                                                    type="text"
                                                    id="item_code"
                                                    onChange={(e) =>
                                                        searchByFieldValue("item_code", e.target.value)
                                                    }
                                                    className="form-control"
                                                />
                                            </th>
                                            <th>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    onChange={(e) =>
                                                        searchByFieldValue("name", e.target.value)
                                                    }
                                                    className="form-control"
                                                />
                                            </th>
                                            <th>
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
                                                    highlightOnlyResult="true"
                                                    onInputChange={(searchTerm, e) => {
                                                        suggestCategories(searchTerm);
                                                    }}
                                                    multiple
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
                                                    highlightOnlyResult="true"
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
                                                    onChange={(date) => {
                                                        searchByDateField("created_at", date);
                                                    }}
                                                />
                                                <small
                                                    style={{
                                                        color: "blue",
                                                        "text-decoration": "underline",
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
                                        {productList &&
                                            productList.map((product) => (
                                                <tr>
                                                    <td>{product.item_code}</td>
                                                    <td>{product.name}</td>
                                                    <td>
                                                        <ul>
                                                            {product.category_name &&
                                                                product.category_name.map((name) => (
                                                                    <li>{name}</li>
                                                                ))}
                                                        </ul>
                                                    </td>
                                                    <td>{product.created_by_name}</td>
                                                    <td>
                                                        {format(
                                                            new Date(product.created_at),
                                                            "MMM dd yyyy H:mma"
                                                        )}
                                                    </td>
                                                    <td>
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

                                                        {/*
                                                        <button
                                                            className="btn btn-outline-secondary dropdown-toggle"
                                                            type="button"
                                                            data-bs-toggle="dropdown"
                                                            aria-expanded="false"
                                                        ></button>
                                                        <ul className="dropdown-menu">
                                                            <li>
                                                                <a href="/" className="dropdown-item">
                                                                    <i className="bi bi-download"></i>
                                                                    Download
                                                                </a>
                                                            </li>
                                                        </ul>
                                                       */}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>

                                <ReactPaginate
                                    breakLabel="..."
                                    nextLabel="next >"
                                    onPageChange={(event) => {
                                        changePage(event.selected + 1);
                                    }}
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
                                    forcePage={page - 1}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ProductIndex;
