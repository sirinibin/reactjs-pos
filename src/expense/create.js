import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import ExpenseCategoryCreate from "../expense_category/create.js";
import ExpenseCategoryView from "../expense_category/view.js";
//import Resizer from "react-image-file-resizer";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { highlightWords } from "../utils/search.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import VendorCreate from "./../vendor/create.js";
import Vendors from "./../utils/vendors.js";

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

const ExpenseCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {


            selectedCategories = [];
            setSelectedCategories(selectedCategories);


            formData = {
                images_content: [],
            };
            formData.date_str = new Date();
            setFormData({ ...formData });

            if (id) {
                getExpense(id);
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


    /* function resizeFIle(file, w, h, cb) {
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
 
     let [selectedImage, setSelectedImage] = useState("");*/


    let [selectedCategories, setSelectedCategories] = useState([]);
    let [categoryOptions, setCategoryOptions] = useState([]);

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


    function getExpense(id) {
        console.log("inside get Expense");
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


        fetch('/v1/expense/' + id + "?" + queryParams, requestOptions)
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
                formData.date_str = formData.date;

                formData.images_content = [];

                setSelectedVendors([]);
                if (formData.vendor_id && formData.vendor_name) {
                    let selectedVendors = [
                        {
                            id: formData.vendor_id,
                            name: formData.vendor_name,
                            search_label: formData.vendor.search_label,
                        }
                    ];
                    setSelectedVendors([...selectedVendors]);
                }

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

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/expense-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCategoryOptions(data.result);
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
                    if (props.showToastMessage) props.showToastMessage("Expense updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Expense created successfully!", "success");
                }

                if (props.refreshList) {
                    props.refreshList();
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
                if (props.showToastMessage) props.showToastMessage("Failed to process expense!", "danger");
            });
    }








    /*
    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }*/

    /*
    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    */


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

    const categorySearchRef = useRef();

    //Vendor
    const VendorCreateFormRef = useRef();
    const [openVendorCreateForm, setOpenVendorCreateForm] = useState(false);
    useEffect(() => {
        if (openVendorCreateForm) {
            VendorCreateFormRef.current.open();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openVendorCreateForm]);

    function handleVendorCreateFormClose() {
        setOpenVendorCreateForm(false);
    }


    const VendorsRef = useRef();
    const [openVendors, setOpenVendors] = useState(false);
    useEffect(() => {
        if (openVendors) {
            VendorsRef.current.open();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openVendors]);

    function handleVendorsClose() {
        setOpenVendors(false);
    }


    const handleSelectedVendor = (selectedVendor) => {
        console.log("selectedVendor:", selectedVendor);
        setSelectedVendors([selectedVendor])
        formData.vendor_id = selectedVendor.id;
        setFormData({ ...formData });
    };

    const timerRef = useRef(null);
    const vendorSearchRef = useRef();
    const customVendorFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

        const q = normalize(query);
        const qWords = q.split(" ");

        const fields = [
            option.code,
            option.vat_no,
            option.name,
            option.name_in_arabic,
            option.phone,
            option.search_label,
            option.phone_in_arabic,
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];

        const searchable = normalize(fields.join(" "));

        return qWords.every((word) => searchable.includes(word));
    }, []);

    let [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);
    const [vendorOptions, setVendorOptions] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");
        setVendorOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            setTimeout(() => {
                setOpenVendorSearchResult(false);
            }, 100);

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

        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,use_remarks_in_purchases,remarks,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        // setIsVendorsLoading(true);
        let result = await fetch(
            "/v1/vendor?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();
        if (!data.result || data.result.length === 0) {
            openVendorSearchResult = false;
            setOpenVendorSearchResult(false);
            return;
        }

        openVendorSearchResult = true;
        setOpenVendorSearchResult(true);




        if (data.result) {
            const filtered = data.result.filter((opt) => customVendorFilter(opt, searchTerm));
            setVendorOptions(filtered);
        } else {
            setVendorOptions([]);
        }
        // setIsVendorsLoading(false);
    }


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);



    return (
        <>
            {openVendors && <Vendors ref={VendorsRef} onSelectVendor={handleSelectedVendor} handleVendorsClose={handleVendorsClose} />}
            {openVendorCreateForm && <VendorCreate ref={VendorCreateFormRef} handleVendorCreateFormClose={handleVendorCreateFormClose} />}
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
                        <div className="col-md-10">
                            <label className="form-label">Vendor</label>
                            <Typeahead
                                id="vendor_search"
                                filterBy={() => true}
                                labelKey="search_label"
                                open={openVendorSearchResult}
                                isLoading={false}
                                onChange={(selectedItems) => {
                                    delete errors.vendor_id;
                                    setErrors(errors);
                                    if (selectedItems.length === 0) {
                                        delete errors.vendor_id;
                                        //setErrors(errors);
                                        formData.vendor_id = "";
                                        setFormData({ ...formData });
                                        setSelectedVendors([]);
                                        return;
                                    }
                                    formData.vendor_id = selectedItems[0].id;
                                    if (selectedItems[0].use_remarks_in_purchases && selectedItems[0].remarks) {
                                        formData.remarks = selectedItems[0].remarks;
                                    }

                                    setOpenVendorSearchResult(false);
                                    setFormData({ ...formData });
                                    setSelectedVendors(selectedItems);
                                }}
                                options={vendorOptions}
                                placeholder="Vendor Name / Mob / VAT # / ID"
                                selected={selectedVendors}
                                highlightOnlyResult={true}
                                ref={vendorSearchRef}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        delete errors.vendor_id;
                                        setOpenVendorSearchResult(false);
                                        //setErrors(errors);
                                        formData.vendor_id = "";
                                        formData.vendor_name = "";

                                        setFormData({ ...formData });
                                        setSelectedVendors([]);
                                        setVendorOptions([]);
                                        vendorSearchRef.current?.clear();
                                    }
                                }}
                                onInputChange={(searchTerm, e) => {
                                    if (searchTerm) {
                                        formData.vendor_name = searchTerm;
                                    }
                                    setFormData({ ...formData });
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => {
                                        suggestVendors(searchTerm);
                                    }, 100);
                                }}

                                renderMenu={(results, menuProps, state) => {
                                    const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                    return (
                                        <Menu {...menuProps}>
                                            {/* Header */}
                                            <MenuItem disabled>
                                                <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                                    <div style={{ width: '10%' }}>ID</div>
                                                    <div style={{ width: '47%' }}>Name</div>
                                                    <div style={{ width: '10%' }}>Phone</div>
                                                    <div style={{ width: '13%' }}>VAT</div>
                                                    <div style={{ width: '10%' }}>Credit Balance</div>
                                                    <div style={{ width: '10%' }}>Credit Limit</div>
                                                </div>
                                            </MenuItem>

                                            {/* Rows */}
                                            {results.map((option, index) => {
                                                const onlyOneResult = results.length === 1;
                                                const isActive = state.activeIndex === index || onlyOneResult;
                                                return (
                                                    <MenuItem option={option} position={index} key={index}>
                                                        <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                {highlightWords(
                                                                    option.code,
                                                                    searchWords,
                                                                    isActive
                                                                )}
                                                            </div>
                                                            <div style={{ ...columnStyle, width: '47%' }}>
                                                                {highlightWords(
                                                                    option.name_in_arabic
                                                                        ? `${option.name} - ${option.name_in_arabic}`
                                                                        : option.name,
                                                                    searchWords,
                                                                    isActive
                                                                )}
                                                            </div>
                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                {highlightWords(option.phone, searchWords, isActive)}
                                                            </div>
                                                            <div style={{ ...columnStyle, width: '13%' }}>
                                                                {highlightWords(option.vat_no, searchWords, isActive)}
                                                            </div>
                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                {option.credit_balance && (
                                                                    <Amount amount={trimTo2Decimals(option.credit_balance)} />
                                                                )}
                                                            </div>
                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                {option.credit_limit && (
                                                                    <Amount amount={trimTo2Decimals(option.credit_limit)} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </MenuItem>
                                                );
                                            })}
                                        </Menu>
                                    );
                                }}
                            />
                            <Button hide={true.toString()} onClick={() => {
                                setOpenVendorCreateForm(true);
                            }} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                            {errors.vendor_id && (
                                <div style={{ color: "red" }}>
                                    {errors.vendor_id}
                                </div>
                            )}
                        </div>
                        <div className="col-md-1">
                            <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={() => {
                                setOpenVendors(true);
                            }}>
                                <i class="bi bi-list"></i>
                            </Button>
                        </div>
                        {/*
                                                <div className="col-md-3">
                                                    <label className="form-label">Product Barcode Scan</label>
                        
                                                    <div className="input-group mb-3">
                                                        <DebounceInput
                                                            minLength={12}
                                                            debounceTimeout={500}
                                                            placeholder="Scan Barcode"
                                                            className="form-control barcode"
                                                            value={formData.barcode}
                                                            onChange={event => getProductByBarCode(event.target.value)} />
                                                        {errors.bar_code && (
                                                            <div style={{ color: "red" }}>
                                                                <i className="bi bi-x-lg"> </i>
                                                                {errors.bar_code}
                                                            </div>
                                                        )}
                                                    
                                                    </div>
                                                </div>
                                                        */}



                        <div className="col-md-2">
                            <label className="form-label">Amount*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.amount}
                                    type='number'
                                    onChange={(e) => {
                                        errors["amount"] = "";
                                        setErrors({ ...errors });


                                        if (parseFloat(e.target.value) === 0) {
                                            formData.amount = 0;
                                            setFormData({ ...formData });
                                            return;
                                        }

                                        if (!e.target.value) {
                                            formData.amount = "";
                                            setFormData({ ...formData });
                                            return;
                                        }

                                        if (e.target.value) {
                                            formData.amount = parseFloat(e.target.value);
                                        }

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

                            </div>
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

                        <div className="col-md-2">
                            <label className="form-label">Vendor Invoice No.</label>

                            <div className="input-group mb-3">
                                <input id="purchase_vendor_invoice_no" name="purchase_vendor_invoice_no"
                                    value={formData.vendor_invoice_no ? formData.vendor_invoice_no : ""}
                                    type='string'
                                    onChange={(e) => {
                                        delete errors["vendor_invoice_no"];
                                        setErrors({ ...errors });
                                        formData.vendor_invoice_no = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    placeholder="Vendor Invoice No."
                                />
                                {errors.vendor_invoice_no && (
                                    <div style={{ color: "red" }}>
                                        {errors.vendor_invoice_no}
                                    </div>
                                )}

                            </div>
                        </div>


                        <div className="col-md-3">
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

                            </div>
                        </div>

                        <div className="col-md-3">
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
                                    ref={categorySearchRef}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setCategoryOptions([]);
                                            categorySearchRef.current?.clear();
                                        }
                                    }}
                                />
                                <Button hide={true.toString()} onClick={openExpenseCategoryCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.category_id && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.category_id}
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

                        {/*<div className="col-md-6">
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

                            </div>
                        </div>*/}



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
