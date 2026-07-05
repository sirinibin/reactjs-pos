import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';


const ExpenseCategoryView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getExpenseCategory(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function getExpenseCategory(id) {
        console.log("inside get ExpenseCategory");
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

        fetch('/v1/expense-category/' + id + "?" + queryParams, requestOptions)
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

                model = data.result;

                setModel({ ...model });
            })
            .catch(error => {
                // setErrors(error);
            });
    }

    // Helper: avatar initials
    function getInitials(name) {
        if (!name) return '';
        return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                {/* Close button - always top right */}
                <button
                    type="button"
                    className="btn-close"
                    onClick={handleClose}
                    aria-label="Close"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
                ></button>

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap" style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
<button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                            <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i>
                            Back
                        </button>
                        <h1 style={{ margin: 0, fontSize: '30px', lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                            {model.name ? model.name : 'Details of Expense Category'}
                        </h1>
                        {model.parent_name && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                Parent: {model.parent_name}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button
                                onClick={() => { handleClose(); props.openCreateForm(); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}
                            >
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button
                                onClick={() => { handleClose(); props.openUpdateForm(model.id); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                            >
                                <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i>
                                Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Main scrollable content */}
                <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">

                        {/* Name */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '16px' }}>Name</span>
                            <span style={{ fontSize: '20px', fontWeight: 700, lineHeight: '28px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.name || <span style={{ color: '#a0a8b4', fontStyle: 'italic', fontWeight: 400, fontSize: '16px' }}>—</span>}
                            </span>
                        </div>

                        {/* Parent Category */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '16px' }}>Parent Category</span>
                            <span style={{ fontSize: '18px', fontWeight: 600, lineHeight: '26px', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {model.parent_name || <span style={{ color: '#a0a8b4', fontStyle: 'italic', fontWeight: 400, fontSize: '14px' }}>None</span>}
                            </span>
                        </div>

                        {/* Created By */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '16px' }}>Created By</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                {model.created_by_name && (
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                                        {getInitials(model.created_by_name)}
                                    </div>
                                )}
                                <span style={{ fontSize: '15px', fontWeight: 600, lineHeight: '22px', color: '#191c1e' }}>
                                    {model.created_by_name || <span style={{ color: '#a0a8b4', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Section */}
                    <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Details</h3>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                            {/* Created At */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #c3c6d7' }}>
                                <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                    {formatInStoreTimezone(model.created_at) || <span style={{ color: '#a0a8b4', fontStyle: 'italic' }}>—</span>}
                                </span>
                            </div>

                            {/* Updated At */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #c3c6d7' }}>
                                <span style={{ fontSize: '14px', color: '#434655' }}>Updated At</span>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                    {formatInStoreTimezone(model.updated_at) || <span style={{ color: '#a0a8b4', fontStyle: 'italic' }}>—</span>}
                                </span>
                            </div>

                            {/* Updated By */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                                <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {model.updated_by_name && (
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                                            {getInitials(model.updated_by_name)}
                                        </div>
                                    )}
                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                        {model.updated_by_name || <span style={{ color: '#a0a8b4', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </section>

                </div>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                    onClick={handleClose}
                    style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleClose}
                    style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default ExpenseCategoryView;
