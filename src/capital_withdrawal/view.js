import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';
import AttachmentsViewer from '../utils/AttachmentsViewer.js';

const CapitalWithdrawalView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getCapitalWithdrawal(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    function getCapitalWithdrawal(id) {
        console.log("inside get CapitalWithdrawal");
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

        fetch('/v1/capital-withdrawal/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

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

    function formatPaymentMethod(method) {
        if (!method) return "—";
        return method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
        } catch {
            return dateStr;
        }
    }

    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                    {/* Close button */}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={handleClose}
                        aria-label="Close"
                        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
                    ></button>

                    {/* Page Header */}
                    <div
                        className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap"
                        style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
<button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                    <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i>
                                    Back
                                </button>
                                <h1 style={{
                                    margin: 0,
                                    fontSize: '30px',
                                    lineHeight: '38px',
                                    fontWeight: 700,
                                    letterSpacing: '-0.02em',
                                    fontFamily: "'Hanken Grotesk', sans-serif",
                                    color: '#191c1e',
                                }}>
                                    Capital Withdrawal {model.code ? `#${model.code}` : ''}
                                </h1>
                                {model.payment_method && (
                                    <span style={{
                                        backgroundColor: '#dbeafe',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                        padding: '2px 8px',
                                        borderRadius: '2px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        lineHeight: '14px',
                                    }}>
                                        {formatPaymentMethod(model.payment_method)}
                                    </span>
                                )}
                            </div>
                            {model.date && (
                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                    Withdrawal recorded on {formatDateShort(model.date)}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                            {props.openCreateForm && (
                                <button
                                    onClick={() => { handleClose(); props.openCreateForm(); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb',
                                        color: '#191c1e', padding: '8px 24px', borderRadius: '4px',
                                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                    Create
                                </button>
                            )}
                            {props.openUpdateForm && (
                                <button
                                    onClick={() => { handleClose(); props.openUpdateForm(model.id); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        backgroundColor: '#004ac6', color: '#ffffff', border: 'none',
                                        padding: '8px 24px', borderRadius: '4px', fontSize: '13px',
                                        fontWeight: 600, lineHeight: '16px', cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i>
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                        {/* 4 Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">

                            {/* Amount */}
                            <div style={{
                                backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px',
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                    Amount
                                </span>
                                <span style={{
                                    fontSize: '24px', fontWeight: 600, lineHeight: '32px',
                                    letterSpacing: '-0.01em', color: '#191c1e',
                                    fontFamily: "'Hanken Grotesk', sans-serif",
                                }}>
                                    {model.amount != null ? model.amount.toLocaleString() : '—'}
                                </span>
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#ba1a1a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-arrow-down-right" style={{ fontSize: '14px' }}></i>
                                    Withdrawn
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div style={{
                                backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px',
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                    Payment Method
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <i className="bi bi-wallet2" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                    <span style={{
                                        fontSize: '18px', fontWeight: 600, lineHeight: '26px',
                                        color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif",
                                    }}>
                                        {formatPaymentMethod(model.payment_method)}
                                    </span>
                                </div>
                            </div>

                            {/* Withdrawn By */}
                            <div style={{
                                backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px',
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                    Withdrawn By
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        backgroundColor: '#2563eb', color: '#eeefff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {model.withdrawn_by_user_name
                                            ? model.withdrawn_by_user_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                            : '?'}
                                    </div>
                                    <span style={{
                                        fontSize: '15px', fontWeight: 600, lineHeight: '22px',
                                        color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif",
                                    }}>
                                        {model.withdrawn_by_user_name || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Date */}
                            <div style={{
                                backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px',
                            }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                                    Date
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <i className="bi bi-calendar3" style={{ fontSize: '20px', color: '#505f76' }}></i>
                                    <span style={{
                                        fontSize: '16px', fontWeight: 600, lineHeight: '24px',
                                        color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif",
                                    }}>
                                        {formatDateShort(model.date)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Main body grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                            {/* Left column: detail + images */}
                            <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Withdrawal Details */}
                                <section style={{
                                    backgroundColor: '#ffffff', borderRadius: '8px',
                                    border: '1px solid #e2e8f0', overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '12px 24px', borderBottom: '1px solid #c3c6d7',
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', backgroundColor: '#f2f4f6',
                                    }}>
                                        <h3 style={{
                                            margin: 0, fontSize: '18px', fontWeight: 600,
                                            lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif",
                                            color: '#191c1e',
                                        }}>
                                            Withdrawal Details
                                        </h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                                        {/* Code */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', padding: '12px 0',
                                            borderBottom: '1px solid #c3c6d7',
                                        }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Code</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', fontFamily: 'monospace' }}>
                                                {model.code || '—'}
                                            </span>
                                        </div>

                                        {/* Amount */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', padding: '12px 0',
                                            borderBottom: '1px solid #c3c6d7',
                                        }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Amount</span>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ba1a1a' }}>
                                                {model.amount != null ? model.amount.toLocaleString() : '—'}
                                            </span>
                                        </div>

                                        {/* Payment Method */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', padding: '12px 0',
                                            borderBottom: '1px solid #c3c6d7',
                                        }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Payment Method</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <i className="bi bi-credit-card" style={{ fontSize: '14px', color: '#505f76' }}></i>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                    {formatPaymentMethod(model.payment_method)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', padding: '12px 0',
                                            borderBottom: '1px solid #c3c6d7',
                                        }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Date</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                {formatDateShort(model.date)}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        {model.description && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'flex-start', gap: '16px', padding: '12px 0',
                                            }}>
                                                <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Description</span>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>
                                                    {model.description}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Images */}
                            <AttachmentsViewer images={model.images} title="Attachments" />
                            </div>

                            {/* Right column: Sidebar */}
                            <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Metadata */}
                                <section style={{
                                    backgroundColor: '#ffffff', borderRadius: '8px',
                                    border: '1px solid #e2e8f0', overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '12px 24px', borderBottom: '1px solid #c3c6d7',
                                        backgroundColor: '#f2f4f6',
                                    }}>
                                        <h3 style={{
                                            margin: 0, fontSize: '18px', fontWeight: 600,
                                            lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif",
                                            color: '#191c1e',
                                        }}>
                                            Metadata
                                        </h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                        {/* Created By */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', paddingBottom: '8px',
                                            borderBottom: '1px solid #c3c6d7',
                                        }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    backgroundColor: '#2563eb', color: '#eeefff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '10px', fontWeight: 700,
                                                }}>
                                                    {model.created_by_name
                                                        ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                                        : ''}
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                    {model.created_by_name || '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Withdrawn By */}
                                        {model.withdrawn_by_user_name && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center', paddingBottom: '8px',
                                                borderBottom: '1px solid #c3c6d7',
                                            }}>
                                                <span style={{ fontSize: '14px', color: '#434655' }}>Withdrawn By</span>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                    {model.withdrawn_by_user_name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Store */}

                                        {/* Created At */}
                                        {model.created_at && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'flex-start', gap: '8px',
                                                paddingBottom: '8px', borderBottom: '1px solid #c3c6d7',
                                            }}>
                                                <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Created At</span>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>
                                                    {formatDate(model.created_at)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Updated By */}
                                        {model.updated_by_name && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center', paddingBottom: '8px',
                                                borderBottom: '1px solid #c3c6d7',
                                            }}>
                                                <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>
                                                    {model.updated_by_name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Updated At */}
                                        {model.updated_at && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'flex-start', gap: '8px',
                                            }}>
                                                <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Last Updated</span>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>
                                                    {formatDate(model.updated_at)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer style={{
                    backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7',
                    padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px',
                }}>
                    <button
                        onClick={handleClose}
                        style={{
                            backgroundColor: '#d0e1fb', color: '#54647a', border: 'none',
                            padding: '8px 24px', borderRadius: '4px', fontSize: '13px',
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    {props.openUpdateForm && (
                        <button
                            onClick={() => { handleClose(); props.openUpdateForm(model.id); }}
                            style={{
                                backgroundColor: '#004ac6', color: '#ffffff', border: 'none',
                                padding: '8px 24px', borderRadius: '4px', fontSize: '13px',
                                fontWeight: 700, cursor: 'pointer',
                            }}
                        >
                            Edit Withdrawal
                        </button>
                    )}
                </Modal.Footer>
            </Modal>
        </>
    );
});

export default CapitalWithdrawalView;
