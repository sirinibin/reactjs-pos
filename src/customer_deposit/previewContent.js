import { React, forwardRef } from "react";
import { format } from "date-fns";
import n2words from 'n2words'
import { trimTo2Decimals } from "../utils/numberUtils";
import '@emran-alhaddad/saudi-riyal-font/index.css';
import Amount from "../utils/amount.js";

const CustomerDepositPreviewContent = forwardRef((props, ref) => {

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

    function GetPaymentMode(str) {
        return str
            .replace(/_/g, ' ')                     // Replace underscores with spaces
            .split(' ')                             // Split into words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
            .join(' ');                             // Join back with spaces
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


    return (<><span ref={ref}>
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
                    backgroundImage: `url(${props.whatsAppShare ? props.invoiceBackground : ""})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}

            >

                {props.invoiceBackground ? (<img
                    src={props.invoiceBackground}
                    style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        top: 0,
                        width: "800px",
                        height: "100%",
                        maxWidth: "100%",
                        objectFit: "cover",
                        objectPosition: "top center",
                        zIndex: 0,
                        pointerEvents: "none",
                        backgroundColor: "transparent",
                        backgroundImage: `url(${props.whatsAppShare ? props.invoiceBackground : ""})`,
                    }}
                    alt="Invoice Background" />) : null}
                <div style={{ position: "relative", zIndex: 1 }}>
                    {props.fontSizes[props.modelName + "_storeHeader"]?.visible ? < div className="row">
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

                    <div className="row" style={{ marginTop: props.fontSizes[props.modelName + "_storeHeader"]?.visible ? "0px" : props.fontSizes[props.modelName + "_marginTop"]?.size }}>
                        <div className="col">
                            <u><h1 className="text-center clickable-text fw-bold" onClick={() => {
                                props.selectText("invoiceTitle");
                            }} style={{ fontSize: props.fontSizes[props.modelName + "_invoiceTitle"]?.size }} >
                                {props.model.ReceiptTitle}
                            </h1>
                            </u>
                        </div>
                    </div>

                    <div className="row col-md-14" style={{ border: "solid 0px", borderColor: detailsBorderColor, fontSize: props.fontSizes[props.modelName + "_invoiceDetails"]?.size, padding: "10px" }} onClick={() => {
                        props.selectText("invoiceDetails");
                    }}>
                        <div className="col-md-12" style={{ border: detailsBorderThickness, borderColor: detailsBorderColor, marginLeft: "0px", width: `${(props.model.store?.settings?.zatca_qr_on_left_bottom || (props.modelName === "quotation" && props.model.type !== "invoice")) ? "100%" : "74%"}` }}>
                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Receipt No. | رقم الإيصال:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.code ? props.model.code : ""}</div>
                            </div>
                            <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Receipt Date | تاريخ الاستلام:</b></div>
                                <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >{props.model.date ? format(
                                    new Date(props.model.date),
                                    "yyyy-MM-dd h:mma"
                                ) : "<DATETIME>"} {" | " + getArabicDate(props.model.date)}</div>
                            </div>

                            {props.model.type === "customer" && (props.modelName === "customer_deposit" || props.modelName === "customer_withdrawal" || props.modelName === "whatsapp_customer_deposit" || props.modelName === "whatsapp_customer_withdrawal") ? <>
                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, borderColor: detailsBorderColor, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Customer Name | اسم العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ borderColor: detailsBorderColor, width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.customer ? props.model.customer.name : ""}
                                        {!props.model.customer && props.model.customerName ? props.model.customerName : ""}
                                        {!props.model.customerName && !props.model.customer ? "N/A" : ""}
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

                                <div className="row" dir="ltr" style={{}} >
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
                                            {/*props.model.customer?.country_name ? `, ${props.model.customer.country_name}` : ""*/}
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
                                            {/*props.model.customer?.country_name === "Saudi Arabia" ? `المملكة العربية السعودية , ` : ""*/}
                                        </span>}
                                    </div>
                                </div>
                            </> : ""}
                            {props.model.type === "vendor" && (props.modelName === "customer_deposit" || props.modelName === "customer_withdrawal" || props.modelName === "whatsapp_customer_deposit" || props.modelName === "whatsapp_customer_withdrawal") ? <>
                                <div className="row" dir="ltr" style={{ borderBottom: detailsBorderThickness }} >
                                    <div className="col-md-4 print-label" dir="ltr" style={{ borderRight: detailsBorderThickness, width: detailsLabelsColumnWidthPercent, padding: "3px" }} ><b>Vendor Name | اسم العميل:</b></div>
                                    <div className="col-md-8 print-value" dir="ltr" style={{ width: detailsValuesColumnWidthPercent, padding: "3px" }} >
                                        {props.model.vendor ? props.model.vendor.name : ""}
                                        {!props.model.vendor && props.model.vendorName ? props.model.vendorName : ""}
                                        {!props.model.vendorName && !props.model.vendor ? "N/A" : ""}
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
                                className=""
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
                                            <th className="per1 text-center" style={{ padding: "0px", width: "7%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>رقم سري</li>
                                                    <li>SI No.</li>
                                                </ul>
                                            </th>
                                            <th className="per68 text-center" style={{ padding: "0px", width: "28%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>وصف</li>
                                                    <li>Description</li>
                                                </ul>
                                            </th>

                                            <th className="per1 text-center" style={{ padding: "0px", width: "13%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>وضع الدفع</li>
                                                    <li>Payment Mode</li>
                                                </ul>
                                            </th>
                                            <th className="per1 text-center" style={{ padding: "0px", width: "16%", borderRight: tableBorderThickness, borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>الرقم المرجعي للبنك</li>
                                                    <li>Bank Ref. #</li>
                                                </ul>
                                            </th>
                                            <th className="per68 text-center" style={{ padding: "0px", width: "12%", borderBottom: tableBorderThickness, borderRight: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>وصف</li>
                                                    <li>Amount</li>
                                                </ul>
                                            </th>
                                            <th className="per68 text-center" style={{ padding: "0px", width: "12%", borderBottom: tableBorderThickness, borderRight: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>تخفيض</li>
                                                    <li>Discount</li>
                                                </ul>
                                            </th>
                                            <th className="per68 text-center" style={{ padding: "0px", width: "12%", borderBottom: tableBorderThickness }}>
                                                <ul
                                                    className="list-unstyled"
                                                    style={{
                                                        height: "20px"
                                                    }}
                                                >
                                                    <li>المجموع الفرعي</li>
                                                    <li>Sub Total</li>
                                                </ul>
                                            </th>
                                        </tr>
                                        {page.payments && page.payments.map((payment, index) => (
                                            <tr style={{ borderBottom: tableBorderThickness }} key={index} className="text-center"  >
                                                <td style={{ padding: "7px", borderRight: tableBorderThickness }}>{(index + 1) + (pageIndex * props.model.pageSize)}</td>
                                                <td style={{ padding: "1px", borderRight: tableBorderThickness }}>
                                                    {props.model.modelName === "customer_deposit" || props.model.modelName === "whatsapp_customer_deposit" ? "Payment Received" : ""}
                                                    {props.model.modelName === "customer_withdrawal" || props.model.modelName === "whatsapp_customer_withdrawal" ? "Paid" : ""}
                                                    {payment.invoice_code ? " for Invoice: " + payment.invoice_code : ""}
                                                    {/*props.model.customer?.name && (props.model.modelName === "customer_deposit" || props.model.modelName === "whatsapp_customer_deposit") ? " from " + props.model.customer.name : ""*/}
                                                    {/*props.model.customer?.name && (props.model.modelName === "customer_withdrawal" || props.model.modelName === "whatsapp_customer_withdrawal") ? " to " + props.model.customer.name : ""*/}
                                                    {payment.description ? " | " + payment.description : ""}
                                                </td>
                                                <td style={{ padding: "1px", borderRight: tableBorderThickness }} className="text-center">{payment.method ? GetPaymentMode(payment.method) : ""} </td>
                                                <td style={{ padding: "1px", borderRight: tableBorderThickness }} className="text-center">{payment.bank_reference ? payment.bank_reference : ""} </td>
                                                <td style={{ padding: "1px", borderRight: tableBorderThickness, paddingRight: "2px", textAlign: "right" }}> {payment.amount ? <Amount amount={trimTo2Decimals(payment.amount)} /> : ""}</td>
                                                <td style={{ padding: "1px", borderRight: tableBorderThickness, paddingRight: "2px", textAlign: "right" }}> {payment.amount ? <Amount amount={trimTo2Decimals(payment.discount)} /> : ""}</td>
                                                <td style={{ padding: "1px", paddingRight: "2px", textAlign: "right" }}> {payment.amount ? <Amount amount={trimTo2Decimals((payment.amount - payment.discount))} /> : ""}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot
                                        className=""
                                        style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size, width: "100%" }} onClick={() => {
                                            props.selectText("tableFooter");
                                        }}
                                    >
                                        <tr
                                            style={{}}>
                                            <th colSpan="6" className="text-end print-label"
                                                style={{ padding: "2px", borderRight: tableBorderThickness }}
                                            >
                                                Total المجموع:
                                            </th>
                                            <th className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <Amount amount={trimTo2Decimals(props.model.total)} />
                                            </th>
                                        </tr>

                                        <tr
                                            style={{}}>
                                            <th colSpan="6" className="text-end print-label"
                                                style={{ padding: "2px", borderRight: tableBorderThickness }}
                                            >
                                                Total Discount إجمالي الخصم:
                                            </th>
                                            <th className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <Amount amount={trimTo2Decimals(props.model.total_discount)} />
                                            </th>
                                        </tr>

                                        <tr
                                            style={{}}>
                                            <th colSpan="6" className="text-end print-label"
                                                style={{ padding: "2px", borderRight: tableBorderThickness }}
                                            >
                                                Net Total  صافي المجموع:
                                            </th>
                                            <th className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                                <span className={props.model.store.settings.show_currency_symbol ? "icon-saudi_riyal" : ""} >
                                                    <Amount amount={trimTo2Decimals(props.model.net_total)} />
                                                </span>
                                            </th>
                                        </tr>
                                    </tfoot>
                                </table>
                                <table className="table-responsive"
                                    style={{ border: tableBorderThickness, width: "100%" }}>
                                    <tbody
                                        style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                            props.selectText("tableFooter");
                                        }} className="clickable-text"
                                    >
                                        <tr style={{ borderBottom: tableBorderThickness }}>
                                            <th colSpan="1" className="text-end print-label" style={{ padding: "2px", width: "30%", borderRight: tableBorderThickness }}>
                                                In Words بكلمات:
                                            </th>
                                            <th
                                                className="print-table-value"
                                                colSpan="8"
                                                style={{ padding: "2px", width: "70%" }}

                                            >
                                                <ul
                                                    className="list-unstyled"
                                                    style={{ marginBottom: "0px" }}
                                                >
                                                    <li>{props.model?.net_total ? n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  " : ""}</li>
                                                    <li>{props.model?.net_total ? n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals" : ""}</li>
                                                </ul>
                                            </th>
                                        </tr>
                                        <tr style={{ borderBottom: tableBorderThickness }}>
                                            <th colSpan="1" className="text-end print-label" style={{ padding: "2px", width: "30%", borderRight: tableBorderThickness }}>
                                                Remarks ملاحظات:
                                            </th>
                                            <th
                                                className="text-end print-table-value"
                                                colSpan="8"
                                                style={{ padding: "2px", width: "70%" }}

                                            >
                                                {props.model.remarks ? props.model.remarks : ""}
                                            </th>

                                        </tr>
                                    </tbody>
                                </table>
                                <table
                                    className="table-responsive"
                                    style={{ border: tableBorderThickness, width: "100%" }}
                                >
                                    <tbody
                                        style={{ fontSize: props.fontSizes[props.modelName + "_tableFooter"]?.size }} onClick={() => {
                                            props.selectText("tableFooter");
                                        }} className="clickable-text"
                                    >
                                        <tr style={{ borderBottom: tableBorderThickness }}>
                                            <th className="text-end print-label" style={{ width: "20%", height: "30px", padding: "2px", borderRight: tableBorderThickness }}>
                                                Received From تم الاستلام من:
                                            </th>
                                            <th style={{ width: "30%", padding: "2px", borderRight: tableBorderThickness }}> {props.model.customer?.name ? props.model.customer.name : null}</th>
                                            <th className="text-end print-label" style={{ width: "20%", padding: "2px", borderRight: tableBorderThickness }}>
                                                Received By تم الاستلام بواسطة:
                                            </th>
                                            <th style={{ width: "30%", padding: "2px" }}>
                                                {props.model.store?.name ? props.model.store.name : null}
                                            </th>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {
                        props.model.store?.settings?.show_address_in_invoice_footer && <div className="row fw-bold" style={{ fontSize: "2.2mm", height: "55px", }}>
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
            </div>
        ))}
    </span >
    </>);

});

export default CustomerDepositPreviewContent;