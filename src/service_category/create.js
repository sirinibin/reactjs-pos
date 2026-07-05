import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

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

const ServiceCategoryCreate = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData({});
            selectedParentCategories = [];
            setSelectedParentCategories([]);
            if (id) getServiceCategory(id);
            SetShow(true);
        },
    }));

    const [show, SetShow] = useState(false);
    let [formData, setFormData] = useState({});
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [parentCategoryOptions, setParentCategoryOptions] = useState([]);
    let [selectedParentCategories, setSelectedParentCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const categorySearchRef = useRef();

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) window.location = "/";
    });

    function handleClose() { SetShow(false); }

    function getServiceCategory(id) {
        const headers = { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') };
        let queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") || "" });
        fetch('/v1/service-category/' + id + "?" + queryParams, { method: 'GET', headers })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) return Promise.reject(data.errors);
                formData = data.result;
                setFormData({ ...formData });
                if (formData.parent_id) {
                    selectedParentCategories = [{ id: formData.parent_id, name: formData.parent_name }];
                    setSelectedParentCategories([...selectedParentCategories]);
                }
            })
            .catch(err => setErrors({ ...err }));
    }

    async function suggestCategories(searchTerm) {
        if (!searchTerm) return;
        setIsLoadingCategories(true);
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        let q = ObjectToSearchQueryParams({ name: searchTerm, store_id: localStorage.getItem("store_id") || "" });
        let result = await fetch("/v1/service-category?select=id,name&" + q, { method: "GET", headers });
        let data = await result.json();
        setParentCategoryOptions(data.result || []);
        setIsLoadingCategories(false);
    }

    function handleCreate(event) {
        event.preventDefault();
        let endPoint = "/v1/service-category";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/service-category/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }
        const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', Authorization: localStorage.getItem("access_token") };
        let queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") || "" });
        setProcessing(true);
        fetch(endPoint + "?" + queryParams, { method, headers, body: JSON.stringify(formData) })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) return Promise.reject(data.errors);
                setErrors({});
                setProcessing(false);
                if (props.showToastMessage) props.showToastMessage("Service Category saved", "success");
                if (props.refreshList) props.refreshList();
                handleClose();
            })
            .catch(err => {
                setProcessing(false);
                setErrors({ ...err });
                if (props.showToastMessage) props.showToastMessage("Error saving Service Category", "danger");
            });
    }

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    return (
        <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
            <style>{`.pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }`}</style>
            <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" onClick={handleClose}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                </button>
                <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                    {formData.id ? `Update Service Category — ${formData.name}` : 'Create New Service Category'}
                </Modal.Title>
                <div className="d-flex align-items-center gap-2">
                    <button type="button"
                        style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleCreate} disabled={isProcessing}>
                        {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                        {formData.id ? 'Update' : 'Create'}
                    </button>
                    <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                </div>
            </Modal.Header>

            {/* Error panel — slides in, no shift inside the form */}
            <div style={{
                flexShrink: 0,
                overflow: 'hidden',
                maxHeight: totalErrors > 0 ? '300px' : '0px',
                opacity: totalErrors > 0 ? 1 : 0,
                transition: 'max-height 0.22s ease, opacity 0.18s ease',
                background: '#fff8f7',
                borderBottom: totalErrors > 0 ? '1px solid #f4adaa' : 'none',
            }}>
                <div style={{ padding: '12px 24px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ color: '#93000a', fontSize: '14px' }}></i>
                        <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '13px', color: '#93000a' }}>
                            {totalErrors} error{totalErrors > 1 ? 's' : ''} — please fix before saving
                        </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {allErrors.map(([k, v]) => (
                            <li key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12.5px', color: '#93000a', marginBottom: '3px', lineHeight: 1.5 }}>
                                {v}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <Modal.Body style={{ padding: '24px 32px', background: '#f7f9fb', overflow: 'auto' }}>
                <form style={{ maxWidth: '600px', margin: '0 auto' }} onSubmit={handleCreate}>

                    <div style={CARD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <i className="bi bi-grid-3x3-gap" style={{ fontSize: '18px', color: '#004ac6' }}></i>
                            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Category Details</h3>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <Label required>Name</Label>
                            <input
                                value={formData.name || ""}
                                type="text"
                                onChange={(e) => { errors["name"] = ""; setErrors({ ...errors }); formData.name = e.target.value; setFormData({ ...formData }); }}
                                style={INPUT}
                                placeholder="Service category name"
                            />
                            {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <Label>Parent Category</Label>
                            <Typeahead
                                id="parent_id"
                                labelKey="name"
                                isLoading={isLoadingCategories}
                                isInvalid={!!errors.parent_id}
                                onChange={(selectedItems) => {
                                    if (selectedItems.length === 0) {
                                        formData.parent_id = "";
                                        formData.parent_name = "";
                                        setFormData({ ...formData });
                                        setSelectedParentCategories([]);
                                        return;
                                    }
                                    formData.parent_id = selectedItems[0].id;
                                    formData.parent_name = selectedItems[0].name;
                                    setFormData({ ...formData });
                                    setSelectedParentCategories([...selectedItems]);
                                }}
                                options={parentCategoryOptions}
                                placeholder="Select Parent Category"
                                selected={selectedParentCategories}
                                highlightOnlyResult={true}
                                onInputChange={(searchTerm) => suggestCategories(searchTerm)}
                                ref={categorySearchRef}
                                onKeyDown={(e) => { if (e.key === "Escape") { setParentCategoryOptions([]); categorySearchRef.current?.clear(); } }}
                            />
                            {errors.parent_id && <ErrMsg>{errors.parent_id}</ErrMsg>}
                        </div>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
});

export default ServiceCategoryCreate;
