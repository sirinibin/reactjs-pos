import React, { useState, useEffect, useRef, useCallback } from "react";
import StoreCreate from "./create.js";
import ZatcaConnect from "./zatca_connect.js";
import StoreView from "./view.js";
import WhatsAppConnect from "./WhatsAppConnect.js";
import WhatsAppContactsModal from "./WhatsAppContactsModal.js";
import StoreBackup from "./StoreBackup.js";
import StoreDuplicate from "./StoreDuplicate.js";

import "react-datepicker/dist/react-datepicker.css";
import { Button, Spinner, Dropdown } from "react-bootstrap";
import ReactPaginate from "react-paginate";
//import { confirm } from 'react-bootstrap-confirmation';
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";
import OverflowTooltip from "../utils/OverflowTooltip.js";


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


function StoreIndex(props) {


    function selectStore(store) {
        localStorage.setItem("store_name", store.name);
        localStorage.setItem("branch_name", store.branch_name);
        localStorage.setItem("store_id", store.id);
        localStorage.setItem("store_country_code", store.country_code || '');
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
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let Select =
            "select=id,name,code,branch_name,country_code,created_by_name,created_at,vat_percent,zatca,phone,settings";

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
                loadContactCounts(data.result || []);

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
                Authorization: localStorage.getItem("access_token"),
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
                if(props.showToastMessage) props.showToastMessage("Store Disconnected from Zatca Successfully!", "success");
                list();
            })
            .catch((error) => {
                //setProcessing(false);
                console.log(error);
                //setErrors({ ...error });
                console.error("There was an error!", error);
                if(props.showToastMessage) props.showToastMessage("Error Connecting to Zatca!", "danger");
            });
    }
    */

    const ZatcaConnectFormRef = useRef();
    const WhatsAppConnectRef = useRef();

    function openWhatsAppConnect(store) {
        WhatsAppConnectRef.current.open(store);
    }

    const [disconnectingStoreId, setDisconnectingStoreId] = useState(null);
    const [syncingStoreId, setSyncingStoreId] = useState(null);
    const [clearingStoreId, setClearingStoreId] = useState(null);

    async function clearWhatsAppContacts(store) {
        if (!window.confirm(`Clear all synced WhatsApp contacts for "${store.name}"?\nYou can re-sync them anytime.`)) return;
        setClearingStoreId(store.id);
        try {
            const res = await fetch(`/v1/whatsapp/contacts?store_id=${store.id}`, {
                method: 'DELETE',
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                setContactCounts(prev => ({ ...prev, [store.id]: 0 }));
                if (props.showToastMessage) props.showToastMessage(`Cleared ${data.deleted} contacts from DB`, 'success');
            } else {
                if (props.showToastMessage) props.showToastMessage(data.error || 'Clear failed', 'danger');
            }
        } catch (e) {
            if (props.showToastMessage) props.showToastMessage('Clear failed: ' + e.message, 'danger');
        } finally {
            setClearingStoreId(null);
        }
    }
    const [contactCounts, setContactCounts] = useState({}); // storeId → count

    const WhatsAppContactsRef = useRef();

    // Fetch contacts counts for all connected stores
    const loadContactCounts = useCallback(async (stores) => {
        const connected = stores.filter(s => s.settings?.evolution_instance_name);
        if (!connected.length) return;
        const results = await Promise.allSettled(
            connected.map(s =>
                fetch(`/v1/whatsapp/contacts-count?store_id=${s.id}`, {
                    headers: { Authorization: localStorage.getItem('access_token') },
                }).then(r => r.json()).then(d => ({ id: s.id, count: d.count || 0 }))
            )
        );
        const counts = {};
        results.forEach(r => { if (r.status === 'fulfilled') counts[r.value.id] = r.value.count; });
        setContactCounts(counts);
    }, []);

    async function syncWhatsAppContacts(store) {
        setSyncingStoreId(store.id);
        try {
            const res = await fetch('/v1/whatsapp/sync-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                body: JSON.stringify({ store_id: store.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                setContactCounts(prev => ({ ...prev, [store.id]: data.count }));
                if (props.showToastMessage) props.showToastMessage(`Synced ${data.count} contacts`, 'success');
            } else {
                if (props.showToastMessage) props.showToastMessage(data.error || 'Sync failed', 'danger');
            }
        } catch (e) {
            if (props.showToastMessage) props.showToastMessage('Sync failed: ' + e.message, 'danger');
        } finally {
            setSyncingStoreId(null);
        }
    }

    async function disconnectWhatsApp(store) {
        if (!window.confirm(`Disconnect WhatsApp from "${store.name}"? This will delete the Evolution API instance.`)) return;
        setDisconnectingStoreId(store.id);
        try {
            const res = await fetch(`/v1/whatsapp/disconnect?store_id=${store.id}`, {
                method: 'DELETE',
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                if (props.showToastMessage) props.showToastMessage('WhatsApp disconnected successfully', 'success');
                list();
            } else {
                if (props.showToastMessage) props.showToastMessage(data.error || 'Disconnect failed', 'danger');
            }
        } catch (e) {
            if (props.showToastMessage) props.showToastMessage('Disconnect failed: ' + e.message, 'danger');
        } finally {
            setDisconnectingStoreId(null);
        }
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const CreateFormRef = useRef();
    function openCreateForm() {
        CreateFormRef.current.open();
    }

    const StoreBackupRef = useRef();
    function openBackup(store) {
        StoreBackupRef.current.open(store);
    }

    const StoreDuplicateRef = useRef();
    function openDuplicate(store) {
        StoreDuplicateRef.current.open(store);
    }



    return (
        <>
            <StoreCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <ZatcaConnect ref={ZatcaConnectFormRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <StoreView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />
            <WhatsAppConnect ref={WhatsAppConnectRef} showToastMessage={props.showToastMessage} onConnected={list} onDisconnected={list} />
            <WhatsAppContactsModal ref={WhatsAppContactsRef} showToastMessage={props.showToastMessage} />
            <StoreBackup ref={StoreBackupRef} />
            <StoreDuplicate ref={StoreDuplicateRef} onDuplicated={list} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col">
                        <h1 className="h3">Stores</h1>
                    </div>

                    {localStorage.getItem('user_role') === "Admin" ? <div className="col text-end">
                        <Button
                            hide={true.toString()}
                            variant="primary"
                            className="btn btn-primary mb-3"
                            onClick={openCreateForm}
                        >
                            <i className="bi bi-plus-lg"></i> Create
                        </Button>
                    </div> : ""}
                </div>


                {/*<div className="row">

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
                </div>*/}

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
                                        <div className="w-100" style={{ overflowX: "auto" }}>
                                            {totalPages ? <ReactPaginate
                                                breakLabel="..."
                                                nextLabel="next >"
                                                onPageChange={(event) => {
                                                    changePage(event.selected + 1);
                                                }}
                                                pageRangeDisplayed={3}
                                                marginPagesDisplayed={1}
                                                pageCount={totalPages}
                                                previousLabel="< prev"
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
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {localStorage.getItem('store_id') !== store.id ?
                                                                <Button className="btn btn-danger btn-sm" onClick={() => {
                                                                    selectStore(store);
                                                                }}>
                                                                    <i className="bi bi-select"></i>
                                                                    SELECT
                                                                </Button> : <span className="badge bg-success">SELECTED</span>}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            <OverflowTooltip value={store.name} maxWidth={300} />
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{store.code}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }}>{store.branch_name}</td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {store.zatca.phase === "1" ?
                                                                <span className="badge bg-warning">
                                                                    {"Phase 1"}
                                                                </span> : ""}

                                                            {store.zatca.phase === "2" && store.zatca.connected ?
                                                                <span>
                                                                    <span className="badge bg-success">
                                                                        {"Connected to Phase2 "}<TimeAgo date={store.zatca.last_connected_at} />
                                                                    </span> </span> : ""}
                                                            {store.zatca.phase === "2" && !store.zatca.connected ? <span><Button style={{ marginTop: "3px" }} className="btn btn-danger btn-sm" onClick={() => {
                                                                openZatcaConnectForm(store.id);
                                                            }}>
                                                                <i className="bi bi-power"></i>&nbsp;
                                                                Connect to Zatca
                                                            </Button></span> : ""}

                                                            {store.zatca.phase === "2" && store.zatca.connected ? <Button style={{ marginTop: "3px" }} className="btn btn btn-sm" onClick={() => {
                                                                openZatcaConnectForm(store.id);
                                                            }}>
                                                                <i className="fa fa-refresh"></i>
                                                            </Button> : ""}
                                                        </td>
                                                        <td style={{ width: "auto", whiteSpace: "nowrap" }} >
                                                            {/* Actions dropdown */}
                                                            <Dropdown className="d-inline-block me-1">
                                                                <Dropdown.Toggle variant="outline-secondary" size="sm" id={`actions-${store.id}`}>
                                                                    <i className="bi bi-three-dots-vertical"></i> Actions
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu>
                                                                    <Dropdown.Item onClick={() => openDetailsView(store.id)}>
                                                                        <i className="bi bi-eye me-2"></i>View
                                                                    </Dropdown.Item>
                                                                    {localStorage.getItem('user_role') === "Admin" && (
                                                                        <Dropdown.Item onClick={() => openUpdateForm(store.id)}>
                                                                            <i className="bi bi-pencil me-2"></i>Edit
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    {localStorage.getItem('user_role') === "Admin" && (
                                                                        <Dropdown.Item onClick={() => openDuplicate(store)}>
                                                                            <i className="bi bi-files me-2"></i>Duplicate
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    <Dropdown.Divider />
                                                                    <Dropdown.Item onClick={() => openBackup(store)}>
                                                                        <i className="bi bi-archive me-2"></i>Backup Data
                                                                    </Dropdown.Item>
                                                                </Dropdown.Menu>
                                                            </Dropdown>

                                                            {/* WhatsApp section (kept as inline badges/buttons due to status indicators) */}
                                                            {(localStorage.getItem('user_role') === "Admin" || store.settings?.use_whatsapp_api) && store.settings?.evolution_instance_name ? (
                                                                <>
                                                                    <span
                                                                        className="badge bg-success ms-1"
                                                                        style={{ fontSize: '0.75em', verticalAlign: 'middle', cursor: 'pointer' }}
                                                                        title={`Instance: ${store.settings.evolution_instance_name}`}
                                                                        onClick={() => WhatsAppContactsRef.current.open(store)}
                                                                    >
                                                                        <i className="bi bi-whatsapp me-1"></i>
                                                                        {contactCounts[store.id] != null
                                                                            ? `${contactCounts[store.id]} contacts`
                                                                            : 'Connected'
                                                                        }
                                                                    </span>

                                                                    <Button
                                                                        className="btn btn-outline-success btn-sm ms-1"
                                                                        title="View contacts"
                                                                        onClick={() => WhatsAppContactsRef.current.open(store)}
                                                                    >
                                                                        <i className="bi bi-people"></i>
                                                                    </Button>

                                                                    <Button
                                                                        className="btn btn-outline-primary btn-sm ms-1"
                                                                        title="Sync WhatsApp contacts now"
                                                                        disabled={syncingStoreId === store.id}
                                                                        onClick={() => syncWhatsAppContacts(store)}
                                                                    >
                                                                        {syncingStoreId === store.id
                                                                            ? <Spinner size="sm" animation="border" />
                                                                            : <i className="bi bi-arrow-clockwise"></i>
                                                                        }
                                                                    </Button>

                                                                    <Button
                                                                        className="btn btn-outline-warning btn-sm ms-1"
                                                                        title="Clear all synced contacts from DB"
                                                                        disabled={clearingStoreId === store.id}
                                                                        onClick={() => clearWhatsAppContacts(store)}
                                                                    >
                                                                        {clearingStoreId === store.id
                                                                            ? <Spinner size="sm" animation="border" />
                                                                            : <i className="bi bi-trash"></i>
                                                                        }
                                                                    </Button>

                                                                    <Button
                                                                        className="btn btn-danger btn-sm ms-1"
                                                                        title="Disconnect WhatsApp"
                                                                        disabled={disconnectingStoreId === store.id}
                                                                        onClick={() => disconnectWhatsApp(store)}
                                                                    >
                                                                        {disconnectingStoreId === store.id
                                                                            ? <Spinner size="sm" animation="border" />
                                                                            : <i className="bi bi-plug-fill"></i>
                                                                        }
                                                                    </Button>
                                                                </>
                                                            ) : (localStorage.getItem('user_role') === "Admin" || store.settings?.use_whatsapp_api) ? (
                                                                <Button
                                                                    className="btn btn-outline-success btn-sm ms-1"
                                                                    title="Connect WhatsApp"
                                                                    onClick={() => openWhatsAppConnect(store)}
                                                                >
                                                                    <i className="bi bi-whatsapp"></i>
                                                                </Button>
                                                            ) : null}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="w-100" style={{ overflowX: "auto" }}>
                                    {totalPages ? <ReactPaginate
                                        breakLabel="..."
                                        nextLabel="next >"
                                        onPageChange={(event) => {
                                            changePage(event.selected + 1);
                                        }}
                                        pageRangeDisplayed={3}
                                        marginPagesDisplayed={1}
                                        pageCount={totalPages}
                                        previousLabel="< prev"
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
            </div>
        </>
    );
}

export default StoreIndex;
