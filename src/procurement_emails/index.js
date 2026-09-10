import React from 'react';
import ProcurementEmailsTab from '../store/ProcurementEmailsTab';

export default function ProcurementEmailsIndex() {
    const storeId = localStorage.getItem('store_id');
    return (
        <div className="container-fluid" style={{ padding: '20px' }}>
            <ProcurementEmailsTab storeId={storeId} />
        </div>
    );
}
