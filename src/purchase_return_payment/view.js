import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';


const PurchaseReturnPaymentView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/purchase-return-payment"
        title={m => `Details of Purchase Return Payment  of Purchase return #${m.purchase_return_code}`}
        renderFirstRow={m => (<>
            <th>Purchase Return ID:</th><td> {m.purchase_return_code}</td>
            <th>Purchase Purchase ID:</th><td> {m.purchase_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Payment Method:</th><td> {m.method}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
        </>)}
        
        createFormArg={(props, model) => model}
    />
));

export default PurchaseReturnPaymentView;
