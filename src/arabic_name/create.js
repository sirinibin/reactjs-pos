import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';

const ArabicNameCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData(formData);
            setErrors({});
            if (id) {
                getArabicName(id);
            }
            SetShow(true);
        },
    }));

    useEnterKeyNavigation();

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        if (!localStorage.getItem("access_token")) {
            window.location = "/";
        }
    });

    function getArabicName(id) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        formData = {};
        setFormData({ ...formData });

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/arabic-name/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data && data.errors);
                setErrors({});
                formData = data.result;
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error || {});
            });
    }

    function handleCreate(event) {
        event.preventDefault();

        let endPoint = "/v1/arabic-name";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/arabic-name/" + formData.id;
            method = "PUT";
        } else if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }

        const requestOptions = {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        const queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data && data.errors);

                setErrors({});
                setProcessing(false);
                if (props.showToastMessage) props.showToastMessage(formData.id ? "Arabic Name Updated!" : "Arabic Name Created!", "success");
                if (props.refreshList) props.refreshList();
                if (props.onSelect) props.onSelect(data.result);
                handleClose();
            })
            .catch(error => {
                setProcessing(false);
                setErrors({ ...(error || {}) });
                if (props.showToastMessage) props.showToastMessage("Error saving Arabic Name!", "danger");
            });
    }

    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => (
        <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
    );

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
                        {formData.id ? `Update Arabic Name — ${formData.name_in_english}` : 'Add Arabic Name'}
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
                <style>{`
                  .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                  .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                `}</style>
                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: '#f7f9fb' }}>
                        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

                            {totalErrors > 0 && (
                                <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px", marginBottom: '16px' }}>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px" }}>
                                        <i className="bi bi-exclamation-circle-fill" style={{ marginRight: '6px' }}></i>
                                        {totalErrors} error{totalErrors > 1 ? "s" : ""} — please fix before saving:
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                        {allErrors.map(([k, v]) => (
                                            <li key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a" }}>{v}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div style={CARD}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <i className="bi bi-translate" style={{ fontSize: '18px', color: '#004ac6' }}></i>
                                    <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>Arabic Name Entry</h3>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <Label required>Name in English</Label>
                                    <input
                                        id="arabic_name_english"
                                        type="text"
                                        value={formData.name_in_english || ''}
                                        onChange={(e) => {
                                            errors['name_in_english'] = '';
                                            setErrors({ ...errors });
                                            formData.name_in_english = e.target.value;
                                            setFormData({ ...formData });
                                        }}
                                        style={INPUT}
                                        placeholder="e.g. Red Apple"
                                        autoFocus
                                    />
                                    {errors.name_in_english && <ErrMsg>{errors.name_in_english}</ErrMsg>}
                                </div>

                                <div style={{ marginBottom: '4px' }}>
                                    <Label required>Name in Arabic</Label>
                                    <input
                                        id="arabic_name_arabic"
                                        type="text"
                                        value={formData.name_in_arabic || ''}
                                        onChange={(e) => {
                                            errors['name_in_arabic'] = '';
                                            setErrors({ ...errors });
                                            formData.name_in_arabic = e.target.value;
                                            setFormData({ ...formData });
                                        }}
                                        style={{ ...INPUT, direction: 'rtl', fontFamily: '"Amiri", "Noto Naskh Arabic", Arial, sans-serif', fontSize: '15px' }}
                                        placeholder="مثال: تفاحة حمراء"
                                    />
                                    {errors.name_in_arabic && <ErrMsg>{errors.name_in_arabic}</ErrMsg>}
                                </div>
                            </div>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default ArabicNameCreate;
