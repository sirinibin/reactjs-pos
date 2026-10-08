import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PaymentView from '../utils/PaymentView.js';


const QuotationSalesReturnPaymentView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    return (
        <PaymentView
            ref={ref}
            {...props}
            apiPath="/v1/quotation-sales-return-payment"
            title={m => t('Details of QuotationSales Return Payment of QuotationSales return #') + m.quotationsales_return_code}
            renderFirstRow={m => (<>
                <th>{t('QuotationSales Return ID:')}</th><td> {m.quotationsales_return_code}</td>
                <th>{t('QuotationSales Order ID:')}</th><td> {m.order_code}</td>
                <th>{t('Amount:')}</th><td> {m.amount}</td>
                <th>{t('Payment Method:')}</th><td> {m.method}</td>
                <th>{t('Store Name:')}</th><td> {m.store_name}</td>
            </>)}

            createFormArg={(props) => props.quotationsales_return}
        />
    );
});

export default QuotationSalesReturnPaymentView;
