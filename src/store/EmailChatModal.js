import React from 'react';
import { Modal } from 'react-bootstrap';
import ProcurementEmailConversationTab from './ProcurementEmailConversationTab';

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
