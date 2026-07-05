import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';


const PurchasePaymentView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/purchase-payment"
        title={m => `Details of Payment of Purchase #${m.purchase_code}`}
        renderFirstRow={m => (<>
            <th>Purchase ID:</th><td> {m.purchase_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Payment Method:</th><td> {m.method}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
        </>)}
        
        createFormArg={(props) => props.purchase}
    />
));

export default PurchasePaymentView;
