import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
import Quotations from "./../utils/quotations.js";
import ImageGallery from '../utils/ImageGallery.js';

const CustomerCreate = forwardRef((props, ref) => {

    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();

    useImperativeHandle(ref, () => ({
        async open(id) {
            errors = {};
            setErrors({ ...errors });
            formData = {
                national_address: {},
            };
            setFormData({ ...formData });
            if (id) {
                await getCustomer(id);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    ImageGalleryRef.current.open();
                }, 300);
            }
            SetShow(true);

            if (localStorage.getItem("store_id")) {
                getStore(localStorage.getItem("store_id"));
            }
        },

    }));

    let [store, setStore] = useState({});

    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/store/' + id, requestOptions)
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
                setStore({ ...store });
            })
            .catch(error => {
                // setErrors(error);
            });
    }

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-customer.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if (event.target.getAttribute("class").includes("barcode")) {
                            form.elements[index].focus();
                        } else {
                            form.elements[index + 1].focus();
                        }
                        event.preventDefault();
                    }
                }
            }
        };
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        national_address: {},
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

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


    const validateSaudiPhone = (phone) => {
        const regex = /^(?:\+9665|05)[0-9]{8}$/;
        return regex.test(phone);
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

        formData.phone_in_arabic = convertToArabicNumber(formData.phone);
        formData.vat_no_in_arabic = convertToArabicNumber(formData.vat_no);

        let haveErrors = false;
        setErrors({ ...errors });
        if (!formData.name) {
            errors["name"] = "Name is required";
            haveErrors = true;
        }

        if (formData.phone && !validateSaudiPhone(formData.phone)) {
            errors["phone"] = "Invalid phone no.";
            haveErrors = true;
        }

        if (formData.vat_no && !isValidNDigitNumber(formData.vat_no, 15)) {
            errors["vat_no"] = "VAT No. should be 15 digits";
            haveErrors = true;
        } else if (formData.vat_no && !NumberStartAndEndWith(formData.vat_no, 3)) {
            errors["vat_no"] = "VAT No should start and end with 3";
            haveErrors = true;
        }

        if (formData.vat_no && store.zatca?.phase === "2") {

            if (formData.national_address?.building_no && !isValidNDigitNumber(formData.national_address?.building_no, 4)) {
                errors["national_address_building_no"] = "Building number should be 4 digits";
                haveErrors = true;
            }


            if (formData.national_address?.zipcode && !isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
                errors["national_address_zipcode"] = "Zipcode should be 5 digits";
                haveErrors = true;
            }
        }

        if (formData.registration_number && !IsAlphanumeric(formData.registration_number)) {
            errors["registration_number"] = "CRN should be alpha numeric(a-zA-Z0-9)";
            haveErrors = true;
        }

        if (formData.email && !validateEmail(formData.email)) {
            errors["email"] = "E-mail is not valid";
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

                await ImageGalleryRef.current.uploadAllImages();

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    setProcessing(false);
                    if (formData.id) {
                        if (props.showToastMessage)
                            props.showToastMessage("Customer updated successfully!", "success");
                    } else {
                        if (props.showToastMessage)
                            props.showToastMessage("Customer created successfully!", "success");
                    }

                    if (props.refreshList) {
                        props.refreshList();
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
                if (props.showToastMessage) props.showToastMessage("Failed to process customer!", "danger");
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

    const countrySearchRef = useRef();

    return (
        <>
            <Quotations ref={QuotationsRef} showToastMessage={props.showToastMessage} />
            {/*  <CustomerView ref={DetailsViewRef} />*/}
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Customer #" + formData.name : "Create New Customer"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
                            if (props.openDetailsView)
                                props.openDetailsView(formData.id);
                        }}>
                            <i className="bi bi-eye"></i> View Detail
                        </Button> : ""}
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={handleCreate} >
                            {isProcessing ?
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden={true}
                                />

                                : ""
                            }
                            {formData.id && !isProcessing ? "Update" : !isProcessing ? "Create" : ""}
                        </Button>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>
                        <h6><b>General details</b></h6>
                        <div className="col-md-3">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_name"
                                    name="customer_name"
                                    value={formData.name ? formData.name : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["name"] = "";
                                        setErrors({ ...errors });
                                        formData.name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    placeholder="Name"
                                />
                            </div>
                            {errors.name && (
                                <div style={{ color: "red" }}>

                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Name in arabic</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_name_in_arabic"
                                    name="customer_name_in_arabic"
                                    value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["name_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.name_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Name in Arabic"
                                />
                            </div>
                            {errors.name_in_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.name_in_arabic}
                                </div>
                            )}
                        </div>

                        {/*<div className="col-md-6">
                            <label className="form-label">ID</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_id"
                                    name="customer_id"
                                    value={formData.code ? formData.code : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["code"] = "";
                                        setErrors({ ...errors });
                                        formData.code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="ID"
                                />
                            </div>
                            {errors.code && (
                                <div style={{ color: "red" }}>
                                    {errors.code}
                                </div>
                            )}
                        </div>*/}


                        <div className="col-md-2">
                            <label className="form-label">Phone ( 05.. / +966..)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_phone"
                                    name="customer_phone"
                                    value={formData.phone ? formData.phone : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone"] = "";
                                        setErrors({ ...errors });
                                        formData.phone = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Phone"
                                />
                            </div>
                            {errors.phone && (
                                <div style={{ color: "red" }}>

                                    {errors.phone}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Phone2 ( 05.. / +966..)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_phone2"
                                    name="customer_phone2"
                                    value={formData.phone2 ? formData.phone2 : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone2"] = "";
                                        setErrors({ ...errors });
                                        formData.phone2 = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Phone"
                                />
                            </div>
                            {errors.phone2 && (
                                <div style={{ color: "red" }}>
                                    {errors.phone2}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">VAT NO.(15 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_vat_no"
                                    name="customer_vat_no"
                                    value={formData.vat_no ? formData.vat_no : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["vat_no"] = "";
                                        setErrors({ ...errors });
                                        formData.vat_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="VAT NO."
                                />
                            </div>
                            {errors.vat_no && (
                                <div style={{ color: "red" }}>

                                    {errors.vat_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Registration Number(CRN)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.registration_number ? formData.registration_number : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["registration_number"] = "";
                                        setErrors({ ...errors });
                                        formData.registration_number = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_registration_number"
                                    name="customer_registration_number"
                                    placeholder="CRN"
                                />
                            </div>
                            {errors.registration_number && (
                                <div style={{ color: "red" }}>

                                    {errors.registration_number}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Email</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.email ? formData.email : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["email"] = "";

                                        formData.email = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_email"
                                    name="customer_email"
                                    placeholder="Email"
                                />
                            </div>
                            {errors.email && (
                                <div style={{ color: "red" }}>

                                    {errors.email}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Contact Person</label>
                            <div className="input-group mb-3">
                                <input
                                    id="customer_contact_person"
                                    name="customer_contact_person"
                                    value={formData.contact_person ? formData.contact_person : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["contact_person"] = "";

                                        formData.contact_person = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Contact Person"
                                />
                            </div>
                            {errors.contact_person && (
                                <div style={{ color: "red" }}>

                                    {errors.contact_person}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Country</label>

                            <div className="input-group mb-3">
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
                                    placeholder="Country name"
                                    selected={selectedCountries}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        //suggestBrands(searchTerm);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Credit limit</label>
                            <input
                                id="customer_credit_limit" name="customer_credit_limit"
                                type='number' value={formData.credit_limit} className="form-control "
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
                            {errors.credit_limit && (
                                <div style={{ color: "red" }}>
                                    {errors.credit_limit}
                                </div>
                            )}
                        </div>

                        {formData.id && <>
                            <div className="col-md-2">
                                <label className="form-label">Credit balance</label>
                                <input type='string' disabled={true} value={formData.credit_balance} className="form-control "
                                    onChange={(e) => {

                                    }}
                                />
                                {errors.credit_balance && (
                                    <div style={{ color: "red" }}>
                                        {errors.credit_balance}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-2">
                                <label className="form-label">Qtn. Credit Invoice Amount</label>
                                <input type='number' disabled={true} value={formData.stores && formData.stores[localStorage.getItem("store_id")]?.quotation_invoice_balance_amount} className="form-control "
                                    onChange={(e) => {

                                    }}
                                />
                                {errors.quotation_invoice_credit_amount && (
                                    <div style={{ color: "red" }}>
                                        {errors.quotation_invoice_credit_amount}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-1">
                                <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openCreditQuotationInvoices}>
                                    <i class="bi bi-list"></i>
                                </Button>
                            </div>

                            <div className="col-md-2">
                                <label className="form-label">Qtn. Paid Invoice Amount</label>
                                <input type='number' disabled={true} value={formData.stores && formData.stores[localStorage.getItem("store_id")]?.quotation_invoice_paid_amount} className="form-control "
                                    onChange={(e) => {

                                    }}
                                />
                                {errors.quotation_invoice_paid_amount && (
                                    <div style={{ color: "red" }}>
                                        {errors.quotation_invoice_paid_amount}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-1">
                                <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openPaidQuotationInvoices}>
                                    <i class="bi bi-list"></i>
                                </Button>
                            </div>
                        </>}

                        <div className="col-md-3">
                            <label className="form-label">Remarks
                                |&nbsp;<input type="checkbox" style={{ marginLeft: "3px" }}
                                    value={formData.use_remarks_in_sales}
                                    checked={formData.use_remarks_in_sales}
                                    onChange={(e) => {

                                        errors["formData.show_address_in_invoice_footer"] = "";
                                        formData.use_remarks_in_sales = !formData.use_remarks_in_sales
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="customer_use_remarks_in_sales"
                                    phone="customer_use_remarks_in_sales"

                                /> Use in Sales / Sales Return
                            </label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address"] = "";
                                        setErrors({ ...errors });
                                        formData.remarks = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="remarks"
                                    placeholder="Remarks"
                                />
                            </div>
                            {errors.remarks && (
                                <div style={{ color: "red" }}>

                                    {errors.remarks}
                                </div>
                            )}
                        </div>

                        {/*
                        <div className="col-md-3">
                            <label className="form-label">Address</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.address}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address"] = "";
                                        setErrors({ ...errors });
                                        formData.address = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="address"
                                    placeholder="Address"
                                />
                            </div>
                            {errors.address && (
                                <div style={{ color: "red" }}>

                                    {errors.address}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Address In Arabic</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.address_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["address_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.address_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="address_in_arabic"
                                    placeholder="Address In Arabic"
                                />
                            </div>
                            {errors.address_in_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.address_in_arabic}
                                </div>
                            )}
                        </div>
                        */}

                        <h6><b>National Address</b></h6>
                        <div className="col-md-2">
                            <label className="form-label">Building Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address && formData.national_address.building_no ? formData.national_address.building_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_building_no"] = "";
                                        formData.national_address.building_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_national_address_building_no"
                                    name="customer_national_address_building_no"
                                    placeholder="Building Number"
                                />

                            </div>
                            {errors.national_address_building_no && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_building_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Street Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address && formData.national_address.street_name ? formData.national_address.street_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_street_name"] = "";
                                        formData.national_address.street_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_national_address_street_name"
                                    name="customer_national_address_street_name"
                                    placeholder="Street Name"
                                />
                            </div>
                            {errors.national_address_street_name && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_street_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Street Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address_street_name_arabic"
                                    name="customer_national_address_street_name_arabic"
                                    value={formData.national_address && formData.national_address.street_name_arabic ? formData.national_address.street_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_street_name_arabic"] = "";
                                        formData.national_address.street_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Street Name(Arabic)"
                                />
                            </div>
                            {errors.national_address_street_name_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_street_name_arabic}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">District Name</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address_district_name_arabic"
                                    name="customer_national_address_district_name_arabic"
                                    value={formData.national_address && formData.national_address.district_name ? formData.national_address.district_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_district_name"] = "";
                                        formData.national_address.district_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    placeholder="District Name"
                                />
                            </div>
                            {errors.national_address_district_name && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_district_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">District Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="national_address.district_name_arabic"
                                    name="national_address.district_name_arabic"
                                    value={formData.national_address && formData.national_address.district_name_arabic ? formData.national_address.district_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_district_name_arabic"] = "";
                                        formData.national_address.district_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="District Name(Arabic)"
                                />
                            </div>
                            {errors.national_address_district_name_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_district_name_arabic}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Unit Number</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address_unit_no"
                                    model="customer_national_address_unit_no"
                                    value={formData.national_address && formData.national_address.unit_no ? formData.national_address.unit_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_unit_no"] = "";
                                        formData.national_address.unit_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Unit Number"
                                />
                            </div>
                            {errors.national_address_unit_no && (
                                <div style={{ color: "red" }}>
                                    {errors.national_address_unit_no}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">City Name</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address_city_name"
                                    name="customer_national_address_city_name"
                                    value={formData.national_address && formData.national_address.city_name ? formData.national_address.city_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_city_name"] = "";
                                        formData.national_address.city_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="City Name"
                                />
                            </div>
                            {errors.national_address_city_name && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_city_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">City Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address.city_name_arabic"
                                    name="customer_national_address.city_name_arabic"

                                    value={formData.national_address && formData.national_address.city_name_arabic ? formData.national_address.city_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_city_name_arabic"] = "";
                                        formData.national_address.city_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="City Name(Arabic)"
                                />
                            </div>
                            {errors.national_address_city_name_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_city_name_arabic}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Zipcode</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address_zipcode"
                                    value={formData.national_address && formData.national_address.zipcode ? formData.national_address.zipcode : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_zipcode"] = "";
                                        formData.national_address.zipcode = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Zipcode"
                                />
                            </div>
                            {errors.national_address_zipcode && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_zipcode}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Additional Number</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_national_address.additional_no"
                                    name="customer_national_address.additional_no"
                                    value={formData.national_address && formData.national_address.additional_no ? formData.national_address.additional_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_additional_no"] = "";
                                        formData.national_address.additional_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Additional Number"
                                />
                            </div>
                            {errors.national_address_additional_no && (
                                <div style={{ color: "red" }}>
                                    {errors.national_address_additional_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-12">
                            <label className="form-label">Customer photos</label>
                            <ImageGallery ref={ImageGalleryRef} id={formData.id} storeID={formData.store_id} storedImages={formData.images} modelName={"customer"} />
                        </div>


                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bcustomer"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Processing..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default CustomerCreate;
