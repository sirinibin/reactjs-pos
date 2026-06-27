import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';

const ProductCategoryView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getProductCategory(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const [show, SetShow] = useState(false);

    function handleClose() { SetShow(false); }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object).map(k => `search[${k}]=${object[k]}`).join("&");
    }

    function getProductCategory(id) {
        const requestOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('access_token') },
        };
        let searchParams = {};
        if (localStorage.getItem("store_id")) searchParams.store_id = localStorage.getItem("store_id");
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch('/v1/product-category/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data && data.errors);
                model = data.result;
                setModel({ ...model });
            })
            .catch(() => {});
    }

    function formatInStoreTimezone(dateStr) {
        if (!dateStr) return '';
        const tzMap = { 'SA': 'Asia/Riyadh', 'AE': 'Asia/Dubai', 'KW': 'Asia/Kuwait', 'QA': 'Asia/Qatar', 'BH': 'Asia/Bahrain', 'OM': 'Asia/Muscat', 'IN': 'Asia/Kolkata' };
        const tz = tzMap[localStorage.getItem('store_country_code')] || 'UTC';
        try {
            const formatted = new Date(dateStr).toLocaleString('en-US', {
                timeZone: tz, year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
            });
            return `${formatted} (${tz.replace('_', ' ')})`;
        } catch { return dateStr; }
    }

    const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #c3c6d7', gap: '16px' };
    const labelStyle = { fontSize: '14px', color: '#434655', flexShrink: 0, minWidth: '140px' };
    const valueStyle = { fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' };

    return (<>
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                {/* Close button */}
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"
                    style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }} />

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap"
                    style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i> Back
                            </button>
                            <h1 style={{ margin: 0, fontSize: '30px', lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                                {model.name || 'Product Category'}
                            </h1>
                            {model.parent_name && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500 }}>
                                    {model.parent_name}
                                </span>
                            )}
                        </div>
                        {model.parent_name && (
                            <p style={{ margin: 0, fontSize: '14px', color: '#434655' }}>
                                Parent: {model.parent_name}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i> Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i> Edit
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>Category Name</span>
                            <span style={{ fontSize: '22px', fontWeight: 700, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{model.name || '—'}</span>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>Parent Category</span>
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{model.parent_name || <span style={{ color: '#434655', fontStyle: 'italic', fontWeight: 400, fontSize: '14px' }}>None</span>}</span>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655' }}>Created By</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                                    {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                </div>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: '#191c1e' }}>{model.created_by_name || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Details + Metadata */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left: Category Info */}
                        <div className="lg:col-span-8">
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Category Details</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                    {[
                                        { label: 'Name', value: model.name },
                                        { label: 'Parent Category', value: model.parent_name },
                                    ].filter(r => r.value).map((r, i, arr) => (
                                        <div key={r.label} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid #c3c6d7' : 'none' }}>
                                            <span style={labelStyle}>{r.label}</span>
                                            <span style={valueStyle}>{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Right: Metadata */}
                        <div className="lg:col-span-4">
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name || '—'}</span>
                                        </div>
                                    </div>
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                        </div>
                                    )}
                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Created At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.created_at)}</span>
                                        </div>
                                    )}
                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Last Updated</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose} style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                </button>
                {props.openUpdateForm && (
                    <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        Edit Category
                    </button>
                )}
            </Modal.Footer>
        </Modal>
    </>);
});

export default ProductCategoryView;
