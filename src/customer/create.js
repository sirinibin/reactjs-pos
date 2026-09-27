import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { enUS } from "date-fns/locale";
import { Modal, Button, Dropdown } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
import Quotations from "./../utils/quotations.js";
import Sales from "./../utils/sales.js";
import SalesReturns from "./../utils/salesReturn.js";
import QuotationSalesReturns from "./../utils/quotation_sales_returns.js";
import ImageGallery from '../utils/ImageGallery.js';
import VehicleCreate from "../vehicle/create.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';
import { useTranslation } from "react-i18next";

const CustomerCreate = forwardRef((props, ref) => {
    const { t } = useTranslation('common');

    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();
    const VehicleCreateRef = useRef();

    const onSavedRef = useRef(null);

    useImperativeHandle(ref, () => ({
        async open(id, onSaved) {
            onSavedRef.current = onSaved || null;
            errors = {};
            setErrors({ ...errors });
            formData = {
                national_address: {},
            };
            setFormData({ ...formData });
            if (id) {
                await getCustomer(id);
            }
            SetShow(true);

            if (localStorage.getItem("store_id")) {
                getStore(localStorage.getItem("store_id"));
            }
        },

    }));

    let [store, setStore] = useState({});
    const [customerVehicles, setCustomerVehicles] = useState([]);
    const [isVehicleListLoading, setIsVehicleListLoading] = useState(false);

    async function getStore(id) {
        try {
            const data = await fetchStore(id);
            setStore({ ...data });
        } catch (error) { }
    }

    const translateText = useCallback(async (text, setter) => {
        if (store.settings?.enable_auto_translation_to_arabic !== true) {
            return;
        }
        try {
            const response = await fetch('/v1/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify({ text }),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch translation');
            }
            const data = await response.json();
            setter(data.translatedText);
        } catch (error) {
            console.error('Translation error:', error);
        }
    }, [store]);

    useEnterKeyNavigation();


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        national_address: {},
    });

    const [show, SetShow] = useState(false);
    useEffect(() => {
        if (!show) return;
        const apply = () => {
            const el = document.querySelector('.modal.cust-create-wrap');
            if (el) el.style.setProperty('z-index', '1600', 'important');
        };
        apply();
        const t = setTimeout(apply, 80);
        return () => clearTimeout(t);
    }, [show]);

    function handleClose() {
        SetShow(false);
        setCustomerVehicles([]);
        setIsVehicleListLoading(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });

    const loadCustomerVehicles = useCallback((customerId = formData.id) => {
        if (!customerId) {
            setCustomerVehicles([]);
            setIsVehicleListLoading(false);
            return;
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        const searchParams = { customer_id: customerId };
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const queryParams = ObjectToSearchQueryParams(searchParams);

        setIsVehicleListLoading(true);
        fetch('/v1/vehicle?select=id,brand,model,variant,year,vehicle_number,istimara_no&' + queryParams + '&sort=-created_at&limit=1000', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                setCustomerVehicles(data.result || []);
                setIsVehicleListLoading(false);
            })
            .catch(error => {
                console.log(error);
                setCustomerVehicles([]);
                setIsVehicleListLoading(false);
            });
    }, [formData.id]);

    useEffect(() => {
        if (!show || store.settings?.enable_automobile_module !== true) {
            return;
        }
        loadCustomerVehicles(formData.id);
    }, [show, formData.id, store.settings?.enable_automobile_module, loadCustomerVehicles]);

    async function getCustomer(id) {
        console.log("inside get Order");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);
                formData = data.result;

                selectedCountries = [];
                if (data.result.country_code && data.result.country_name) {
                    selectedCountries.push({
                        value: data.result.country_code,
                        label: data.result.country_name,
                    });
                }
                setSelectedCountries(selectedCountries);

                formData.logo = "";
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function convertToArabicNumber(input) {
        return input?.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    function isValidNDigitNumber(str, n) {
        const regex = new RegExp(`^\\d{${n}}$`); // Dynamically create regex
        return regex.test(str);
    }


    const NumberStartAndEndWith = (num, startAndEndWithNo) => {
        //const regex = /^3\d*3$/; // Starts (^) with 3, ends ($) with 3, and has digits (\d*) in between.
        const regex = new RegExp(`^${startAndEndWithNo}\\d*${startAndEndWithNo}$`);
        return regex.test(num);
    };

    function IsAlphanumeric(str) {
        const regex = /^[a-zA-Z0-9]+$/; // Allows only letters and numbers
        return regex.test(str);
    }


    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };


    function handleCreate(event) {
        event.preventDefault();

        console.log("Inside handle Create");


        if (formData.vat_percent) {
            formData.vat_percent = parseFloat(formData.vat_percent);
        } else {
            formData.vat_percent = null;
        }

        if (formData.credit_limit) {
            formData.credit_limit = parseFloat(formData.credit_limit);
        } else {
            formData.credit_limit = 0.00;
        }

        formData.phone_in_arabic = convertToArabicNumber(formData.phone);
        formData.vat_no_in_arabic = convertToArabicNumber(formData.vat_no);

        let haveErrors = false;
        setErrors({ ...errors });
        if (!formData.name) {
            errors["name"] = t("Name is required");
            haveErrors = true;
        }

        formData.vat_no = formData.vat_no?.trim();

        if (formData.country_code === "" || formData.country_code === "SA") {
            if (formData.vat_no && !isValidNDigitNumber(formData.vat_no, 15)) {
                errors["vat_no"] = t("VAT No. should be 15 digits");
                haveErrors = true;
            } else if (formData.vat_no && !NumberStartAndEndWith(formData.vat_no, 3)) {
                errors["vat_no"] = t("VAT No should start and end with 3");
                haveErrors = true;
            }
        }


        if (formData.vat_no && store.zatca?.phase === "2") {

            if (formData.national_address?.building_no && !isValidNDigitNumber(formData.national_address?.building_no, 4)) {
                errors["national_address_building_no"] = t("Building number should be 4 digits");
                haveErrors = true;
            }


            if (formData.national_address?.zipcode && !isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
                errors["national_address_zipcode"] = t("Zipcode should be 5 digits");
                haveErrors = true;
            }
        }

        if (formData.registration_number && !IsAlphanumeric(formData.registration_number)) {
            errors["registration_number"] = t("CRN should be alpha numeric(a-zA-Z0-9)");
            haveErrors = true;
        }

        if (formData.email && !validateEmail(formData.email)) {
            errors["email"] = t("E-mail is not valid");
            haveErrors = true;
        }

        if (formData.registration_number) {
            formData.registration_number_in_arabic = convertToArabicNumber(formData.registration_number.toString());
        }

        if (formData.national_address?.building_no) {
            formData.national_address.building_no_arabic = convertToArabicNumber(formData.national_address.building_no.toString());
        }

        if (formData.national_address?.zipcode) {
            formData.national_address.zipcode_arabic = convertToArabicNumber(formData.national_address.zipcode.toString());
        }

        if (formData.national_address?.additional_no) {
            formData.national_address.additional_no_arabic = convertToArabicNumber(formData.national_address.additional_no.toString());
        }

        if (formData.national_address?.unit_no) {
            formData.national_address.unit_no_arabic = convertToArabicNumber(formData.national_address.unit_no.toString());
        }

        if (haveErrors) {
            setErrors({ ...errors });
            console.log("Errors: ", errors);
            return;
        }


        let endPoint = "/v1/customer";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/customer/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }


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

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
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

                setErrors({});


                console.log("Response:");
                console.log(data);

                formData.id = data.result?.id;
                setFormData({ ...formData });

                if (ImageGalleryRef.current) {
                    await ImageGalleryRef.current.uploadAllImages();
                }

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    setProcessing(false);
                    if (formData.id) {
                        if (props.showToastMessage)
                            props.showToastMessage(t("Customer updated successfully!"), "success");
                    } else {
                        if (props.showToastMessage)
                            props.showToastMessage(t("Customer created successfully!"), "success");
                    }

                    if (props.refreshList) {
                        props.refreshList();
                    }

                    if (onSavedRef.current) {
                        onSavedRef.current(data.result);
                        onSavedRef.current = null;
                    }
                    if (props.onUpdated) {
                        props.onUpdated(data.result);
                    }

                    handleClose();
                    if (props.openDetailsView)
                        props.openDetailsView(data.result.id);

                }, 300);


            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage(t("Failed to process customer!"), "danger");
            });
    }

    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    /*

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    */

    //country
    const countryOptions = useMemo(() => countryList().getData(), [])
    //const [selectedCountry, setSelectedCountry] = useState('')
    let [selectedCountries, setSelectedCountries] = useState([]);

    const QuotationsRef = useRef();
    const QtnSalesRef = useRef();
    const SalesRef = useRef();
    const SalesReturnsRef = useRef();
    const QtnSalesReturnsRef = useRef();

    const storeSettingsCreate = (() => {
        try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; }
    })();
    const automobileEnabledCreate = !!storeSettingsCreate?.enable_automobile_module;

    function openCreditQuotationInvoices() {
        let selectedCustomers = [
            {
                id: formData.id,
                name: formData.name,
                search_label: formData.search_label,
            }
        ];

        let selectedPaymentStatusList = [
            {
                id: "not_paid",
                name: "Not Paid",
            },
            {
                id: "paid_partially",
                name: "Paid partially",
            }
        ];

        QuotationsRef.current.open(false, selectedCustomers, "invoice", selectedPaymentStatusList);
    }

    function openPaidQuotationInvoices() {
        let selectedCustomers = [
            {
                id: formData.id,
                name: formData.name,
                search_label: formData.search_label,
            }
        ];

        let selectedPaymentStatusList = [
            {
                id: "paid",
                name: "Paid",
            },

        ];

        QuotationsRef.current.open(false, selectedCustomers, "invoice", selectedPaymentStatusList);
    }

    function openVehicleCreate() {
        VehicleCreateRef.current?.open(undefined, formData.id, {
            id: formData.id,
            name: formData.name,
            name_in_arabic: formData.name_in_arabic,
        });
    }

    function openVehicleUpdate(id) {
        VehicleCreateRef.current?.open(id, formData.id, {
            id: formData.id,
            name: formData.name,
            name_in_arabic: formData.name_in_arabic,
        });
    }

    function deleteVehicle(id) {
        if (!window.confirm(t("Are you sure you want to delete this vehicle?"))) {
            return;
        }

        const requestOptions = {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/vehicle/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                if (props.showToastMessage) {
                    props.showToastMessage(t("Vehicle deleted successfully!"), "success");
                }
                loadCustomerVehicles(formData.id);
            })
            .catch(error => {
                console.log(error);
                if (props.showToastMessage) {
                    props.showToastMessage(t("Failed to delete vehicle!"), "danger");
                }
            });
    }

    const countrySearchRef = useRef();

    // ── Design tokens ──────────────────────────────────────────────────────
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => (
        <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
    );
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    return (
        <>
            <Sales ref={SalesRef} showToastMessage={props.showToastMessage} />
            <SalesReturns ref={SalesReturnsRef} showToastMessage={props.showToastMessage} />
            <Quotations ref={QuotationsRef} showToastMessage={props.showToastMessage} />
            <Quotations ref={QtnSalesRef} showToastMessage={props.showToastMessage} />
            <QuotationSalesReturns ref={QtnSalesReturnsRef} showToastMessage={props.showToastMessage} />
            {!props.noVehicleCreate && <VehicleCreate ref={VehicleCreateRef} refreshList={() => loadCustomerVehicles()} showToastMessage={props.showToastMessage} />}
            {/*  <CustomerView ref={DetailsViewRef} />*/}
            <style>{`.cust-create-wrap { z-index: ${props.zIndex || 1600} !important; }`}</style>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal" className="cust-create-wrap">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? <>{t('Update Customer')}{formData.code ? <span style={{ fontWeight: 700, color: '#5a6478', marginLeft: '8px', fontSize: '17px' }}>#{formData.code}</span> : ''} — {formData.name}</> : t('Create New Customer')}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                                <i className="bi bi-eye me-1"></i>{t('View Detail')}
                            </button>
                        )}
                        {formData.id && (
                            <Dropdown align="end">
                                <Dropdown.Toggle variant="outline-secondary" size="sm" id="cust-create-hist-dd" title={t('History & Links')}>
                                    <i className="bi bi-clock-history me-1"></i>{t('History')}
                                </Dropdown.Toggle>
                                <Dropdown.Menu style={{ minWidth: 230 }}>
                                    <Dropdown.Item onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id, 'repairs'); }}>
                                        <i className="bi bi-tools me-2 text-secondary"></i>{t('Repair Jobs')}
                                    </Dropdown.Item>
                                    {automobileEnabledCreate && (
                                        <Dropdown.Item onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id, 'vehicles'); }}>
                                            <i className="bi bi-car-front me-2 text-secondary"></i>{t('Vehicles')}
                                        </Dropdown.Item>
                                    )}
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => SalesRef.current?.open(false, [{ id: formData.id, name: formData.name, search_label: formData.search_label }], null)}>
                                        <i className="bi bi-receipt me-2 text-success"></i>{t('Sales History')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => SalesReturnsRef.current?.open(false, [{ id: formData.id, name: formData.name, search_label: formData.search_label }], null)}>
                                        <i className="bi bi-receipt-cutoff me-2 text-warning"></i>{t('Sales Return History')}
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => QuotationsRef.current?.open(false, [{ id: formData.id, name: formData.name, search_label: formData.search_label }], 'quotation', null)}>
                                        <i className="bi bi-clipboard2-check me-2 text-info"></i>{t('Quotation History')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => QtnSalesRef.current?.open(false, [{ id: formData.id, name: formData.name, search_label: formData.search_label }], 'invoice', null)}>
                                        <i className="bi bi-file-earmark-check me-2 text-info"></i>{t('Qtn. Sales History')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => QtnSalesReturnsRef.current?.open(false, [{ id: formData.id, name: formData.name, search_label: formData.search_label }], null)}>
                                        <i className="bi bi-clipboard2-x me-2 text-warning"></i>{t('Qtn. Sales Return History')}
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id, 'churnHistory'); }}>
                                        <i className="bi bi-exclamation-triangle me-2 text-danger"></i>{t('Churn Risk History')}
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id, 'clvHistory'); }}>
                                        <i className="bi bi-graph-up-arrow me-2 text-primary"></i>{t('CLV History')}
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? t('Update') : t('Create')}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>
                <style>{`
                    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                    input[type="number"]::-webkit-outer-spin-button,
                    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                    input[type="number"] { -moz-appearance: textfield; }
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .pw-form { display: flex; width: 100%; flex: 1; min-height: 0; }
                    .pw-sidebar { width: 200px; background: #f2f4f6; border-right: 1px solid #c3c6d7; padding: 16px 10px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
                    .pw-sidebar-header { margin-bottom: 16px; }
                    .pw-content { flex: 1; display: flex; flex-direction: column; background: #f7f9fb; min-width: 0; overflow: hidden; }
                    .pw-tab-wrap { max-width: 900px; width: 100%; margin: 0 auto; }
                    @media (max-width: 767px) {
                        .pw-form { flex-direction: column; }
                        .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
                        .pw-sidebar-header { display: none; }
                        .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
                        .pw-content-scroll { padding: 14px 16px !important; }
                        .pw-tab-wrap { max-width: 100%; }
                    }
                    @media (min-width: 768px) and (max-width: 1100px) {
                        .pw-sidebar { width: 170px; }
                        .pw-content-scroll { padding: 16px 20px; }
                        .pw-tab-wrap { max-width: 100%; }
                    }
                    @media (min-height: 600px) and (max-height: 800px) {
                        .pw-content-scroll { padding: 14px 24px; }
                    }
                    @media (max-width: 767px) {
                        .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
                    }
                    @media (min-width: 768px) and (max-width: 1100px) {
                        .pw-card { padding: 16px !important; margin-bottom: 14px !important; }
                    }
                `}</style>
                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} className="pw-form">

                        {/* Main Content Area */}
                        <div className="pw-content" style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", paddingBottom: "8px" }} className="pw-content-scroll">
                            <div style={{ overflow: "hidden", maxHeight: totalErrors > 0 ? "500px" : "0", marginBottom: totalErrors > 0 ? "16px" : "0", transition: "max-height 0.25s ease, margin-bottom 0.2s ease" }}>
                              <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px" }}>
                                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <i className="bi bi-exclamation-circle-fill" style={{ fontSize: "14px" }}></i>
                                  {totalErrors} {totalErrors > 1 ? t('errors') : t('error')} — {t('please fix before saving:')}
                                </div>
                                {allErrors.map(([k, v]) => (
                                  <div key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a", paddingLeft: "14px" }}>• {v}</div>
                                ))}
                              </div>
                            </div>
                            <div className="pw-tab-wrap">

                                {/* ── Basic Info ── */}
                                <>
                                        <div style={CARD} className="pw-card">
                                            <SectionTitle icon="bi-person-circle">{t('Identity')}</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <Label required>{t('Name')}</Label>
                                                    <input
                                                        id="customer_name"
                                                        name="customer_name"
                                                        value={formData.name ? formData.name : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["name"] = "";
                                                            setErrors({ ...errors });
                                                            formData.name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, name_in_arabic: translated }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Name')}
                                                    />
                                                    {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>{t('Name in Arabic')}</Label>
                                                    <input
                                                        id="customer_name_in_arabic"
                                                        name="customer_name_in_arabic"
                                                        value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["name_in_arabic"] = "";
                                                            setErrors({ ...errors });
                                                            formData.name_in_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Name in Arabic')}
                                                    />
                                                    {errors.name_in_arabic && <ErrMsg>{errors.name_in_arabic}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Email')}</Label>
                                                    <input
                                                        value={formData.email ? formData.email : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["email"] = "";
                                                            formData.email = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        id="customer_email"
                                                        name="customer_email"
                                                        placeholder={t('Email')}
                                                    />
                                                    {errors.email && <ErrMsg>{errors.email}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Phone (05.. / +966..)')}</Label>
                                                    <input
                                                        id="customer_phone"
                                                        name="customer_phone"
                                                        value={formData.phone ? formData.phone : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["phone"] = "";
                                                            setErrors({ ...errors });
                                                            formData.phone = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Phone')}
                                                    />
                                                    {errors.phone && <ErrMsg>{errors.phone}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Phone2 (05.. / +966..)')}</Label>
                                                    <input
                                                        id="customer_phone2"
                                                        name="customer_phone2"
                                                        value={formData.phone2 ? formData.phone2 : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["phone2"] = "";
                                                            setErrors({ ...errors });
                                                            formData.phone2 = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Phone2')}
                                                    />
                                                    {errors.phone2 && <ErrMsg>{errors.phone2}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Contact Person')}</Label>
                                                    <input
                                                        id="customer_contact_person"
                                                        name="customer_contact_person"
                                                        value={formData.contact_person ? formData.contact_person : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["contact_person"] = "";
                                                            formData.contact_person = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Contact Person')}
                                                    />
                                                    {errors.contact_person && <ErrMsg>{errors.contact_person}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Country')}</Label>
                                                    <Typeahead
                                                        id="country_code"
                                                        labelKey="label"
                                                        onChange={(selectedItems) => {
                                                            errors.country_code = "";
                                                            setErrors(errors);
                                                            if (selectedItems.length === 0) {
                                                                errors.country_code = "Invalid country selected";
                                                                setErrors(errors);
                                                                formData.country_code = "";
                                                                formData.country_name = "";
                                                                setFormData({ ...formData });
                                                                setSelectedCountries([]);
                                                                return;
                                                            }
                                                            formData.country_code = selectedItems[0].value;
                                                            formData.country_name = selectedItems[0].label;
                                                            setFormData({ ...formData });
                                                            setSelectedCountries(selectedItems);
                                                        }}
                                                        ref={countrySearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                countrySearchRef.current?.clear();
                                                            }
                                                        }}
                                                        options={countryOptions}
                                                        placeholder={t('Country name')}
                                                        selected={selectedCountries}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            //suggestBrands(searchTerm);
                                                        }}
                                                    />
                                                    {errors.country_code && <ErrMsg>{errors.country_code}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={CARD} className="pw-card">
                                            <SectionTitle icon="bi-building">{t('Business Details')}</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <Label>{t('VAT No. (15 digits)')}</Label>
                                                    <input
                                                        id="customer_vat_no"
                                                        name="customer_vat_no"
                                                        value={formData.vat_no ? formData.vat_no : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["vat_no"] = "";
                                                            setErrors({ ...errors });
                                                            formData.vat_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('VAT NO.')}
                                                    />
                                                    {errors.vat_no && <ErrMsg>{errors.vat_no}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>{t('Registration Number (CRN)')}</Label>
                                                    <input
                                                        value={formData.registration_number ? formData.registration_number : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["registration_number"] = "";
                                                            setErrors({ ...errors });
                                                            formData.registration_number = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        id="customer_registration_number"
                                                        name="customer_registration_number"
                                                        placeholder={t('CRN')}
                                                    />
                                                    {errors.registration_number && <ErrMsg>{errors.registration_number}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={CARD} className="pw-card">
                                            <SectionTitle icon="bi-chat-left-text">{t('Remarks')}</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-12">
                                                    <Label>
                                                        {t('Remarks')}&nbsp;|&nbsp;
                                                        <input type="checkbox" style={{ marginLeft: '3px' }}
                                                            value={formData.use_remarks_in_sales}
                                                            checked={formData.use_remarks_in_sales}
                                                            onChange={(e) => {
                                                                errors["formData.show_address_in_invoice_footer"] = "";
                                                                formData.use_remarks_in_sales = !formData.use_remarks_in_sales;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            id="customer_use_remarks_in_sales"
                                                        />
                                                        {' '}{t('Use in Sales / Sales Return')}
                                                    </Label>
                                                    <textarea
                                                        value={formData.remarks}
                                                        onChange={(e) => {
                                                            errors["address"] = "";
                                                            setErrors({ ...errors });
                                                            formData.remarks = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, minHeight: '80px', resize: 'vertical' }}
                                                        id="remarks"
                                                        placeholder={t('Remarks')}
                                                    />
                                                    {errors.remarks && <ErrMsg>{errors.remarks}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>
                                </>

                                {/* ── Address ── */}
                                <>
                                        <div style={CARD} className="pw-card">
                                            <SectionTitle icon="bi-signpost">{t('National Address')}</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <Label>{t('Building Number')}</Label>
                                                    <input
                                                        value={formData.national_address && formData.national_address.building_no ? formData.national_address.building_no : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_building_no"] = "";
                                                            formData.national_address.building_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        id="customer_national_address_building_no"
                                                        name="customer_national_address_building_no"
                                                        placeholder={t('Building Number')}
                                                    />
                                                    {errors.national_address_building_no && <ErrMsg>{errors.national_address_building_no}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Street Name')}</Label>
                                                    <input
                                                        value={formData.national_address && formData.national_address.street_name ? formData.national_address.street_name : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_street_name"] = "";
                                                            formData.national_address.street_name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, national_address: { ...prev.national_address, street_name_arabic: translated } }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        id="customer_national_address_street_name"
                                                        name="customer_national_address_street_name"
                                                        placeholder={t('Street Name')}
                                                    />
                                                    {errors.national_address_street_name && <ErrMsg>{errors.national_address_street_name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Street Name (Arabic)')}</Label>
                                                    <input
                                                        id="customer_national_address_street_name_arabic"
                                                        name="customer_national_address_street_name_arabic"
                                                        value={formData.national_address && formData.national_address.street_name_arabic ? formData.national_address.street_name_arabic : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_street_name_arabic"] = "";
                                                            formData.national_address.street_name_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Street Name (Arabic)')}
                                                    />
                                                    {errors.national_address_street_name_arabic && <ErrMsg>{errors.national_address_street_name_arabic}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('District Name')}</Label>
                                                    <input
                                                        id="customer_national_address_district_name_arabic"
                                                        name="customer_national_address_district_name_arabic"
                                                        value={formData.national_address && formData.national_address.district_name ? formData.national_address.district_name : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_district_name"] = "";
                                                            formData.national_address.district_name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, national_address: { ...prev.national_address, district_name_arabic: translated } }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('District Name')}
                                                    />
                                                    {errors.national_address_district_name && <ErrMsg>{errors.national_address_district_name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('District Name (Arabic)')}</Label>
                                                    <input
                                                        id="national_address.district_name_arabic"
                                                        name="national_address.district_name_arabic"
                                                        value={formData.national_address && formData.national_address.district_name_arabic ? formData.national_address.district_name_arabic : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_district_name_arabic"] = "";
                                                            formData.national_address.district_name_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('District Name (Arabic)')}
                                                    />
                                                    {errors.national_address_district_name_arabic && <ErrMsg>{errors.national_address_district_name_arabic}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Unit Number')}</Label>
                                                    <input
                                                        id="customer_national_address_unit_no"
                                                        model="customer_national_address_unit_no"
                                                        value={formData.national_address && formData.national_address.unit_no ? formData.national_address.unit_no : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_unit_no"] = "";
                                                            formData.national_address.unit_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Unit Number')}
                                                    />
                                                    {errors.national_address_unit_no && <ErrMsg>{errors.national_address_unit_no}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('City Name')}</Label>
                                                    <input
                                                        id="customer_national_address_city_name"
                                                        name="customer_national_address_city_name"
                                                        value={formData.national_address && formData.national_address.city_name ? formData.national_address.city_name : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_city_name"] = "";
                                                            formData.national_address.city_name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, national_address: { ...prev.national_address, city_name_arabic: translated } }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('City Name')}
                                                    />
                                                    {errors.national_address_city_name && <ErrMsg>{errors.national_address_city_name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('City Name (Arabic)')}</Label>
                                                    <input
                                                        id="customer_national_address.city_name_arabic"
                                                        name="customer_national_address.city_name_arabic"
                                                        value={formData.national_address && formData.national_address.city_name_arabic ? formData.national_address.city_name_arabic : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_city_name_arabic"] = "";
                                                            formData.national_address.city_name_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('City Name (Arabic)')}
                                                    />
                                                    {errors.national_address_city_name_arabic && <ErrMsg>{errors.national_address_city_name_arabic}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Zipcode')}</Label>
                                                    <input
                                                        id="customer_national_address_zipcode"
                                                        value={formData.national_address && formData.national_address.zipcode ? formData.national_address.zipcode : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_zipcode"] = "";
                                                            formData.national_address.zipcode = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Zipcode')}
                                                    />
                                                    {errors.national_address_zipcode && <ErrMsg>{errors.national_address_zipcode}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>{t('Additional Number')}</Label>
                                                    <input
                                                        id="customer_national_address.additional_no"
                                                        name="customer_national_address.additional_no"
                                                        value={formData.national_address && formData.national_address.additional_no ? formData.national_address.additional_no : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            errors["national_address_additional_no"] = "";
                                                            formData.national_address.additional_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder={t('Additional Number')}
                                                    />
                                                    {errors.national_address_additional_no && <ErrMsg>{errors.national_address_additional_no}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>
                                </>

                                {/* ── Financial ── */}
                                <>
                                        <div style={CARD} className="pw-card">
                                            <SectionTitle icon="bi-cash-stack">{t('Credit & Balances')}</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <Label>{t('Credit Limit')}</Label>
                                                    <input
                                                        id="customer_credit_limit"
                                                        name="customer_credit_limit"
                                                        type='number'
                                                        value={formData.credit_limit}
                                                        style={INPUT}
                                                        onChange={(e) => {
                                                            errors["credit_limit"] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                formData.credit_limit = e.target.value;
                                                                setFormData({ ...formData });
                                                                return;
                                                            }
                                                            formData.credit_limit = parseFloat(e.target.value);
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                    />
                                                    {errors.credit_limit && <ErrMsg>{errors.credit_limit}</ErrMsg>}
                                                </div>

                                                {formData.id && (
                                                    <>
                                                        <div className="col-md-4">
                                                            <Label>{t('Credit Balance')}</Label>
                                                            <input
                                                                type='text'
                                                                disabled={true}
                                                                value={formData.credit_balance}
                                                                style={{ ...INPUT, background: '#f2f4f6', color: '#737686' }}
                                                                onChange={(e) => {}}
                                                            />
                                                            {errors.credit_balance && <ErrMsg>{errors.credit_balance}</ErrMsg>}
                                                        </div>

                                                        <div className="col-md-4">
                                                            <Label>{t('Qtn. Credit Invoice Amount')}</Label>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <input
                                                                    type='number'
                                                                    disabled={true}
                                                                    value={formData.stores && formData.stores[localStorage.getItem("store_id")]?.quotation_invoice_balance_amount}
                                                                    style={{ ...INPUT, background: '#f2f4f6', color: '#737686' }}
                                                                    onChange={(e) => {}}
                                                                />
                                                                <Button className="btn btn-primary" onClick={openCreditQuotationInvoices} style={{ flexShrink: 0 }}>
                                                                    <i className="bi bi-list"></i>
                                                                </Button>
                                                            </div>
                                                            {errors.quotation_invoice_credit_amount && <ErrMsg>{errors.quotation_invoice_credit_amount}</ErrMsg>}
                                                        </div>

                                                        <div className="col-md-4">
                                                            <Label>{t('Qtn. Paid Invoice Amount')}</Label>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <input
                                                                    type='number'
                                                                    disabled={true}
                                                                    value={formData.stores && formData.stores[localStorage.getItem("store_id")]?.quotation_invoice_paid_amount}
                                                                    style={{ ...INPUT, background: '#f2f4f6', color: '#737686' }}
                                                                    onChange={(e) => {}}
                                                                />
                                                                <Button className="btn btn-primary" onClick={openPaidQuotationInvoices} style={{ flexShrink: 0 }}>
                                                                    <i className="bi bi-list"></i>
                                                                </Button>
                                                            </div>
                                                            {errors.quotation_invoice_paid_amount && <ErrMsg>{errors.quotation_invoice_paid_amount}</ErrMsg>}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                </>

                                {store.settings?.enable_automobile_module === true && !!formData.id && (
                                    <div style={CARD} className="pw-card">
                                        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                                            <SectionTitle icon="bi-car-front">{t('Vehicles')}</SectionTitle>
                                            {formData.id && (
                                                <Button type="button" className="btn btn-primary btn-sm" onClick={openVehicleCreate}>
                                                    <i className="bi bi-plus-lg"></i> {t('Add Vehicle')}
                                                </Button>
                                            )}
                                        </div>

                                        {!formData.id && (
                                            <p className="text-muted mb-0">{t('Save the customer first to add vehicles.')}</p>
                                        )}

                                        {formData.id && isVehicleListLoading && (
                                            <div className="text-center py-3">
                                                <Spinner animation="border" size="sm" />
                                            </div>
                                        )}

                                        {formData.id && !isVehicleListLoading && customerVehicles.length === 0 && (
                                            <p className="text-muted mb-0">{t('No vehicles added for this customer yet.')}</p>
                                        )}

                                        {formData.id && !isVehicleListLoading && customerVehicles.length > 0 && (
                                            <div className="table-responsive">
                                                <table className="table table-sm table-bordered table-striped mb-0">
                                                    <thead>
                                                        <tr className="text-center">
                                                            <th>{t('Brand / Model')}</th>
                                                            <th>{t('Variant')}</th>
                                                            <th>{t('Year')}</th>
                                                            <th>{t('Vehicle # / Istimara No.')}</th>
                                                            <th>{t('Actions')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-center">
                                                        {customerVehicles.map((vehicle) => (
                                                            <tr key={vehicle.id}>
                                                                <td className="text-start" style={{ whiteSpace: 'nowrap' }}>
                                                                    {vehicle.brand || '-'} {vehicle.model || ''}
                                                                </td>
                                                                <td style={{ whiteSpace: 'nowrap' }}>{vehicle.variant || '-'}</td>
                                                                <td>{vehicle.year || '-'}</td>
                                                                <td className="text-start" style={{ whiteSpace: 'nowrap' }}>
                                                                    <div>{vehicle.vehicle_number || '-'}</div>
                                                                    <small className="text-muted">{vehicle.istimara_no || '-'}</small>
                                                                </td>
                                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                                    <Button type="button" className="btn btn-light btn-sm me-1" onClick={() => openVehicleUpdate(vehicle.id)}>
                                                                        <i className="bi bi-pencil"></i>
                                                                    </Button>
                                                                    <Button type="button" className="btn btn-outline-danger btn-sm" onClick={() => deleteVehicle(vehicle.id)}>
                                                                        <i className="bi bi-trash"></i>
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Opening Balance ── */}
                                <div style={CARD} className="pw-card">
                                    <SectionTitle icon="bi-arrow-left-right">{t('Opening Balance')}</SectionTitle>
                                    <p style={{ fontSize: '12px', color: '#5c6470', fontFamily: '"Inter", sans-serif', marginBottom: '12px' }}>
                                        {t('If this customer has an outstanding balance from your previous system, enter the amount and date. Leave as 0 if fully settled.')}
                                        {formData.opening_balance_posted && ' ' + t('(An opening balance entry has already been posted — changing values below will update it.)')}
                                    </p>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{t('Balance Direction')}</label>
                                            <div style={{ display: 'flex', gap: '24px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                                    <input type="radio" name="cust_ob_type" value="receivable"
                                                        checked={(formData.opening_balance_type || 'receivable') === 'receivable'}
                                                        onChange={() => { formData.opening_balance_type = 'receivable'; setFormData({ ...formData }); }} />
                                                    {t('Customer owes Store')}
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                                    <input type="radio" name="cust_ob_type" value="payable"
                                                        checked={formData.opening_balance_type === 'payable'}
                                                        onChange={() => { formData.opening_balance_type = 'payable'; setFormData({ ...formData }); }} />
                                                    {t('Store owes Customer')}
                                                </label>
                                            </div>
                                            {errors.opening_balance_type && <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>{errors.opening_balance_type}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{t('Opening Balance Amount')}</label>
                                            <input type="number" step="0.01" min="0" style={INPUT}
                                                value={formData.opening_balance ?? ''}
                                                onChange={e => { formData.opening_balance = e.target.value === '' ? '' : parseFloat(e.target.value); setFormData({ ...formData }); }} />
                                            {errors.opening_balance && <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>{errors.opening_balance}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{t('As Of Date')}</label>
                                            <DatePicker
                                                selected={formData.opening_balance_date ? new Date(formData.opening_balance_date) : null}
                                                onChange={(value) => { formData.opening_balance_date = value; setFormData({ ...formData }); }}
                                                showTimeSelect
                                                timeIntervals={1}
                                                dateFormat="MMMM d, yyyy h:mm aa"
                                                locale={enUS}
                                                placeholderText={t('Select date & time')}
                                                isClearable
                                                className={`form-control form-control-sm${errors.opening_balance_date ? " is-invalid" : ""}`}
                                            />
                                            {errors.opening_balance_date && <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>{errors.opening_balance_date}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Photos ── */}
                                <>
                                        <div style={CARD} className="pw-card">
                                            <SectionTitle icon="bi-images">{t('Customer Photos')}</SectionTitle>
                                            <ImageGallery ref={ImageGalleryRef} id={formData.id} storeID={formData.store_id} storedImages={formData.images} modelName={"customer"} />
                                        </div>
                                </>

                            </div>
                            </div>
                        </div>

                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default CustomerCreate;
