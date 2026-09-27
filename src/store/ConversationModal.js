import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import ProcurementWhatsAppTab from './ProcurementWhatsAppTab';
import RFQEmailConversationsPanel from '../rfq_received/RFQEmailConversationsPanel';
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
    const [activeTab, setActiveTab] = useState('whatsapp');
    const [customerEmailUnread, setCustomerEmailUnread] = useState(0);
    const [supplierEmailUnread, setSupplierEmailUnread] = useState(0);

    // Reset to WhatsApp tab when a new conversation opens
    useEffect(() => {
        if (show) setActiveTab('whatsapp');
    }, [show, phone]);

    const displayName = supplier?.name || customer?.name || contactName || '';

    const customerEmails = customer?.email ? [customer.email] : [];
    const customerEmailLabels = customer?.email ? { [customer.email]: customer.name || customer.email } : {};

    const supplierEmails = supplier?.email ? [supplier.email] : [];
    const supplierEmailLabels = supplier?.email ? { [supplier.email]: supplier.name || supplier.email } : {};

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" backdrop="static" style={{ zIndex: zIndex || 1060 }}>
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
                                <i className="bi bi-pencil-square"></i>
                            </button>
                        )}
                        {customer && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ fontSize: '11px', padding: '2px 6px', lineHeight: 1 }}
                                onClick={() => customerEditRef.current?.open(customer.id)}
                                title="Edit Customer"
                            >
                                <i className="bi bi-pencil-square"></i>
                            </button>
                        )}
                    </Modal.Title>
                </Modal.Header>

                {/* Subtabs */}
                <ul className="nav nav-tabs px-3 pt-1" style={{ borderBottom: '1px solid #dee2e6', background: '#f8f9fa', fontSize: 13, marginBottom: 0 }}>
                    <li className="nav-item">
                        <button
                            className={`nav-link py-1 ${activeTab === 'whatsapp' ? 'active' : ''}`}
                            onClick={() => setActiveTab('whatsapp')}
                        >
                            <i className="bi bi-person-lines-fill me-1"></i>Customer Conversations
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link py-1 ${activeTab === 'customer_email' ? 'active' : ''}`}
                            onClick={() => setActiveTab('customer_email')}
                        >
                            <i className="bi bi-envelope-fill me-1"></i>Customer Email
                            {customerEmailUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{customerEmailUnread}</span>}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link py-1 ${activeTab === 'supplier_email' ? 'active' : ''}`}
                            onClick={() => setActiveTab('supplier_email')}
                        >
                            <i className="bi bi-building-check me-1"></i>Supplier Email
                            {supplierEmailUnread > 0 && <span className="badge bg-danger ms-1 rounded-pill" style={{ fontSize: 9 }}>{supplierEmailUnread}</span>}
                        </button>
                    </li>
                </ul>

                <Modal.Body style={{ padding: 0, overflowY: 'auto', maxHeight: '85vh' }}>
                    {/* Customer Conversations (WhatsApp) */}
                    <div style={{ display: activeTab === 'whatsapp' ? undefined : 'none', height: '100%' }}>
                        {show && phone && (
                            <ProcurementWhatsAppTab key={phone} storeId={storeId} initialPhone={phone} />
                        )}
                    </div>

                    {/* Customer Email */}
                    {activeTab === 'customer_email' && (
                        <div style={{ padding: '12px' }}>
                            <RFQEmailConversationsPanel
                                storeId={storeId}
                                emails={customerEmails}
                                emailLabels={customerEmailLabels}
                                chatZIndex={(zIndex || 1060) + 100}
                                emptyMessage="No email address found for this customer."
                                onUnreadCount={setCustomerEmailUnread}
                                showEmptyEmails
                            />
                        </div>
                    )}

                    {/* Supplier Email */}
                    {activeTab === 'supplier_email' && (
                        <div style={{ padding: '12px' }}>
                            <RFQEmailConversationsPanel
                                storeId={storeId}
                                emails={supplierEmails}
                                emailLabels={supplierEmailLabels}
                                chatZIndex={(zIndex || 1060) + 100}
                                emptyMessage="No email address found for this supplier."
                                onUnreadCount={setSupplierEmailUnread}
                                showEmptyEmails
                            />
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {editingSupplier && (
                <SupplierForm
                    supplier={editingSupplier}
                    onClose={() => setEditingSupplier(null)}
                    onSave={saved => { setSupplier({ ...editingSupplier, ...saved }); setEditingSupplier(null); }}
                    zIndex={21000}
                />
            )}

            <CustomerCreate ref={customerEditRef} />
        </>
    );
}
