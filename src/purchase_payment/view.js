import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PaymentView from '../utils/PaymentView.js';


const PurchasePaymentView = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    return (
        <PaymentView
            ref={ref}
            {...props}
            apiPath="/v1/purchase-payment"
            title={m => `${t('details_of_payment_of_purchase')} #${m.purchase_code}`}
            renderFirstRow={m => (<>
                <th>{t('purchase_id_label')}</th><td> {m.purchase_code}</td>
                <th>{t('amount_label')}</th><td> {m.amount}</td>
                <th>{t('payment_method_label')}</th><td> {m.method}</td>
                <th>{t('store_name_label')}</th><td> {m.store_name}</td>
            </>)}

            createFormArg={(props) => props.purchase}
        />
    );
});

export default PurchasePaymentView;
