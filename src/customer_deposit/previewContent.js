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

    return (<><span ref={ref}>
        {props.model.pages && props.model.pages.map((page, pageIndex) => (
            <div
                className="container"
                id="printableArea"
                style={{
                    backgroundColor: "white",
                    border: "solid 0px",
                    borderColor: "silver",
                    borderRadius: "2mm",
                    padding: "20px",
                    marginTop: page.top + "px",
                    height: "100px",
                    width: "770px"
                }}

            >
                <div className="row" style={{ fontSize: "3.5mm" }}>
                    <div className="col">
                        <ul className="list-unstyled text-left">
                            <li><h4 style={{ fontSize: "3.5mm" }}>{props.model.store ? props.model.store.name : "<STORE_NAME>"}</h4></li>
                            <li>{props.model.store ? props.model.store.title : "<STORE_TITLE>"}</li>
                            {/*<!-- <li><hr /></li> --> */}
                            <li style={{ fontSize: "2.2mm" }}>C.R. / {props.model.store ? props.model.store.registration_number : "<STORE_CR_NO>"}</li>
                            <li style={{ fontSize: "2.2mm" }}>VAT / {props.model.store ? props.model.store.vat_no : "<STORE_VAT_NO>"}</li>
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
                                <h4 style={{ fontSize: "3.5mm" }}>
                                    <strong>
                                        {props.model.store ? props.model.store.name_in_arabic : "<STORE_NAME_ARABIC>"}
                                    </strong>
                                </h4>
                            </li>
                            <li>
                                {props.model.store ? props.model.store.title_in_arabic : "<STORE_TITLE_ARABIC>"}
                            </li>
                            {/* <!-- <li><hr /></li> --> */}
                            <li style={{ fontSize: "2.2mm" }}>{props.model.store ? props.model.store.registration_number_in_arabic : "<STORE_CR_NO_ARABIC>"} / ‫ت‬.‫س‬</li>
                            <li style={{ fontSize: "2.2mm" }} >{props.model.store ? props.model.store.vat_no_in_arabic : "<STORE_VAT_NO_ARABIC>"} / ‫الضريبي‬ ‫الرقم‬</li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <u
                        ><h1 className="text-center" style={{ fontSize: "3mm" }}>
                                PAYMENT RECEIPT (RECEIVABLE) | إيصال الدفع (مستحق القبض)
                            </h1>
                        </u>
                    </div>
                </div>

                <div className="row table-active" style={{ fontSize: "3.5mm", border: "solid 0px" }}>
                    <div className="col-md-5" style={{ border: "solid 0px", width: "79%" }}>
                        <div className="container" style={{ border: "solid 0px", paddingLeft: "0px", fontSize: "2.2mm" }}>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" dir="ltr">Receipt No. | رقم الإيصال:</div>
                                <div className="col-6 fw-bold" style={{ marginLeft: "-72px" }} dir="ltr">
                                    {props.model.code ? props.model.code : ""}
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" dir="ltr">Receipt Date | تاريخ الاستلام:</div>
                                <div className="col-6 fw-bold" style={{ marginLeft: "-72px" }} dir="ltr">
                                    <span dir="ltr"> {props.model.date ? format(
                                        new Date(props.model.date),
                                        "yyyy-MM-dd h:mma"
                                    ) : "<DATETIME>"} {" | " + getArabicDate(props.model.date)}
                                    </span>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" dir="ltr">Customer Name | اسم العميل:</div>
                                <div className="col-6 fw-bold" dir="ltr" style={{ marginLeft: "-72px" }}>
                                    {props.model.customer ? props.model.customer.name : ""}
                                    {!props.model.customer && props.model.customerName ? props.model.customerName : ""}
                                    {!props.model.customerName && !props.model.customer ? "N/A" : ""}
                                    {props.model.customer?.name_in_arabic ? " | " + props.model.customer.name_in_arabic : ""}
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" dir="ltr">Customer ID | معرف العميل:</div>
                                <div className="col-6 fw-bold" dir="ltr" style={{ marginLeft: "-72px" }}>
                                    {props.model.customer?.code ? props.model.customer.code : ""}
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" >Customer VAT | ضريبة القيمة المضافة للعملاء:</div>
                                <div className="col-6 fw-bold" dir="ltr" style={{ marginLeft: "-72px" }}>
                                    <span dir="ltr">
                                        {props.model.customer?.vat_no ? props.model.customer.vat_no : ""}
                                        {!props.model.customer && props.model.vat_no ? props.model.vat_no : ""}
                                        {!props.model.customer && !props.model.vat_no ? "N/A" : ""}
                                        {props.model.customer?.vat_no_in_arabic ? " | " + props.model.customer.vat_no_in_arabic : ""}
                                        {!props.model.customer && props.model.vat_no ? " | " + convertToArabicNumber(props.model.vat_no) : ""}
                                    </span>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" >Customer C.R | رقم تسجيل شركة العميل</div>
                                <div className="col-6 fw-bold" dir="ltr" style={{ marginLeft: "-72px" }}>
                                    <span dir="ltr">
                                        {props.model.customer?.registration_number ? props.model.customer.registration_number + " | " + convertToArabicNumber(props.model.customer.registration_number) : "N/A"}
                                    </span>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-7 text-start fw-bold" dir="ltr" >Customer Address | عنوان العميل:</div>
                                <div className="col-6 fw-bold" dir="ltr" style={{ marginLeft: "-72px" }}>

                                    <span dir="ltr">
                                        {props.model.address && !props.model.customer ? props.model.address : ""}
                                        {!props.model.customer?.national_address?.building_no && !props.model.customer?.national_address?.unit_no && props.model.customer?.national_address?.street_name && props.model.customer?.national_address?.district_name && props.model.customer?.national_address?.city_name ? props.model.customer?.address : ""}
                                        {props.model.customer?.national_address?.building_no ? `${props.model.customer.national_address.building_no}` : ""}
                                        {props.model.customer?.national_address?.street_name ? ` ${props.model.customer.national_address.street_name}` : ""}
                                        {props.model.customer?.national_address?.district_name ? ` - ${props.model.customer.national_address.district_name}` : ""}
                                        {props.model.customer?.national_address?.unit_no ? `, Unit #${props.model.customer.national_address.unit_no}` : ""}
                                        {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                                        {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                                        {props.model.customer?.national_address?.additional_no ? ` - ${props.model.customer.national_address.additional_no}` : ""}
                                        {props.model.customer?.country_name ? `, ${props.model.customer.country_name}` : ""}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="col-md-2 text-center" style={{ border: "solid 0px", width: "21%", padding: "0px" }}>

                    </div>
                </div>
                <div className="row" style={{ fontSize: "2.2mm" }}>
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
                            className="table-responsive"
                            style={{
                                overflow: "hidden", outline: "none"
                            }}
                            tabIndex="0"
                        >

                            <table
                                className="table table-bordered"
                                style={{ borderRadius: "6px" }}
                            >
                                <thead style={{ fontSize: "2.2mm" }} className="fw-bold">
                                    <tr style={{}}>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
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
                                        <th className="per68 text-center" style={{ padding: "0px", width: "13%" }}>
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

                                        <th className="per1 text-center" style={{ padding: "0px", width: "4%" }}>
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
                                        <th className="per1 text-center" style={{ padding: "0px", width: "4%" }}>
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
                                        <th className="per68 text-center" style={{ padding: "0px", width: "13%" }}>
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

                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: "2.2mm" }} className="fw-bold" >
                                    <tr className="text-center"  >
                                        <td style={{ padding: "1px", height: "16px" }}>{1}</td>
                                        <td style={{ padding: "1px" }}>
                                            Payment Received from {props.model.customer?.name} {props.model.description ? " | " + props.model.description : ""}
                                        </td>
                                        <td style={{ padding: "1px" }} className="text-end">{props.model.payment_method ? GetPaymentMode(props.model.payment_method) : ""} </td>
                                        <td style={{ padding: "1px" }} className="text-end">{props.model.bank_reference_no ? props.model.bank_reference_no : ""} </td>
                                        <td style={{ padding: "1px", textAlign: "right" }}> {props.model.amount ? <Amount amount={trimTo2Decimals(props.model.amount)} /> : ""}</td>
                                    </tr>
                                </tbody>

                                <tfoot style={{ fontSize: "2.2mm" }} className="fw-bold">
                                    <tr>
                                        <th colSpan="4" className="text-end" style={{ padding: "2px" }}>
                                            Net Total  صافي المجموع:
                                        </th>
                                        <th className="text-end" colSpan="1" style={{ padding: "2px" }}>
                                            <span className="icon-saudi_riyal">
                                                <Amount amount={trimTo2Decimals(props.model.net_total)} />
                                            </span>
                                        </th>
                                    </tr>
                                    {props.model.remarks ? <tr>
                                        <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                            Remarks ملاحظات:
                                        </th>
                                        <th
                                            colSpan="7"
                                            style={{ padding: "2px" }}

                                        >
                                            {props.model.remarks ? props.model.remarks : ""}
                                        </th>

                                    </tr> : ""}
                                    <tr>

                                        <th colSpan="2" className="text-end" style={{ padding: "2px" }}>
                                            In Words بكلمات:
                                        </th>
                                        <th
                                            colSpan="7"
                                            style={{ padding: "2px" }}

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
                                </tfoot>
                            </table>

                            <table className="table table-bordered fw-bold" style={{ fontSize: "2.2mm" }} >
                                <thead>
                                    <tr style={{ height: "50px" }}>
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Received From تم الاستلام من:
                                        </th>
                                        <th style={{ width: "30%", padding: "2px" }}> {props.model.customer?.name ? props.model.customer.name : null}</th>
                                        <th className="text-end" style={{ width: "20%", padding: "2px" }}>
                                            Received By تم الاستلام بواسطة:
                                        </th>
                                        <th style={{ width: "30%", padding: "2px" }}>
                                            {props.model.store?.name ? props.model.store.name : null}
                                        </th>
                                    </tr>
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
                            </table>
                        </div>
                    </div>
                </div>
                {props.model.store?.show_address_in_invoice_footer && <div className="row fw-bold" style={{ fontSize: "2.2mm", height: "55px", }}>
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
                </div>}
            </div>
        ))}
    </span >
    </>);

});

export default CustomerDepositPreviewContent;