import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';


const VendorCategoryView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getVendorCategory(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    function getVendorCategory(id) {
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

        fetch('/v1/vendor-category/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                model = data.result;
                setModel({ ...model });
            })
            .catch(() => { });
    }

    function getInitials(name) {
        if (!name) return '';
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}></button>

                <div style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={handleClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', width: 'fit-content' }}>
                            <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i> Back
                        </button>
                        <h1 style={{ margin: '8px 0 0', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                            {model.name ? model.name : 'Details of Vendor Category'}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i> Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i> Edit
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '24px 32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>

                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.name || <span style={{ color: '#a0a8b4', fontStyle: 'italic', fontWeight: 400, fontSize: '16px' }}>—</span>}
                            </span>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created By</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                {model.created_by_name && (
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                                        {getInitials(model.created_by_name)}
                                    </div>
                                )}
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#191c1e' }}>
                                    {model.created_by_name || <span style={{ color: '#a0a8b4', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Details</h3>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #c3c6d7' }}>
                                <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                    {formatInStoreTimezone(model.created_at) || <span style={{ color: '#a0a8b4', fontStyle: 'italic' }}>—</span>}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                                <span style={{ fontSize: '14px', color: '#434655' }}>Updated At</span>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                    {formatInStoreTimezone(model.updated_at) || <span style={{ color: '#a0a8b4', fontStyle: 'italic' }}>—</span>}
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose}
                    style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    </>);
});

export default VendorCategoryView;
