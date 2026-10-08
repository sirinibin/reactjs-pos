import React, { useState } from 'react';
import ProcurementEmailsTab from '../store/ProcurementEmailsTab';
import ProcurementEmailConversationTab from '../store/ProcurementEmailConversationTab';

export default function ProcurementEmailsIndex() {
    const storeId = localStorage.getItem('store_id');
    const [activeTab, setActiveTab] = useState('emails');

    return (
        <div className="container-fluid" style={{ padding: '20px' }}>
            {/* Tab switcher */}
            <ul className="nav nav-tabs mb-3" style={{ borderBottom: '2px solid #dee2e6' }}>
                <li className="nav-item">
                    <button
                        className={`nav-link${activeTab === 'emails' ? ' active' : ''}`}
                        onClick={() => setActiveTab('emails')}
                        style={{ border: 'none', background: 'none', fontWeight: activeTab === 'emails' ? 600 : 400 }}
                    >
                        <i className="bi bi-inbox me-1"></i>Emails
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link${activeTab === 'conversations' ? ' active' : ''}`}
                        onClick={() => setActiveTab('conversations')}
                        style={{ border: 'none', background: 'none', fontWeight: activeTab === 'conversations' ? 600 : 400 }}
                    >
                        <i className="bi bi-chat-left-text me-1"></i>Conversations
                    </button>
                </li>
            </ul>

            {activeTab === 'emails' && <ProcurementEmailsTab storeId={storeId} />}
            {activeTab === 'conversations' && <ProcurementEmailConversationTab storeId={storeId} />}
        </div>
    );
}
