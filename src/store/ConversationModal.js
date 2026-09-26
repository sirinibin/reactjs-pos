import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import ProcurementWhatsAppTab from './ProcurementWhatsAppTab';
import ProcurementEmailConversationTab from './ProcurementEmailConversationTab';
import { SupplierForm } from '../rfq_suppliers/index';
import CustomerCreate from '../customer/create';

function usePhoneContact(show, phone, storeId) {
    const [supplier, setSupplier] = useState(null);
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        if (!show || !phone || !storeId) { setSupplier(null); setCustomer(null); return; }
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: token };

        // Look up supplier and customer in parallel
        Promise.all([
            fetch(`/v1/rfq-suppliers?store_id=${storeId}&search=${encodeURIComponent(phone)}&limit=1`, { headers })
                .then(r => r.json()).catch(() => null),
            fetch(`/v1/customer/by-phone?store_id=${storeId}&phone=${encodeURIComponent(phone)}`, { headers })
                .then(r => r.json()).catch(() => null),
        ]).then(([supRes, custRes]) => {
            setSupplier(supRes?.items?.[0] || null);
            setCustomer(custRes?.id ? custRes : null);
        });
    }, [show, phone, storeId]);

    return { supplier, setSupplier, customer };
}

export function WhatsAppChatModal({ show, phone, storeId, onHide, zIndex }) {
    const { supplier, setSupplier, customer } = usePhoneContact(show, phone, storeId);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const customerEditRef = useRef(null);

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" backdrop="static" style={{ zIndex: zIndex || 1060 }}>
                <Modal.Header closeButton style={{ padding: '8px 16px', background: '#f6fdf6', borderBottom: '1px solid #d4edda' }}>
                    <Modal.Title style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <i className="bi bi-whatsapp text-success" style={{ fontSize: '18px' }}></i>
                        {phone}
                        {supplier && (
                            <button
                                className="btn btn-sm btn-outline-primary"
                                style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 'normal' }}
                                onClick={() => setEditingSupplier(supplier)}
                                title="Edit RFQ Supplier"
                            >
                                <i className="bi bi-building-gear me-1"></i>{supplier.name}
                            </button>
                        )}
                        {customer && (
                            <button
                                className="btn btn-sm btn-outline-info"
                                style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 'normal' }}
                                onClick={() => customerEditRef.current?.open(customer.id)}
                                title="Edit Customer"
                            >
                                <i className="bi bi-person-gear me-1"></i>{customer.name}
                            </button>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: 0, overflowY: 'auto', maxHeight: '85vh' }}>
                    {show && phone && (
                        <ProcurementWhatsAppTab key={phone} storeId={storeId} initialPhone={phone} />
                    )}
                </Modal.Body>
            </Modal>

            {editingSupplier && (
                <SupplierForm
                    supplier={editingSupplier}
                    onClose={() => setEditingSupplier(null)}
                    onSave={saved => { setSupplier({ ...editingSupplier, ...saved }); setEditingSupplier(null); }}
                />
            )}

            <CustomerCreate ref={customerEditRef} />
        </>
    );
}

export function EmailChatModal({ show, email, storeId, onHide, zIndex }) {
    return (
        <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" backdrop="static" style={{ zIndex: zIndex || 1060 }}>
            <Modal.Header closeButton style={{ padding: '8px 16px', background: '#f0f4ff', borderBottom: '1px solid #c3d4f5' }}>
                <Modal.Title style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="bi bi-envelope-fill text-primary" style={{ fontSize: '18px' }}></i>
                    {email}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: 0, overflowY: 'auto', maxHeight: '85vh' }}>
                {show && email && (
                    <ProcurementEmailConversationTab key={email} storeId={storeId} initialEmail={email} />
                )}
            </Modal.Body>
        </Modal>
    );
}
