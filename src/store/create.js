import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import StoreView from "./view.js";
import Resizer from "react-image-file-resizer";
import { toArabic } from 'arabic-digits';

const StoreCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData({});
            if (id) {
                getStore(id);
            }

            SetShow(true);
        },

    }));

    const selectedDate = new Date();

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({});

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



    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function resizeFIle(file, cb) {
        Resizer.imageFileResizer(
            file,
            100,
            100,
            "JPEG",
            100,
            0,
            (uri) => {
                cb(uri);
            },
            "base64"
        );
    }

    function getBase64(file, cb) {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            cb(reader.result);
        };
        reader.onerror = function (error) {
            console.log('Error: ', error);
        };
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        if (formData.vat_percent) {
            formData.vat_percent = parseFloat(formData.vat_percent);
        } else {
            formData.vat_percent = null;
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

    //let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");

    function convertToEnglishNumber(input) {
        return input.replace(/[\u06F0-\u06F90]/g, function (m) {
            return persianDigits.indexOf(m);
        });
    }

    function convertToPersianNumber(input) {
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
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop={true}>
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

                        <div className="col-md-6">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.name}
                                    </div>
                                )}
                                {formData.name && !errors.name && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Name In Arabic*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name_in_arabic}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.name_in_arabic}
                                    </div>
                                )}
                                {formData.name_in_arabic && !errors.name_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Title(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.title}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.title}
                                    </div>
                                )}
                                {formData.title && !errors.title && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Title In Arabic(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.title_in_arabic}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.title_in_arabic}
                                    </div>
                                )}
                                {formData.title_in_arabic && !errors.title_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Registration Number(C.R NO.)*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.registration_number}
                                    type='number'
                                    onChange={(e) => {
                                        errors["registration_number"] = "";
                                        setErrors({ ...errors });
                                        formData.registration_number = e.target.value;
                                        formData.registration_number_in_arabic = convertToPersianNumber(formData.registration_number.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="registration_number"
                                    placeholder="Registration Number(C.R NO.)"
                                />
                                {errors.registration_number && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.registration_number}
                                    </div>
                                )}
                                {formData.registration_number && !errors.registration_number && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Registration Number(C.R NO.) In Arabic*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.registration_number_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["registration_number"] = "";
                                        setErrors({ ...errors });
                                        formData.registration_number_in_arabic = e.target.value;
                                        formData.registration_number = convertToEnglishNumber(formData.registration_number_in_arabic.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="registration_number_in_arabic"
                                    placeholder="Registration Number(C.R NO.) In Arabic"
                                />
                                {errors.registration_number_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.registration_number}
                                    </div>
                                )}
                                {formData.registration_number_in_arabic && !errors.registration_number_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.address}
                                    </div>
                                )}
                                {formData.address && !errors.address && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.address_in_arabic}
                                    </div>
                                )}
                                {formData.address_in_arabic && !errors.address_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">ZIP/PIN Code*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.zipcode}
                                    type='number'
                                    onChange={(e) => {
                                        errors["zipcode"] = "";
                                        setErrors({ ...errors });
                                        formData.zipcode = e.target.value;
                                        formData.zipcode_in_arabic = convertToPersianNumber(formData.zipcode.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="zipcode"
                                    placeholder="ZIP/PIN Code"
                                />
                                {errors.zipcode && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.zipcode}
                                    </div>
                                )}
                                {formData.zipcode && !errors.zipcode && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">ZIP/PIN Code In Arabic*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.zipcode_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["zipcode_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.zipcode_in_arabic = e.target.value;
                                        formData.zipcode = convertToEnglishNumber(formData.zipcode_in_arabic.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="zipcode_in_arabic"
                                    placeholder="ZIP/PIN Code In Arabic"
                                />
                                {errors.zipcode_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.zipcode_in_arabic}
                                    </div>
                                )}
                                {formData.zipcode_in_arabic && !errors.zipcod_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Phone*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.phone}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone"] = "";
                                        setErrors({ ...errors });
                                        formData.phone = e.target.value;
                                        formData.phone_in_arabic = convertToPersianNumber(formData.phone);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="phone"
                                    placeholder="Phone"
                                />
                                {errors.phone && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.phone}
                                    </div>
                                )}
                                {formData.phone && !errors.phone && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Phone In Arabic*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.phone_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["phone_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.phone_in_arabic = e.target.value;
                                        formData.phone = convertToEnglishNumber(formData.phone_in_arabic.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="phone_in_arabic"
                                    placeholder="Phone NO. In Arabic"
                                />
                                {errors.phone_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.phone_in_arabic}
                                    </div>
                                )}
                                {formData.phone_in_arabic && !errors.phone_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label">VAT NO.*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_no}
                                    type='string'
                                    onChange={(e) => {
                                        errors["vat_no"] = "";
                                        setErrors({ ...errors });
                                        formData.vat_no = e.target.value;
                                        formData.vat_no_in_arabic = convertToPersianNumber(formData.vat_no.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="vat_no"
                                    placeholder="VAT NO."
                                />
                                {errors.vat_no && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.vat_no}
                                    </div>
                                )}
                                {formData.vat_no && !errors.vat_no && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">VAT NO. In Arabic*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_no_in_arabic}
                                    type='string'
                                    onChange={(e) => {
                                        errors["vat_no_in_arabic"] = "";
                                        setErrors({ ...errors });
                                        formData.vat_no_in_arabic = e.target.value;
                                        formData.vat_no = convertToEnglishNumber(formData.vat_no_in_arabic.toString());
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="vat_no_in_arabic"
                                    placeholder="VAT NO. In Arabic"
                                />
                                {errors.vat_no_in_arabic && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.vat_no_in_arabic}
                                    </div>
                                )}
                                {formData.vat_no_in_arabic && !errors.vat_no_in_arabic && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label">VAT %*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_percent}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.vat_percent}
                                    </div>
                                )}
                                {formData.vat_percent && !errors.vat_percent && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>




                        <div className="col-md-6">
                            <label className="form-label">Email*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.email}
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
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.email}
                                    </div>
                                )}
                                {formData.email && !errors.email && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Logo*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.logo}
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

                                        resizeFIle(file, (result) => {
                                            formData.logo_content = result;

                                            console.log("formData.logo_content:", formData.logo_content);

                                            setFormData({ ...formData });
                                        });
                                    }}
                                    className="form-control"
                                    id="logo"
                                    placeholder="Logo"
                                />
                                {errors.logo_content && (
                                    <div style={{ color: "red" }}>
                                        <i class="bi bi-x-lg"> </i>
                                        {errors.logo_content}
                                    </div>
                                )}
                                {formData.logo_content && !errors.logo_content && (
                                    <div style={{ color: "green" }}>
                                        <i class="bi bi-check-lg"> </i>
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
                                        animation="bstore"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
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
