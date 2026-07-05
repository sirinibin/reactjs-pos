import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { useTranslation } from 'react-i18next';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';


const ProductCategoryCreate = forwardRef((props, ref) => {
    const { t } = useTranslation(['common', 'messages', 'validation', 'modules']);

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData(formData);
            selectedParentCategories = [];
            setSelectedParentCategories(selectedParentCategories);

            if (id) {
                getProductCategory(id);
            }

            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },

    }));


    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (error) { }
    }


    useEnterKeyNavigation();

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    const [parentCategoryOptions, setParentCategoryOptions] = useState([]);
    let [selectedParentCategories, setSelectedParentCategories] = useState([]);
    const [isProductCategoriesLoading, setIsProductCategoriesLoading] = useState(false);

    //fields
    let [formData, setFormData] = useState({});

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


    function getProductCategory(id) {
        console.log("inside get Product Category");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        formData = {};
        setFormData({ ...formData });
        selectedParentCategories = [];
        setSelectedParentCategories([...selectedParentCategories]);

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/product-category/' + id + "?" + queryParams, requestOptions)
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
                console.log("formData:", formData);


                if (formData.parent_id) {
                    selectedParentCategories = [
                        {
                            id: formData.parent_id,
                            name: formData.parent_name,
                        },
                    ];
                    setSelectedParentCategories([...selectedParentCategories]);

                }

                setFormData({ ...formData });
                console.log("formData:", formData);

            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        console.log("formData.logo:", formData.logo);

        setIsProductCategoriesLoading(true);

        let endPoint = "/v1/product-category";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/product-category/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
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
                setIsProductCategoriesLoading(false);

                console.log("Response:");
                console.log(data);
                if (props.showToastMessage) props.showToastMessage(
                    t('messages:success.created', { entity: t('modules:product_category.title') }),
                    "success"
                );
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setIsProductCategoriesLoading(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage(
                    t('messages:error.creating', { entity: t('modules:product_category.title') }),
                    "danger"
                );
            });
    }

    async function suggestCategories(searchTerm) {
        console.log("Inside handle suggest Categories");
        setParentCategoryOptions([]);

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
        setIsProductCategoriesLoading(true);
        let result = await fetch(
            "/v1/product-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setParentCategoryOptions(data.result);
        setIsProductCategoriesLoading(false);
    }

    const categorySearchRef = useRef();

    // ── Design Tokens ──────────────────────────────────────────────────────
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
    // ──────────────────────────────────────────────────────────────────────

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
                        {formData.id ? `Update Category — ${formData.name}` : 'Create New Category'}
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
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

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

                            {/* Category Details Card */}
                            <div style={CARD} className="pw-card">
                                <SectionTitle icon="bi-grid">Category Details</SectionTitle>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Name</Label>
                                    <input
                                        id="product_category_name"
                                        name="product_category_name"
                                        value={formData.name ? formData.name : ""}
                                        type="text"
                                        onChange={(e) => {
                                            errors["name"] = "";
                                            setErrors({ ...errors });
                                            formData.name = e.target.value;
                                            setFormData({ ...formData });
                                            console.log(formData);
                                        }}
                                        style={INPUT}
                                        placeholder="Category name"
                                    />
                                    {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label>Parent Category</Label>
                                    <Typeahead
                                        id="parent_id"
                                        labelKey="name"
                                        isLoading={isProductCategoriesLoading}
                                        isInvalid={errors.parent_id ? true : false}
                                        onChange={(selectedItems) => {
                                            errors.parent__id = "";
                                            setErrors({ errors });
                                            if (selectedItems.length === 0) {
                                                errors.parent_id = "Invalid Parent Category Selected";
                                                setErrors(errors);
                                                formData.parent_id = "";
                                                formData.parent_name = "";
                                                setFormData({ ...formData });
                                                setSelectedParentCategories([]);
                                                return;
                                            }

                                            formData.parent_id = selectedItems[0].id;
                                            setFormData({ ...formData });
                                            setSelectedParentCategories([...selectedItems]);
                                        }}
                                        options={parentCategoryOptions}
                                        placeholder="Select Parent Category"
                                        selected={selectedParentCategories}
                                        highlightOnlyResult={true}
                                        onInputChange={(searchTerm, e) => {
                                            suggestCategories(searchTerm);
                                        }}
                                        ref={categorySearchRef}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                                setParentCategoryOptions([]);
                                                categorySearchRef.current?.clear();
                                            }
                                        }}
                                    />
                                    {errors.parent_id && <ErrMsg>{errors.parent_id}</ErrMsg>}
                                </div>

                            </div>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default ProductCategoryCreate;
