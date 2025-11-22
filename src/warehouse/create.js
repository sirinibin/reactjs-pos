import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
//import { DebounceInput } from 'react-debounce-input';

const WarehouseCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            //selectedWarehouses = [];
            //setSelectedWarehouses(selectedWarehouses);

            formData = {
                national_address: {},
                code: "",
            };

            setFormData({ ...formData });
            if (id) {
                getWarehouse(id);
            }

            SetShow(true);
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

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };



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
                return `search[${key}]=` + encodeURIComponent(object[key]);
            })
            .join("&");
    }


    function getWarehouse(id) {
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

        fetch('/v1/warehouse/' + id + "?" + queryParams, requestOptions)
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
                let warehouseData = data.result;

                //let warehouseIds = data.result.use_products_from_warehouse_id;
                //let warehouseNames = data.result.use_products_from_warehouse_names;

                /*
                selectedWarehouses = [];
                if (warehouseIds && warehouseNames) {
                    for (var i = 0; i < warehouseIds.length; i++) {
                        selectedWarehouses.push({
                            id: warehouseIds[i],
                            name: warehouseNames[i],
                        });
                    }
                }
                setSelectedWarehouses(selectedWarehouses);
                */

                setFormData({ ...warehouseData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function isValidNDigitNumber(str, n) {
        const regex = new RegExp(`^\\d{${n}}$`); // Dynamically create regex
        return regex.test(str);
    }

    const validateSaudiPhone = (phone) => {
        const regex = /^(?:\+9665|05)[0-9]{8}$/;
        return regex.test(phone);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        if (formData.phone) {
            formData.phone_in_arabic = convertToArabicNumber(formData.phone.toString());
        }


        if (formData.zipcode) {
            formData.zipcode_in_arabic = convertToArabicNumber(formData.zipcode.toString());
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

        let haveErrors = false;
        errors = {};
        setErrors({ ...errors });

        if (!formData.name) {
            errors["name"] = "Name is required";
            haveErrors = true;
        }

        /*
        if (!formData.name_in_arabic) {
            errors["name_in_arabic"] = "Name in arabic is required";
            haveErrors = true;
        }*/

        /*
        if (!formData.phone) {
            errors["phone"] = "Phone is required";
            haveErrors = true;
        } else if (!validateSaudiPhone(formData.phone)) {
            errors["phone"] = "Invalid phone no.";
            haveErrors = true;
        }*/

        if (formData.phone && !validateSaudiPhone(formData.phone)) {
            errors["phone"] = "Invalid phone no.";
            haveErrors = true;
        }

        /*
        if (!formData.email) {
            errors["email"] = "E-mail is required";
            haveErrors = true;
        } else if (!validateEmail(formData.email)) {
            errors["email"] = "E-mail is not valid";
            haveErrors = true;
        }*/
        if (formData.email && !validateEmail(formData.email)) {
            errors["email"] = "E-mail is not valid";
            haveErrors = true;
        }

        /* if (!formData.address_in_arabic) {
             errors["address_in_arabic"] = "Address in arabic is required";
             haveErrors = true;
         }*/

        /*
        if (!formData.national_address?.building_no) {
            errors["national_address_building_no"] = "Building number is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.national_address?.building_no, 4)) {
                errors["national_address_building_no"] = "Building number should be 4 digits";
                haveErrors = true;
            }
        }*/

        if (formData.national_address?.building_no && !isValidNDigitNumber(formData.national_address?.building_no, 4)) {
            errors["national_address_building_no"] = "Building number should be 4 digits";
            haveErrors = true;
        }

        /* if (!formData.national_address?.street_name) {
             errors["national_address_street_name"] = "Street name is required";
             haveErrors = true;
         }
 
         if (!formData.national_address?.district_name) {
             errors["national_address_district_name"] = "District name is required";
             haveErrors = true;
         }
 
         if (!formData.national_address?.city_name) {
             errors["national_address_city_name"] = "City name is required";
             haveErrors = true;
         }
 
         if (!formData.national_address?.street_name_arabic) {
             errors["national_address_street_name_arabic"] = "Street name arabic is required";
             haveErrors = true;
         }
 
         if (!formData.national_address?.district_name_arabic) {
             errors["national_address_district_name_arabic"] = "District name arabic is required";
             haveErrors = true;
         }
 
         if (!formData.national_address?.city_name_arabic) {
             errors["national_address_city_name_arabic"] = "City name arabic is required";
             haveErrors = true;
         }*/



        /*
   if (!formData.national_address?.zipcode) {
       errors["national_address_zipcode"] = "Zip code is required";
       haveErrors = true;
   } else {
       if (!isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
           errors["national_address_zipcode"] = "Zip code should be 5 digits";
           haveErrors = true;
       }
   }*/

        if (formData.national_address?.zipcode && !isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
            errors["national_address_zipcode"] = "Zip code should be 5 digits";
            haveErrors = true;
        }


        if (haveErrors) {
            setErrors({ ...errors });
            console.log("Errors: ", errors);
            return;
        }
        console.log("formData.logo:", formData.logo);


        if (localStorage.getItem('store_id')) {
            formData.store_id = localStorage.getItem('store_id');
        }

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        let queryParams = ObjectToSearchQueryParams(searchParams);

        let endPoint = "/v1/warehouse";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/warehouse/" + formData.id + "?" + queryParams;
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

        setProcessing(true);
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

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);

                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Warehouse updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Warehouse created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }
                if (localStorage.getItem("warehouse_id")) {
                    if (localStorage.getItem("warehouse_id") === data.result.id) {
                        localStorage.setItem("vat_percent", data.result.vat_percent);
                    }
                }

                handleClose();
                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Failed to process warehouse!", "danger");
            });
    }

    //let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    //   let [selectedWarehouses, setSelectedWarehouses] = useState([]);
    //    let [warehouseOptions, setWarehouseOptions] = useState([]);

    /*
    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }*/
    /*
    async function suggestWarehouses(searchTerm) {
        console.log("Inside handle suggest warehouses");

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
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/warehouse?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        if (formData.id) {
            data.result = data.result.filter(warehouse => warehouse.id !== formData.id);
        }

        setWarehouseOptions(data.result);
    }*/

    //country
    const countryOptions = useMemo(() => countryList().getData(), [])
    //const [selectedCountry, setSelectedCountry] = useState('')
    let [selectedCountries, setSelectedCountries] = useState([]);

    const countrySearchRef = useRef();

    return (
        <>
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Warehouse #" + formData.name : "Create New Warehouse"}
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
                            {formData.id ? "Update" : "Create"}

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
                        <h6><b>General details:</b></h6>

                        <div className="col-md-2">
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
                            </div>
                            {errors.name && (
                                <div style={{ color: "red" }}>
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Name In Arabic</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["v"] = "";
                                        setErrors({ ...errors });
                                        formData.name_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name_in_arabic"
                                    placeholder="Name In Arabic"
                                />
                            </div>
                            {errors.name_in_arabic && (
                                <div style={{ color: "red" }}>
                                    {errors.name_in_arabic}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Phone ( 05.. / +966..)</label>

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


                            </div>
                            {errors.phone && (
                                <div style={{ color: "red" }}>

                                    {errors.phone}
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
                                    id="email"
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
                                    ref={countrySearchRef}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            countrySearchRef.current?.clear();
                                        }
                                    }}
                                    onInputChange={(searchTerm, e) => {
                                        //suggestBrands(searchTerm);
                                    }}
                                />
                            </div>
                            {errors.country_code && (
                                <div style={{ color: "red" }}>
                                    {errors.country_code}
                                </div>
                            )}
                        </div>

                        <h6><b>National Address:</b></h6>
                        <div className="col-md-2">
                            <label className="form-label">Short code</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.short_code ? formData.national_address.short_code : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_short_code"] = "";
                                        formData.national_address.short_code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.short_code "
                                    placeholder="Short code "
                                />
                            </div>
                            {errors.national_address_short_code && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_short_code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Building Number(4 digits)</label>

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


                            </div>
                            {errors.national_address_district_name_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_district_name_arabic}
                                </div>
                            )}

                        </div>


                        <div className="col-md-2">
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



                            </div>
                            {errors.national_address_city_name_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_city_name_arabic}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Zipcode(5 digits)</label>

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



                            </div>
                            {errors.national_address_additional_no && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_additional_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
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



                            </div>
                            {errors.national_address_unit_no && (
                                <div style={{ color: "red" }}>

                                    {errors.national_address_unit_no}
                                </div>
                            )}
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
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
                        </Modal.Footer>
                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default WarehouseCreate;
