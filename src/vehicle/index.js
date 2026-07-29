import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import VehicleCreate from "./create.js";
import CustomerCreate from "../customer/create.js";
import VehicleView from "./view.js";
import RepairJobCreate from "../repair_job/create.js";
import QuotationType3Form from "../quotation/QuotationType3Form.js";
import OrderCreate from "../order/create.js";

import { Button, Spinner, Dropdown } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import OverflowTooltip from "../utils/OverflowTooltip.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import PaginationControls from '../utils/PaginationControls.js';
import { useTableSettings } from '../utils/useTableSettings.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';

const DEFAULT_COLUMNS = [
    { key: 'vehicle_number', label: 'Vehicle #',    fieldName: 'vehicle_number', visible: true },
    { key: 'brand_model',    label: 'Brand / Model', fieldName: 'brand_model',   visible: true },
    { key: 'year',           label: 'Year',          fieldName: 'year',          visible: false },
    { key: 'customer',       label: 'Customer',      fieldName: 'customer',      visible: true },
    { key: 'istimara_no',    label: 'Istimara No.',  fieldName: 'istimara_no',   visible: true },
    { key: 'chassis',        label: 'Chassis #',     fieldName: 'chassis',       visible: true },
    { key: 'km',             label: 'KM',            fieldName: 'km',            visible: true },
    { key: 'color',          label: 'Color',         fieldName: 'color',         visible: false },
    { key: 'created_at',     label: 'Created At',    fieldName: 'created_at',    visible: false },
    { key: 'actions',        label: 'Actions',       fieldName: 'actions',       visible: true },
];

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

    const { columns, showSettings, setShowSettings, handleToggleColumn, onDragEnd, restoreDefaults } = useTableSettings({
        storageKey: 'vehicle_table_settings',
        defaultColumns: DEFAULT_COLUMNS,
    });
    const colVisible = (key) => columns.find(c => c.key === key)?.visible;

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
    const CustomerCreateRef = useRef();
    const RepairJobCreateRef = useRef();
    const QuotationFormRef = useRef();
    const OrderCreateRef = useRef();

    function openUpdateForm(id) { CreateFormRef.current.open(id); }
    function openDetailsView(id, tab) { DetailsViewRef.current.open(id, tab); }
    function openDetailsViewOnTab(id, tab) { DetailsViewRef.current.open(id, tab); }
    function openCreateForm() { CreateFormRef.current.open(); }

    return (
        <>
            <TableSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                title={t('Table Settings')}
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onDragEnd={onDragEnd}
                onRestoreDefaults={restoreDefaults}
            />
            <VehicleCreate ref={CreateFormRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={openDetailsView} onOpenCustomerForm={(id, cb) => CustomerCreateRef.current?.open(id, cb)} />
            <CustomerCreate ref={CustomerCreateRef} refreshList={list} showToastMessage={props.showToastMessage} />
            <RepairJobCreate ref={RepairJobCreateRef} refreshList={() => {}} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
            <QuotationType3Form ref={QuotationFormRef} refreshList={() => {}} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
            <OrderCreate ref={OrderCreateRef} refreshList={() => {}} showToastMessage={props.showToastMessage} openDetailsView={() => {}} />
            <VehicleView
                ref={DetailsViewRef}
                openUpdateForm={openUpdateForm}
                openCreateForm={openCreateForm}
                onOpenSalesUpdate={(id) => OrderCreateRef.current?.open(id)}
                onOpenQuotationUpdate={(id) => QuotationFormRef.current?.open(id)}
                onOpenRepairJobUpdate={(id) => RepairJobCreateRef.current?.open(id)}
            />

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
                                    <Button variant="outline-secondary" size="sm" title={t('Column Settings')} onClick={() => setShowSettings(true)}>
                                        <i className="bi bi-gear"></i>
                                    </Button>
                                    <PaginationControls
                                        totalPages={totalPages} page={page} totalItems={totalItems} offset={offset}
                                        currentPageItemsCount={currentPageItemsCount} pageSize={pageSize}
                                        onPageChange={changePage} onPageSizeChange={changePageSize}
                                        pageSizes={[5, 10, 20, 40, 50, 100]}
                                    />
                                </div>
                                <div className="table-responsive" style={{ position: "relative", overflowX: "auto", overflowY: "auto", minHeight: "350px" }}>
                                    {isListLoading && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(255,255,255,0.5)" }}>
                                            <Spinner animation="grow" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                                        </div>
                                    )}
                                    <table className="table table-striped table-sm table-bordered">
                                        <thead>
                                            <tr className="text-center">
                                                {colVisible('vehicle_number') && <th key="vehicle_number"><b style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => sort("vehicle_number")}>{t('Vehicle #')}</b></th>}
                                                {colVisible('brand_model') && <th key="brand_model"><b>{t('Brand / Model')}</b></th>}
                                                {colVisible('year') && <th key="year" style={{ minWidth: '80px' }}><b>{t('Year')}</b></th>}
                                                {colVisible('customer') && <th key="customer"><b>{t('Customer')}</b></th>}
                                                {colVisible('istimara_no') && <th key="istimara_no"><b>{t('Istimara No.')}</b></th>}
                                                {colVisible('chassis') && <th key="chassis"><b>{t('Chassis #')}</b></th>}
                                                {colVisible('km') && <th key="km" style={{ minWidth: '120px' }}><b>{t('KM')}</b></th>}
                                                {colVisible('color') && <th key="color"><b>{t('Color')}</b></th>}
                                                {colVisible('created_at') && <th key="created_at"><b style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => sort("created_at")}>{t('Created At')}</b></th>}
                                                <th>{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <thead>
                                            <tr className="text-center">
                                                {colVisible('vehicle_number') && <th key="vehicle_number"><input type="text" onChange={(e) => searchByFieldValue("search", e.target.value)} className="form-control" placeholder={t('Search')} /></th>}
                                                {colVisible('brand_model') && <th key="brand_model"></th>}
                                                {colVisible('year') && <th key="year"></th>}
                                                {colVisible('customer') && (
                                                    <th key="customer">
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
                                                )}
                                                {colVisible('istimara_no') && <th key="istimara_no"></th>}
                                                {colVisible('chassis') && <th key="chassis"></th>}
                                                {colVisible('km') && <th key="km"></th>}
                                                {colVisible('color') && <th key="color"></th>}
                                                {colVisible('created_at') && <th key="created_at"></th>}
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {vehicleList && vehicleList.map((vehicle) => (
                                                <tr key={vehicle.id}>
                                                    {colVisible('vehicle_number') && <td key="vehicle_number" className="text-start" style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{vehicle.vehicle_number || '-'}</td>}
                                                    {colVisible('brand_model') && <td key="brand_model" style={{ whiteSpace: "nowrap" }}>{vehicle.brand} {vehicle.model}{vehicle.variant && <small className="text-muted d-block">{vehicle.variant}</small>}</td>}
                                                    {colVisible('year') && <td key="year" style={{ minWidth: '80px' }}>{vehicle.year || '-'}</td>}
                                                    {colVisible('customer') && (
                                                        <td key="customer" className="text-start" style={{ whiteSpace: "nowrap" }}>
                                                            {vehicle.customer_id ? (
                                                                <button type="button" onClick={() => CustomerCreateRef.current?.open(vehicle.customer_id)}
                                                                    style={{ background: "none", border: "none", padding: 0, color: "#004ac6", fontWeight: 500, cursor: "pointer", textDecoration: "underline", fontSize: "inherit", textAlign: "left" }}>
                                                                    <OverflowTooltip value={vehicle.customer_name || '-'} maxWidth={200} />
                                                                </button>
                                                            ) : (
                                                                <OverflowTooltip value={vehicle.customer_name || '-'} maxWidth={200} />
                                                            )}
                                                        </td>
                                                    )}
                                                    {colVisible('istimara_no') && <td key="istimara_no" style={{ whiteSpace: "nowrap" }}>{vehicle.istimara_no || '-'}</td>}
                                                    {colVisible('chassis') && <td key="chassis" style={{ whiteSpace: "nowrap" }}>{vehicle.chassis_number || '-'}</td>}
                                                    {colVisible('km') && <td key="km" style={{ minWidth: '120px' }}>{vehicle.current_km ? parseFloat(vehicle.current_km).toLocaleString() : '-'}</td>}
                                                    {colVisible('color') && <td key="color">{vehicle.color || '—'}</td>}
                                                    {colVisible('created_at') && <td key="created_at" style={{ whiteSpace: "nowrap" }}>{vehicle.created_at ? new Date(vehicle.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>}
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <Button className="btn btn-light btn-sm me-1" title={t('Edit')} onClick={() => openUpdateForm(vehicle.id)}>
                                                            <i className="bi bi-pencil"></i>
                                                        </Button>
                                                        <Button className="btn btn-primary btn-sm me-1" title={t('Details')} onClick={() => openDetailsView(vehicle.id)}>
                                                            <i className="bi bi-eye"></i>
                                                        </Button>
                                                        <Dropdown as="span" align="end">
                                                            <Dropdown.Toggle variant="outline-secondary" size="sm" id={`veh-hist-${vehicle.id}`} title={t('History')}>
                                                                <i className="bi bi-clock-history"></i>
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu style={{ minWidth: 200 }}>
                                                                <Dropdown.Item onClick={() => openDetailsViewOnTab(vehicle.id, 'repairs')}>
                                                                    <i className="bi bi-tools me-2 text-warning"></i>{t('Repair Jobs')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => openDetailsViewOnTab(vehicle.id, 'sales')}>
                                                                    <i className="bi bi-receipt me-2 text-success"></i>{t('Sales History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Item onClick={() => openDetailsViewOnTab(vehicle.id, 'quotations')}>
                                                                    <i className="bi bi-file-earmark-text me-2 text-info"></i>{t('Quotation History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => openDetailsViewOnTab(vehicle.id, 'trello')}>
                                                                    <i className="bi bi-kanban me-2" style={{ color: '#0052cc' }}></i>{t('Repair Job Board')}
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
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
