import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import ExpenseView from "./view.js";
import { Typeahead } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import ExpenseCategoryCreate from "../expense_category/create.js";
import ExpenseCategoryView from "../expense_category/view.js";
import Resizer from "react-image-file-resizer";
import DatePicker from "react-datepicker";
import { format } from "date-fns";


const ExpenseCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {


            selectedCategories = [];
            setSelectedCategories(selectedCategories);


            formData = {
                images_content: [],
            };
            setFormData({ formData });

            if (id) {
                getExpense(id);
            }

            SetShow(true);
        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-expense.");
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

    let [selectedCategories, setSelectedCategories] = useState([]);
    let [categoryOptions, setCategoryOptions] = useState([]);

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        images_content: [],
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getExpense(id) {
        console.log("inside get Expense");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/expense/' + id, requestOptions)
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
                let categoryIds = data.result.category_id;
                let categoryNames = data.result.category_name;

                selectedCategories = [];
                if (categoryIds && categoryNames) {
                    for (var i = 0; i < categoryIds.length; i++) {
                        selectedCategories.push({
                            id: categoryIds[i],
                            name: categoryNames[i],
                        });
                    }
                }

                setSelectedCategories(selectedCategories);

                formData = data.result;
                formData.images_content = [];
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    async function suggestCategories(searchTerm) {
        console.log("Inside handle suggest Categories");

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
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/expense-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCategoryOptions(data.result);
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
                Authorization: cookies.get("access_token"),
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
        let at = cookies.get("access_token");
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

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        formData.category_id = [];
        for (var i = 0; i < selectedCategories.length; i++) {
            formData.category_id.push(selectedCategories[i].id);
        }


        console.log("category_id:", formData.category_id);

        if (cookies.get("store_id")) {
            formData.store_id = cookies.get("store_id");
        }


        let endPoint = "/v1/expense";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/expense/" + formData.id;
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
                props.showToastMessage("Expense Created Successfully!", "success");
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
                props.showToastMessage("Error Creating Expense!", "danger");
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

    const ExpenseCategoryCreateFormRef = useRef();
    function openExpenseCategoryCreateForm() {
        ExpenseCategoryCreateFormRef.current.open();
    }

    const ExpenseCategoryDetailsViewRef = useRef();
    function openExpenseCategoryDetailsView(id) {
        ExpenseCategoryDetailsViewRef.current.open(id);
    }


    function openExpenseCategoryUpdateForm(id) {
        ExpenseCategoryCreateFormRef.current.open(id);
    }

    return (
        <>

            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            {/*
            <ExpenseView ref={DetailsViewRef} />
            */}
            <ExpenseCategoryCreate ref={ExpenseCategoryCreateFormRef} openDetailsView={openExpenseCategoryDetailsView} showToastMessage={props.showToastMessage} />

            <ExpenseCategoryView ref={ExpenseCategoryDetailsViewRef} openUpdateForm={openExpenseCategoryUpdateForm} openCreateForm={openExpenseCategoryCreateForm} />


            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Expense #" + formData.description : "Create New Expense"}
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
                                /> + " Creating..."

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
                            <label className="form-label">Categories*</label>

                            <div className="input-group mb-3">

                                <Typeahead
                                    id="category_id"
                                    labelKey="name"

                                    isInvalid={errors.category_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.category_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.category_id = "Invalid Category selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedCategories([]);
                                            return;
                                        }
                                        setFormData({ ...formData });
                                        setSelectedCategories(selectedItems);
                                    }}
                                    options={categoryOptions}
                                    placeholder="Select Categories"
                                    selected={selectedCategories}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestCategories(searchTerm);
                                    }}
                                />
                                <Button hide={true.toString()} onClick={openExpenseCategoryCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.category_id && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.category_id}
                                    </div>
                                )}
                                {formData.category_id && !errors.category_id && (
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
                                        animation="bexpense"
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

export default ExpenseCreate;