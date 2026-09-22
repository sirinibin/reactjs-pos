import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PaymentView from '../utils/PaymentView.js';


const PurchaseReturnPaymentView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    return (
        <PaymentView
            ref={ref}
            {...props}
            apiPath="/v1/purchase-return-payment"
            title={m => `${t('details_of_purchase_return_payment')} #${m.purchase_return_code}`}
            renderFirstRow={m => (<>
                <th>{t('purchase_return_id_label')}</th><td> {m.purchase_return_code}</td>
                <th>{t('purchase_id_label')}</th><td> {m.purchase_code}</td>
                <th>{t('amount_label')}</th><td> {m.amount}</td>
                <th>{t('payment_method_label')}</th><td> {m.method}</td>
                <th>{t('store_name_label')}</th><td> {m.store_name}</td>
            </>)}

            createFormArg={(props, model) => model}
        />
    );
});

export default PurchaseReturnPaymentView;
