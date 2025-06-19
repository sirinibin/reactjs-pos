import { React, forwardRef } from "react";
import { format } from "date-fns";
//import n2words from 'n2words'
//import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils.js";
import '@emran-alhaddad/saudi-riyal-font/index.css';
import Amount from "../utils/amount.js";
import StatsSummary from "../utils/StatsSummary.js";

const ReportContent = forwardRef((props, ref) => {

    let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        if (Number.isInteger(input)) {
            input = input.toString();
        }

        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    /*

    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }
        */

    let detailsLabelsColumnWidthPercent = "32%";
    let detailsValuesColumnWidthPercent = "68%";
    let detailsBorderThickness = "0.5px solid black";
    let detailsBorderColor = "black";//#dee2e6
    let tableBorderThickness = "0.5px solid black";

    return (<>
        <span ref={ref}>
            {props.model.pages && props.model.pages.map((page, pageIndex) => (
                <div
                    className="container"
                    key={pageIndex}
                    id="printableArea"
                    style={{
                        fontFamily: props.fontSizes[props.modelName + "_font"],
                        backgroundColor: "white",
                        border: "solid 0px",
                        borderColor: "silver",
                        borderRadius: "2mm",
                        paddingLeft: "0px",
                        paddingRight: "0px",
                        paddingTop: "10px",
                        paddingBottom: "4px",
                        marginTop: page.top + "px",
                        /* height: "auto",*/
                        height: "1118px",
                        width: `${props.whatsAppShare ? "750px" : "750px"}`
                    }}

                >
                    {props.fontSizes[props.modelName + "_storeHeader"]?.visible || props.whatsAppShare ? < div className="row">
                        <div className="col">
                            <ul className="list-unstyled text-left">
                                <li>
                                    <h4 className="clickable-text" onClick={() => {
                                        props.selectText("storeName");
                                    }} style={{ fontSize: props.fontSizes[props.modelName + "_storeName"]?.size }}>
                                        {props.model.store ? props.model.store.name : "<STORE_NAME>"}
                                    </h4>
                                </li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeTitle");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeTitle"]?.size }}>{props.model.store ? props.model.store.title : "<STORE_TITLE>"}</li>
                                {/*<!-- <li><hr /></li> --> */}
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeCR");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeCR"]?.size }}>C.R. / {props.model.store ? props.model.store.registration_number : "<STORE_CR_NO>"}</li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeVAT");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeVAT"]?.size }}>VAT / {props.model.store ? props.model.store.vat_no : "<STORE_VAT_NO>"}</li>
                            </ul>
                        </div>
                        <div className="col">
                            <div className="invoice-logo text-center">
                                {props.model?.store?.logo ? <img width="70" height="70" src={props.model.store.logo + "?" + (Date.now())} alt="Invoice logo" /> : null}
                            </div>
                        </div>
                        <div className="col">
                            <ul className="list-unstyled text-end">
                                <li>
                                    <h4 className="clickable-text" onClick={() => {
                                        props.selectText("storeNameArabic");
                                    }} style={{ fontSize: props.fontSizes[props.modelName + "_storeNameArabic"]?.size }}>
                                        <strong>
                                            {props.model.store ? props.model.store.name_in_arabic : "<STORE_NAME_ARABIC>"}
                                        </strong>
                                    </h4>
                                </li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeTitleArabic");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeTitleArabic"]?.size }}>
                                    {props.model.store ? props.model.store.title_in_arabic : "<STORE_TITLE_ARABIC>"}
                                </li>
                                {/* <!-- <li><hr /></li> --> */}
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeCRArabic");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeCRArabic"]?.size }}>{props.model.store ? props.model.store.registration_number_in_arabic : "<STORE_CR_NO_ARABIC>"}</li>
                                <li className="clickable-text" onClick={() => {
                                    props.selectText("storeVATArabic");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_storeVATArabic"]?.size }} >{props.model.store ? props.model.store.vat_no_in_arabic : "<STORE_VAT_NO_ARABIC>"}</li>
                            </ul>
                        </div>
                    </div> : ""}


                    <div className="row" style={{ marginTop: props.fontSizes[props.modelName + "_storeHeader"]?.visible || props.whatsAppShare ? "0px" : props.fontSizes[props.modelName + "_marginTop"]?.size }}>
                        <div className="col">
                            <u><h1 className="text-center clickable-text fw-bold" onClick={() => {
                                props.selectText("invoiceTitle");
                            }} style={{ fontSize: props.fontSizes[props.modelName + "_invoiceTitle"]?.size }} >
                                {props.model.reportTitle}
                            </h1>
                            </u>
                        </div>
                    </div>

                    <div className="row col-md-14" style={{ border: "solid 0px", borderColor: detailsBorderColor, fontSize: props.fontSizes[props.modelName + "_invoiceDetails"]?.size, padding: "10px" }} onClick={() => {
                        props.selectText("invoiceDetails");
                    }}>
                        <div className="col-md-12" style={{ border: detailsBorderThickness, borderColor: detailsBorderColor, marginLeft: "0px", width: "100%" }}>

                            {props.model.dateStr && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Date | تاريخ:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                    {props.model.dateStr ? props.model.dateStr : ""}
                                </div>
                            </div>}

                            {props.model.customer && (props.modelName === "sales_report" || props.modelName === "sales_return_report" || props.modelName === "quotation_sales_return_report" || props.modelName === "quotation_report" || props.modelName === "quotation_invoice_report" || props.modelName === "delivery_note_report") ? <>
                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer Name | اسم العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer ? props.model.customer.name : ""}
                                        {props.model.customer?.name_in_arabic ? " | " + props.model.customer.name_in_arabic : ""}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer ID | معرف العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer?.code ? props.model.customer.code : "N/A"}

                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer VAT  | ضريبة القيمة المضافة للعملاء:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer?.vat_no ? props.model.customer.vat_no : ""}
                                        {!props.model.customer && props.model.vat_no ? props.model.vat_no : ""}
                                        {!props.model.customer && !props.model.vat_no ? "N/A" : ""}
                                        {props.model.customer?.vat_no_in_arabic ? " | " + props.model.customer.vat_no_in_arabic : ""}
                                        {!props.model.customer && props.model.vat_no ? " | " + convertToArabicNumber(props.model.vat_no) : ""}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer C.R | رقم تسجيل شركة العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer?.registration_number ? props.model.customer.registration_number + " | " + convertToArabicNumber(props.model.customer.registration_number) : "N/A"}
                                    </div>
                                </div>
                            </> : ""}
                            {props.modelName === "sales_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Sales"
                                    defaultOpen={true}
                                    stats={{
                                        "Sales | مبيعات": props.model.meta.total_sales,
                                        "Paid Sales | المبيعات المدفوعة": props.model.meta.paid_sales,
                                        "Cash Sales | المبيعات النقدية": props.model.meta.cash_sales,
                                        "Bank Account Sales | مبيعات الحسابات البنكية": props.model.meta.bank_account_sales,
                                        "Credit Sales | مبيعات الائتمان": props.model.meta.unpaid_sales,
                                        "Sales Discount | خصم المبيعات": props.model.meta.discount,
                                        "Cash Discount | الخصم النقدي": props.model.meta.cash_discount,
                                        "Shipping/Handling fees | رسوم الشحن/المناولة": props.model.meta.shipping_handling_fees,
                                        "VAT Collected | ضريبة القيمة المضافة": props.model.meta.vat_price,
                                        "Net Profit | صافي الربح": props.model.meta.net_profit,
                                        "Net Profit % | صافي الربح %": props.model.meta.net_profit && props.model.meta.total_sales ? ((props.model.meta.net_profit / props.model.meta.total_sales) * 100) : "",
                                        "Net Loss | صافي الخسارة": props.model.meta.loss,
                                        "Return Count | عدد الإرجاع": props.model.meta.return_count,
                                        "Return Paid Amount | إرجاع المبلغ المدفوع": props.model.meta.return_amount,
                                    }}
                                />
                            </div>}
                            {props.modelName === "sales_return_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Sales Return"
                                    defaultOpen={true}
                                    stats={{
                                        "Sales Return | عائد المبيعات": props.model.meta.total_sales_return,
                                        "Paid Sales Return | عائد المبيعات المدفوع": props.model.meta.paid_sales_return,
                                        "Cash Sales Return | عائد المبيعات النقدية": props.model.meta.cash_sales_return,
                                        "Bank Account Sales Return | عائد مبيعات الحساب البنكي": props.model.meta.bank_account_sales_return,
                                        "Credit Sales Return | عائد مبيعات الائتمان": props.model.meta.unpaid_sales_return,
                                        "Sales Discount Return | عائد خصم المبيعات": props.model.meta.discount,
                                        "Cash Discount Return | إرجاع الخصم النقدي": props.model.meta.cash_discount,
                                        "Shipping/Handling fees Return | رسوم الشحن/المناولة الإرجاع": props.model.meta.shipping_handling_fees,
                                        "VAT Return | VAT Return": props.model.meta.vat_price,
                                        "Net Profit Return | عائد صافي الربح": props.model.meta.net_profit,
                                        "Net Profit Return % | عائد صافي الربح %": props.model.meta.net_profit && props.model.meta.total_sales_return ? ((props.model.meta.net_profit / props.model.meta.total_sales_return) * 100) : "",
                                        "Net Loss Return | صافي عائد الخسارة": props.model.meta.loss,
                                    }}
                                />
                            </div>}
                            {props.modelName === "quotation_invoice_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Sales"
                                    defaultOpen={true}
                                    stats={{
                                        "Sales | مبيعات": props.model.meta.invoice_total_sales,
                                        "Paid Sales | المبيعات المدفوعة": props.model.meta.invoice_paid_sales,
                                        "Cash Sales | المبيعات النقدية": props.model.meta.invoice_cash_sales,
                                        "Bank Account Sales | مبيعات الحسابات البنكية": props.model.meta.invoice_bank_account_sales,
                                        "Credit Sales | مبيعات الائتمان": props.model.meta.invoice_unpaid_sales,
                                        "Sales Discount | خصم المبيعات": props.model.meta.invoice_discount,
                                        "Cash Discount | الخصم النقدي": props.model.meta.invoice_cash_discount,
                                        "Shipping/Handling fees | رسوم الشحن/المناولة": props.model.meta.invoice_shipping_handling_fees,
                                        "VAT Collected | ضريبة القيمة المضافة": props.model.meta.invoice_vat_price,
                                        "Net Profit | صافي الربح": props.model.meta.invoice_net_profit,
                                        "Net Profit % | صافي الربح %": props.model.meta.invoice_net_profit && props.model.meta.invoice_total_sales ? ((props.model.meta.invoice_net_profit / props.model.meta.invoice_total_sales) * 100) : "",
                                        "Net Loss | صافي الخسارة": props.model.meta.invoice_loss,
                                    }}
                                />
                            </div>}
                            {props.modelName === "quotation_sales_return_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Qtn. Sales Return"
                                    defaultOpen={true}
                                    stats={{
                                        "Sales Return | عائد المبيعات": props.model.meta.total_quotation_sales_return,
                                        "Paid Sales Return | عائد المبيعات المدفوع": props.model.meta.paid_quotation_sales_return,
                                        "Cash Sales Return | عائد المبيعات النقدية": props.model.meta.cash_quotation_sales_return,
                                        "Bank Account Sales Return | عائد مبيعات الحساب البنكي": props.model.meta.bank_account_quotation_sales_return,
                                        "Credit Sales Return | عائد مبيعات الائتمان": props.model.meta.unpaid_quotation_sales_return,
                                        "Sales Discount Return | عائد خصم المبيعات": props.model.meta.discount,
                                        "Cash Discount Return | إرجاع الخصم النقدي": props.model.meta.cash_discount,
                                        "Shipping/Handling fees Return | رسوم الشحن/المناولة الإرجاع": props.model.meta.shipping_handling_fees,
                                        "VAT Return | VAT Return": props.model.meta.vat_price,
                                        "Net Profit Return | عائد صافي الربح": props.model.meta.net_profit,
                                        "Net Profit Return % | عائد صافي الربح %": props.model.meta.net_profit && props.model.meta.total_quotation_sales_return ? ((props.model.meta.net_profit / props.model.meta.total_quotation_sales_return) * 100) : "",
                                        "Net Loss Return | صافي عائد الخسارة": props.model.meta.loss,
                                    }}
                                />
                            </div>}
                            {props.modelName === "quotation_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Quotations"
                                    defaultOpen={true}
                                    stats={{
                                        "Quotation": props.model.meta.total_quotation,
                                        "Profit": props.model.meta.profit,
                                        //  "Profit %": props.model.meta.profit && props.model.meta.total_quotation ? (props.model.meta.profit / props.model.meta.total_quotation) * 100 : "",
                                        "Loss": props.model.meta.loss,
                                    }}
                                />
                            </div>}

                            {props.model.vendor && (props.modelName === "purchase_report" || props.modelName === "purchase_return_report") ? <>
                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor Name | اسم العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor ? props.model.vendor.name : ""}
                                        {props.model.vendor?.name_in_arabic ? " | " + props.model.vendor.name_in_arabic : ""}
                                    </div>
                                </div>
                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor ID | معرف البائع:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor?.code ? props.model.vendor.code : "N/A"}
                                    </div>
                                </div>
                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor VAT | ضريبة القيمة المضافة للعملاء:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor?.vat_no ? props.model.vendor.vat_no : "N/A"}
                                    </div>
                                </div>

                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor C.R | رقم تسجيل الشركة الموردة:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor?.registration_number ? props.model.vendor.registration_number : "N/A"}
                                    </div>
                                </div>
                            </> : ""}
                            {props.modelName === "purchase_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Purchase"
                                    defaultOpen={true}
                                    stats={{
                                        "Purchase | شراء": props.model.meta.total_purchase,
                                        "Paid purchase | شراء مدفوع الأجر": props.model.meta.paid_purchase,
                                        "Cash purchase | شراء نقدا": props.model.meta.cash_purchase,
                                        "Bank account purchase | شراء حساب بنكي": props.model.meta.bank_account_purchase,
                                        "Credit purchase | شراء الائتمان": props.model.meta.unpaid_purchase,
                                        "Purchase discount | خصم الشراء": props.model.meta.discount,
                                        "Cash discount | الخصم النقدي": props.model.meta.cash_discount,
                                        "Shipping/Handling fees | رسوم الشحن/المناولة": props.model.meta.shipping_handling_fees,
                                        "VAT paid | ضريبة القيمة المضافة المدفوعة": props.model.meta.vat_price,
                                        "Return Count | عدد الإرجاع": props.model.meta.return_count,
                                        "Return Paid Amount | إرجاع المبلغ المدفوع": props.model.meta.return_paid_amount,
                                    }}
                                />
                            </div>}
                            {props.modelName === "purchase_return_report" && pageIndex === 0 && <div className="row" style={{ marginTop: "12px" }}>
                                <StatsSummary
                                    title="Purchase"
                                    defaultOpen={true}
                                    stats={{
                                        "Purchase Return | عائد الشراء": props.model.meta.total_purchase_return,
                                        "Paid Purchase Return | عائد الشراء المدفوع": props.model.meta.paid_purchase_return,
                                        "Cash Purchase Return | عائد الشراء النقدي": props.model.meta.cash_purchase_return,
                                        "Bank Account Purchase Return | عائد شراء الحساب البنكي": props.model.meta.bank_account_purchase_return,
                                        "Credit Purchase Return | عائد شراء الائتمان": props.model.meta.unpaid_purchase_return,
                                        "Purchase Discount Return | إرجاع خصم الشراء": props.model.meta.discount,
                                        "Cash Discount Return | إرجاع الخصم النقدي": props.model.meta.cash_discount,
                                        "Shipping/Handling fees | رسوم الشحن/المناولة": props.model.meta.shipping_handling_fees,
                                        "VAT Return | إرجاع ضريبة القيمة المضافة": props.model.meta.vat_price,
                                    }}
                                />
                            </div>}
                        </div>
                    </div>


                    < div className="row clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_invoicePageCount"]?.size }} onClick={() => {
                        props.selectText("invoicePageCount");
                    }}>
                        <div className="col text-start">
                            {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                        </div>
                        <div className="col text-end">
                            {props.model.total_pages ? convertToArabicNumber(props.model.total_pages.toString()) + " الصفحة " + convertToArabicNumber((pageIndex + 1).toString()) + " من " : ""}
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <div
                                className=" "
                                style={{
                                    overflow: "hidden", outline: "none"
                                }}
                                tabIndex="0"
                            >
                                <table
                                    className="table-responsive"
                                    style={{ border: tableBorderThickness, width: "100%" }}
                                >
                                    <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableBody"]?.size }} className="clickable-text print-value" onClick={() => {
                                        props.selectText("tableBody");
                                    }} >
                                        <tr style={{ borderBottom: tableBorderThickness, fontSize: props.fontSizes[props.modelName + "_tableHead"]?.size, height: "auto" }} onClick={(e) => {
                                            e.stopPropagation();
                                            props.selectText("tableHead");
                                        }}>
                                            <th className="per6 text-center" style={{ padding: "0px", width: "6%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>

                                                <b>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>رقم</li>
                                                        <li>Sn.</li>
                                                    </ul>
                                                </b>
                                            </th>
                                            <th className="per14 text-center" style={{ padding: "0px", width: "14%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto",
                                                        marginBottom: "2px"
                                                    }}
                                                >
                                                    <li>بطاقة تعريف</li>
                                                    <li>ID</li>
                                                </ul>
                                            </th>
                                            <th className="per33 text-center" style={{ padding: "0px", width: "13%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "auto",
                                                        marginBottom: "2px"

                                                    }}
                                                >
                                                    <li>تاريخ</li>
                                                    <li>Date</li>
                                                </ul>
                                            </th>
                                            {!props.model.customer && (props.modelName === "sales_report" || props.modelName === "sales_return_report" || props.modelName === "quotation_report" || props.modelName === "quotation_invoice_report" || props.modelName === "delivery_note_report") && <>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "34%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>عميل</li>
                                                        <li>Customer</li>
                                                    </ul>
                                                </th>
                                            </>}
                                            {!props.model.vendor && (props.modelName === "purchase_report" || props.modelName === "purchase_return_report") && <>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "35%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>بائع</li>
                                                        <li>Vendor</li>
                                                    </ul>
                                                </th>
                                            </>}
                                            {props.modelName !== "delivery_note_report" && <>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "8%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>صافي المجموع</li>
                                                        <li>Net Total</li>
                                                    </ul>
                                                </th>
                                            </>}
                                            {props.modelName !== "delivery_note_report" && props.modelName !== "quotation_report" && <>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "8%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>المبلغ المدفوع</li>
                                                        <li>Amount Paid</li>
                                                    </ul>
                                                </th>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "8%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>الرصيد الائتماني</li>
                                                        <li>Credit Balance</li>
                                                    </ul>
                                                </th>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "7%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>حالة الدفع</li>
                                                        <li>Payment Status</li>
                                                    </ul>
                                                </th>
                                            </>}
                                        </tr>
                                        {page.models && page.models.map((model, index) => (
                                            <tr style={{ borderBottom: tableBorderThickness }} key={model.code} className="text-center"  >
                                                <td style={{ padding: "7px", borderRight: tableBorderThickness }}>{(index + 1) + (pageIndex * props.model.pageSize)}</td>
                                                <td style={{ borderRight: tableBorderThickness }} >{model.code}</td>
                                                <th dir="ltr" style={{ borderRight: tableBorderThickness }}>
                                                    {format(new Date(model.date), "MMM dd yyyy h:mma")}
                                                </th>
                                                {!props.model.customer && (props.modelName === "sales_report" || props.modelName === "sales_return_report" || props.modelName === "quotation_report" || props.modelName === "quotation_invoice_report" || props.modelName === "delivery_note_report") && <>
                                                    <td style={{ borderRight: tableBorderThickness }}>
                                                        {model.customer_name}
                                                    </td>
                                                </>}
                                                {!props.model.vendor && (props.modelName === "purchase_report" || props.modelName === "purchase_return_report") && <>
                                                    <td style={{ borderRight: tableBorderThickness }}>
                                                        {model.vendor_name}
                                                    </td>
                                                </>}
                                                {props.modelName !== "delivery_note_report" && <>
                                                    <td style={{ borderRight: tableBorderThickness }}>
                                                        <Amount amount={trimTo2Decimals(model.net_total)} />
                                                    </td>
                                                </>}
                                                {props.modelName !== "delivery_note_report" && props.modelName !== "quotation_report" && <>
                                                    <td style={{ borderRight: tableBorderThickness }}>
                                                        <Amount amount={trimTo2Decimals(model.total_payment_received)} />
                                                    </td>
                                                    <td style={{ borderRight: tableBorderThickness }}>
                                                        <Amount amount={trimTo2Decimals(model.balance_amount)} />
                                                    </td>
                                                    <td style={{ borderRight: tableBorderThickness }}>
                                                        {model.payment_status === "paid" ?
                                                            <span className="badge bg-success">
                                                                Paid
                                                            </span> : ""}
                                                        {model.payment_status === "paid_partially" ?
                                                            <span className="badge bg-warning">
                                                                Paid Partially
                                                            </span> : ""}
                                                        {model.payment_status === "not_paid" ?
                                                            <span className="badge bg-danger">
                                                                Not Paid
                                                            </span> : ""}
                                                    </td>
                                                </>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {
                        props.model.store?.settings?.show_address_in_invoice_footer && <div className="row clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_footer"]?.size, height: "55px", }} onClick={() => {
                            props.selectText("footer");
                        }}>
                            <div className="col-md-2 text-start">
                                {/*props.model.QRImageData && <img src={props.model.QRImageData} style={{ width: "122px", height: "114px" }} alt="Invoice QR Code" />*/}
                            </div>
                            <div className="col-md-8 text-center">
                                <ul className="list-unstyled mb0 text-center">
                                    <li>
                                        <b
                                        > {props.model.store ? props.model.store.address_in_arabic : "<STORE_ADDRESS_ARABIC>"}
                                        </b>
                                    </li>
                                    <li>
                                        <strong
                                        >{props.model.store ? props.model.store.address : "<STORE_ADDRESS>"}
                                        </strong>
                                    </li>

                                    <li>
                                        هاتف:<b
                                        > {props.model.store ? props.model.store.phone_in_arabic : "<STORE_PHONE_ARABIC>"}
                                        </b>,
                                        Phone:<strong
                                        >{props.model.store ? props.model.store.phone : "<STORE_PHONE>"}
                                        </strong>
                                    </li>
                                    <li>
                                        <strong>الرمز البريدي:</strong>{props.model.store ? props.model.store.zipcode_in_arabic : "<STORE_ZIPCODE_ARABIC>"},
                                        <strong>Email:{props.model.store ? props.model.store.email : "<STORE_EMAIL>"} </strong>

                                    </li>
                                </ul>
                            </div>
                        </div>
                    }
                </div >
            ))}
        </span >
    </>);

});

export default ReportContent;