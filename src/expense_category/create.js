import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal } from "react-bootstrap";
import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";


const ExpenseCategoryCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData(formData);
            selectedParentCategories = [];
            setSelectedParentCategories(selectedParentCategories);

            if (id) {
                getExpenseCategory(id);
            }
            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },

    }));

    let [store, setStore] = useState({});

    async function getStore(id) {
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
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                store = data.result;
                setStore(store);
            })
            .catch(() => { });
    }

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        form.elements[index + 1].focus();
                        event.preventDefault();
                    }
                }
            }
        };
        document.addEventListener("keydown", listener);
        return () => { document.removeEventListener("keydown", listener); };
    }, []);

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);

    const [parentCategoryOptions, setParentCategoryOptions] = useState([]);
    let [selectedParentCategories, setSelectedParentCategories] = useState([]);
    const [isExpenseCategoriesLoading, setIsExpenseCategoriesLoading] = useState(false);

    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) { window.location = "/"; }
    });

    function getExpenseCategory(id) {
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

        fetch('/v1/expense-category/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                setErrors({});
                formData = data.result;
                if (formData.parent_id) {
                    selectedParentCategories = [{ id: formData.parent_id, name: formData.parent_name }];
                    setSelectedParentCategories([...selectedParentCategories]);
                }
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object).map(key => `search[${key}]=${object[key]}`).join("&");
    }

    function handleCreate(event) {
        event.preventDefault();
        setIsExpenseCategoriesLoading(true);

        let endPoint = "/v1/expense-category";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/expense-category/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }

        const requestOptions = {
            method,
            headers: { 'Accept': 'application/json', "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
            body: JSON.stringify(formData),
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) { searchParams.store_id = localStorage.getItem("store_id"); }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setErrors({});
                setProcessing(false);
                setIsExpenseCategoriesLoading(false);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Expense category updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Expense category created successfully!", "success");
                }
                if (props.refreshList) props.refreshList();
                handleClose();
                if (props.openDetailsView) props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                setIsExpenseCategoriesLoading(false);
                setErrors({ ...error });
                if (props.showToastMessage) props.showToastMessage("Failed to process expense category!", "danger");
            });
    }

    async function suggestCategories(searchTerm) {
        setParentCategoryOptions([]);
        if (!searchTerm) return;

        var params = { name: searchTerm };
        if (localStorage.getItem("store_id")) { params.store_id = localStorage.getItem("store_id"); }
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") { queryString = "&" + queryString; }

        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };

        setIsExpenseCategoriesLoading(true);
        let result = await fetch("/v1/expense-category?select=id,name" + queryString, requestOptions);
        let data = await result.json();
        setParentCategoryOptions(data.result);
        setIsExpenseCategoriesLoading(false);
    }

    const categorySearchRef = useRef();

    // ── Design tokens ────────────────────────────────────────────────────────
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => children
        ? <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
        : null;
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `Update Expense Category — ${formData.name}` : 'Create New Expense Category'}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && props.openDetailsView && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); props.openDetailsView(formData.id); }}>
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
                    .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                    .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                    @media (max-width: 767px) {
                        .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
                    }
                `}</style>

                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                            {/* Animated error panel */}
                            <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '300px' : '0', marginBottom: totalErrors > 0 ? '16px' : '0', transition: 'max-height 0.25s ease, margin-bottom 0.2s ease' }}>
                                <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px' }}>
                                    <div style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#93000a', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '14px' }}></i>
                                        {totalErrors} error{totalErrors > 1 ? 's' : ''} — please fix before saving:
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        {allErrors.map(([k, v]) => (
                                            <li key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#93000a' }}>{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div style={CARD} className="pw-card">
                                <SectionTitle icon="bi-folder2-open">Category Details</SectionTitle>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Label required>Name</Label>
                                        <input
                                            value={formData.name || ''}
                                            type="text"
                                            onChange={(e) => {
                                                errors["name"] = "";
                                                setErrors({ ...errors });
                                                formData.name = e.target.value;
                                                setFormData({ ...formData });
                                            }}
                                            style={INPUT}
                                            id="name"
                                            placeholder="Category name"
                                        />
                                        <ErrMsg>{errors.name}</ErrMsg>
                                    </div>

                                    <div className="col-md-6">
                                        <Label>Parent Category (Optional)</Label>
                                        <Typeahead
                                            id="parent_id"
                                            labelKey="name"
                                            isLoading={isExpenseCategoriesLoading}
                                            isInvalid={!!errors.parent_id}
                                            onChange={(selectedItems) => {
                                                errors.parent_id = "";
                                                setErrors({ ...errors });
                                                if (selectedItems.length === 0) {
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
                                            placeholder="Search parent category..."
                                            selected={selectedParentCategories}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => { suggestCategories(searchTerm); }}
                                            ref={categorySearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") {
                                                    setParentCategoryOptions([]);
                                                    categorySearchRef.current?.clear();
                                                }
                                            }}
                                        />
                                        <ErrMsg>{errors.parent_id}</ErrMsg>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default ExpenseCategoryCreate;
