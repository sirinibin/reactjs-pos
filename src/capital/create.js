import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import Resizer from "react-image-file-resizer";
import DatePicker from "react-datepicker";
import { format } from "date-fns";

const CapitalCreate = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {

            formData = {
                images_content: [],
            };
            setFormData({ formData });

            if (id) {
                getCapital(id);
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
                console.log("Enter key was pressed. Run your function-capital.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if ((event.target.getAttribute("class") || "").includes("description")) {
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


    function getCapital(id) {
        console.log("inside get Capital");
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

        fetch('/v1/capital/' + id + "?" + queryParams, requestOptions)
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
                formData.date_str = formData.date || formData.date_str;

                let selectedInvestedByUsers = [
                    {
                        id: formData.invested_by_user_id,
                        name: formData.invested_by_user_name,
                    }
                ];

                setSelectedInvestedByUsers([...selectedInvestedByUsers]);


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

    //InvestedByUser Auto Suggestion
    const [investedbyuserOptions, setInvestedByUserOptions] = useState([]);
    const [selectedInvestedByUsers, setSelectedInvestedByUsers] = useState([]);
    const [isInvestedByUsersLoading, setIsInvestedByUsersLoading] = useState(false);

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestInvestedByUsers");
        setInvestedByUserOptions([]);

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
        setIsInvestedByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setInvestedByUserOptions(data.result);
        setIsInvestedByUsersLoading(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }

        let endPoint = "/v1/capital";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/capital/" + formData.id;
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
                    if (props.showToastMessage) props.showToastMessage("Capital updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Capital created successfully!", "success");
                }
                if (props.refreshList) {
                    props.refreshList();
                }

                if (props.onUpdated) {
                    props.onUpdated();
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
                if (props.showToastMessage) props.showToastMessage("Failed to process capital!", "danger");
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

    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };

    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => (
        <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
    );
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? "Update Capital Investment" : "Create New Capital Investment"}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                                <i className="bi bi-eye me-1"></i>View Detail
                            </button>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? 'Update' : 'Create'}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>
                <style>{`
                    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                    input[type="number"]::-webkit-outer-spin-button,
                    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                    input[type="number"] { -moz-appearance: textfield; }
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    .pw-form { display: flex; width: 100%; flex: 1; min-height: 0; }
                    .pw-sidebar { width: 200px; background: #f2f4f6; border-right: 1px solid #c3c6d7; padding: 16px 10px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
                    .pw-sidebar-header { margin-bottom: 16px; }
                    .pw-content { flex: 1; overflow-y: auto; padding: 20px 28px; background: #f7f9fb; min-width: 0; }
                    .pw-tab-wrap { max-width: 900px; }
                    .pw-price-cards .col-md-4 { margin-bottom: 16px; }
                    @media (max-width: 767px) {
                        .pw-form { flex-direction: column; }
                        .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
                        .pw-sidebar-header { display: none; }
                        .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
                        .pw-content { padding: 14px 16px !important; }
                        .pw-tab-wrap { max-width: 100%; }
                    }
                    @media (min-width: 768px) and (max-width: 1100px) {
                        .pw-sidebar { width: 170px; }
                        .pw-content { padding: 16px 20px; }
                        .pw-tab-wrap { max-width: 100%; }
                    }
                    @media (min-height: 600px) and (max-height: 800px) {
                        .pw-content { padding: 14px 24px; }
                    }
                    @media (max-width: 767px) {
                        .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
                    }
                    @media (min-width: 768px) and (max-width: 1100px) {
                        .pw-card { padding: 16px !important; margin-bottom: 14px !important; }
                    }
                `}</style>
                <Modal.Body className="pw-body">
                    <form style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }} onSubmit={handleCreate}>
                        <div style={{ maxWidth: '700px', margin: '0 auto' }}>

                            <div style={{ overflow: "hidden", maxHeight: totalErrors > 0 ? "500px" : "0", marginBottom: totalErrors > 0 ? "16px" : "0", transition: "max-height 0.25s ease, margin-bottom 0.2s ease" }}>
                                <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px" }}>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: "14px" }}></i>
                                        {totalErrors} error{totalErrors > 1 ? "s" : ""} — please fix before saving:
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                        {allErrors.map(([k, v]) => (
                                            <li key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a" }}>{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Section 1: Investment Details */}
                            <div style={CARD} className="pw-card">
                                <SectionTitle icon="bi-bank">Investment Details</SectionTitle>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Invested By User</Label>
                                    <div className="input-group">
                                        <Typeahead
                                            id="invested_by_user_id"
                                            labelKey="name"
                                            isLoading={isInvestedByUsersLoading}
                                            isInvalid={errors.invested_by_user_id ? true : false}
                                            onChange={(selectedItems) => {
                                                errors.invested_by_user_id = "";
                                                setErrors(errors);
                                                if (selectedItems.length === 0) {
                                                    errors.invested_by_user_id = "Invalid User selected";
                                                    setErrors(errors);
                                                    formData.invested_by_user_id = "";
                                                    setFormData({ ...formData });
                                                    setSelectedInvestedByUsers([]);
                                                    return;
                                                }
                                                formData.invested_by_user_id = selectedItems[0].id;
                                                setFormData({ ...formData });
                                                setSelectedInvestedByUsers(selectedItems);
                                            }}
                                            options={investedbyuserOptions}
                                            placeholder="Select InvestedByUser"
                                            selected={selectedInvestedByUsers}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm, e) => {
                                                suggestUsers(searchTerm);
                                            }}
                                        />
                                        {localStorage.getItem('user_role') === "Admin" && <Button hide={true.toString()} onClick={props.openUserCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>}
                                    </div>
                                    {errors.invested_by_user_id && <ErrMsg>{errors.invested_by_user_id}</ErrMsg>}
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Amount</Label>
                                    <input
                                        value={formData.amount ? formData.amount : ""}
                                        type="number"
                                        onChange={(e) => {
                                            errors["amount"] = "";
                                            setErrors({ ...errors });
                                            formData.amount = parseFloat(e.target.value);
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        style={INPUT}
                                        id="amount"
                                        placeholder="Amount"
                                    />
                                    {errors.amount && <ErrMsg>{errors.amount}</ErrMsg>}
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Description</Label>
                                    <textarea
                                        value={formData.description ? formData.description : ""}
                                        onChange={(e) => {
                                            errors["description"] = "";
                                            setErrors({ ...errors });
                                            formData.description = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        style={{ ...INPUT, resize: 'vertical', minHeight: '80px' }}
                                        className="description"
                                        id="description"
                                        placeholder="Description"
                                    />
                                    {errors.description && <ErrMsg>{errors.description}</ErrMsg>}
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Date Time</Label>
                                    <div>
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
                                                setFormData({ ...formData });
                                            }}
                                        />
                                    </div>
                                    {errors.date_str && <ErrMsg>{errors.date_str}</ErrMsg>}
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Payment Method</Label>
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
                                        style={INPUT}
                                    >
                                        <option value="" SELECTED>Select</option>
                                        <option value="cash">Cash</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="bank_card">Bank Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="bank_cheque">Bank Cheque</option>
                                    </select>
                                    {errors.payment_method && <ErrMsg>{errors.payment_method}</ErrMsg>}
                                </div>
                            </div>

                            {/* Section 2: Attachments */}
                            <div style={CARD} className="pw-card">
                                <SectionTitle icon="bi-paperclip">Attachments</SectionTitle>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label>Image (Optional)</Label>
                                    <input
                                        value={selectedImage ? selectedImage : ""}
                                        type="file"
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
                                        style={INPUT}
                                        id="image"
                                    />
                                    {errors.image && <ErrMsg>{errors.image}</ErrMsg>}
                                </div>
                            </div>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default CapitalCreate;
