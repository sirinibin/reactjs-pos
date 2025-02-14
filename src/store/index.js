import React, { useState, useEffect, useRef } from "react";
import StoreCreate from "./create.js";
import ZatcaConnect from "./zatca_connect.js";
import StoreView from "./view.js";
import Cookies from "universal-cookie";
import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
//import { confirm } from 'react-bootstrap-confirmation';
import { formatDistanceToNow } from "date-fns";

const TimeAgo = ({ datetime }) => {
    return <span>{formatDistanceToNow(new Date(datetime), { addSuffix: true })}</span>;
};

function StoreIndex(props) {
    const cookies = new Cookies();

    function selectStore(store) {
        cookies.set('store_name', store.name, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
        cookies.set('store_id', store.id, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
        cookies.set('vat_percent', store.vat_percent, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
        window.location = "/dashboard/stores";
    }

    function selectAllStore() {
        cookies.remove('store_name', { path: '/' });
        cookies.remove('store_id', { path: '/' });
        cookies.remove('vat_percent', { path: '/' });
        window.location = "/dashboard/stores";
    }


    //list
    const [storeList, setStoreList] = useState([]);

    //pagination
    let [pageSize, setPageSize] = useState(5);
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);




    //loader flag
    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);




    useEffect(() => {
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    //Search params
    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortStore, setSortStore] = useState("-");

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;

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
            "select=id,name,code,branch_name,created_by_name,created_at,vat_percent,zatca";

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") {
            queryParams = "&" + queryParams;
        }

        setIsListLoading(true);
        fetch(
            "/v1/store?" +
            Select +
            queryParams +
            "&sort=" +
            sortStore +
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
                setStoreList(data.result);

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
        sortStore = sortStore === "-" ? "" : "-";
        setSortStore(sortStore);
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

    function openUpdateForm(id) {
        CreateFormRef.current.open(id);
    }

    function openZatcaConnectForm(id) {
        ZatcaConnectFormRef.current.open(id);
    }

    /*

    const confirmZatcaDisconnection = async (id) => {
        console.log(id);
        const result = await confirm('Are you sure?');
        console.log(result);
        if (result) {
            disConnectFromZatca(id);
        }
    };

    function disConnectFromZatca(id) {
        console.log("Inside handle Connect");
        let endPoint = "/v1/store/zatca/disconnect";
        let method = "POST";

        let formData = {id:id};

        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("formData:", formData);

        //setProcessing(true);
        fetch(endPoint, requestOptions)
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = data && data.errors;
                    //const error = data.errors
                    return Promise.reject(error);
                }

                //setErrors({});
               // setProcessing(false);

                console.log("Response:");
                console.log(data);
                props.showToastMessage("Store Disconnected from Zatca Successfully!", "success");
                list();
            })
            .catch((error) => {
                //setProcessing(false);
                console.log(error);
                //setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Connecting to Zatca!", "danger");
            });
    }
    */

    const ZatcaConnectFormRef = useRef();

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
            <StoreCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <ZatcaConnect ref={ZatcaConnectFormRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <StoreView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Stores</h1>
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

                    <div className="col text-end">
                        <Button
                            hide={true.toString()}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={selectAllStore}
                        >
                             Select All Stores
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
                                            <p className="text-start">No Stores to display</p>
                                        </div>
                                    )}
                                </div>
                                <div className="row" style={{ bstore: "solid 0px" }}>
                                    <div className="col text-start" style={{ bstore: "solid 0px" }}>
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
                                                    animation="bstore"
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
                                                        bstore: "solid 1px",
                                                        bstoreColor: "silver",
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
                                    <div className="col" style={{ bstore: "solid 0px" }}>
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
                                <div className="table-responsive" style={{ overflowX: "auto" }}>
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                <th>Select</th>
                                                <th>
                                                    <b
                                                        style={{
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => {
                                                            sort("name");
                                                        }}
                                                    >
                                                        Name
                                                        {sortField === "name" && sortStore === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "name" && sortStore === "" ? (
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
                                                            sort("code");
                                                        }}
                                                    >
                                                        Branch Code
                                                        {sortField === "code" && sortStore === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "code" && sortStore === "" ? (
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
                                                            sort("branch_name");
                                                        }}
                                                    >
                                                        Branch Name
                                                        {sortField === "branch_name" && sortStore === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "branch_name" && sortStore === "" ? (
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
                                                            sort("zatca.phase");
                                                        }}
                                                    >
                                                        Zatca phase
                                                        {sortField === "zatca.phase" && sortStore === "-" ? (
                                                            <i className="bi bi-sort-alpha-up-alt"></i>
                                                        ) : null}
                                                        {sortField === "zatca.phase" && sortStore === "" ? (
                                                            <i className="bi bi-sort-alpha-up"></i>
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
                                                        id="name"
                                                        onChange={(e) =>
                                                            searchByFieldValue("name", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
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
                                                    <input
                                                        type="text"
                                                        id="branch_name"
                                                        onChange={(e) =>
                                                            searchByFieldValue("branch_name", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th>
                                                    <input
                                                        type="text"
                                                        id="phase"
                                                        onChange={(e) =>
                                                            searchByFieldValue("zatca.phase", e.target.value)
                                                        }
                                                        className="form-control"
                                                    />
                                                </th>
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-center">
                                            {storeList &&
                                                storeList.map((store) => (
                                                    <tr key={store.id}>
                                                        <td>
                                                            {cookies.get('store_id') !== store.id ?
                                                                <Button className="btn btn-danger btn-sm" onClick={() => {
                                                                    selectStore(store);
                                                                }}>
                                                                    <i className="bi bi-select"></i>
                                                                    SELECT
                                                                </Button> : <span className="badge bg-success">SELECTED</span>}
                                                        </td>
                                                        <td>{store.name}</td>
                                                        <td>{store.code}</td>
                                                        <td>{store.branch_name}</td>
                                                        <td>
                                                            {store.zatca.phase === "2" ?
                                                                <span className="badge bg-success">
                                                                    {"Phase " + store.zatca.phase}
                                                                </span> : <span className="badge bg-warning">
                                                                    {"Phase " + store.zatca.phase?store.zatca.phase:"1"}
                                                                </span>}
                                                            <br />
                                                            {store.zatca.phase === "2" && store.zatca.connected ?
                                                                <span className="badge bg-success">
                                                                    {"Connected"}


                                                                </span> : ""}
                                                            <br />
                                                            {store.zatca.phase === "2" && store.zatca.last_connected_at ? <TimeAgo datetime={store.zatca.last_connected_at} /> : ""}
                                                            <br />
                                                            {store.zatca.phase === "2" && !store.zatca.connected ? <Button style={{ marginTop: "3px" }} className="btn btn-danger btn-sm" onClick={() => {
                                                                openZatcaConnectForm(store.id);
                                                            }}>
                                                                <i className="bi bi-power"></i>&nbsp;
                                                                Connect to Zatca
                                                            </Button> : ""}

                                                            {store.zatca.phase === "2" && store.zatca.connected ? <Button style={{ marginTop: "3px" }} className="btn btn btn-sm" onClick={() => {
                                                                openZatcaConnectForm(store.id);
                                                            }}>
                                                                <i className="fa fa-refresh"></i>&nbsp;
                                                                Refresh Connection
                                                            </Button> : ""}



                                                            {/*store.zatca.phase === "2"&&store.zatca.connected ? <Button style={{marginTop:"3px"}} className="btn btn-danger btn-sm" onClick={() => {
                                                                confirmZatcaDisconnection(store.id);
                                                            }}>
                                                                <i className="bi bi-power"></i>&nbsp;
                                                                Disconnect from Zatca
                                                        </Button>:""*/}


                                                        </td>
                                                        <td>
                                                            <Button className="btn btn-light btn-sm" onClick={() => {
                                                                openUpdateForm(store.id);
                                                            }}>
                                                                <i className="bi bi-pencil"></i>
                                                            </Button>

                                                            <Button className="btn btn-primary btn-sm" onClick={() => {
                                                                openDetailsView(store.id);
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

export default StoreIndex;
