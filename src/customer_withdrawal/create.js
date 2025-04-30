import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import Resizer from "react-image-file-resizer";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import CustomerCreate from "./../customer/create.js";
import CustomerView from "./../customer/view.js";
import Customers from "./../utils/customers.js";
import CustomerDepositPreview from './../customer_deposit/preview.js';


const CustomerWithdrawalCreate = forwardRef((props, ref) => {

    //Store Auto Suggestion
    let [selectedStores, setSelectedStores] = useState([]);
    const isStoresLoading = false;

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {
                images_content: [],
                date_str: new Date(),
            };
            setFormData({ ...formData });
            setSelectedCustomers([]);

            if (id) {
                getCustomerWithdrawal(id);
            }

            SetShow(true);
        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-customerwithdrawal.");
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


    let [storeOptions, setStoreOptions] = useState([]);

    let selectedCategories = [];

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        images_content: [],
        date_str: new Date(),
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getCustomerWithdrawal(id) {
        console.log("inside get CustomerWithdrawal");
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

        fetch('/v1/customer-withdrawal/' + id + "?" + queryParams, requestOptions)
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
                formData.date_str = data.result.date;

                if (formData.customer_name && formData.customer_id) {
                    let selectedCustomers = [
                        {
                            id: formData.customer_id,
                            name: formData.customer_name,
                            search_label: formData.customer.search_label,
                        }
                    ];
                    setSelectedCustomers([...selectedCustomers]);
                }

                let selectedStores = [
                    {
                        id: formData.store_id,
                        name: formData.store_name,
                    }
                ];
                setSelectedStores([...selectedStores]);

                formData.images_content = [];
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    async function suggestStores(searchTerm) {
        console.log("Inside handle suggest Stores");

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

        setStoreOptions(data.result);
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

    //Customer Auto Suggestion
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [isCustomersLoading, setIsCustomersLoading] = useState(false);

    async function suggestCustomers(searchTerm) {
        console.log("Inside handle suggestCustomers");
        setCustomerOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }

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

        let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        setIsCustomersLoading(true);
        let result = await fetch(
            "/v1/customer?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCustomerOptions(data.result);
        setIsCustomersLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        formData.category_id = [];
        for (var i = 0; i < selectedCategories.length; i++) {
            formData.category_id.push(selectedCategories[i].id);
        }


        console.log("category_id:", formData.category_id);

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }


        let endPoint = "/v1/customer-withdrawal";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/customer-withdrawal/" + formData.id;
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
                props.showToastMessage("CustomerWithdrawal Created Successfully!", "success");
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
                props.showToastMessage("Error Creating CustomerWithdrawal!", "danger");
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

    const StoreCreateFormRef = useRef();
    function openStoreCreateForm() {
        StoreCreateFormRef.current.open();
    }

    const CustomerCreateFormRef = useRef();
    function openCustomerCreateForm() {
        CustomerCreateFormRef.current.open();
    }

    const CustomerDetailsViewRef = useRef();
    function openCustomerDetailsView(id) {
        CustomerDetailsViewRef.current.open(id);
    }

    const CustomersRef = useRef();
    function openCustomers(model) {
        CustomersRef.current.open();
    }

    const handleSelectedCustomer = (selectedCustomer) => {
        console.log("selectedCustomer:", selectedCustomer);
        setSelectedCustomers([selectedCustomer])
        formData.customer_id = selectedCustomer.id;
        setFormData({ ...formData });
    };


    const PreviewRef = useRef();
    function openPreview() {
        if (!formData.date) {
            formData.date = formData.date_str;
        }
        PreviewRef.current.open(formData, undefined, "customer_withdrawal");
    }

    return (
        <>
            <CustomerDepositPreview ref={PreviewRef} />
            <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <CustomerCreate ref={CustomerCreateFormRef} openDetailsView={openCustomerDetailsView} showToastMessage={props.showToastMessage} />
            <CustomerView ref={CustomerDetailsViewRef} showToastMessage={props.showToastMessage} />


            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Customer Payable #" + formData.code : "Create New Customer Payable"}
                    </Modal.Title>


                    <div className="col align-self-end text-end">
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={openPreview}>
                            <i className="bi bi-printer"></i> Print
                        </Button>
                        &nbsp;&nbsp;

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
                        {!localStorage.getItem('store_name') ? <div className="col-md-6">
                            <label className="form-label">Store*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="store_id"
                                    labelKey="name"
                                    isLoading={isStoresLoading}
                                    isInvalid={errors.store_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.store_id = "";
                                        errors["product_id"] = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.store_id = "Invalid Store selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedStores([]);
                                            return;
                                        }
                                        formData.store_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        console.log("formData.store_id:", formData.store_id);
                                        selectedStores = selectedItems;
                                        setSelectedStores([...selectedItems]);
                                    }
                                    }
                                    options={storeOptions}
                                    placeholder="Select Store"
                                    selected={selectedStores}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                <div style={{ color: "red" }}>
                                    <i className="bi x-lg"> </i>
                                    {errors.store_id}
                                </div>
                            </div>
                        </div> : ""}

                        {!localStorage.getItem('store_name') ? <div className="col-md-6">
                            <label className="form-label">Store*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="store_id"
                                    labelKey="name"
                                    isLoading={isStoresLoading}
                                    isInvalid={errors.store_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.store_id = "";
                                        errors["product_id"] = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.store_id = "Invalid Store selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedStores([]);
                                            return;
                                        }
                                        formData.store_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        console.log("formData.store_id:", formData.store_id);
                                        selectedStores = selectedItems;
                                        setSelectedStores([...selectedItems]);
                                    }
                                    }
                                    options={storeOptions}
                                    placeholder="Select Store"
                                    selected={selectedStores}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                <div style={{ color: "red" }}>
                                    <i className="bi x-lg"> </i>
                                    {errors.store_id}
                                </div>
                            </div>
                        </div> : ""}

                        <div className="col-md-6" style={{ border: "solid 0px" }}>
                            <label className="form-label">Customer*</label>
                            <Typeahead
                                id="customer_id"
                                labelKey="search_label"
                                isLoading={isCustomersLoading}
                                isInvalid={errors.customer_id ? true : false}
                                onChange={(selectedItems) => {
                                    errors.customer_id = "";
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        // errors.customer_id = "Invalid Customer selected";
                                        //setErrors(errors);
                                        formData.customer_id = "";
                                        setFormData({ ...formData });
                                        setSelectedCustomers([]);
                                        return;
                                    }
                                    formData.customer_id = selectedItems[0].id;
                                    if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                                        formData.remarks = selectedItems[0].remarks;
                                    }

                                    setFormData({ ...formData });
                                    setSelectedCustomers(selectedItems);
                                }}
                                options={customerOptions}
                                placeholder="Customer Name / Mob / VAT # / ID"
                                selected={selectedCustomers}
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm, e) => {
                                    if (searchTerm) {
                                        formData.customerName = searchTerm;
                                    }
                                    suggestCustomers(searchTerm);
                                }}
                            />
                            <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>


                            {errors.customer_id && (
                                <div style={{ color: "red" }}>
                                    {errors.customer_id}
                                </div>
                            )}

                        </div>
                        <div className="col-md-1">
                            <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openCustomers}>
                                <i class="bi bi-list"></i>
                            </Button>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">ID</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_code"
                                    name="customer_withdrawal_code"
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
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Date*</label>

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
                                        {errors.date_str}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_amount"
                                    name="customer_withdrawal_amount"
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

                                    placeholder="Amount"
                                />


                            </div>
                            {errors.amount && (
                                <div style={{ color: "red" }}>
                                    {errors.amount}
                                </div>
                            )}
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

                            </div>
                            {errors.payment_method && (
                                <div style={{ color: "red" }}>

                                    {errors.payment_method}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Bank Ref. No.</label>
                            <div className="input-group mb-3">
                                <input
                                    id="customer_withdrawal_bank_ref"
                                    name="customer_withdrawal_bank_ref"
                                    value={formData.bank_reference_no ? formData.bank_reference_no : ""}
                                    type='text'
                                    onChange={(e) => {
                                        errors["bank_reference_no"] = "";
                                        setErrors({ ...errors });
                                        formData.bank_reference_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"

                                    placeholder="Bank reference no."
                                />
                            </div>
                            {errors.bank_reference_no && (
                                <div style={{ color: "red" }}>
                                    {errors.bank_reference_no}
                                </div>
                            )}
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Description</label>
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
                                        {errors.description}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Remarks</label>
                            <div className="input-group mb-3">
                                <textarea
                                    value={formData.remarks ? formData.remarks : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["remarks"] = "";
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




                        <div className="col-md-6">
                            <label className="form-label">Image</label>

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
                                        animation="bcustomerwithdrawal"
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

export default CustomerWithdrawalCreate;
