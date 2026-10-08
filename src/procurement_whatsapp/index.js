import React from 'react';
import ProcurementWhatsAppTab from '../store/ProcurementWhatsAppTab';

export default function ProcurementWhatsAppIndex() {
    const storeId = localStorage.getItem('store_id');
    return (
        <div className="container-fluid" style={{ padding: '20px' }}>
            <ProcurementWhatsAppTab storeId={storeId} />
        </div>
    );
}
