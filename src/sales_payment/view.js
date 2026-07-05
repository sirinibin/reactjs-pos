import React, { forwardRef } from "react";
import PaymentView from '../utils/PaymentView.js';


const SalesPaymentView = forwardRef((props, ref) => (
    <PaymentView
        ref={ref}
        {...props}
        apiPath="/v1/sales-payment"
        title={m => `Details of Sales Payment  of Order #${m.order_code}`}
        renderFirstRow={m => (<>
            <th>Order ID:</th><td> {m.order_code}</td>
            <th>Amount:</th><td> {m.amount}</td>
            <th>Payment Method:</th><td> {m.method}</td>
            <th>Payment from Account:</th><td> {m.pay_from_account}</td>
            <th>Store Name:</th><td> {m.store_name}</td>
        </>)}
        
        createFormArg={(props) => props.order}
    />
));

export default SalesPaymentView;
