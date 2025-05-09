import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import Resizer from "react-image-file-resizer";
import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
//import { DebounceInput } from 'react-debounce-input';

const StoreCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            //selectedStores = [];
            //setSelectedStores(selectedStores);

            formData = {
                national_address: {},
                bank_account: {},
                zatca: {
                    phase: "1",
                    env: "NonProduction",
                },
                business_category: "Supply Activities",
                branch_name: "",
                code: "",
                vat_percent: 15.00,
                sales_serial_number: {
                    prefix: "S-INV",
                    start_from_count: 1,
                    padding_count: 6
                },
                sales_return_serial_number: {
                    prefix: "SR-INV",
                    start_from_count: 1,
                    padding_count: 6
                },
                purchase_serial_number: {
                    prefix: "P-INV",
                    start_from_count: 1,
                    padding_count: 6
                },
                purchase_return_serial_number: {
                    prefix: "PR-INV",
                    start_from_count: 1,
                    padding_count: 6
                },
                quotation_serial_number: {
                    prefix: "QTN",
                    start_from_count: 1,
                    padding_count: 6
                },
                customer_serial_number: {
                    prefix: "CUST",
                    start_from_count: 1,
                    padding_count: 4
                },
                vendor_serial_number: {
                    prefix: "VND",
                    start_from_count: 1,
                    padding_count: 4
                },
                expense_serial_number: {
                    prefix: "EXP",
                    start_from_count: 1,
                    padding_count: 4
                },
                customer_deposit_serial_number: {
                    prefix: "CUST-RCVBLE",
                    start_from_count: 1,
                    padding_count: 4
                },
                customer_withdrawal_serial_number: {
                    prefix: "CUST-PYBLE",
                    start_from_count: 1,
                    padding_count: 4
                },
                capital_deposit_serial_number: {
                    prefix: "CAP-DPST",
                    start_from_count: 1,
                    padding_count: 4
                },
                divident_serial_number: {
                    prefix: "CAP-DRWNG",
                    start_from_count: 1,
                    padding_count: 4
                },
                delivery_note_serial_number: {
                    prefix: "DEL-NOTE",
                    start_from_count: 1,
                    padding_count: 6
                },
            };
            setFormData({ ...formData });
            if (id) {
                getStore(id);
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
        bank_account: {},
        zatca: {
            phase: "1",
            env: "NonProduction",
        },
        branch_name: "",
        vat_percent: 15.00,
        business_category: "Supply Activities",
        sales_serial_number: {
            prefix: "S-INV",
            start_from_count: 1,
            padding_count: 6
        },
        sales_return_serial_number: {
            prefix: "SR-INV",
            start_from_count: 1,
            padding_count: 6
        },
        purchase_serial_number: {
            prefix: "P-INV",
            start_from_count: 1,
            padding_count: 6
        },
        purchase_return_serial_number: {
            prefix: "PR-INV",
            start_from_count: 1,
            padding_count: 6
        },
        quotation_serial_number: {
            prefix: "QTN",
            start_from_count: 1,
            padding_count: 6
        },
        customer_serial_number: {
            prefix: "CUST",
            start_from_count: 1,
            padding_count: 4
        },
        vendor_serial_number: {
            prefix: "VND",
            start_from_count: 1,
            padding_count: 4
        },
        expense_serial_number: {
            prefix: "EXP",
            start_from_count: 1,
            padding_count: 4
        },
        customer_deposit_serial_number: {
            prefix: "CUST-RCVBLE",
            start_from_count: 1,
            padding_count: 4
        },
        customer_withdrawal_serial_number: {
            prefix: "CUST-PAYBLE",
            start_from_count: 1,
            padding_count: 4
        },
        capital_deposit_serial_number: {
            prefix: "CAP-DPST",
            start_from_count: 1,
            padding_count: 4
        },
        divident_serial_number: {
            prefix: "CAP-DRWNG",
            start_from_count: 1,
            padding_count: 4
        },
        delivery_note_serial_number: {
            prefix: "DEL-NOTE",
            start_from_count: 1,
            padding_count: 6
        },
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


    function getStore(id) {
        console.log("inside get Order");
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

                setErrors({});

                console.log("Response:");
                console.log(data);
                let storeData = data.result;
                storeData.logo = "";

                selectedCountries = [];
                if (data.result.country_code && data.result.country_name) {
                    selectedCountries.push({
                        value: data.result.country_code,
                        label: data.result.country_name,
                    });
                }
                setSelectedCountries(selectedCountries);

                //let storeIds = data.result.use_products_from_store_id;
                //let storeNames = data.result.use_products_from_store_names;

                /*
                selectedStores = [];
                if (storeIds && storeNames) {
                    for (var i = 0; i < storeIds.length; i++) {
                        selectedStores.push({
                            id: storeIds[i],
                            name: storeNames[i],
                        });
                    }
                }
                setSelectedStores(selectedStores);
                */

                setFormData({ ...storeData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function resizeFIle(file, w, h, cb) {
        Resizer.imageFileResizer(
            file,
            w,
            h,
            "JPEG",
            100,
            0,
            (uri) => {
                cb(uri);
            },
            "base64"
        );
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

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        formData.use_products_from_store_id = [];
        /*
        for (var i = 0; i < selectedStores.length; i++) {
            formData.use_products_from_store_id.push(selectedStores[i].id);
        }
        */


        if (formData.vat_percent) {
            formData.vat_percent = parseFloat(formData.vat_percent);
        } else {
            formData.vat_percent = null;
        }

        if (formData.phone) {
            formData.phone_in_arabic = convertToArabicNumber(formData.phone.toString());
        }

        if (formData.vat_no) {
            formData.vat_no_in_arabic = convertToArabicNumber(formData.vat_no.toString());
        }

        if (formData.zipcode) {
            formData.zipcode_in_arabic = convertToArabicNumber(formData.zipcode.toString());
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

        let haveErrors = false;
        errors = {};
        setErrors({ ...errors });

        if (!formData.business_category) {
            errors["business_category"] = "Business category is required";
            haveErrors = true;
        }


        if (!formData.name) {
            errors["name"] = "Name is required";
            haveErrors = true;
        }

        if (!formData.name_in_arabic) {
            errors["name_in_arabic"] = "Name in arabic is required";
            haveErrors = true;
        }

        if (!formData.code) {
            errors["code"] = "Branch code is required";
            haveErrors = true;
        }

        if (!formData.branch_name) {
            errors["branch_name"] = "Branch name is required";
            haveErrors = true;
        }

        if (!formData.phone) {
            errors["phone"] = "Phone is required";
            haveErrors = true;
        } else if (!validateSaudiPhone(formData.phone)) {
            errors["phone"] = "Invalid phone no.";
            haveErrors = true;
        }

        if (!formData.registration_number) {
            errors["registration_number"] = "CRN is required";
            haveErrors = true;
        } else if (!IsAlphanumeric(formData.registration_number)) {
            errors["registration_number"] = "CRN should be alpha numeric(a-zA-Z0-9)";
            haveErrors = true;
        }

        if (!formData.zipcode) {
            errors["zipcode"] = "Zipcode is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.zipcode, 5)) {
                errors["zipcode"] = "Zipcode should be 5 digits";
                haveErrors = true;
            }
        }

        if (!formData.vat_no) {
            errors["vat_no"] = "VAT No. is required";
            haveErrors = true;
        } else if (!isValidNDigitNumber(formData.vat_no, 15)) {
            errors["vat_no"] = "VAT No should be 15 digits";
            haveErrors = true;
        } else if (!NumberStartAndEndWith(formData.vat_no, 3)) {
            errors["vat_no"] = "VAT No should start and end with 3";
            haveErrors = true;
        }

        if (!formData.vat_percent) {
            errors["vat_percent"] = "VAT % is required";
            haveErrors = true;
        }

        if (!formData.email) {
            errors["email"] = "E-mail is required";
            haveErrors = true;
        } else if (!validateEmail(formData.email)) {
            errors["email"] = "E-mail is not valid";
            haveErrors = true;
        }

        if (!formData.address) {
            errors["address"] = "Address is required";
            haveErrors = true;
        }

        if (!formData.address_in_arabic) {
            errors["address_in_arabic"] = "Address in arabic is required";
            haveErrors = true;
        }

        if (!formData.logo && !formData.id) {
            errors["logo_content"] = "Logo is required";
            haveErrors = true;
        }





        if (!formData.national_address?.building_no) {
            errors["national_address_building_no"] = "Building number is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.national_address?.building_no, 4)) {
                errors["national_address_building_no"] = "Building number should be 4 digits";
                haveErrors = true;
            }
        }

        if (!formData.national_address?.street_name) {
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
        }



        if (!formData.national_address?.zipcode) {
            errors["national_address_zipcode"] = "Zip code is required";
            haveErrors = true;
        } else {
            if (!isValidNDigitNumber(formData.national_address?.zipcode, 5)) {
                errors["national_address_zipcode"] = "Zip code should be 5 digits";
                haveErrors = true;
            }
        }


        if (haveErrors) {
            setErrors({ ...errors });
            console.log("Errors: ", errors);
            return;
        }
        console.log("formData.logo:", formData.logo);


        let endPoint = "/v1/store";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/store/" + formData.id;
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
                    props.showToastMessage("Store updated successfully!", "success");
                } else {
                    props.showToastMessage("Store created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
                }
                if (localStorage.getItem("store_id")) {
                    if (localStorage.getItem("store_id") === data.result.id) {
                        localStorage.setItem("vat_percent", data.result.vat_percent);
                    }
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
                props.showToastMessage("Failed to process store!", "danger");
            });
    }


    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }

    //let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    //   let [selectedStores, setSelectedStores] = useState([]);
    //    let [storeOptions, setStoreOptions] = useState([]);

    /*
    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }*/
    /*
    async function suggestStores(searchTerm) {
        console.log("Inside handle suggest stores");

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
            "/v1/store?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        if (formData.id) {
            data.result = data.result.filter(store => store.id !== formData.id);
        }

        setStoreOptions(data.result);
    }*/

    //country
    const countryOptions = useMemo(() => countryList().getData(), [])
    //const [selectedCountry, setSelectedCountry] = useState('')
    let [selectedCountries, setSelectedCountries] = useState([]);

    return (
        <>
            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Store #" + formData.name : "Create New Store"}
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
                            <label className="form-label">Zatca phase*</label>

                            <div className="input-group mb-3">
                                <select
                                    value={formData.zatca?.phase}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.zatca.phase = "";
                                            errors["zatca_phase"] = "Invalid Phase";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["zatca_phase"] = "";
                                        setErrors({ ...errors });

                                        formData.zatca.phase = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="1" SELECTED>Phase 1</option>
                                    <option value="2">Phase 2</option>

                                </select>
                            </div>
                            {errors.zatca_phase && (
                                <div style={{ color: "red" }}>
                                    {errors.zatca_phase}
                                </div>
                            )}
                        </div>
                        {formData.zatca?.phase === "2" ? <div className="col-md-2">
                            <label className="form-label">Zatca environment*</label>
                            <div className="input-group mb-3">
                                <select
                                    value={formData.zatca?.env}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.zatca.env = "";
                                            errors["zatca_env"] = "Invalid Env.";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["zatca_env"] = "";
                                        setErrors({ ...errors });

                                        formData.zatca.env = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="NonProduction" SELECTED>NonProduction</option>
                                    <option value="Simulation" >Simulation</option>
                                    <option value="Production" >Production</option>
                                </select>
                            </div>
                            {errors.zatca_env && (
                                <div style={{ color: "red" }}>
                                    {errors.zatca_env}
                                </div>
                            )}
                        </div> : ""}

                        <div className="col-md-2">
                            <label className="form-label">Business category*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.business_category}
                                    type='string'
                                    onChange={(e) => {
                                        errors["business_category"] = "";
                                        setErrors({ ...errors });
                                        formData.business_category = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="business_category"
                                    placeholder="Business category"
                                />
                            </div>
                            {errors.business_category && (
                                <div style={{ color: "red" }}>
                                    {errors.business_category}
                                </div>
                            )}
                        </div>


                        <div className="col-md-4">
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

                        <div className="col-md-4">
                            <label className="form-label">Name In Arabic*</label>

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
                            <label className="form-label">Branch Code*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.code ? formData.code : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["code"] = "";
                                        setErrors({ ...errors });


                                        if (!formData.id) {
                                            if (formData.code) {
                                                formData.sales_serial_number.prefix = formData.sales_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");
                                                // formData.sales_serial_number.prefix = formData.sales_serial_number.prefix.replace(formData.code.toUpperCase(), "-");

                                                formData.sales_return_serial_number.prefix = formData.sales_return_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");
                                                //formData.sales_return_serial_number.prefix = formData.sales_return_serial_number.prefix.replace(formData.code.toUpperCase(), "-");

                                                formData.purchase_serial_number.prefix = formData.purchase_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");
                                                //  formData.purchase_serial_number.prefix = formData.purchase_serial_number.prefix.replace(formData.code.toUpperCase(), "-");

                                                formData.purchase_return_serial_number.prefix = formData.purchase_return_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");
                                                // formData.purchase_return_serial_number.prefix = formData.purchase_return_serial_number.prefix.replace(formData.code.toUpperCase(), "-");

                                                formData.quotation_serial_number.prefix = formData.quotation_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");

                                                formData.customer_serial_number.prefix = formData.customer_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");
                                                formData.vendor_serial_number.prefix = formData.vendor_serial_number.prefix.replace("-" + formData.code.toUpperCase(), "");
                                                // formData.quotation_serial_number.prefix = formData.quotation_serial_number.prefix.replace(formData.code.toUpperCase(), "-");
                                            }

                                            if (e.target.value) {
                                                formData.sales_serial_number.prefix = formData.sales_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                                formData.sales_return_serial_number.prefix = formData.sales_return_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                                formData.purchase_serial_number.prefix = formData.purchase_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                                formData.purchase_return_serial_number.prefix = formData.purchase_return_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                                formData.quotation_serial_number.prefix = formData.quotation_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                                formData.customer_serial_number.prefix = formData.customer_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                                formData.vendor_serial_number.prefix = formData.vendor_serial_number.prefix + "-" + e.target.value.toUpperCase();
                                            }
                                        }




                                        formData.code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="code"
                                    placeholder="Code"
                                />


                            </div>
                            {errors.code && (
                                <div style={{ color: "red" }}>
                                    {errors.code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Branch Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.branch_name}
                                    type='string'
                                    onChange={(e) => {
                                        errors["branch_name"] = "";
                                        setErrors({ ...errors });
                                        formData.branch_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="branch_name"
                                    placeholder="Branch Name"
                                />


                            </div>
                            {errors.branch_name && (
                                <div style={{ color: "red" }}>
                                    {errors.branch_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Title(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.title ? formData.title : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["title"] = "";
                                        setErrors({ ...errors });
                                        formData.title = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="title"
                                    placeholder="Title"
                                />

                            </div>
                            {errors.title && (
                                <div style={{ color: "red" }}>

                                    {errors.title}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Title In Arabic(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.title_in_arabic ? formData.title_in_arabic : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["title_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.title_in_arabic = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="title_in_arabic"
                                    placeholder="Title In Arabic"
                                />


                            </div>
                            {errors.title_in_arabic && (
                                <div style={{ color: "red" }}>

                                    {errors.title_in_arabic}
                                </div>
                            )}
                        </div>

                        {/*<div className="col-md-4">
                            <label className="form-label">Use products from other stores(Optional)</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="use_products_from_store_id"
                                      filterBy={() => true}
                                    labelKey="name"
                                    isInvalid={errors.use_products_from_store_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.use_products_from_store_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            // errors.use_products_from_store_id = "Invalid store selected";
                                            //setErrors(errors);
                                            //setFormData({ ...formData });
                                            setSelectedStores([]);
                                            return;
                                        }
                                        //setFormData({ ...formData });
                                        setSelectedStores(selectedItems);
                                    }}
                                    options={storeOptions}
                                    placeholder="Select Stores"
                                    selected={selectedStores}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                    multiple
                                />


                            </div>
                            {errors.use_products_from_store_id && (
                                <div style={{ color: "red" }}>

                                    {errors.use_products_from_store_id}
                                </div>
                            )}
                        </div>*/}

                        <div className="col-md-2">
                            <label className="form-label">Registration Number(CRN)*</label>

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
                                    id="registration_number"
                                    placeholder="CRN"
                                />


                            </div>
                            {errors.registration_number && (
                                <div style={{ color: "red" }}>

                                    {errors.registration_number}
                                </div>
                            )}
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">Zipcode*(5 digits)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.zipcode ? formData.zipcode : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["zipcode"] = "";
                                        setErrors({ ...errors });
                                        formData.zipcode = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="zipcode"
                                    placeholder="Zipcode"
                                />


                            </div>
                            {errors.zipcode && (
                                <div style={{ color: "red" }}>
                                    {errors.zipcode}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Phone* ( 05.. / +966..)</label>

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


                        <div className="col-md-2">
                            <label className="form-label">VAT NO.* (15 digits)</label>

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


                            </div>
                            {errors.vat_no && (
                                <div style={{ color: "red" }}>

                                    {errors.vat_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-1">
                            <label className="form-label">VAT %*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_percent ? formData.vat_percent : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["vat_percent"] = "";
                                        setErrors({ ...errors });

                                        if (isNaN(e.target.value)) {
                                            errors["vat_percent"] = "Invalid Discount";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        formData.vat_percent = e.target.value;

                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="vat_percent"
                                    placeholder="%"
                                />


                            </div>
                            {errors.vat_percent && (
                                <div style={{ color: "red" }}>

                                    {errors.vat_percent}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Email*</label>

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
                            <label className="form-label">Address*</label>

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
                            <label className="form-label">Address In Arabic*</label>

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

                        <div className="col-md-3">
                            <label className="form-label">Country*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="country_code"
                                    labelKey="label"
                                    filterBy={() => true}
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
                            {errors.country_code && (
                                <div style={{ color: "red" }}>
                                    {errors.country_code}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Logo*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.logo ? formData.logo : ""}
                                    type='file'
                                    onChange={(e) => {
                                        errors["logo_content"] = "";
                                        setErrors({ ...errors });

                                        if (!e.target.value) {
                                            errors["logo_content"] = "Invalid Logo File";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        formData.logo = e.target.value;

                                        let file = document.querySelector('#logo').files[0];

                                        let targetHeight = 100;
                                        let targetWidth = 100;


                                        let url = URL.createObjectURL(file);
                                        let img = new Image();

                                        img.onload = function () {
                                            let originaleWidth = img.width;
                                            let originalHeight = img.height;

                                            let targetDimensions = getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight);
                                            targetWidth = targetDimensions.targetWidth;
                                            targetHeight = targetDimensions.targetHeight;

                                            resizeFIle(file, targetWidth, targetHeight, (result) => {
                                                formData.logo_content = result;
                                                setFormData({ ...formData });

                                                console.log("formData.logo_content:", formData.logo_content);
                                            });
                                        };
                                        img.src = url;

                                        /*
                                        resizeFIle(file, (result) => {
                                            formData.logo_content = result;

                                            console.log("formData.logo_content:", formData.logo_content);

                                            setFormData({ ...formData });
                                        });
                                        */
                                    }}
                                    className="form-control"
                                    id="logo"
                                    placeholder="Logo"
                                />


                            </div>
                            {errors.logo_content && (
                                <div style={{ color: "red" }}>

                                    {errors.logo_content}
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
                            <label className="form-label">Building Number(4 digits)*</label>

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
                            <label className="form-label">Street Name*</label>

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
                            <label className="form-label">District Name*</label>

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
                            <label className="form-label">City Name*</label>

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
                            <label className="form-label">Zipcode(5 digits)*</label>

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

                        <h6><b>Serial Numbers</b></h6>
                        <h6><b>Sales ID's:</b> {formData.sales_serial_number.prefix.toUpperCase()}-{String(formData.sales_serial_number.start_from_count).padStart(formData.sales_serial_number.padding_count, '0')}, {formData.sales_serial_number.prefix.toUpperCase()}-{String((formData.sales_serial_number.start_from_count + 1)).padStart(formData.sales_serial_number.padding_count, '0')}...</h6>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.prefix"] = "";
                                        formData.sales_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />


                            </div>
                            {errors.sales_serial_number_prefix && (
                                <div style={{ color: "red" }}>

                                    {errors.sales_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.padding_count"] = "";
                                        formData.sales_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.formData?.sales_serial_number.padding_count && (
                                <div style={{ color: "red" }}>

                                    {errors.sales_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_serial_number?.start_from_count ? formData.sales_serial_number.start_from_count : ""}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.start_from_count"] = "";
                                        formData.sales_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />


                            </div>
                            {errors.sales_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>

                                    {errors.sales_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Sales Return ID's:</b> {formData.sales_return_serial_number.prefix.toUpperCase()}-{String(formData.sales_return_serial_number.start_from_count).padStart(formData.sales_return_serial_number.padding_count, '0')}, {formData.sales_return_serial_number.prefix.toUpperCase()}-{String((formData.sales_return_serial_number.start_from_count + 1)).padStart(formData.sales_return_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_return_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.prefix"] = "";
                                        formData.sales_return_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_return_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />


                            </div>
                            {errors.sales_return_serial_number_prefix && (
                                <div style={{ color: "red" }}>

                                    {errors.sales_return_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_return_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.sales_serial_number.padding_count"] = "";
                                        formData.sales_return_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_return_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.sales_return_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    {errors.sales_return_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.sales_return_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.sales_return_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.sales_serial_number.start_from_count"] = "";
                                        formData.sales_return_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.sales_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.sales_return_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    {errors.sales_return_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Purchase ID's:</b> {formData.purchase_serial_number.prefix.toUpperCase()}-{String(formData.purchase_serial_number.start_from_count).padStart(formData.purchase_serial_number.padding_count, '0')}, {formData.purchase_serial_number.prefix.toUpperCase()}-{String((formData.purchase_serial_number.start_from_count + 1)).padStart(formData.purchase_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.purchase_serial_number.prefix"] = "";
                                        formData.purchase_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_serial_number.prefix"
                                    placeholder="S-INV-UMLJ"
                                />

                            </div>

                            {errors.purchase_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    {errors.purchase_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.purchase_serial_number.padding_count"] = "";
                                        formData.purchase_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.purchase_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    {errors.purchase_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.purchase_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.purchase_serial_number.start_from_count"] = "";
                                        formData.purchase_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />

                            </div>
                            {errors.purchase_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Purchase Return ID's:</b> {formData.purchase_return_serial_number.prefix.toUpperCase()}-{String(formData.purchase_return_serial_number.start_from_count).padStart(formData.purchase_return_serial_number.padding_count, '0')}, {formData.purchase_return_serial_number.prefix.toUpperCase()}-{String((formData.purchase_return_serial_number.start_from_count + 1)).padStart(formData.purchase_return_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_return_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.purchase_return_serial_number.prefix"] = "";
                                        formData.purchase_return_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_return_serial_number.prefix"
                                    placeholder="PR-INV-UMLJ"
                                />


                            </div>
                            {errors.purchase_return_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_return_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_return_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.purchase_return_serial_number.padding_count"] = "";
                                        formData.purchase_return_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_return_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />


                            </div>
                            {errors.purchase_return_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_return_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.purchase_return_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.purchase_return_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.purchase_return_serial_number.start_from_count"] = "";
                                        formData.purchase_return_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.purchase_return_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />

                            </div>

                            {errors.purchase_return_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.purchase_return_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Quotation ID's:</b> {formData.quotation_serial_number.prefix.toUpperCase()}-{String(formData.quotation_serial_number.start_from_count).padStart(formData.quotation_serial_number.padding_count, '0')}, {formData.quotation_serial_number.prefix.toUpperCase()}-{String((formData.quotation_serial_number.start_from_count + 1)).padStart(formData.quotation_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.quotation_serial_number.prefix"] = "";
                                        formData.quotation_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_serial_number.prefix"
                                    placeholder="QTN-UMLJ"
                                />


                            </div>
                            {errors.quotation_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.quotation_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.quotation_serial_number.padding_count"] = "";
                                        formData.quotation_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.quotation_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.quotation_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from*</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.quotation_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.quotation_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.quotation_serial_number.start_from_count"] = "";
                                        formData.quotation_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.quotation_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.quotation_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.quotation_serial_number_start_from_count}
                                </div>
                            )}
                        </div>


                        <h5><b>Customer ID's:</b> {formData.customer_serial_number.prefix.toUpperCase()}-{String(formData.customer_serial_number.start_from_count).padStart(formData.customer_serial_number.padding_count, '0')}, {formData.customer_serial_number.prefix.toUpperCase()}-{String((formData.customer_serial_number.start_from_count + 1)).padStart(formData.customer_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {

                                        errors["formData.customer_serial_number.prefix"] = "";
                                        formData.customer_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_serial_number.prefix"
                                    placeholder="CUST-UMLJ"
                                />


                            </div>
                            {errors.customer_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.customer_serial_number.padding_count"] = "";
                                        formData.customer_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.customer_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.customer_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["formData.customer_serial_number.start_from_count"] = "";
                                        formData.customer_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.customer_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Vendor ID's:</b> {formData.vendor_serial_number.prefix.toUpperCase()}-{String(formData.vendor_serial_number.start_from_count).padStart(formData.vendor_serial_number.padding_count, '0')}, {formData.vendor_serial_number.prefix.toUpperCase()}-{String((formData.vendor_serial_number.start_from_count + 1)).padStart(formData.vendor_serial_number.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["formData.vendor_serial_number.prefix"] = "";
                                        formData.vendor_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.vendor_serial_number.prefix"
                                    placeholder="VND-UMLJ"
                                />


                            </div>
                            {errors.vendor_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["formData.vendor_serial_number.padding_count"] = "";
                                        formData.vendor_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.vendor_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.vendor_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.vendor_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.vendor_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["vendor_serial_number_start_from_count"] = "";
                                        formData.vendor_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.vendor_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.vendor_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.vendor_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Expense ID's:</b> {formData.expense_serial_number?.prefix.toUpperCase()}-{String(formData.expense_serial_number?.start_from_count).padStart(formData.expense_serial_number.padding_count, '0')}, {formData.expense_serial_number?.prefix.toUpperCase()}-{String((formData.expense_serial_number?.start_from_count + 1)).padStart(formData.expense_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.expense_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["expense_serial_number_prefix"] = "";
                                        formData.expense_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.expense_serial_number.prefix"
                                    placeholder="EXP-UMLJ"
                                />


                            </div>
                            {errors.expense_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.expense_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.expense_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["expense_serial_number.padding_count"] = "";
                                        formData.expense_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.expense_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.expense_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.expense_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.expense_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.expense_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["expense_serial_number.start_from_count"] = "";
                                        formData.expense_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.expense_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.expense_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.expense_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Delivery Note ID's:</b> {formData.delivery_note_serial_number?.prefix.toUpperCase()}-{String(formData.delivery_note_serial_number?.start_from_count).padStart(formData.delivery_note_serial_number.padding_count, '0')}, {formData.delivery_note_serial_number?.prefix.toUpperCase()}-{String((formData.delivery_note_serial_number?.start_from_count + 1)).padStart(formData.delivery_note_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.delivery_note_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["delivery_note_serial_number.prefix"] = "";
                                        formData.delivery_note_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.delivery_note_serial_number.prefix"
                                    placeholder="DEL-NOTE"
                                />


                            </div>
                            {errors.delivery_note_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.delivery_note_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.delivery_note_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["delivery_note_serial_number.padding_count"] = "";
                                        formData.delivery_note_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.delivery_note_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.delivery_note_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.delivery_note_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.delivery_note_serial_number.start_from_count}
                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.delivery_note_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["delivery_note_serial_number.start_from_count"] = "";
                                        formData.delivery_note_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.delivery_note_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.delivery_note_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.delivery_note_serial_number_start_from_count}
                                </div>
                            )}
                        </div>
                        <h5><b>Customer Receivable ID's:</b> {formData.customer_deposit_serial_number?.prefix.toUpperCase()}-{String(formData.customer_deposit_serial_number?.start_from_count).padStart(formData.customer_deposit_serial_number.padding_count, '0')}, {formData.customer_deposit_serial_number?.prefix.toUpperCase()}-{String((formData.ustomer_deposit_serial_number?.start_from_count + 1)).padStart(formData.ustomer_deposit_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_deposit_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["customer_deposit_serial_number.prefix"] = "";
                                        formData.customer_deposit_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_deposit_serial_number.prefix"
                                    placeholder="CUST-RCVBLE"
                                />


                            </div>
                            {errors.customer_deposit_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_deposit_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_deposit_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["customer_deposit_serial_number.padding_count"] = "";
                                        formData.customer_deposit_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_deposit_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.customer_deposit_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_deposit_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_deposit_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.customer_deposit_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["customer_deposit_serial_number.start_from_count"] = "";
                                        formData.customer_deposit_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_deposit_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.customer_deposit_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_deposit_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Customer Payable ID's:</b> {formData.customer_withdrawal_serial_number?.prefix.toUpperCase()}-{String(formData.customer_withdrawal_serial_number?.start_from_count).padStart(formData.customer_withdrawal_serial_number.padding_count, '0')}, {formData.customer_withdrawal_serial_number?.prefix.toUpperCase()}-{String((formData.customer_withdrawal_serial_number?.start_from_count + 1)).padStart(formData.customer_withdrawal_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_withdrawal_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["customer_withdrawal_serial_number.prefix"] = "";
                                        formData.customer_withdrawal_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.customer_withdrawal_serial_number.prefix"
                                    placeholder="CUST-PYBLE"
                                />


                            </div>
                            {errors.customer_withdrawal_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_withdrawal_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_withdrawal_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["customer_withdrawal_serial_number.padding_count"] = "";
                                        formData.customer_withdrawal_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_withdrawal_serial_number.padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.customer_withdrawal_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_withdrawal_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.customer_withdrawal_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.customer_withdrawal_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["customer_deposit_serial_number.start_from_count"] = "";
                                        formData.customer_withdrawal_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="customer_withdrawal_serial_number.start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.customer_withdrawal_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.customer_withdrawal_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Capital ID's:</b> {formData.capital_deposit_serial_number?.prefix.toUpperCase()}-{String(formData.capital_deposit_serial_number?.start_from_count).padStart(formData.capital_deposit_serial_number.padding_count, '0')}, {formData.capital_deposit_serial_number?.prefix.toUpperCase()}-{String((formData.capital_deposit_serial_number?.start_from_count + 1)).padStart(formData.capital_deposit_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.capital_deposit_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["capital_deposit_serial_number.prefix"] = "";
                                        formData.capital_deposit_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="formData.capital_deposit_serial_number.prefix"
                                    placeholder="CAP-DEPO"
                                />


                            </div>
                            {errors.capital_deposit_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.capital_deposit_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.capital_deposit_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["capital_deposit_serial_number_padding_count"] = "";
                                        formData.capital_deposit_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="capital_deposit_serial_number_padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.capital_deposit_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.capital_deposit_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.capital_deposit_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.capital_deposit_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["capital_deposit_serial_number.start_from_count"] = "";
                                        formData.capital_deposit_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="capital_deposit_serial_number_start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.capital_deposit_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.capital_deposit_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h5><b>Drawing ID's:</b> {formData.divident_serial_number?.prefix.toUpperCase()}-{String(formData.divident_serial_number?.start_from_count).padStart(formData.divident_serial_number.padding_count, '0')}, {formData.divident_serial_number?.prefix.toUpperCase()}-{String((formData.divident_serial_number?.start_from_count + 1)).padStart(formData.divident_serial_number?.padding_count, '0')}...</h5>
                        <div className="col-md-2">
                            <label className="form-label">Prefix</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.divident_serial_number.prefix}
                                    type='string'
                                    onChange={(e) => {
                                        errors["divident_serial_number.prefix"] = "";
                                        formData.divident_serial_number.prefix = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="divident_serial_number.prefix"
                                    placeholder="CAP-DRWNG"
                                />


                            </div>
                            {errors.divident_serial_number_prefix && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.divident_serial_number_prefix}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Padding count</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.divident_serial_number.padding_count}
                                    type='number'
                                    onChange={(e) => {

                                        errors["divident_serial_number_padding_count"] = "";
                                        formData.divident_serial_number.padding_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="divident_serial_number_padding_count"
                                    placeholder="4 will make counter value: 0001"
                                />
                            </div>
                            {errors.divident_serial_number_padding_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.divident_serial_number_padding_count}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Counting start from</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.divident_serial_number.start_from_count}

                                    type='number'
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            formData.divident_serial_number.start_from_count = e.target.value;
                                            setFormData({ ...formData });
                                            return
                                        }
                                        errors["divident_serial_number.start_from_count"] = "";
                                        formData.divident_serial_number.start_from_count = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="divident_serial_number_start_from_count"
                                    placeholder="eg: Start counting from 1000"
                                />
                            </div>
                            {errors.divident_serial_number_start_from_count && (
                                <div style={{ color: "red" }}>
                                    <i className="bi bi-x-lg"> </i>
                                    {errors.divident_serial_number_start_from_count}
                                </div>
                            )}
                        </div>

                        <h6><b>Bank Account:</b></h6>
                        <div className="col-md-4">
                            <label className="form-label">Bank Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.bank_name ? formData.bank_account.bank_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_bank_name"] = "";
                                        formData.bank_account.bank_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_bank_name"
                                    placeholder="Bank Name"
                                />



                            </div>
                            {errors.bank_account_bank_name && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_account_bank_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Customer No.</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.customer_no ? formData.bank_account.customer_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_customer_no"] = "";
                                        formData.bank_account.customer_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_customer_no"
                                    placeholder="Customer No"
                                />
                            </div>
                            {errors.bank_account_customer_no && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_account_customer_no}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">IBAN</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.iban ? formData.bank_account.iban : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_iban"] = "";
                                        formData.bank_account.iban = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_iban"
                                    placeholder="IBAN"
                                />
                            </div>
                            {errors.bank_account_iban && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_account_iban}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Account Name</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.account_name ? formData.bank_account.account_name : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_account_name"] = "";
                                        formData.bank_account.account_name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_account_name"
                                    placeholder="Account Name"
                                />
                            </div>
                            {errors.bank_account_account_name && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_account_account_name}
                                </div>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Account No.</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.bank_account.account_no ? formData.bank_account.account_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["bank_account_account_no"] = "";
                                        formData.bank_account.account_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="bank_account_account_no"
                                    placeholder="Account No."
                                />
                            </div>
                            {errors.bank_account_account_no && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_account_account_no}
                                </div>
                            )}
                        </div>

                        <h6><b>Settings</b></h6>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.show_address_in_invoice_footer}
                                    checked={formData.show_address_in_invoice_footer}
                                    onChange={(e) => {

                                        errors["formData.show_address_in_invoice_footer"] = "";
                                        formData.show_address_in_invoice_footer = !formData.show_address_in_invoice_footer
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="formData.show_address_in_invoice_footer"

                                /> &nbsp;Show addres in invoice footer
                            </div>
                            <label className="form-label"></label>
                            {errors.show_address_in_invoice_footer && (
                                <div style={{ color: "red" }}>
                                    {errors.show_address_in_invoice_footer}
                                </div>
                            )}
                        </div>
                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.show_received_by_footer_in_invoice}
                                    checked={formData.show_received_by_footer_in_invoice}
                                    onChange={(e) => {

                                        errors["show_received_by_footer_in_invoice"] = "";
                                        formData.show_received_by_footer_in_invoice = !formData.show_received_by_footer_in_invoice
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="show_received_by_footer_in_invoice"
                                    name="show_received_by_footer_in_invoice"

                                /> &nbsp;Show received by footer in invoices
                            </div>
                            <label className="form-label"></label>
                            {errors.show_received_by_footer_in_invoice && (
                                <div style={{ color: "red" }}>
                                    {errors.show_received_by_footer_in_invoice}
                                </div>
                            )}
                        </div>



                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.zatca_qr_on_left_bottom}
                                    checked={formData.zatca_qr_on_left_bottom}
                                    onChange={(e) => {

                                        errors["formData.zatca_qr_on_left_bottom"] = "";
                                        formData.zatca_qr_on_left_bottom = !formData.zatca_qr_on_left_bottom
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="formData.zatca_qr_on_left_bottom"
                                /> &nbsp;Zatca QR on left bottom
                            </div>
                            <label className="form-label"></label>
                            {errors.zatca_qr_on_left_bottom && (
                                <div style={{ color: "red" }}>
                                    {errors.zatca_qr_on_left_bottom}
                                </div>
                            )}
                        </div>

                        <div className="col-md-2">
                            <div className="input-group mb-3">
                                <input type="checkbox"
                                    value={formData.default_unit_price_is_with_vat}
                                    checked={formData.default_unit_price_is_with_vat}
                                    onChange={(e) => {

                                        errors["default_unit_price_is_with_vat"] = "";
                                        formData.default_unit_price_is_with_vat = !formData.default_unit_price_is_with_vat;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className=""
                                    id="default_unit_price_is_with_vat"
                                /> &nbsp;Default product unit price is with VAT?
                            </div>
                            <label className="form-label"></label>
                            {errors.default_unit_price_is_with_vat && (
                                <div style={{ color: "red" }}>
                                    {errors.default_unit_price_is_with_vat}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Default quotation validity (# of Days)*</label>
                            <div className="input-group mb-3">
                                <input
                                    type="number"
                                    className="text-center"
                                    style={{ width: "50px" }}
                                    value={formData.default_quotation_validity_days}
                                    onChange={(e) => {
                                        console.log("Inside onchange validity days");
                                        if (!e.target.value) {
                                            formData.default_quotation_validity_days = null;
                                            errors["default_quotation_validity_days"] = "";
                                            setFormData({ ...formData });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (parseInt(e.target.value) <= 0) {
                                            formData.default_quotation_validity_days = parseInt(e.target.value);
                                            setFormData({ ...formData });
                                            errors["default_quotation_validity_days"] =
                                                "Deafult quotation validity days should be > 0";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["default_quotation_validity_days"] = "";
                                        setErrors({ ...errors });
                                        formData.default_quotation_validity_days = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.default_quotation_validity_days && (
                                    <div style={{ color: "red" }}>
                                        {errors.default_quotation_validity_days}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Default quotation delivery (# of Days)*</label>
                            <div className="input-group mb-3">
                                <input
                                    type="number"
                                    className="text-center"
                                    style={{ width: "50px" }}
                                    value={formData.default_quotation_delivery_days}
                                    onChange={(e) => {
                                        console.log("Inside onchange delivery days");
                                        if (!e.target.value) {
                                            formData.default_quotation_delivery_days = null;
                                            errors["default_quotation_delivery_days"] = "";
                                            setFormData({ ...formData });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        if (parseInt(e.target.value) <= 0) {
                                            formData.default_quotation_delivery_days = parseInt(e.target.value);
                                            setFormData({ ...formData });
                                            errors["default_quotation_delivery_days"] =
                                                "Default quotation delivery days should be > 0";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["default_quotation_delivery_days"] = "";
                                        setErrors({ ...errors });
                                        formData.default_quotation_delivery_days = parseInt(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                />

                                {errors.default_quotation_delivery_days && (
                                    <div style={{ color: "red" }}>
                                        {errors.default_quotation_delivery_days}
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

export default StoreCreate;
