import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";

import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";

const VendorCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {

            formData = {
                national_address: {},
                vat_percent: 15.00,
            };
            setFormData({ ...formData });

            if (id) {
                getVendor(id);
            }
            setShow(true);
        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function.");
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
        vat_percent: 15.00,
    });

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });


    function getVendor(id) {
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

        fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
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
                let vendor = data.result;
                formData = vendor;

                if (!formData.national_address) {
                    formData.national_address = {};
                }

                if (!formData.vat_percent) {
                    formData.vat_percent = 15.00;
                }

                selectedCountries = [];
                if (data.result.country_code && data.result.country_name) {
                    selectedCountries.push({
                        value: data.result.country_code,
                        label: data.result.country_name,
                    });
                }
                setSelectedCountries(selectedCountries);

                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        formData.vat_percent = parseFloat(formData.vat_percent);

        if (formData.phone) {
            formData.phone_in_arabic = convertToArabicNumber(formData.phone.toString());
        }

        if (formData.vat_no) {
            formData.vat_no_in_arabic = convertToArabicNumber(formData.vat_no.toString());
        }

        if (formData.registration_number) {
            formData.registration_number_in_arabic = convertToArabicNumber(formData.registration_number.toString());
        }

        if (formData.national_address.application_no) {
            formData.national_address.application_no_arabic = convertToArabicNumber(formData.national_address.application_no.toString());
        }

        if (formData.national_address.service_no) {
            formData.national_address.service_no_arabic = convertToArabicNumber(formData.national_address.service_no.toString());
        }

        if (formData.national_address.customer_account_no) {
            formData.national_address.customer_account_no_arabic = convertToArabicNumber(formData.national_address.customer_account_no.toString());
        }

        if (formData.national_address.building_no) {
            formData.national_address.building_no_arabic = convertToArabicNumber(formData.national_address.building_no.toString());
        }

        if (formData.national_address.zipcode) {
            formData.national_address.zipcode_arabic = convertToArabicNumber(formData.national_address.zipcode.toString());
        }

        if (formData.national_address.additional_no) {
            formData.national_address.additional_no_arabic = convertToArabicNumber(formData.national_address.additional_no.toString());
        }

        if (formData.national_address.unit_no) {
            formData.national_address.unit_no_arabic = convertToArabicNumber(formData.national_address.unit_no.toString());
        }

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }


        let endPoint = "/v1/vendor";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/vendor/" + formData.id;
            method = "PUT";
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
                setProcessing(false);

                console.log("Response:");
                console.log(data);

                if (formData.id) {
                    props.showToastMessage("Vendor updated successfully!", "success");
                } else {
                    props.showToastMessage("Vendor created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
                props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Failed to process vendor!", "danger");
            });
    }

    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    //country
    const countryOptions = useMemo(() => countryList().getData(), [])
    let [selectedCountries, setSelectedCountries] = useState([]);

    return (
        <>
            <Modal show={show} size="lg" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Vendor #" + formData.name : "Create New Vendor"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
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
                        <div className="col-md-3">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
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
                                    id="name"
                                    placeholder="Name"
                                />
                                {errors.name && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.name}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Name In Arabic</label>

                            <div className="input-group mb-3">
                                <input
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
                                    id="name_in_arabic"
                                    placeholder="Name In Arabic"
                                />
                                {errors.name_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.name_in_arabic}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">ID</label>

                            <div className="input-group mb-3">
                                <input
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
                                    id="id"
                                    placeholder="ID"
                                />
                            </div>
                            {errors.code && (
                                <div style={{ color: "red" }}>
                                    {errors.code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Phone</label>

                            <div className="input-group mb-3">
                                <input
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
                                    id="phone"
                                    placeholder="Phone"
                                />
                                {errors.phone && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.phone}
                                    </div>
                                )}

                            </div>
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
                                    id="email"
                                    placeholder="Email"
                                />

                                {errors.email && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.email}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Registration Number(C.R NO.)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.registration_number ? formData.registration_number : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["registration_number"] = "";
                                        setErrors({ ...errors });
                                        formData.registration_number = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="registration_number"
                                    placeholder="Registration Number(C.R NO.)"
                                />
                                {errors.registration_number && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.registration_number}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">VAT NO.</label>

                            <div className="input-group mb-3">
                                <input
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
                                    id="vat_no"
                                    placeholder="VAT NO."
                                />
                                {errors.vat_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.vat_no}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Contact Person</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.contact_person ? formData.contact_person : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["contact_person"] = "";

                                        formData.contact_person = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="contact_person"
                                    placeholder="Contact Person"
                                />
                            </div>
                            {errors.contact_person && (
                                <div style={{ color: "red" }}>

                                    {errors.contact_person}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
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
                            <input type='number' value={formData.credit_limit} className="form-control "
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

                        <div className="col-md-2">
                            <label className="form-label">Credit balance</label>
                            <input type='number' disabled={true} value={formData.credit_balance} className="form-control "
                                onChange={(e) => {

                                }}
                            />
                            {errors.credit_balance && (
                                <div style={{ color: "red" }}>
                                    {errors.credit_balance}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Remarks
                                |&nbsp;<input type="checkbox" style={{ marginLeft: "3px" }}
                                    value={formData.use_remarks_in_purchases}
                                    checked={formData.use_remarks_in_purchases}
                                    onChange={(e) => {

                                        errors["formData.show_address_in_invoice_footer"] = "";
                                        formData.use_remarks_in_purchases = !formData.use_remarks_in_purchases
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="formData.use_remarks_in_sales"

                                /> Use in Purchase / Purchase Return
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


                        <h2>National Address:</h2>

                        <div className="col-md-3">
                            <label className="form-label">Building Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.building_no ? formData.national_address.building_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_building_no"] = "";
                                        formData.national_address.building_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.building_no"
                                    placeholder="Building Number"
                                />

                                {errors.national_address_building_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_building_no}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Street Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.street_name ? formData.national_address.street_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_street_name"] = "";
                                        formData.national_address.street_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.street_name"
                                    placeholder="Street Name"
                                />

                                {errors.national_address_street_name && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_street_name}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Street Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.street_name_arabic ? formData.national_address.street_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_street_name_arabic"] = "";
                                        formData.national_address.street_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.street_name_arabic"
                                    placeholder="Street Name(Arabic)"
                                />

                                {errors.national_address_street_name_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_street_name_arabic}
                                    </div>
                                )}

                            </div>
                        </div>


                        <div className="col-md-3">
                            <label className="form-label">District Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.district_name ? formData.national_address.district_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_district_name"] = "";
                                        formData.national_address.district_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.district_name"
                                    placeholder="District Name"
                                />

                                {errors.national_address_district_name && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_district_name}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">District Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.district_name_arabic ? formData.national_address.district_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_district_name_arabic"] = "";
                                        formData.national_address.district_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.district_name_arabic"
                                    placeholder="District Name(Arabic)"
                                />

                                {errors.national_address_district_name_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_district_name_arabic}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Unit Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.unit_no ? formData.national_address.unit_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_unit_no"] = "";
                                        formData.national_address.unit_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.unit_no"
                                    placeholder="Unit Number"
                                />

                                {errors.national_address_unit_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_unit_no}
                                    </div>
                                )}

                            </div>
                        </div>


                        <div className="col-md-3">
                            <label className="form-label">City Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.city_name ? formData.national_address.city_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_city_name"] = "";
                                        formData.national_address.city_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.city_name"
                                    placeholder="City Name"
                                />

                                {errors.national_address_city_name && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_city_name}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">City Name(Arabic)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.city_name_arabic ? formData.national_address.city_name_arabic : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_city_name_arabic"] = "";
                                        formData.national_address.city_name_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.city_name_arabic"
                                    placeholder="City Name(Arabic)"
                                />

                                {errors.national_address_city_name_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_city_name_arabic}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Zipcode</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.zipcode ? formData.national_address.zipcode : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_zipcode"] = "";
                                        formData.national_address.zipcode = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.zipcode"
                                    placeholder="Zipcode"
                                />

                                {errors.national_address_zipcode && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_zipcode}
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Additional Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.additional_no ? formData.national_address.additional_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_additional_no"] = "";
                                        formData.national_address.additional_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.additional_no"
                                    placeholder="Additional Number"
                                />

                                {errors.national_address_additional_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_additional_no}
                                    </div>
                                )}

                            </div>
                        </div>




                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bvendor"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    />

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

export default VendorCreate;
