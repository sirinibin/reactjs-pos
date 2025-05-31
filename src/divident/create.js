import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import Resizer from "react-image-file-resizer";
import DatePicker from "react-datepicker";
import { format } from "date-fns";

const DividentCreate = forwardRef((props, ref) => {

    //Store Auto Suggestion



    useImperativeHandle(ref, () => ({
        open(id) {

            formData = {
                images_content: [],
            };
            setFormData({ formData });

            if (id) {
                getDivident(id);
            }

            getStore(localStorage.getItem("store_id"));

            SetShow(true);
        },

    }));

    let [store, setStore] = useState({});

    async function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
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
                setStore(store);
            })
            .catch(error => {

            });
    }

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-divident.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if (event.target.getAttribute("class").includes("description")) {
                            form.elements[index].focus();
                            form.elements[index].value += '\r\n';
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

    let [selectedImage, setSelectedImage] = useState("");


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        images_content: [],
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getDivident(id) {
        console.log("inside get Divident");
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

        fetch('/v1/divident/' + id + "?" + queryParams, requestOptions)
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

                let selectedWithdrawnByUsers = [
                    {
                        id: formData.withdrawn_by_user_id,
                        name: formData.withdrawn_by_user_name,
                    }
                ];

                setSelectedWithdrawnByUsers([...selectedWithdrawnByUsers]);

                formData.images_content = [];
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
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

    //WithdrawnByUser Auto Suggestion
    const [withdrawnbyuserOptions, setWithdrawnByUserOptions] = useState([]);
    const [selectedWithdrawnByUsers, setSelectedWithdrawnByUsers] = useState([]);
    const [isWithdrawnByUsersLoading, setIsWithdrawnByUsersLoading] = useState(false);

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestWithdrawnByUsers");
        setWithdrawnByUserOptions([]);

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
        setIsWithdrawnByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setWithdrawnByUserOptions(data.result);
        setIsWithdrawnByUsersLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }

        let endPoint = "/v1/divident";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/divident/" + formData.id;
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
                if (props.showToastMessage) props.showToastMessage("Divident Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }

                handleClose();
                if (props.openDetailsView) {
                    if (props.openDetailsView)
                        props.openDetailsView(data.result.id);
                }

            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Error Creating Divident!", "danger");
            });
    }


    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }

    /*
    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    */



    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update WithdrawnByUser Divident #" + formData.description : "Create New Divident Withdrawal"}
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
                        <div className="col-md-6">
                            <label className="form-label">Withdrawn By User*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="withdrawn_by_user_id"

                                    labelKey="name"
                                    isLoading={isWithdrawnByUsersLoading}
                                    isInvalid={errors.withdrawn_by_user_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.withdrawn_by_user_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.withdrawn_by_user_id = "Invalid User selected";
                                            setErrors(errors);
                                            formData.withdrawn_by_user_id = "";
                                            setFormData({ ...formData });
                                            setSelectedWithdrawnByUsers([]);
                                            return;
                                        }
                                        formData.withdrawn_by_user_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedWithdrawnByUsers(selectedItems);
                                    }}
                                    options={withdrawnbyuserOptions}
                                    placeholder="Select WithdrawnByUser"
                                    selected={selectedWithdrawnByUsers}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestUsers(searchTerm);
                                    }}
                                />
                                <Button hide={true.toString()} onClick={props.openUserCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.withdrawn_by_user_id && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.withdrawn_by_user_id}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.amount ? formData.amount : ""}
                                    type='number'
                                    onChange={(e) => {
                                        errors["amount"] = "";
                                        setErrors({ ...errors });
                                        formData.amount = parseFloat(e.target.value);
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="amount"
                                    placeholder="Amount"
                                />
                                {errors.amount && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.amount}
                                    </div>
                                )}
                                {formData.amount && !errors.amount && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>



                        <div className="col-md-6">
                            <label className="form-label">Description*</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.description ? formData.description : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["description"] = "";
                                        setErrors({ ...errors });
                                        formData.description = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control description"
                                    id="description"
                                    placeholder="Description"
                                />
                                {errors.description && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.description}
                                    </div>
                                )}
                                {formData.description && !errors.description && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Date Time*</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="date_str"
                                    selected={formData.date_str ? new Date(formData.date_str) : null}
                                    value={formData.date_str ? format(
                                        new Date(formData.date_str),
                                        "MMMM d, yyyy h:mm aa"
                                    ) : null}
                                    className="form-control"
                                    dateFormat="MMMM d, yyyy h:mm aa"
                                    showTimeSelect
                                    timeIntervals="1"
                                    onChange={(value) => {
                                        console.log("Value", value);
                                        formData.date_str = value;
                                        // formData.date_str = format(new Date(value), "MMMM d yyyy h:mm aa");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.date_str && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.date_str}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Payment method*</label>

                            <div className="input-group mb-3">
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => {
                                        console.log("Inside onchange payment method");
                                        if (!e.target.value) {
                                            formData.payment_method = "";
                                            errors["status"] = "Invalid Payment Method";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["payment_method"] = "";
                                        setErrors({ ...errors });

                                        formData.payment_method = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="" SELECTED>Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="debit_card">Debit Card</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="bank_card">Bank Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="bank_cheque">Bank Cheque</option>
                                </select>
                                {errors.payment_method && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.payment_method}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Image(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={selectedImage ? selectedImage : ""}
                                    type='file'
                                    onChange={(e) => {
                                        errors["image"] = "";
                                        setErrors({ ...errors });

                                        if (!e.target.value) {
                                            errors["image"] = "Invalid Image File";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        selectedImage = e.target.value;
                                        setSelectedImage(selectedImage);

                                        let file = document.querySelector('#image').files[0];


                                        let targetHeight = 400;
                                        let targetWidth = 400;


                                        let url = URL.createObjectURL(file);
                                        let img = new Image();

                                        img.onload = function () {
                                            let originaleWidth = img.width;
                                            let originalHeight = img.height;

                                            let targetDimensions = getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight);
                                            targetWidth = targetDimensions.targetWidth;
                                            targetHeight = targetDimensions.targetHeight;

                                            resizeFIle(file, targetWidth, targetHeight, (result) => {
                                                formData.images_content = [];
                                                formData.images_content[0] = result;
                                                setFormData({ ...formData });

                                                console.log("formData.images_content[0]:", formData.images_content[0]);
                                            });
                                        };
                                        img.src = url;


                                        /*
                                        resizeFIle(file, (result) => {
                                            if (!formData.images_content) {
                                                formData.images_content = [];
                                            }
                                            formData.images_content[0] = result;
                                            setFormData({ ...formData });
    
                                            console.log("formData.images_content[0]:", formData.images_content[0]);
                                        });
                                        */
                                    }}
                                    className="form-control"
                                    id="image"
                                />
                                {errors.image && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.image}
                                    </div>
                                )}
                                {formData.image && !errors.image && (
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
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bdivident"
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

export default DividentCreate;
