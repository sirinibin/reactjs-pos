import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import ProcurementWhatsAppTab from './ProcurementWhatsAppTab';
import { SupplierForm } from '../rfq_suppliers/index';
import CustomerCreate from '../customer/create';
export { EmailChatModal } from './EmailChatModal';

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

export function WhatsAppChatModal({ show, phone, storeId, onHide, zIndex, contactName }) {
    const { supplier, setSupplier, customer } = usePhoneContact(show, phone, storeId);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const customerEditRef = useRef(null);

    const displayName = supplier?.name || customer?.name || contactName || '';
    const modalZIndex = zIndex || 1060;

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" backdrop="static" style={{ zIndex: modalZIndex }}>
                <Modal.Header closeButton style={{ padding: '8px 16px', background: '#f6fdf6', borderBottom: '1px solid #d4edda' }}>
                    <Modal.Title style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <i className="bi bi-whatsapp text-success" style={{ fontSize: '18px' }}></i>
                        {displayName && <span style={{ fontWeight: 700 }}>{displayName}</span>}
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>{phone}</span>
                        {supplier && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ fontSize: '11px', padding: '2px 6px', lineHeight: 1 }}
                                onClick={() => setEditingSupplier(supplier)}
                                title="Edit RFQ Supplier"
                            >
                                <i className="bi bi-pencil-square"></i> Edit Supplier
                            </button>
                        )}
                        {customer && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ fontSize: '11px', padding: '2px 6px', lineHeight: 1 }}
                                onClick={() => customerEditRef.current?.open(customer.id)}
                                title="Edit Customer"
                            >
                                <i className="bi bi-pencil-square"></i> Edit Customer
                            </button>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: 0, overflowY: 'auto', maxHeight: '85vh' }}>
                    {show && phone && (
                        <ProcurementWhatsAppTab key={phone} storeId={storeId} initialPhone={phone} zIndexBase={modalZIndex} />
                    )}
                </Modal.Body>
            </Modal>

            {editingSupplier && (
                <SupplierForm
                    supplier={editingSupplier}
                    onClose={() => setEditingSupplier(null)}
                    onSave={saved => { setSupplier({ ...editingSupplier, ...saved }); setEditingSupplier(null); }}
                    zIndex={modalZIndex + 10000}
                />
            )}

            <CustomerCreate ref={customerEditRef} />
        </>
    );
}

// WhatsAppNotificationModal — opened from the app header notification.
// Shows the full ProcurementWhatsAppTab (sidebar + chat) in a modal.
// The clicked conversation loads first; sidebar loads other conversations after.
// WhatsAppNotificationModal — opens procurement-whatsapp in a modal.
// Loads the clicked phone's messages first, then loads the full sidebar.
export function WhatsAppNotificationModal({ show, storeId, phone, onHide }) {
    const MODAL_Z = 15000;
    return (
        <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" backdrop="static" style={{ zIndex: MODAL_Z }}>
            <Modal.Header closeButton style={{ padding: '8px 16px', background: '#f6fdf6', borderBottom: '1px solid #d4edda' }}>
                <Modal.Title style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-whatsapp text-success" style={{ fontSize: '18px' }}></i>
                    WhatsApp Conversations
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: 0, overflowY: 'hidden', height: '85vh' }}>
                {show && (
                    <ProcurementWhatsAppTab
                        key={phone || 'wa-modal'}
                        storeId={storeId}
                        initialPhone={phone}
                        showSidebar
                        zIndexBase={MODAL_Z}
                    />
                )}
            </Modal.Body>
        </Modal>
    );
}
