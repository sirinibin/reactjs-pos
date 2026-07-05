import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';


const SalesCashDiscountView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/sales-cash-discount"
        title={m => `Details of Sales Cash Discount of Order #${m.order_code}`}
        renderFirstRow={m => (<>
            <th>Order ID:</th><td> {m.order_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
            <th>Payment Method:</th><td> {m.method}</td>
        </>)}
        
        createFormArg={(props) => props.order}
    />
));

export default SalesCashDiscountView;
