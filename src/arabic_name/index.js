import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import ArabicNameCreate from "./create.js";
import { Modal, Spinner } from "react-bootstrap";
import { confirm } from 'react-bootstrap-confirmation';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import PaginationControls from '../utils/PaginationControls.js';

const ArabicNameIndex = forwardRef((props, ref) => {

    const [show, setShow] = useState(false);
    const isModal = !!ref; // rendered as modal when a ref is attached

    useImperativeHandle(ref, () => ({
        open() {
            setShow(true);
            list();
        },
    }));

    const [arabicNameList, setArabicNameList] = useState([]);
    let [pageSize] = useState(() => parseInt(localStorage.getItem('arabic_name_pageSize') || '20'));
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isListLoading, setIsListLoading] = useState(false);
    const [searchParams, setSearchParams] = useState({});
    let [nameSearch, setNameSearch] = useState("");

    const ArabicNameCreateRef = useRef();

    const [toastMsg, setToastMsg] = useState({ text: '', type: '' });
    const [showToast, setShowToast] = useState(false);

    function showToastMessage(text, type) {
        setToastMsg({ text, type });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    }

    useEffect(() => {
        if (!isModal) list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function list() {
        setIsListLoading(true);

        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        setSearchParams(searchParams);

        let queryParams = ObjectToSearchQueryParams(searchParams);
        if (queryParams !== "") queryParams = "&" + queryParams;

        const url = '/v1/arabic-name?sort=-created_at&page=' + page + '&limit=' + pageSize + queryParams;

        try {
            const response = await fetch(url, {
                headers: { Authorization: localStorage.getItem("access_token") },
            });
            const data = await response.json();
            if (data.result) {
                setArabicNameList(data.result);
                setTotalPages(data.criterias?.total_pages || 0);
                setTotalItems(data.total_count || 0);
                setCurrentPageItemsCount((data.result || []).length);
                setOffset(((page - 1) * pageSize));
            } else {
                setArabicNameList([]);
            }
        } catch (e) {
            console.error(e);
        }
        setIsListLoading(false);
    }

    function searchByName(value) {
        if (value) {
            searchParams['name'] = value;
        } else {
            delete searchParams['name'];
        }
        page = 1;
        setPage(1);
        list();
    }

    async function deleteArabicName(id) {
        const ok = await confirm('Delete this Arabic Name entry?', {
            okText: 'Delete', cancelText: 'Cancel',
            okButtonStyle: 'danger',
        });
        if (!ok) return;

        let params = {};
        if (localStorage.getItem("store_id")) params.store_id = localStorage.getItem("store_id");

        await fetch('/v1/arabic-name/permanent/' + id + '?' + ObjectToSearchQueryParams(params), {
            method: 'DELETE',
            headers: { Authorization: localStorage.getItem("access_token") },
        });
        showToastMessage("Deleted successfully", "success");
        list();
    }

    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', fontFamily: '"Inter", sans-serif', outline: 'none', color: '#191c1e', background: '#fff' };

    const content = (
        <div style={{ padding: isModal ? '16px 20px' : '20px 24px', background: '#f7f9fb', minHeight: isModal ? 'unset' : '100vh' }}>
            <ArabicNameCreate ref={ArabicNameCreateRef} refreshList={list} showToastMessage={showToastMessage} />

            {/* Toast */}
            {showToast && (
                <div style={{ position: 'fixed', top: '16px', right: '20px', zIndex: 9999, background: toastMsg.type === 'success' ? '#dcfce7' : '#fde8e8', border: `1px solid ${toastMsg.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: '6px', padding: '10px 16px', fontSize: '13px', fontFamily: '"Inter", sans-serif', color: toastMsg.type === 'success' ? '#166534' : '#991b1b', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    <i className={`bi ${toastMsg.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} style={{ marginRight: '6px' }}></i>
                    {toastMsg.text}
                </div>
            )}

            {/* Header — only shown in standalone page mode */}
            {!isModal && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '20px', fontWeight: 700, color: '#191c1e', margin: 0 }}>
                            <i className="bi bi-translate" style={{ marginRight: '8px', color: '#004ac6' }}></i>
                            Arabic Names
                        </h2>
                        <div style={{ fontSize: '13px', color: '#6b7280', fontFamily: '"Inter", sans-serif', marginTop: '2px' }}>
                            Predefined Arabic name list for product search &amp; selection
                        </div>
                    </div>
                    <button
                        style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => ArabicNameCreateRef.current?.open()}>
                        <i className="bi bi-plus-lg"></i> Add New
                    </button>
                </div>
            )}

            {/* Search */}
            <div style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="bi bi-search" style={{ color: '#6b7280', fontSize: '14px' }}></i>
                <input
                    type="text"
                    value={nameSearch}
                    onChange={e => { setNameSearch(e.target.value); searchByName(e.target.value); }}
                    placeholder="Search in English or Arabic…"
                    style={{ ...INPUT, flex: 1, border: 'none', padding: '0', outline: 'none' }}
                />
                {nameSearch && (
                    <button onClick={() => { setNameSearch(""); searchByName(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px', padding: '0 2px' }}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: '"Inter", sans-serif' }}>
                    <thead>
                        <tr style={{ background: '#f2f4f6', borderBottom: '1px solid #c3c6d7' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#434655', width: '42%' }}>Name in English</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#434655', width: '42%' }}>الاسم بالعربية</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#434655', width: '16%' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isListLoading ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                                    <Spinner animation="border" size="sm" style={{ marginRight: '8px' }} />Loading…
                                </td>
                            </tr>
                        ) : arabicNameList.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                                    <i className="bi bi-translate" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: '#c3c6d7' }}></i>
                                    No Arabic names found. Click <strong>Add New</strong> to create one.
                                </td>
                            </tr>
                        ) : arabicNameList.map((item, idx) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #e8eaed', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbfc'}>
                                <td style={{ padding: '10px 14px', color: '#191c1e' }}>{item.name_in_english}</td>
                                <td style={{ padding: '10px 14px', color: '#191c1e', textAlign: 'right', direction: 'rtl', fontFamily: '"Amiri", "Noto Naskh Arabic", Arial, sans-serif', fontSize: '14px' }}>
                                    {item.name_in_arabic}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                                        <button
                                            onClick={() => ArabicNameCreateRef.current?.open(item.id)}
                                            style={{ background: '#e8f0fe', color: '#1a5fb4', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                                            title="Edit">
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            onClick={() => deleteArabicName(item.id)}
                                            style={{ background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                                            title="Delete">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {totalItems > 0 && (
                    <div style={{ borderTop: '1px solid #e8eaed', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: '"Inter", sans-serif' }}>
                            Showing {offset + 1}–{offset + currentPageItemsCount} of {totalItems}
                        </div>
                        <PaginationControls
                            page={page} totalPages={totalPages}
                            onPageChange={p => { page = p; setPage(p); list(); }}
                        />
                    </div>
                )}
            </div>
        </div>
    );

    if (isModal) {
        return (
            <Modal show={show} fullscreen onHide={() => setShow(false)} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={() => setShow(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        <i className="bi bi-translate" style={{ marginRight: '8px', color: '#004ac6' }}></i>
                        Arabic Names
                    </Modal.Title>
                    <button
                        style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => ArabicNameCreateRef.current?.open()}>
                        <i className="bi bi-plus-lg"></i> Add New
                    </button>
                    <button type="button" className="btn-close ms-1" onClick={() => setShow(false)} aria-label="Close" />
                </Modal.Header>
                <Modal.Body style={{ padding: 0, overflow: 'auto', background: '#f7f9fb' }}>
                    {content}
                </Modal.Body>
            </Modal>
        );
    }

    return content;
});

export default ArabicNameIndex;
