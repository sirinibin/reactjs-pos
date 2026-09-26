import React from 'react';
import PurchaseBillsTab from '../store/PurchaseBillsTab';

export default function PurchaseBillImagesIndex() {
    const storeId = localStorage.getItem('store_id');
    return (
        <div className="container-fluid" style={{ padding: '20px' }}>
            <PurchaseBillsTab storeId={storeId} />
        </div>
    );
}
