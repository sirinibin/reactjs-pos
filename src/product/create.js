import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import ProductView from "./view.js";
import { Typeahead } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import ProductCategoryCreate from "../product_category/create.js";
import Resizer from "react-image-file-resizer";


const ProductCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {


            selectedCategories = [];
            setSelectedCategories(selectedCategories);

            selectedUnitPrices = [];
            setSelectedUnitPrices(selectedUnitPrices);

            selectedStocks = [];
            setSelectedStocks(selectedStocks);


            formData = {
                images_content: [],
                unit: "",
                item_code: "",
            };
            setFormData({ formData });

            if (id) {
                getProduct(id);
            }

            SetShow(true);
        },

    }));

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


    let [selectedUnitPrice, setSelectedUnitPrice] = useState([
        {
            id: "",
            name: "",
            purchase_unit_price: "",
            retail_unit_price: "",
            wholesale_unit_price: "",
        },
    ]);

    let [selectedUnitPrices, setSelectedUnitPrices] = useState([]);
    let [selectedStock, setSelectedStock] = useState([
        {
            id: "",
            name: "",
            stock: "",
        },
    ]);
    let [selectedStocks, setSelectedStocks] = useState([]);



    let [storeOptions, setStoreOptions] = useState([]);

    let [selectedCategories, setSelectedCategories] = useState([]);
    let [categoryOptions, setCategoryOptions] = useState([]);

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        images_content: [],
        unit: "",
        item_code: "",
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getProduct(id) {
        console.log("inside get Product");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/product/' + id, requestOptions)
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

                if (data.result.stock) {
                    selectedStocks = data.result.stock;
                    setSelectedStocks([...selectedStocks]);
                }

                if (data.result.unit_prices) {
                    selectedUnitPrices = data.result.unit_prices;
                    setSelectedUnitPrices([...selectedUnitPrices]);
                }

                setSelectedCategories(selectedCategories);

                formData = data.result;
                formData.name = data.result.name;
                if (!formData.unit) {
                    formData.unit = "";
                }
                formData.images_content = [];
                formData.useLaserScanner = false;
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
            "/v1/product-category?" + Select + queryString,
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


        formData.stock = selectedStocks;
        formData.unit_prices = selectedUnitPrices;

        console.log("category_id:", formData.category_id);


        let endPoint = "/v1/product";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/product/" + formData.id;
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
                props.showToastMessage("Product Created Successfully!", "success");
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
                props.showToastMessage("Error Creating Product!", "danger");
            });
    }

    function isStockAddedToStore(storeID) {
        for (var i = 0; i < selectedStocks.length; i++) {
            if (selectedStocks[i].store_id === storeID) {
                return true;
            }
        }
        return false;
    }

    function findStockIndexByStoreID(storeID) {
        for (var i = 0; i < selectedStocks.length; i++) {
            if (selectedStocks[i].store_id === storeID) {
                return i;
            }
        }
        return -1;
    }

    function isUnitPriceAddedToStore(storeID) {
        for (var i = 0; i < selectedUnitPrices.length; i++) {
            if (selectedUnitPrices[i].store_id === storeID) {
                return true;
            }
        }
        return false;
    }

    function removeStock(stock) {
        const index = selectedStocks.indexOf(stock);
        if (index > -1) {
            selectedStocks.splice(index, 1);
        }
        setSelectedStocks([...selectedStocks]);
    }

    function removeUnitPrice(unitPrice) {
        const index = selectedUnitPrices.indexOf(unitPrice);
        if (index > -1) {
            selectedUnitPrices.splice(index, 1);
        }
        setSelectedUnitPrices([...selectedUnitPrices]);
    }

    function addStock() {

        if (cookies.get("store_id")) {
            if (selectedStock[0]) {
                selectedStock[0].id = cookies.get("store_id");
                selectedStock[0].name = cookies.get("store_name");
                setSelectedStock([...selectedStock]);
            }

        }

        if (!selectedStock[0].id) {
            errors.store_id2 = "Store is required";
            setErrors({ ...errors });
            return;
        }

        if (!selectedStock[0].stock) {
            errors.stock = "Stock is required";
            setErrors({ ...errors });
            return;
        }

        if (isNaN(selectedStock[0].stock)) {
            errors.stock = "Invalid Stock";
            setErrors({ ...errors });
            return;
        }


        if (isStockAddedToStore(selectedStock[0].id)) {

            const index = findStockIndexByStoreID(selectedStock[0].id);
            selectedStocks[index].stock += parseInt(selectedStock[0].stock);
        } else {
            selectedStocks.push({
                store_id: selectedStock[0].id,
                store_name: selectedStock[0].name,
                stock: parseInt(selectedStock[0].stock),
            });
        }

        setSelectedStocks([...selectedStocks]);

        selectedStock[0].id = "";
        selectedStock[0].name = "";
        selectedStock[0].stock = "";

        setSelectedStock([...selectedStock]);

    }

    function addUnitPrice() {

        errors.retail_unit_price = "";
        errors.store_id1 = "";
        setErrors({ ...errors });

        if (cookies.get("store_id")) {
            if (selectedUnitPrice[0]) {
                selectedUnitPrice[0].id = cookies.get("store_id");
                selectedUnitPrice[0].name = cookies.get("store_name");
                setSelectedUnitPrice([...selectedUnitPrice]);
            }

        }

        if (!selectedUnitPrice[0].id) {
            errors.store_id1 = "Store is required";
            setErrors({ ...errors });
            return;
        }

        if (!selectedUnitPrice[0].purchase_unit_price) {
            errors.purchase_unit_price = "Purchase Unit Price is required";
            setErrors({ ...errors });
            return;
        }


        if (isNaN(selectedUnitPrice[0].purchase_unit_price)) {
            errors.purchase_unit_price = "Invalid Purchase Unit Price";
            setErrors({ ...errors });
            return;
        }


        /*
        if (!selectedUnitPrice[0].wholesale_unit_price) {
            errors.wholesale_unit_price = "Wholesale Unit Price is required";
            setErrors({ ...errors });
            return;
        }


        if (isNaN(selectedUnitPrice[0].wholesale_unit_price)) {
            errors.wholesale_unit_price = "Invalid Wholesale Unit Price";
            setErrors({ ...errors });
            return;
        }


        if (!selectedUnitPrice[0].retail_unit_price) {
            errors.retail_unit_price = "Retail Unit Price is required";
            setErrors({ ...errors });
            return;
        }

        if (isNaN(selectedUnitPrice[0].retail_unit_price)) {
            errors.retail_unit_price = "Invalid Retail Unit Price";
            setErrors({ ...errors });
            return;
        }
        */


        if (isUnitPriceAddedToStore(selectedUnitPrice[0].id)) {
            errors.store_id1 = "Unit Price Already added to Store:" + selectedUnitPrice[0].name;
            setErrors({ ...errors });
            return;
        }

        let unitPrice = {
            store_id: selectedUnitPrice[0].id,
            store_name: selectedUnitPrice[0].name,
            purchase_unit_price: parseFloat(selectedUnitPrice[0].purchase_unit_price),
        };

        if (selectedUnitPrice[0].retail_unit_price) {
            unitPrice.retail_unit_price = parseFloat(selectedUnitPrice[0].retail_unit_price);
        }

        if (selectedUnitPrice[0].wholesale_unit_price) {
            unitPrice.wholesale_unit_price = parseFloat(selectedUnitPrice[0].wholesale_unit_price);
        }

        selectedUnitPrices.push(unitPrice);


        setSelectedUnitPrices([...selectedUnitPrices]);

        selectedUnitPrice[0].id = "";
        selectedUnitPrice[0].name = "";
        selectedUnitPrice[0].purchase_unit_price = "";
        selectedUnitPrice[0].retail_unit_price = "";
        selectedUnitPrice[0].wholesale_unit_price = "";

        setSelectedUnitPrice([...selectedUnitPrice]);
    }


    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }

    const StoreCreateFormRef = useRef();
    function openStoreCreateForm() {
        StoreCreateFormRef.current.open();
    }

    const ProductCategoryCreateFormRef = useRef();
    function openProductCategoryCreateForm() {
        ProductCategoryCreateFormRef.current.open();
    }


    return (
        <>

            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <ProductView ref={DetailsViewRef} />
            <ProductCategoryCreate ref={ProductCategoryCreateFormRef} showToastMessage={props.showToastMessage} />

            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update Product #" + formData.name : "Create New Product"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewProductModal"
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
                            <label className="form-label">Name In Arabic (Optional)</label>

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
                            <label className="form-label">Item CODE(Optional)</label>
                            <div className="input-group mb-3">
                                <input
                                    value={formData.item_code ? formData.item_code : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["item_code"] = "";
                                        setErrors({ ...errors });
                                        formData.item_code = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="item_code"
                                    placeholder="Item Code"
                                />
                                {errors.item_code && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.item_code}
                                    </div>
                                )}
                                {formData.item_code && !errors.item_code && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Part Number(Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.part_number ? formData.part_number : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["part_number"] = "";
                                        setErrors({ ...errors });
                                        formData.part_number = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="part_number"
                                    placeholder="Part Number"
                                />
                                {errors.part_number && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.part_number}
                                    </div>
                                )}
                                {formData.part_number && !errors.part_number && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Rack / Location (Optional)</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.rack ? formData.rack : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["rack"] = "";
                                        setErrors({ ...errors });
                                        formData.rack = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="rack"
                                    placeholder="Rack/Location"
                                />
                                {errors.rack && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.rack}
                                    </div>
                                )}
                                {formData.rack && !errors.rack && (
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
                                    multiple
                                />
                                <Button hide={true.toString()} onClick={openProductCategoryCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
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

                        <div className="col-md-2">
                            <label className="form-label">Unit</label>
                            <select className="form-control" value={formData.unit}
                                onChange={(e) => {

                                    formData.unit = e.target.value;
                                    console.log("Inside onchange price type:", formData.unit);
                                    setFormData({ ...formData });

                                }}
                            >
                                <option value="">PC</option>
                                <option value="drum">Drum</option>
                                <option value="set">Set</option>
                                <option value="Kg">Kg</option>
                                <option value="Meter(s)">Meter(s)</option>
                                <option value="Gm">Gm</option>
                                <option value="L">Liter (L)</option>
                                <option value="Gm">Gm</option>
                                <option value="Mg">Mg</option>
                            </select>
                        </div>


                        <h4>Unit Price</h4>

                        {!cookies.get('store_name') ? <div className="col-md-4" >
                            <label className="form-label">Select Store*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="store_id1"
                                    labelKey="name"
                                    isInvalid={errors.store_id1 ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.store_id1 = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.store_id1 = "Invalid Store selected";
                                            setErrors(errors);
                                            selectedUnitPrice[0].id = "";
                                            selectedUnitPrice[0].name = "";
                                            setSelectedUnitPrice(selectedUnitPrice);
                                            return;
                                        }

                                        selectedUnitPrice[0].id = selectedItems[0].id;
                                        selectedUnitPrice[0].name = selectedItems[0].name;
                                        console.log("selectedUnitPrice:", selectedUnitPrice);

                                        setSelectedUnitPrice([...selectedUnitPrice]);
                                    }}
                                    options={storeOptions}
                                    placeholder="Select Store"
                                    selected={selectedUnitPrice}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                />
                                <Button hide={true.toString()} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>

                                {errors.store_id1 && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.store_id1}
                                    </div>
                                )}
                                {selectedUnitPrice[0].id && !errors.store_id1 && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div> : ""}

                        <div className="col-md-2">
                            <label className="form-label">Purchase*</label>

                            <div className="input-group mb-3">

                                <input
                                    value={selectedUnitPrice[0] && selectedUnitPrice[0].purchase_unit_price ? selectedUnitPrice[0].purchase_unit_price : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["purchase_unit_price"] = "";
                                        setErrors({ ...errors });
                                        selectedUnitPrice[0].purchase_unit_price = e.target.value;
                                    }}
                                    className="form-control"
                                    id="purchase_unit_price"
                                    placeholder="Purchase Unit Price"
                                />
                                {errors.purchase_unit_price && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.purchase_unit_price}
                                    </div>
                                )}
                                {selectedUnitPrice[0].purchase_unit_price && !errors.purchase_unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}

                            </div>
                        </div>




                        <div className="col-md-2">
                            <label className="form-label">Wholesale</label>

                            <div className="input-group mb-3">

                                <input
                                    value={selectedUnitPrice[0] && selectedUnitPrice[0].wholesale_unit_price ? selectedUnitPrice[0].wholesale_unit_price : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["wholesale_unit_price"] = "";
                                        setErrors({ ...errors });
                                        selectedUnitPrice[0].wholesale_unit_price = e.target.value;
                                    }}
                                    className="form-control"
                                    id="wholesale_unit_price"
                                    placeholder=" Unit Price"
                                />
                                {errors.wholesale_unit_price && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.wholesale_unit_price}
                                    </div>
                                )}
                                {selectedUnitPrice[0].wholesale_unit_price && !errors.wholesale_unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}


                            </div>



                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Retail</label>

                            <div className="input-group mb-3">

                                <input
                                    value={selectedUnitPrice[0] && selectedUnitPrice[0].retail_unit_price ? selectedUnitPrice[0].retail_unit_price : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["retail_unit_price"] = "";
                                        setErrors({ ...errors });
                                        selectedUnitPrice[0].retail_unit_price = e.target.value;
                                    }}
                                    className="form-control"
                                    id="retail_unit_price"
                                    placeholder="Unit Price"
                                />
                                {errors.retail_unit_price && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.retail_unit_price}
                                    </div>
                                )}
                                {selectedUnitPrice[0].retail_unit_price && !errors.retail_unit_price && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}

                            </div>
                        </div>


                        <div className="col-md-2">
                            <label className="form-label">Action</label>
                            <div className="input-group mb-3">

                                <Button hide={true.toString()} onClick={addUnitPrice} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> Add Price</Button>
                            </div>
                        </div>
                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th>SI No.</th>
                                        <th>Store Name</th>
                                        <th>Purchase Unit Price</th>
                                        <th>Wholesale Unit Price</th>
                                        <th>Retail Unit Price</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedUnitPrices.map((unitPrice, index) => (
                                        <tr key={index} className="text-center">
                                            <td>{index + 1}</td>
                                            <td>{unitPrice.store_name}</td>
                                            <td style={{ width: "150px" }}>

                                                <input type="number" value={unitPrice.purchase_unit_price ? unitPrice.purchase_unit_price : ""} className="form-control"

                                                    placeholder="Purchase Unit Price" onChange={(e) => {
                                                        errors["purchase_unit_price_" + index] = "";
                                                        setErrors({ ...errors });
                                                        if (!e.target.value) {
                                                            errors["purchase_unit_price_" + index] = "Invalid Purchase Unit Price";
                                                            selectedUnitPrices[index].purchase_unit_price = parseFloat(e.target.value);
                                                            setSelectedUnitPrices([...selectedUnitPrices]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }
                                                        if (e.target.value === 0) {
                                                            errors["purchase_unit_price_" + index] = "Purchase Unit Price should be > 0";
                                                            selectedUnitPrices[index].purchase_unit_price = parseFloat(e.target.value);
                                                            setSelectedUnitPrices([...selectedUnitPrices]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        selectedUnitPrices[index].purchase_unit_price = parseFloat(e.target.value);
                                                        console.log("selectedUnitPrices[index].purchase_unit_price:", selectedUnitPrices[index].purchase_unit_price);
                                                        setSelectedUnitPrices([...selectedUnitPrices]);

                                                    }} /> SAR
                                                {errors["purchase_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["purchase_unit_price_" + index]}
                                                    </div>
                                                )}
                                                {(selectedUnitPrices[index].purchase_unit_price && !errors["purchase_unit_price_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i className="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>

                                            <td style={{ width: "150px" }}>

                                                <input type="number" value={unitPrice.wholesale_unit_price ? unitPrice.wholesale_unit_price : ""} className="form-control"

                                                    placeholder="Wholesale Unit Price" onChange={(e) => {
                                                        errors["wholesale_unit_price_" + index] = "";
                                                        setErrors({ ...errors });
                                                        if (!e.target.value) {
                                                            errors["wholesale_unit_price_" + index] = "Invalid Unit Price";
                                                            selectedUnitPrices[index].wholesale_unit_price = parseFloat(e.target.value);
                                                            setSelectedUnitPrices([...selectedUnitPrices]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        if (e.target.value === 0) {
                                                            errors["wholesale_unit_price_" + index] = "Unit Price should be > 0";
                                                            selectedUnitPrices[index].wholesale_unit_price = parseFloat(e.target.value);
                                                            setSelectedUnitPrices([...selectedUnitPrices]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        selectedUnitPrices[index].wholesale_unit_price = parseFloat(e.target.value);
                                                        console.log("selectedUnitPrices[index].wholesale_unit_price:", selectedUnitPrices[index].wholesale_unit_price);
                                                        setSelectedUnitPrices([...selectedUnitPrices]);

                                                    }} /> SAR
                                                {errors["wholesale_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["wholesale_unit_price_" + index]}
                                                    </div>
                                                )}
                                                {(selectedUnitPrices[index].wholesale_unit_price && !errors["wholesale_unit_price_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i className="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td style={{ width: "150px" }}>

                                                <input type="number" value={unitPrice.retail_unit_price ? unitPrice.retail_unit_price : ""} className="form-control"

                                                    placeholder="Retail Unit Price" onChange={(e) => {
                                                        errors["retail_unit_price_" + index] = "";
                                                        setErrors({ ...errors });
                                                        if (!e.target.value) {
                                                            errors["retail_unit_price_" + index] = "Invalid Retail Unit Price";
                                                            selectedUnitPrices[index].retail_unit_price = parseFloat(e.target.value);
                                                            setSelectedUnitPrices([...selectedUnitPrices]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        if (e.target.value === 0) {
                                                            errors["retail_unit_price_" + index] = "Retail Unit Price should be > 0";
                                                            selectedUnitPrices[index].retail_unit_price = parseFloat(e.target.value);
                                                            setSelectedUnitPrices([...selectedUnitPrices]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        selectedUnitPrices[index].retail_unit_price = parseFloat(e.target.value);
                                                        console.log("selectedUnitPrices[index].retail_unit_price:", selectedUnitPrices[index].retail_unit_price);
                                                        setSelectedUnitPrices([...selectedUnitPrices]);

                                                    }} /> SAR
                                                {errors["retail_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["retail_unit_price_" + index]}
                                                    </div>
                                                )}
                                                {(selectedUnitPrices[index].retail_unit_price && !errors["retail_unit_price_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i className="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>
                                                <div
                                                    style={{ color: "red", cursor: "pointer" }}
                                                    onClick={() => {
                                                        removeUnitPrice(unitPrice);
                                                    }}
                                                >
                                                    <i className="bi bi-x-lg"> </i>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <h4>Stock</h4>
                        {!cookies.get('store_name') ? <div className="col-md-5">
                            <label className="form-label">Select Store*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="store_id2"
                                    labelKey="name"
                                    isInvalid={errors.store_id2 ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.store_id2 = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.store_id2 = "Invalid Store selected";
                                            setErrors(errors);
                                            selectedStock[0].id = "";
                                            selectedStock[0].name = "";
                                            setSelectedStock(selectedStock);
                                            return;
                                        }

                                        selectedStock[0].id = selectedItems[0].id;
                                        selectedStock[0].name = selectedItems[0].name;
                                        console.log("selectedStock:", selectedStock);

                                        setSelectedStock([...selectedStock]);
                                    }}
                                    options={storeOptions}
                                    placeholder="Select Store"
                                    selected={selectedStock}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="b1"> <i className="bi bi-plus-lg"></i> New</Button>

                                {errors.store_id2 && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.store_id2}
                                    </div>
                                )}
                                {selectedStock[0].id && !errors.store_id2 && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div> : ""}

                        <div className="col-md-2">
                            <label className="form-label">Stock*</label>

                            <div className="input-group mb-3">

                                <input
                                    value={selectedStock[0] && selectedStock[0].stock ? selectedStock[0].stock : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["stock"] = "";
                                        setErrors({ ...errors });
                                        selectedStock[0].stock = e.target.value;
                                    }}
                                    className="form-control"
                                    id="stock"
                                    placeholder="Stock"
                                />
                                {errors.stock && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.stock}
                                    </div>
                                )}
                                {selectedStock[0].stock && !errors.stock && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Action</label>
                            <div className="input-group mb-3">
                                <Button hide={true.toString()} onClick={addStock} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> Add Stock</Button>
                            </div>
                        </div>

                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th>SI No.</th>
                                        <th>Store Name</th>
                                        <th>Stock</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStocks.map((stock, index) => (
                                        <tr key={index} className="text-center">
                                            <td>{index + 1}</td>
                                            <td>{stock.store_name}</td>
                                            <td style={{ width: "125px" }}>

                                                <input type="number" value={stock.stock ? stock.stock : ""} className="form-control"

                                                    placeholder="Stock" onChange={(e) => {
                                                        errors["stock_" + index] = "";
                                                        setErrors({ ...errors });
                                                        if (!e.target.value) {
                                                            errors["stock_" + index] = "Invalid Stock";
                                                            selectedStocks[index].stock = "";
                                                            setSelectedStocks([...selectedStocks]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }
                                                        //  stock.stock = parseInt(e.target.value);
                                                        selectedStocks[index].stock = parseInt(e.target.value);
                                                        console.log("selectedStocks[index].stock:", selectedStocks[index].stock);
                                                        setSelectedStocks([...selectedStocks]);

                                                    }} />
                                                {errors["stock_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["stock_" + index]}
                                                    </div>
                                                )}
                                                {((selectedStocks[index].stock || selectedStocks[index].stock === 0) && !errors["stock_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i className="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>
                                                <div
                                                    style={{ color: "red", cursor: "pointer" }}
                                                    onClick={() => {
                                                        removeStock(stock);
                                                    }}
                                                >
                                                    <i className="bi bi-x-lg"> </i>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            <Button variant="primary" type="submit" >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="bproduct"
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

export default ProductCreate;
