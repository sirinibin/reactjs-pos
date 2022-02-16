import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import StoreView from "./view.js";
import Resizer from "react-image-file-resizer";

const StoreCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = { national_address: {} };
            setFormData({ national_address: {} });
            if (id) {
                getStore(id);
            }

            SetShow(true);
        },

    }));


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        national_address: {}
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
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
                'Authorization': cookies.get('access_token'),
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


    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


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
                Authorization: cookies.get("access_token"),
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
                props.showToastMessage("Store Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating Store!", "danger");
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

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    return (
        <>
            <StoreView ref={DetailsViewRef} />
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Store #" + formData.name : "Create New Store"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewStoreModal"
                        >
                            <i className="bi bi-display"></i> Preview
                        </button> */}
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

                        <div className="col-md-12 align-self-end text-end">
                            <Button variant="primary" type="submit" >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Creating..."

                                    : ""
                                }
                                {formData.id ? "Update" : "Create"}

                            </Button>
                        </div>


                        <div className="col-md-6">
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
                                {formData.name && !errors.name && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {errors.name_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.name_in_arabic}
                                    </div>
                                )}
                                {formData.name_in_arabic && !errors.name_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Code*</label>

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
                                    id="code"
                                    placeholder="Code"
                                />
                                {errors.code && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.code}
                                    </div>
                                )}
                                {formData.code && !errors.code && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
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
                                {errors.title && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.title}
                                    </div>
                                )}
                                {formData.title && !errors.title && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {errors.title_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.title_in_arabic}
                                    </div>
                                )}
                                {formData.title_in_arabic && !errors.title_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>



                        <div className="col-md-6">
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
                                {errors.address && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.address}
                                    </div>
                                )}
                                {formData.address && !errors.address && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {errors.address_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.address_in_arabic}
                                    </div>
                                )}
                                {formData.address_in_arabic && !errors.address_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Registration Number(C.R NO.)*</label>

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
                                {formData.registration_number && !errors.registration_number && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label">Zipcode*</label>

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
                                {errors.zipcode && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.zipcode}
                                    </div>
                                )}
                                {formData.zipcode && !errors.zipcode && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Phone*</label>

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
                                {formData.phone && !errors.phone && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label">VAT NO.*</label>

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
                                {formData.vat_no && !errors.vat_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                    placeholder="Vat %"
                                />
                                {errors.vat_percent && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.vat_percent}
                                    </div>
                                )}
                                {formData.vat_percent && !errors.vat_percent && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>




                        <div className="col-md-6">
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

                                {errors.email && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.email}
                                    </div>
                                )}
                                {formData.email && !errors.email && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {errors.logo_content && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.logo_content}
                                    </div>
                                )}
                                {formData.logo_content && !errors.logo_content && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <h2>National Address:</h2>

                        <div className="col-md-6">
                            <label className="form-label">Application Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.application_no ? formData.national_address.application_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_application_no"] = "";
                                        formData.national_address.application_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.application_no"
                                    placeholder="Application Number"
                                />

                                {errors.national_address_application_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_application_no}
                                    </div>
                                )}
                                {formData.national_address && formData.national_address.application_no && !errors.national_address_application_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Service Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.service_no ? formData.national_address.service_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_service_no"] = "";
                                        formData.national_address.service_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.service_no"
                                    placeholder="Service Number"
                                />

                                {errors.national_address_service_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_service_no}
                                    </div>
                                )}
                                {formData.national_address && formData.national_address.service_no && !errors.national_address_service_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Customer Account Number</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.national_address.customer_account_no ? formData.national_address.customer_account_no : ""}
                                    type='string'
                                    onChange={(e) => {

                                        errors["national_address_customer_account_no"] = "";
                                        formData.national_address.customer_account_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="national_address.customer_account_no"
                                    placeholder="Customer Account Number"
                                />

                                {errors.national_address_customer_account_no && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.national_address_customer_account_no}
                                    </div>
                                )}
                                {formData.national_address && formData.national_address.customer_account_no && !errors.national_address_customer_account_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.building_no && !errors.national_address_building_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.street_name && !errors.national_address_street_name && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.street_name_arabic && !errors.national_address_street_name_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.district_name && !errors.national_address_district_name && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.district_name_arabic && !errors.national_address_district_name_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.city_name && !errors.national_address_city_name && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.city_name_arabic && !errors.national_address_city_name_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.zipcode && !errors.national_address_zipcode && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.additional_no && !errors.national_address_additional_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.national_address && formData.national_address.unit_no && !errors.national_address_unit_no && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" type="submit" >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Creating..."

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

export default StoreCreate;
