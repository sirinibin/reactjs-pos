import { React, forwardRef } from "react";
import { format } from "date-fns";
import n2words from 'n2words'
//import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils.js";
import '@emran-alhaddad/saudi-riyal-font/index.css';
import Amount from "../utils/amount.js";
import { QRCodeSVG } from "qrcode.react";


const PreviewContentWithSellerInfo = forwardRef((props, ref) => {

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
                        height: "1118px",
                        width: `${props.whatsAppShare ? "750px" : "750px"}`,
                        //backgroundImage: `url(${props.whatsAppShare ? props.invoiceBackground : ""})`,
                        // backgroundSize: 'cover',
                        // backgroundPosition: 'center',
                        position: "relative",
                    }}

                >
                    {props.invoiceBackground && props.fontSizes[props.modelName + "_storeHeader"]?.visible ? (<img
                        src={props.invoiceBackground}
                        style={{
                            position: "absolute",
                            left: "50%",
                            transform: "translateX(-50%)",
                            top: 0,
                            width: "105%",
                            height: "1118px",
                            maxWidth: "105%",
                            objectFit: "cover",
                            objectPosition: "top center",
                            zIndex: 0,
                            pointerEvents: "none",
                            backgroundColor: "transparent"
                        }}
                        alt="Invoice Background" />) : null}
                    <div style={{ position: "relative", zIndex: 1 }}>
                        {props.fontSizes[props.modelName + "_storeHeader"]?.visible && !props.invoiceBackground ? < div className="row">
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


                        <div className="row" style={{ marginTop: props.fontSizes[props.modelName + "_storeHeader"]?.visible && props.invoiceBackground ? props.fontSizes[props.modelName + "_marginTop"]?.size : props.fontSizes[props.modelName + "_marginTop"]?.size }}>
                            <div className="col">
                                <u><h1 className="text-center clickable-text fw-bold" onClick={() => {
                                    props.selectText("invoiceTitle");
                                }} style={{ fontSize: props.fontSizes[props.modelName + "_invoiceTitle"]?.size }} >
                                    {props.model.invoiceTitle}
                                </h1>
                                </u>
                            </div>
                        </div>

                        <div className="row col-md-14" style={{ border: "solid 0px", borderColor: detailsBorderColor, fontSize: props.fontSizes[props.modelName + "_invoiceDetails"]?.size, padding: "10px" }} onClick={() => {
                            props.selectText("invoiceDetails");
                        }}>
                            <div className="col-md-12" style={{ border: detailsBorderThickness, borderColor: detailsBorderColor, marginLeft: "0px", width: `${(props.model.store?.settings?.zatca_qr_on_left_bottom || (props.modelName === "quotation" && props.model.type !== "invoice")) ? "100%" : "74%"}` }}>
                                {props.modelName === "quotation" && props.model.type !== "invoice" && <>
                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Quotation No. | رقم الاقتباس:</b></div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.code ? props.model.code : ""}</div>
                                    </div>
                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Quotation Date | تاريخ الاقتباس:</b></div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.date ? format(
                                            new Date(props.model.date),
                                            "yyyy-MM-dd h:mma"
                                        ) : "<DATETIME>"} {" | " + getArabicDate(props.model.date)}</div>
                                    </div>
                                </>}
                                {(props.modelName !== "quotation" || props.model.type === "invoice") && <>
                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >Invoice No. | رقم الفاتورة:</div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.code ? props.model.code : ""}</div>
                                    </div>
                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Invoice Date | تاريخ الفاتورة:</b></div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.date ? format(
                                            new Date(props.model.date),
                                            "yyyy-MM-dd h:mma"
                                        ) : "<DATETIME>"} {" | " + getArabicDate(props.model.date)}</div>
                                    </div>
                                </>}
                                {props.model && props.model.order_code && (props.modelName === "sales_return" || props.modelName === "whatsapp_sales_return") && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Original Invoice No. | رقم الفاتورة الأصلية:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.order_code ? props.model.order_code : ""}</div>
                                </div>}
                                {props.model && props.model.order_code && props.model.order?.date && (props.modelName === "sales_return" || props.modelName === "whatsapp_sales_return") && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Original Invoice Date | تاريخ الفاتورة الأصلية:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.order?.date ? format(
                                        new Date(props.model.order?.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"} {" | " + getArabicDate(props.model.order?.date)}</div>
                                </div>}

                                {props.model && props.model.quotation_code && (props.modelName === "quotation_sales_return" || props.modelName === "whatsapp_quotation_sales_return") && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Original Invoice No. | رقم الفاتورة الأصلية:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.quotation_code ? props.model.quotation_code : ""}</div>
                                </div>}
                                {props.model && props.model.quotation_code && props.model.quotation?.date && (props.modelName === "quotation_sales_return" || props.modelName === "whatsapp_quotation_sales_return") && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Original Invoice Date | تاريخ الفاتورة الأصلية:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.quotation?.date ? format(
                                        new Date(props.model.quotation?.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"} {" | " + getArabicDate(props.model.quotation?.date)}</div>
                                </div>}

                                {props.model && props.model.purchase_code && (props.modelName === "purchase_return" || props.modelName === "whatsapp_purchase_return") && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Original Invoice No. | رقم الفاتورة الأصلية:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.purchase_code ? props.model.purchase_code : ""}</div>
                                </div>}
                                {props.model && props.model.purchase_code && props.model.purchase?.date && (props.modelName === "purchase_return" || props.modelName === "whatsapp_purchase_return") && <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Original Invoice Date | تاريخ الفاتورة الأصلية:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.purchase?.date ? format(
                                        new Date(props.model.purchase?.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"} {" | " + getArabicDate(props.model.purchase?.date)}</div>
                                </div>}

                                {props.modelName === "sales" || props.modelName === "whatsapp_sales" || props.modelName === "sales_return" || props.modelName === "quotation_sales_return" || props.modelName === "whatsapp_sales_return" || props.modelName === "whatsapp_quotation_sales_return" || props.modelName === "quotation" || props.modelName === "whatsapp_quotation" || props.modelName === "delivery_note" || props.modelName === "whatsapp_delivery_note" ? <>

                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} >
                                            <b>Customer ID | معرف العميل</b>
                                        </div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                            {props.model.customer?.code ? props.model.customer.code : "N/A"}
                                        </div>
                                    </div>

                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "50%", padding: "3px" }} >
                                            <b>Seller Data | بيانات البائع</b>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "50%", padding: "3px" }} >
                                            <b>Customer Data | بيانات العملاء</b>
                                        </div>
                                    </div>

                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Name</li>
                                                <li>اسم</li>
                                            </ul>

                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "37.5%", padding: "3px" }} >
                                            {props.model.store ? props.model.store.name : ""}

                                            {props.model.store?.name_in_arabic ? " | " + props.model.store.name_in_arabic : ""}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Name</li>
                                                <li>اسم</li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "37.5%", padding: "3px" }} >
                                            {props.model.customer ? props.model.customer.name : ""}
                                            {!props.model.customer && props.model.customerName ? props.model.customerName : ""}
                                            {!props.model.customerName && !props.model.customer ? "N/A" : ""}
                                            {props.model.customer?.name_in_arabic ? " | " + props.model.customer.name_in_arabic : ""}
                                        </div>
                                    </div>
                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        {/* Seller */}
                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>C.R</li>
                                                <li><span dir="rtl">رقم التسجيل</span></li>
                                            </ul>

                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.registration_number ? props.model.store.registration_number : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>VAT</li>
                                                <li><span dir="rtl">الرقم الضريبي</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.vat_no ? props.model.store.vat_no : "N/A"}
                                        </div>

                                        {/* Customer */}

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>C.R</li>
                                                <li><span dir="rtl">رقم التسجيل</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.customer?.registration_number ? props.model.customer.registration_number : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderColor: detailsBorderColor, borderRight: detailsBorderThickness, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>VAT</li>
                                                <li><span dir="rtl">الرقم الضريبي</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            {props.model.customer?.vat_no ? props.model.customer.vat_no : "N/A"}
                                        </div>
                                    </div>

                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        {/* Seller */}
                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Building</li>
                                                <li><span dir="rtl">رقم المبنى</span></li>
                                            </ul>

                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.national_address?.building_no ? props.model.store?.national_address?.building_no : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Postal Code</li>
                                                <li><span dir="rtl">الرمز</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.national_address?.zipcode ? props.model.store?.national_address?.zipcode : "N/A"}
                                        </div>

                                        {/* Customer */}

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Building</li>
                                                <li><span dir="rtl">رقم المبنى</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.customer?.national_address?.building_no ? props.model.customer?.national_address?.building_no : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Postal Code</li>
                                                <li><span dir="rtl">الرمز</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            {props.model.customer?.national_address?.zipcode ? props.model.customer?.national_address?.zipcode : "N/A"}
                                        </div>
                                    </div>


                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        {/* Seller */}
                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Street Name</li>
                                                <li><span dir="rtl">اسم الشارع</span></li>
                                            </ul>

                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.national_address?.street_name ? props.model.store?.national_address?.street_name : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Additional No.</li>
                                                <li><span dir="rtl">رقم إضافي</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.national_address?.additional_no ? props.model.store?.national_address?.additional_no : "N/A"}
                                        </div>

                                        {/* Customer */}

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Street Name</li>
                                                <li><span dir="rtl">اسم الشارع</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.customer?.national_address?.street_name ? props.model.customer?.national_address?.street_name : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>Additional No.</li>
                                                <li><span dir="rtl">رقم إضافي</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            {props.model.customer?.national_address?.additional_no ? props.model.customer?.national_address?.additional_no : "N/A"}
                                        </div>
                                    </div>


                                    <div className="row" dir="ltr" style={{}} >
                                        {/* Seller */}
                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>District</li>
                                                <li><span dir="rtl">يصرف</span></li>
                                            </ul>

                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.national_address?.district_name ? props.model.store?.national_address?.district_name : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>City</li>
                                                <li><span dir="rtl">مدينة</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.store?.national_address?.city_name ? props.model.store?.national_address?.city_name : "N/A"}
                                        </div>

                                        {/* Customer */}

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>District</li>
                                                <li><span dir="rtl">يصرف</span></li>
                                            </ul>

                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px", borderRight: detailsBorderThickness }} >
                                            {props.model.customer?.national_address?.district_name ? props.model.customer?.national_address?.district_name : "N/A"}
                                        </div>

                                        <div className="col-md-4 print-label text-center" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >

                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    height: "auto",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                <li>City</li>
                                                <li><span dir="rtl">مدينة</span></li>
                                            </ul>
                                        </div>
                                        <div className="col-md-8 print-value text-center" dir="ltr" style={{ borderColor: detailsBorderColor, width: "12.5%", padding: "3px" }} >
                                            {props.model.customer?.national_address?.city_name ? props.model.customer?.national_address?.city_name : "N/A"}
                                        </div>
                                    </div>



                                    {/* <div className="row" dir="ltr" style={{}} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer Address | عنوان العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.address && !props.model.customer ? props.model.address : ""}

                                        {!props.model.customer?.national_address?.building_no && !props.model.customer?.national_address?.unit_no && props.model.customer?.national_address?.street_name && props.model.customer?.national_address?.district_name && props.model.customer?.national_address?.city_name ? props.model.customer?.address : ""}
                                        <span dir="ltr">
                                            {props.model.customer?.national_address?.building_no ? `${props.model.customer.national_address.building_no}` : ""}
                                            {props.model.customer?.national_address?.street_name ? ` ${props.model.customer.national_address.street_name}` : ""}
                                            {props.model.customer?.national_address?.district_name ? ` - ${props.model.customer.national_address.district_name}` : ""}
                                            {props.model.customer?.national_address?.unit_no ? `, Unit #${props.model.customer.national_address.unit_no}` : ""}
                                            {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                                            {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                                            {props.model.customer?.national_address?.additional_no ? ` - ${props.model.customer.national_address.additional_no}` : ""}
                                           
                                        </span>

                                        {props.model.address && !props.model.customer ? props.model.address : ""}
                                        {props.model.customer?.national_address?.building_no_arabic && props.model.customer?.national_address?.street_name_arabic && props.model.customer?.national_address?.district_name_arabic && props.model.customer?.national_address?.city_name_arabic && props.model.customer?.national_address?.zipcode_arabic && <span dir="rtl">
                                            <br />
                                            {props.model.customer?.national_address?.building_no_arabic ? `${props.model.customer.national_address.building_no_arabic}  ` : ""}
                                            {props.model.customer?.national_address?.street_name_arabic ? ` ${props.model.customer.national_address.street_name_arabic}` : ""}
                                            {props.model.customer?.national_address?.district_name_arabic ? ` - ${props.model.customer.national_address.district_name_arabic}` : ""}
                                            {props.model.customer?.national_address?.unit_no_arabic ? `,رقم الوحدة ${props.model.customer.national_address.unit_no_arabic}` : ""}
                                            {props.model.customer?.national_address?.city_name_arabic ? `, ${props.model.customer.national_address.city_name_arabic}` : ""}
                                            {props.model.customer?.national_address?.zipcode_arabic ? ` - ${props.model.customer.national_address.zipcode_arabic} ` : ""}
                                            {props.model.customer?.national_address?.additional_no_arabic ? `- ${props.model.customer.national_address.additional_no_arabic} ` : ""}
                                          
                                        </span>}
                                    </div>
                                  
                                </div>  */}
                                </> : ""}
                                {props.modelName === "purchase" || props.modelName === "whatsapp_purchase" || props.modelName === "purchase_return" || props.modelName === "whatsapp_purchase_return" ? <>
                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor Name | اسم العميل:</b></div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                            {props.model.vendor ? props.model.vendor.name : ""}
                                            {!props.model.vendor && props.model.vendorName ? props.model.vendorName : ""}
                                            {!props.model.vendorName && !props.model.vendor ? "N/A" : ""}
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
                                            {props.model.vendor?.vat_no ? props.model.vendor.vat_no : ""}
                                            {!props.model.vendor && props.model.vat_no ? props.model.vat_no : ""}
                                            {!props.model.vendor && !props.model.vat_no ? "N/A" : ""}
                                        </div>
                                    </div>

                                    <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor C.R | رقم تسجيل الشركة الموردة:</b></div>
                                        <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                            {props.model.vendor?.registration_number ? props.model.vendor.registration_number : "N/A"}
                                        </div>
                                    </div>

                                    <div className="row" dir="ltr" style={{}} >
                                        <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor Address | عنوان العميل:</b> </div>
                                        <div className="col-md-8 print-value    " dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                            {props.model.address && !props.model.vendor ? props.model.address : ""}

                                            {!props.model.vendor?.national_address?.building_no && !props.model.vendor?.national_address?.unit_no && props.model.vendor?.national_address?.street_name && props.model.vendor?.national_address?.district_name && props.model.vendor?.national_address?.city_name ? props.model.vendor?.address : ""}
                                            <span dir="ltr">
                                                {props.model.vendor?.national_address?.building_no ? `${props.model.vendor.national_address.building_no}` : ""}
                                                {props.model.vendor?.national_address?.street_name ? ` ${props.model.vendor.national_address.street_name}` : ""}
                                                {props.model.vendor?.national_address?.district_name ? ` - ${props.model.vendor.national_address.district_name}` : ""}
                                                {props.model.vendor?.national_address?.unit_no ? `, Unit #${props.model.vendor.national_address.unit_no}` : ""}
                                                {props.model.vendor?.national_address?.city_name ? `, ${props.model.vendor.national_address.city_name}` : ""}
                                                {props.model.vendor?.national_address?.zipcode ? ` - ${props.model.vendor.national_address.zipcode}` : ""}
                                                {props.model.vendor?.national_address?.additional_no ? ` - ${props.model.vendor.national_address.additional_no}` : ""}
                                                {/*props.model.customer?.country_name ? `, ${props.model.customer.country_name}` : ""*/}
                                            </span>

                                            {props.model.address && !props.model.vendor ? props.model.address : ""}
                                            {props.model.vendor?.national_address?.building_no_arabic && props.model.vendor?.national_address?.street_name_arabic && props.model.vendor?.national_address?.district_name_arabic && props.model.vendor?.national_address?.city_name_arabic && props.model.vendor?.national_address?.zipcode_arabic && <span dir="rtl">
                                                <br />
                                                {props.model.vendor?.national_address?.building_no_arabic ? `${props.model.vendor.national_address.building_no_arabic}  ` : ""}
                                                {props.model.vendor?.national_address?.street_name_arabic ? ` ${props.model.vendor.national_address.street_name_arabic}` : ""}
                                                {props.model.vendor?.national_address?.district_name_arabic ? ` - ${props.model.vendor.national_address.district_name_arabic}` : ""}
                                                {props.model.vendor?.national_address?.unit_no_arabic ? `,رقم الوحدة ${props.model.vendor.national_address.unit_no_arabic}` : ""}
                                                {props.model.vendor?.national_address?.city_name_arabic ? `, ${props.model.vendor.national_address.city_name_arabic}` : ""}
                                                {props.model.vendor?.national_address?.zipcode_arabic ? ` - ${props.model.vendor.national_address.zipcode_arabic} ` : ""}
                                                {props.model.vendor?.national_address?.additional_no_arabic ? `- ${props.model.vendor.national_address.additional_no_arabic} ` : ""}
                                                {/*props.model.customer?.country_name === "Saudi Arabia" ? `المملكة العربية السعودية , ` : ""*/}
                                            </span>}
                                        </div>
                                    </div>
                                </> : ""}
                            </div>
                            {!props.model.store?.settings?.zatca_qr_on_left_bottom && props.modelName !== "delivery_note" && props.modelName !== "whatsapp_delivery_note" && props.modelName !== "quotation" && props.modelName !== "quotation_sales_return" && props.modelName !== "whatsapp_quotation" && props.modelName !== "whatsapp_quotation_sales_return" &&
                                <div
                                    className="col-md-2"
                                    style={{ border: "solid 0px", width: "26%" }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        props.selectQRCode();
                                    }}
                                >
                                    {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img src={props.model.QRImageData} style={{ width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size, height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size, border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                                    {/*props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size, height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size }} size={props.fontSizes[props.modelName + "_qrCode"]["width"]?.value} /> : ""*/}
                                    {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeSVG
                                        value={props.model.zatca?.qr_code}
                                        fgColor="#000000"
                                        bgColor="#ffffff"
                                        level="H"
                                        size={520} /* high internal resolution */
                                        className="qr-print"
                                        preserveAspectRatio="xMidYMid meet"
                                        shapeRendering="crispEdges"
                                        role="img"
                                        aria-hidden={false}
                                        style={{
                                            width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size,
                                            height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size,
                                            display: "block",
                                            background: "#fff"
                                        }}
                                    /> : ""}
                                    {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.qr_code ? <img src={props.model.QRImageData} style={{ width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size, height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size, border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                                </div>}
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
                                                        <li>رقم القطعة</li>
                                                        <li>Part No.</li>
                                                    </ul>
                                                </th>
                                                <th className="per33 text-center" style={{ padding: "0px", width: "31%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"

                                                        }}
                                                    >
                                                        <li>وصف</li>
                                                        <li>Description</li>
                                                    </ul>
                                                </th>
                                                <th className="per5 text-center" style={{ padding: "0px", width: "5%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{
                                                            height: "auto",
                                                            marginBottom: "2px"
                                                        }}
                                                    >
                                                        <li>كمية</li>
                                                        <li>Qty</li>
                                                    </ul>
                                                </th>
                                                {props.modelName !== "delivery_note" && <>
                                                    <th className="per8 text-center" style={{ padding: "0px", width: "8%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                        <ul
                                                            className="list-unstyled"
                                                            style={{
                                                                height: "auto",
                                                                marginBottom: "2px"
                                                            }}
                                                        >
                                                            <li>سعر الوحدة</li>
                                                            <li>Unit Price</li>
                                                        </ul>
                                                    </th>
                                                    <th className="per7 text-center" style={{ padding: "0px", width: "7%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                        <ul
                                                            className="list-unstyled"
                                                            style={{
                                                                height: "auto",
                                                                marginBottom: "2px"
                                                            }}
                                                        >
                                                            <li>تخفيض</li>
                                                            <li>Discount</li>
                                                        </ul>
                                                    </th>

                                                    <th className="per12 text-center" style={{ padding: "0px", width: "11%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                        {!props.model.hideVAT && <>
                                                            <ul
                                                                className="list-unstyled"
                                                                style={{
                                                                    height: "auto",
                                                                    marginBottom: "2px"
                                                                }}
                                                            >
                                                                <li>السعر بدون ضريبة</li>
                                                                <li>Price (without VAT)</li>
                                                            </ul>
                                                        </>}
                                                        {props.model.hideVAT && <>
                                                            <ul
                                                                className="list-unstyled"
                                                                style={{
                                                                    height: "auto",
                                                                    marginBottom: "2px"
                                                                }}
                                                            >
                                                                <li>سعر</li>
                                                                <li>Price</li>
                                                            </ul>
                                                        </>}
                                                    </th>
                                                    {!props.model.hideVAT && <>
                                                        <th className="per8 text-center" style={{ padding: "0px", width: "8%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                            <ul
                                                                className="list-unstyled"
                                                                style={{
                                                                    height: "auto",
                                                                    marginBottom: "2px"
                                                                }}
                                                            >
                                                                <li>ضريبة</li>
                                                                <li>VAT({trimTo2Decimals(props.model.vat_percent)}%)</li>
                                                            </ul>
                                                        </th>
                                                        <th className="per10 text-center" style={{ padding: "0px", width: "10%", borderBottom: tableBorderThickness }}>
                                                            <ul
                                                                className="list-unstyled"
                                                                style={{
                                                                    height: "auto",
                                                                    marginBottom: "2px"
                                                                }}
                                                            >
                                                                <li>السعر مع الضريبة</li>
                                                                <li>Price (with VAT)</li>
                                                            </ul>
                                                        </th>
                                                    </>}
                                                </>}
                                            </tr>
                                            {page.products && page.products.map((product, index) => (
                                                <tr style={{ borderBottom: tableBorderThickness }} key={product.item_code} className="text-center"  >
                                                    <td style={{ padding: "7px", borderRight: tableBorderThickness }}>{product.part_number ? index + 1 + (pageIndex * props.model.pageSize) : ""}</td>
                                                    <td style={{ borderRight: tableBorderThickness }} >{product.prefix_part_number ? product.prefix_part_number + " - " : ""} {product.part_number ? product.part_number : ""}</td>
                                                    <th dir="ltr" style={{
                                                        unicodeBidi: 'isolate',
                                                        borderRight: tableBorderThickness,
                                                        width: "31%",
                                                        maxWidth: "31%",
                                                        /* wordBreak: "break-word",*/
                                                        /* overflowWrap: "break-word",*/
                                                        whiteSpace: "normal"

                                                    }}>
                                                        {!props.model?.store?.settings?.one_line_product_name_in_invoice && <span dir="ltr" style={{}}>
                                                            <span dir="ltr" style={{
                                                                whiteSpace: "pre-wrap",
                                                                wordBreak: "break-word",
                                                                maxWidth: "100%", // or your desired width
                                                                overflowWrap: "break-word",
                                                            }}>{product.name}</span>
                                                            {product.name_in_arabic && <>|<span dir="rtl" style={{
                                                            }}>{product.name_in_arabic}</span></>}
                                                        </span>}

                                                        {props.model?.store?.settings?.one_line_product_name_in_invoice && <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                                                            <span style={{ //one_line_product_name_in_invoice
                                                                display: 'inline-block',
                                                                maxWidth: `${product.name_in_arabic ? "120px" : "220px"}`,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                verticalAlign: 'bottom'
                                                            }}>{product.name}</span>
                                                            {product.name_in_arabic && <>|<span dir="rtl" style={{
                                                                display: 'inline-block',
                                                                maxWidth: "100px",
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                verticalAlign: 'bottom'
                                                            }}>{product.name_in_arabic}</span></>}
                                                        </span>}
                                                    </th>
                                                    <td style={{ borderRight: tableBorderThickness, marginRight: "2px" }}>{product.quantity ? product.quantity : ""}  {product.unit ? product.unit : ""}</td>
                                                    {props.modelName !== "delivery_note" && <>
                                                        <td className="text-end" style={{ borderRight: tableBorderThickness, paddingRight: "3px" }} >
                                                            {product.unit_price ? <Amount amount={trimTo2Decimals(product.unit_price)} /> : ""}
                                                            {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals(product.purchase_unit_price)} /> : ""}
                                                            {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals(product.purchasereturn_unit_price)} /> : ""}
                                                        </td>
                                                        <td style={{ borderRight: tableBorderThickness, paddingRight: "3px" }} className="text-end">
                                                            {/*product.unit_discount_percent ? "(" + trimTo2Decimals(product.unit_discount_percent) + "%)" : ""}{product.unit_discount ? " " + trimTo2Decimals(product.unit_discount * product.quantity) : ""*/}
                                                            {product.unit_discount ? " " + trimTo2Decimals(product.unit_discount * product.quantity) : ""}
                                                        </td>
                                                        <td style={{ borderRight: tableBorderThickness, paddingRight: "3px" }} className="text-end">

                                                            {product.unit_price ? <Amount amount={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)} /> : ""}
                                                            {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals((product.purchase_unit_price - product.unit_discount) * product.quantity)} /> : ""}
                                                            {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals((product.purchasereturn_unit_price - product.unit_discount) * product.quantity)} /> : ""}
                                                        </td>
                                                        {!props.model.hideVAT && <>
                                                            <td style={{ borderRight: tableBorderThickness, paddingRight: "3px" }} className="text-end">
                                                                {product.unit_price ? <Amount amount={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)} /> : ""}
                                                                {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals((product.purchase_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)} /> : ""}
                                                                {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals((product.purchasereturn_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)} /> : ""}
                                                            </td>
                                                            <td style={{ paddingRight: "3px" }} className="text-end">
                                                                {product.unit_price ? <Amount amount={trimTo2Decimals(((product.unit_price - product.unit_discount) * product.quantity) + (((product.unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)))} /> : ""}
                                                                {product.purchase_unit_price && props.modelName === "purchase" ? <Amount amount={trimTo2Decimals(((product.purchase_unit_price - product.unit_discount) * product.quantity) + (((product.purchase_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)))} /> : ""}
                                                                {product.purchasereturn_unit_price && props.modelName === "purchase_return" ? <Amount amount={trimTo2Decimals(((product.purchasereturn_unit_price - product.unit_discount) * product.quantity) + (((product.purchasereturn_unit_price - product.unit_discount) * product.quantity) * (props.model.vat_percent / 100)))} /> : ""}
                                                            </td>
                                                        </>}
                                                    </>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {props.model.pages.length === (pageIndex + 1) && <table className="table-responsive"
                                        style={{ border: tableBorderThickness, width: "100%" }}>
                                        {props.modelName !== "delivery_note" && <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                            props.selectText("tableFooter");
                                        }} className="clickable-text">
                                            <tr style={{ borderBottom: tableBorderThickness }}>
                                                {props.model.store?.settings?.zatca_qr_on_left_bottom && props.modelName !== "quotation" && props.modelName !== "whatsapp_quotation" && props.modelName !== "quotation_sales_return" && props.modelName !== "whatsapp_quotation_sales_return" && props.modelName !== "delivery_note" && <th rowSpan={7} style={{ width: "20%", padding: "3px", borderRight: tableBorderThickness }}>
                                                    <div
                                                        className="col-md-1 text-center"
                                                        style={{ width: "100%", height: "100%" }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();

                                                            props.selectQRCode();
                                                        }}
                                                    >
                                                        {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img src={props.model.QRImageData} style={{ width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size, height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size, border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                                                        {/*props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size, height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size }} size={props.fontSizes[props.modelName + "_qrCode"]["width"]?.value} /> : ""*/}
                                                        {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeSVG
                                                            value={props.model.zatca?.qr_code}
                                                            fgColor="#000000"
                                                            bgColor="#ffffff"
                                                            level="H"
                                                            size={520} /* high internal resolution */
                                                            className="qr-print"
                                                            preserveAspectRatio="xMidYMid meet"
                                                            shapeRendering="crispEdges"
                                                            role="img"
                                                            aria-hidden={false}
                                                            style={{
                                                                width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size,
                                                                height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size,
                                                                display: "block",
                                                                background: "#fff"
                                                            }}
                                                        /> : ""}
                                                        {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.qr_code ? <img src={props.model.QRImageData} style={{ width: props.fontSizes[props.modelName + "_qrCode"]["width"]?.size, height: props.fontSizes[props.modelName + "_qrCode"]["height"]?.size, border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                                                    </div>
                                                </th>}
                                                <th className="text-end print-label" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                                    {!props.model.hideVAT && <>
                                                        <b> Total (without VAT) الإجمالي (بدون ضريبة القيمة المضافة) :</b>
                                                    </>}
                                                    {props.model.hideVAT && <>
                                                        <b> Total المجموع :</b>
                                                    </>}
                                                </th>
                                                <td className="text-end print-table-value" colSpan="1" style={{ paddingRight: "3px" }} >
                                                    <Amount amount={trimTo2Decimals(props.model.total)} />
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: tableBorderThickness }}>
                                                <th className="text-end print-label" style={{ padding: "2px", borderRight: tableBorderThickness }}>

                                                    Shipping / Handling Fees   رسوم الشحن / المناولة :
                                                </th>
                                                <td className="text-end print-table-value" colSpan="1" style={{ paddingRight: "3px" }}>
                                                    <Amount amount={trimTo2Decimals(props.model.shipping_handling_fees)} />
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: tableBorderThickness }}>
                                                <th className="text-end print-label" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                                    Total Discount الخصم الإجمالي :
                                                </th>
                                                <td className="text-end print-table-value" colSpan="1" style={{ paddingRight: "3px" }}>
                                                    <Amount amount={trimTo2Decimals(props.model.discount)} />
                                                </td>
                                            </tr>
                                            {!props.model.hideVAT && <>
                                                <tr style={{ borderBottom: tableBorderThickness }}>
                                                    <th className="text-end print-label" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                                        Total Taxable Amount (without VAT)  إجمالي المبلغ الخاضع للضريبة (بدون ضريبة القيمة المضافة) :
                                                    </th>
                                                    <td className="text-end print-table-value" colSpan="1" style={{ paddingRight: "3px" }}>
                                                        <Amount amount={trimTo2Decimals(((props.model.net_total - props.model.rounding_amount) - props.model.vat_price))} />
                                                    </td>
                                                </tr>
                                                <tr style={{ borderBottom: tableBorderThickness }}>
                                                    <th className="text-end print-label" style={{ padding: "2px", borderRight: tableBorderThickness }}>
                                                        Total VAT {trimTo2Decimals(props.model.vat_percent)}% إجمالي ضريبة القيمة المضافة :
                                                    </th>
                                                    <td className="text-end print-table-value" colSpan="1" style={{ paddingRight: "3px" }}>
                                                        <Amount amount={trimTo2Decimals(props.model.vat_price)} />
                                                    </td>
                                                </tr>
                                            </>}
                                            <tr style={{ borderBottom: tableBorderThickness }}>
                                                <th className="text-end print-label" style={{ padding: "2px", width: `${props.modelName !== "quotation" ? "70%" : "90%"}`, borderRight: tableBorderThickness }}>
                                                    Rounding Amount مبلغ التقريب :
                                                </th>
                                                <td className="text-end" colSpan="1" style={{ width: "10%", paddingRight: "3px" }}>
                                                    <span className="print-table-value">
                                                        {props.model.rounding_amount ? <Amount amount={trimTo2Decimals(props.model.rounding_amount)} /> : "0.00"}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <th className="text-end print-label" style={{ padding: "2px", width: `${props.modelName !== "quotation" ? "70%" : "90%"}`, borderRight: tableBorderThickness }}>
                                                    {!props.model.hideVAT && <>
                                                        Net Total (with VAT)  الإجمالي الصافي (مع ضريبة القيمة المضافة) :
                                                    </>}
                                                    {props.model.hideVAT && <>
                                                        Net Total صافي المجموع :
                                                    </>}

                                                </th>
                                                <td className="text-end" colSpan="1" style={{ width: "10%", paddingRight: "3px" }}>
                                                    <span className="icon-saudi_riyal print-table-value">
                                                        <Amount amount={trimTo2Decimals(props.model.net_total)} />
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>}
                                    </table>}
                                    {props.model.pages.length === (pageIndex + 1) && <table className="table-responsive"
                                        style={{ border: tableBorderThickness, width: "100%" }}
                                    >
                                        {props.modelName !== "delivery_note" && <tbody style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                            props.selectText("tableFooter");
                                        }} className="clickable-text">
                                            <tr style={{ borderBottom: tableBorderThickness }}>

                                                <th colSpan="2" className="text-end print-label" style={{ padding: "5px", width: "14.6%", borderRight: tableBorderThickness }}>
                                                    In Words بكلمات:
                                                </th>
                                                <th
                                                    className="text-start print-value"
                                                    colSpan="7"
                                                    style={{ padding: "5px", width: "85.4%" }}

                                                >
                                                    <ul
                                                        className="list-unstyled"
                                                        style={{ marginBottom: "0px" }}
                                                    >
                                                        <li style={{

                                                            unicodeBidi: 'isolate',

                                                            whiteSpace: 'normal',
                                                            wordBreak: 'break-word',
                                                            lineHeight: '1.8',

                                                        }}>{n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}</li>
                                                        <li>{n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}</li>
                                                    </ul>
                                                </th>
                                            </tr>
                                            <tr style={{ borderBottom: tableBorderThickness }}>
                                                <th colSpan="2" className="text-end print-label" style={{ padding: "5px", borderRight: tableBorderThickness }}>
                                                    Remarks ملاحظات:
                                                </th>
                                                <td
                                                    className="text-start print-value"
                                                    colSpan="7"
                                                    style={{ padding: "5px", borderRight: tableBorderThickness }}

                                                >
                                                    {props.model.remarks ? props.model.remarks : ""}
                                                </td>
                                            </tr>
                                            {props.modelName === "quotation" && props.model.type === "quotation" && <>
                                                <tr>
                                                    <th colSpan="2" className="text-end print-label" style={{ padding: "5px", borderRight: tableBorderThickness }}>
                                                        Validity صحة:
                                                    </th>
                                                    <th
                                                        colSpan="2"
                                                        className="print-value"
                                                        style={{ padding: "5px", borderRight: tableBorderThickness }}

                                                    >
                                                        <span style={{ color: "red" }}> {props.model.validity_days + " days أيام"} </span>
                                                    </th>
                                                    <th colSpan="2" className="text-end print-label" style={{ padding: "5px", borderRight: tableBorderThickness }}>
                                                        Delivery توصيل:
                                                    </th>
                                                    <th
                                                        colSpan="3"
                                                        className="print-value"
                                                        style={{ padding: "5px" }}

                                                    >
                                                        <span dir="ltr"> Within {props.model.delivery_days} days from the date of payment | خلال {props.model.delivery_days} أيام من تاريخ الدفع</span>
                                                    </th>
                                                </tr>


                                                {props.model.pages.length === (pageIndex + 1) && props.model.store?.bank_account && props.model.store?.bank_account?.bank_name ? <tr >
                                                    <th colSpan="9" style={{ padding: "0px" }} onClick={(e) => e.stopPropagation()}>

                                                        <table
                                                            className="table-responsive"
                                                            style={{ width: "100%", border: tableBorderThickness }}

                                                        >
                                                            <thead className="clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_bankAccountHeader"]?.size }}
                                                                onClick={() => {
                                                                    props.selectText("bankAccountHeader");
                                                                }}>


                                                            </thead>
                                                            <tbody style={{ fontSize: props.fontSizes[props.modelName + "_bankAccountBody"]?.size }}
                                                                onClick={() => {
                                                                    props.selectText("bankAccountBody");
                                                                }} className="clickable-text print-value">
                                                                <tr style={{ borderBottom: tableBorderThickness, fontSize: props.fontSizes[props.modelName + "_bankAccountHeader"]?.size }} onClick={() => {
                                                                    props.selectText("bankAccountHeader");
                                                                }}>
                                                                    <th colSpan="5" className="per1 text-center print-label" style={{ padding: "0px" }}>
                                                                        <ul
                                                                            className="list-unstyled"
                                                                            style={{
                                                                                height: "15px"
                                                                            }}
                                                                        >
                                                                            <li>تفاصيل الحساب البنكي</li>
                                                                            <li>Bank Account details</li>
                                                                        </ul>
                                                                    </th>
                                                                </tr>
                                                                <tr style={{ borderBottom: tableBorderThickness }}>
                                                                    <th className="per1 text-center print-label" style={{ padding: "0px", width: "5%", borderRight: tableBorderThickness }}>
                                                                        <ul
                                                                            className="list-unstyled"
                                                                            style={{
                                                                                height: "auto"
                                                                            }}
                                                                        >
                                                                            <li>اسم البنك</li>
                                                                            <li>Bank Name</li>
                                                                        </ul>
                                                                    </th>
                                                                    <th className="per1 text-center print-label" style={{ padding: "0px", width: "5%", borderRight: tableBorderThickness }}>
                                                                        <ul
                                                                            className="list-unstyled"
                                                                            style={{
                                                                                height: "auto"
                                                                            }}
                                                                        >
                                                                            <li>رقم العميل</li>
                                                                            <li>Customer No.</li>
                                                                        </ul>
                                                                    </th>
                                                                    <th className="per1 text-center print-label" style={{ padding: "0px", maxWidth: "100px", borderRight: tableBorderThickness }}>
                                                                        <ul
                                                                            className="list-unstyled"
                                                                            style={{
                                                                                height: "auto"
                                                                            }}
                                                                        >
                                                                            <li>رقم الحساب المصرفي الدولي</li>
                                                                            <li>IBAN</li>
                                                                        </ul>
                                                                    </th>
                                                                    <th className="per1 text-center print-label" style={{ padding: "0px", width: "10%", borderRight: tableBorderThickness }}>
                                                                        <ul
                                                                            className="list-unstyled"
                                                                            style={{
                                                                                height: "auto"
                                                                            }}
                                                                        >
                                                                            <li>إسم الحساب</li>
                                                                            <li>Account name</li>
                                                                        </ul>
                                                                    </th>
                                                                    <th className="per1 text-center print-label" style={{ padding: "0px", width: "5%", borderRight: tableBorderThickness }}>
                                                                        <ul
                                                                            className="list-unstyled"
                                                                            style={{
                                                                                height: "auto"
                                                                            }}
                                                                        >
                                                                            <li>رقم حساب</li>
                                                                            <li>Account No.</li>
                                                                        </ul>
                                                                    </th>

                                                                </tr>
                                                                <tr >
                                                                    <td style={{ width: "25%", borderRight: tableBorderThickness, padding: "10px" }}>

                                                                        {props.model.store?.bank_account?.bank_name}
                                                                    </td>
                                                                    <td style={{ width: "15%", borderRight: tableBorderThickness, padding: "10px" }}>

                                                                        {props.model.store?.bank_account?.customer_no}
                                                                    </td>
                                                                    <td style={{ maxWidth: "25%", borderRight: tableBorderThickness, padding: "10px" }}>
                                                                        {props.model.store?.bank_account?.iban}
                                                                    </td>
                                                                    <td style={{ width: "20%", borderRight: tableBorderThickness, padding: "10px" }}>

                                                                        {props.model.store?.bank_account?.account_name}
                                                                    </td>
                                                                    <td style={{ width: "15%", padding: "10px" }}>

                                                                        {props.model.store?.bank_account?.account_no}
                                                                    </td>
                                                                </tr>
                                                            </tbody>

                                                        </table>

                                                    </th>
                                                </tr> : ""}
                                            </>}
                                        </tbody>}
                                    </table>}


                                    {props.model.pages.length === (pageIndex + 1) && <table className="invoice-table clickable-text" style={{ fontSize: props.fontSizes[props.modelName + "_signature"]?.size, width: "100%" }} onClick={() => {
                                        props.selectText("signature");
                                    }} >
                                        <thead>
                                            {props.modelName === "delivery_note" && <tr>
                                                <th colSpan="2" className="text-end print-label" style={{ padding: "2px", width: "30%", height: "50px" }}>
                                                    Remarks ملاحظات:
                                                </th>
                                                <th
                                                    colSpan="2"
                                                    className="print-value"
                                                    style={{ padding: "2px", width: "70%" }}

                                                >
                                                    {props.model.remarks ? props.model.remarks : ""}
                                                </th>


                                            </tr>}
                                            {props.model?.store?.settings?.show_received_by_footer_in_invoice && <tr>
                                                <th className="text-end print-label" style={{ width: "20%", padding: "2px" }}>
                                                    Delivered By سلمت بواسطة:
                                                </th>
                                                <th className="print-value" style={{ width: "30%", padding: "2px" }}> {props.model.delivered_by_user ? props.model.delivered_by_user.name : null}</th>
                                                <th className="text-end print-label" style={{ width: "20%", padding: "2px" }}>
                                                    Received By استلمت من قبل:
                                                </th>
                                                <th style={{ width: "30%" }}>

                                                </th>
                                            </tr>}
                                            {/*} <tr>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Signature إمضاء:
                                        </th>
                                        <th style={{ width: "30%", height: "30px" }}>
                                            {props.model.delivered_by_signature ?
                                                <img alt="Signature" src={props.model.delivered_by_signature.signature + "?" + (Date.now())} key={props.model.delivered_by_signature.signature} style={{ width: 100, height: 80 }} ></img>
                                                : null}
                                        </th>
                                        <th className="text-end" style={{ padding: "2px" }} >
                                            Signature إمضاء:
                                        </th>
                                        <th></th>
                                    </tr>*/}
                                            {/*<tr>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th style={{ padding: "2px" }} className="text-center">
                                            {props.model.signature_date_str ? props.model.signature_date_str : ""}  {props.model.signature_date_str ? getArabicDate(props.model.signature_date_str) : ""}
                                        </th>
                                        <th className="text-end" style={{ padding: "2px" }}>
                                            Date تاريخ:
                                        </th>
                                        <th></th>
                                    </tr>*/}
                                        </thead>
                                    </table>}
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
                    </div>
                </div >
            ))}
        </span >
    </>);

});

export default PreviewContentWithSellerInfo;