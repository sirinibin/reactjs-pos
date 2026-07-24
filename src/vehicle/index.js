import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import VehicleCreate from "./create.js";
import VehicleView from "./view.js";

import { Button, Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import PaginationControls from '../utils/PaginationControls.js';

function VehicleIndex(props) {
    const { t } = useTranslation('common');

    const [vehicleList, setVehicleList] = useState([]);

    let [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('vehicle_pageSize') || '10'));
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(1);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);

    const [isListLoading, setIsListLoading] = useState(false);
    const [isRefreshInProcess, setIsRefreshInProcess] = useState(false);

    const [searchParams, setSearchParams] = useState({});
    let [sortField, setSortField] = useState("created_at");
    let [sortDir, setSortDir] = useState("-");

    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const customerSearchRef = useRef();
    const timerRef = useRef();

    useEffect(() => {
        list();
        getStore(localStorage.getItem("store_id"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (error) { }
    }

    function searchByFieldValue(field, value) {
        searchParams[field] = value;
        page = 1;
        setPage(page);
        list();
    }

    function searchByCustomers(values) {
        setSelectedCustomers(values);
        searchParams["customer_id"] = values.map(c => c.id).join(",");
        page = 1;
        setPage(page);
        list();
    }

    async function suggestCustomers(searchTerm) {
        setCustomerOptions([]);
        if (!searchTerm) return;

        var params = { query: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }

        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };

        let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label,additional_keywords";
        let result = await fetch("/v1/customer?" + Select + queryString, requestOptions);
        let data = await result.json();
        setCustomerOptions(data.result || []);
    }

    function list() {
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        let Select = "select=id,customer_id,customer_name,vehicle_number,brand,model,variant,year,istimara_no,chassis_number,current_km,color,created_at";

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        const d = new Date();
        let diff = d.getTimezoneOffset();
        searchParams["timezone_offset"] = parseFloat(diff / 60);

        setSearchParams(searchParams);
        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") { queryParams = "&" + queryParams; }

        setIsListLoading(true);
        fetch("/v1/vehicle?" + Select + queryParams + "&sort=" + sortDir + sortField + "&page=" + page + "&limit=" + pageSize, requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setIsListLoading(false);
                setIsRefreshInProcess(false);
                setVehicleList(data.result);

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
        sortDir = sortDir === "-" ? "" : "-";
        setSortDir(sortDir);
        list();
    }

    function changePageSize(size) {
        pageSize = parseInt(size);
        localStorage.setItem('vehicle_pageSize', size);
        setPageSize(pageSize);
        list();
    }

    function changePage(newPage) {
        page = parseInt(newPage);
        setPage(page);
        list();
    }

    const DetailsViewRef = useRef();
    const CreateFormRef = useRef();

    function openUpdateForm(id) { CreateFormRef.current.open(id); }
    function openDetailsView(id) { DetailsViewRef.current.open(id); }
    function openCreateForm() { CreateFormRef.current.open(); }

    return (
        <>
            <VehicleCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} />
            <VehicleView ref={DetailsViewRef} openUpdateForm={openUpdateForm} openCreateForm={openCreateForm} />

            <div className="container-fluid p-0">
                <div className="row">
                    <div className="col"><h1 className="h3">{t('Vehicles')}</h1></div>
                    <div className="col text-end">
                        <Button variant="primary" className="btn btn-primary mb-1" onClick={openCreateForm}>
                            <i className="bi bi-plus-lg"></i> {t('Create')}
                        </Button>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body p-2">
                                <div className="row">
                                    {totalItems === 0 && (
                                        <div className="col"><p className="text-start">{t('No Vehicles to display')}</p></div>
                                    )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                                    <Button onClick={() => { setIsRefreshInProcess(true); list(); }} variant="primary" disabled={isRefreshInProcess}>
                                        {isRefreshInProcess ? (
                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        ) : (
                                            <i className="fa fa-refresh"></i>
                                        )}
                                    </Button>
                                    <PaginationControls
                                        totalPages={totalPages} page={page} totalItems={totalItems} offset={offset}
                                        currentPageItemsCount={currentPageItemsCount} pageSize={pageSize}
                                        onPageChange={changePage} onPageSizeChange={changePageSize}
                                        pageSizes={[5, 10, 20, 40, 50, 100]}
                                    />
                                </div>
                                <div className="table-responsive" style={{ position: "relative", overflowX: "auto", overflowY: "auto", minHeight: "200px" }}>
                                    {isListLoading && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.5)" }}>
                                            <Spinner animation="grow" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                                        </div>
                                    )}
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                <th><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("vehicle_number")}>{t('Vehicle #')}</b></th>
                                                <th><b>{t('Brand / Model')}</b></th>
                                                <th><b>{t('Year')}</b></th>
                                                <th><b>{t('Customer')}</b></th>
                                                <th><b>{t('Istimara No.')}</b></th>
                                                <th><b>{t('Chassis #')}</b></th>
                                                <th><b>{t('KM')}</b></th>
                                                <th>{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <thead>
                                            <tr className="text-center">
                                                <th><input type="text" onChange={(e) => searchByFieldValue("search", e.target.value)} className="form-control" placeholder={t('Search')} /></th>
                                                <th></th><th></th>
                                                <th>
                                                    <Typeahead
                                                        id="vehicle_customer_filter"
                                                        filterBy={['additional_keywords']}
                                                        labelKey="search_label"
                                                        style={{ minWidth: "220px" }}
                                                        onChange={(selectedItems) => searchByCustomers(selectedItems)}
                                                        options={customerOptions}
                                                        placeholder={t('Customer Name / Mob')}
                                                        selected={selectedCustomers}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm) => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => { suggestCustomers(searchTerm); }, 150);
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
                                                <th></th><th></th><th></th><th></th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {vehicleList && vehicleList.map((vehicle) => (
                                                <tr key={vehicle.id}>
                                                    <td className="text-start" style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                                                        {vehicle.vehicle_number || '-'}
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        {vehicle.brand} {vehicle.model}
                                                        {vehicle.variant && <small className="text-muted d-block">{vehicle.variant}</small>}
                                                    </td>
                                                    <td>{vehicle.year || '-'}</td>
                                                    <td className="text-start" style={{ whiteSpace: "nowrap" }}>
                                                        <OverflowTooltip value={vehicle.customer_name || '-'} maxWidth={200} />
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>{vehicle.istimara_no || '-'}</td>
                                                    <td style={{ whiteSpace: "nowrap" }}>{vehicle.chassis_number || '-'}</td>
                                                    <td>{vehicle.current_km ? parseFloat(vehicle.current_km).toLocaleString() : '-'}</td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <Button className="btn btn-light btn-sm me-1" onClick={() => openUpdateForm(vehicle.id)}>
                                                            <i className="bi bi-pencil"></i>
                                                        </Button>
                                                        <Button className="btn btn-primary btn-sm" onClick={() => openDetailsView(vehicle.id)}>
                                                            <i className="bi bi-eye"></i>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default VehicleIndex;
