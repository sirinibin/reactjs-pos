import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'

const OrderPreviewContent = forwardRef((props, ref) => {

    let persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    let persianMap = persianDigits.split("");

    function convertToPersianNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    function getArabicDate(engishDate) {
        let event = new Date(engishDate);
        let options = {
            /*weekday: 'long', */
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            //  timeZoneName: "short",
        };
        return event.toLocaleDateString('ar-EG', options)
    }

    return (<>
        {props.model.pages && props.model.pages.map((page, pageIndex) => (
            <div
                className="container"
                id="printableArea"
                style={{
                    backgroundColor: "white",
                    border: "solid 2px",
                    borderColor: "silver",
                    borderRadius: "2mm",
                    padding: "20px",
                    marginTop: "10px",
                    height: "1110px",
                    width: "770px"
                }}

            >
                <div className="row" style={{ fontSize: "3mm" }}>
                    <div className="col">
                        <ul className="list-unstyled text-left">
                            <li><h4 style={{ fontSize: "4mm" }}>{props.model.store ? props.model.store.name : "<STORE_NAME>"}</h4></li>
                            <li>{props.model.store ? props.model.store.title : "<STORE_TITLE>"}</li>
                            {/*<!-- <li><hr /></li> --> */}
                            <li>C.R. / {props.model.store ? props.model.store.registration_number : "<STORE_CR_NO>"}</li>
                            <li>VAT / {props.model.store ? props.model.store.vat_no : "<STORE_VAT_NO>"}</li>
                        </ul>
                    </div>
                    <div className="col">
                        <div className="invoice-logo text-center">
                            {props.model.store && props.model.store.logo ? <img width="100" height="100" src={process.env.REACT_APP_API_URL + props.model.store.logo + "?" + (Date.now())} alt="Invoice logo" /> : null}
                        </div>
                    </div>
                    <div className="col">
                        <ul className="list-unstyled text-end">
                            <li>
                                <h4 style={{ fontSize: "4mm" }}>
                                    <strong>
                                        {props.model.store ? props.model.store.name_in_arabic : "<STORE_NAME_ARABIC>"}
                                    </strong>
                                </h4>
                            </li>
                            <li>
                                {props.model.store ? props.model.store.title_in_arabic : "<STORE_TITLE_ARABIC>"}
                            </li>
                            {/* <!-- <li><hr /></li> --> */}
                            <li>{props.model.store ? props.model.store.registration_number_in_arabic : "<STORE_CR_NO_ARABIC>"} / ‫ت‬.‫س‬</li>
                            <li>{props.model.store ? props.model.store.vat_no_in_arabic : "<STORE_VAT_NO_ARABIC>"} / ‫الضريبي‬ ‫الرقم‬</li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <u
                        ><h1 className="text-center" style={{ fontSize: "4mm" }}>
                                INVOICE / فاتورة
                            </h1>
                        </u>
                    </div>
                </div>

                <div className="row table-active" style={{ fontSize: "3mm", border: "solid 0px" }}>
                    <div className="col-md-5" style={{ border: "solid 0px", width: "40%" }}>
                        <ul className="list-unstyled mb0 text-start">
                            <li><strong>Order: </strong>#{props.model.code ? props.model.code : "<ID_NUMBER>"}</li>
                            <li><strong>Order Date: </strong> {props.model.created_at ? format(
                                new Date(props.model.created_at),
                                "MMM dd yyyy h:mma"
                            ) : "<DATETIME>"} </li>
                            <li>
                                <strong>Customer: </strong>{props.model.customer ? props.model.customer.name : "N/A"}
                            </li>
                            <li><strong>VAT Number: </strong>{props.model.customer ? props.model.customer.vat_no : "N/A"}
                            </li>
                        </ul>
                    </div>

                    <div className="col-md-2 text-center" style={{ border: "solid 0px", width: "20%", padding: "0px" }}>
                        {props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "100px", height: "92px" }} alt="Invoice QR Code" /> : ""}
                    </div>

                    <div className="col-md-5" style={{ border: "solid 0px", width: "40%" }}>
                        <ul className="list-unstyled mb0 text-end">
                            <li>{props.model.code ? props.model.code : "<ID_NUMBER_ARABIC>"}<strong> :طلب </strong></li>
                            <li><strong>تاريخ الطلب:  </strong>{props.model.created_at ? getArabicDate(props.model.created_at) : "<DATETIME_ARABIC>"}</li>
                            <li>
                                <strong>عميل: </strong>{props.model.customer ? props.model.customer.name_in_arabic : "<CUSTOMER_NAME_ARABIC>"}
                            </li>
                            <li><strong>الرقم الضريبي للعميل: </strong>{props.model.customer ? props.model.customer.vat_no_in_arabic : "<CUSTOMER_VAT_NO_ARABIC>"}</li>


                        </ul>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3mm" }}>
                    <div className="col text-start">
                        {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                    </div>
                    <div className="col text-end">
                        {props.model.total_pages ? convertToPersianNumber(props.model.total_pages.toString()) + " الصفحة " + convertToPersianNumber((pageIndex + 1).toString()) + " من " : ""}
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
                                style={{ fontSize: "3mm", borderRadius: "6px" }}
                            >
                                <thead>
                                    <tr>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>رقم سري</li>
                                                <li>SI No.</li>
                                            </ul>
                                        </th>
                                        <th className="per3 text-center" style={{ padding: "0px", width: "8%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fonSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>رقم القطعة</li>
                                                <li>Part Number</li>
                                            </ul>
                                        </th>
                                        <th className="per68 text-center" style={{ padding: "0px", width: "15%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>وصف</li>
                                                <li>Description</li>
                                            </ul>
                                        </th>
                                        <th className="per1 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}
                                            >
                                                <li>كمية</li>
                                                <li>Qty</li>
                                            </ul>
                                        </th>
                                        <th className="per10 text-center" style={{ padding: "0px", width: "10%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}
                                            >
                                                <li>سعر الوحدة</li>
                                                <li>Unit Price</li>
                                            </ul>
                                        </th>
                                        <th className="per20 text-center" style={{ padding: "0px", width: "5%" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", height: "35px", marginBottom: "0px" }}
                                            >
                                                <li>المبلغ الإجمالي</li>
                                                <li>Total Amount</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {page.products && page.products.map((product, index) => (
                                        <tr key={product.item_code} className="text-center" >
                                            <td style={{ paddingBottom: "0px", marginTop: "0px" }}>{index + 1 + (pageIndex * props.model.pageSize)}</td>
                                            <td style={{ paddingBottom: "0px", marginTop: "0px" }} >{product.part_number ? product.part_number : ""}</td>
                                            <td style={{ paddingBottom: "0px", marginTop: "0px" }}>
                                                {product.name}{product.name_in_arabic ? "/" + product.name_in_arabic : ""}
                                            </td>
                                            <td style={{ paddingBottom: "0px", marginTop: "0px" }}>{product.quantity.toFixed(2)}  {product.unit ? product.unit : ""}</td>
                                            <td className="text-end" style={{ paddingBottom: "0px", marginTop: "0px" }} >
                                                <NumberFormat
                                                    value={product.unit_price.toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={" SAR"}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                            <td style={{ paddingBottom: "0px", marginTop: "0px" }} className="text-end">
                                                <NumberFormat
                                                    value={(product.unit_price * product.quantity).toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={" SAR"}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                                <tfoot>
                                    <tr>
                                        <th colSpan="4" className="text-end"></th>

                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>المجموع:</li>
                                                <li>Total:</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" colSpan="2">

                                            <NumberFormat
                                                value={props.model.total.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />

                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="5" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>رسوم الشحن / المناولة:</li>
                                                <li>Shipping / Handling Fees:</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" colSpan="2">
                                            <NumberFormat
                                                value={props.model.shipping_handling_fees.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="5" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>خصم:</li>
                                                <li>Discount:</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" colSpan="2">
                                            <NumberFormat
                                                value={props.model.discount.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" colSpan="4" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>ضريبة:</li>
                                                <li>VAT:</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" colSpan="1">{props.model.vat_percent.toFixed(2)}%</th>
                                        <th className="text-end" colSpan="2">
                                            <NumberFormat
                                                value={props.model.vat_price.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>

                                    <tr>
                                        <th colSpan="5" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled text-end"

                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>الإجمالي الصافي:</li>
                                                <li>Net Total:</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" colSpan="2">
                                            <NumberFormat
                                                value={props.model.net_total.toFixed(2)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                    <tr>
                                        <th colSpan="1" className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>بكلمات:</li>
                                                <li>In Words:</li>
                                            </ul>
                                        </th>
                                        <th
                                            colSpan="5"
                                            style={{
                                                paddingLeft: "5px",
                                                paddingTop: "0px",
                                                paddingBottom: "0px"
                                            }}

                                        >
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>{n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}</li>
                                                <li>{n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}</li>
                                            </ul>
                                        </th>
                                    </tr>
                                </tfoot>
                            </table>

                            <table className="table table-bordered" style={{ fontSize: "3mm" }}>
                                <thead>
                                    <tr>
                                        <th className="text-end" style={{ width: "13%", padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>سلمت بواسطة:</li>
                                                <li>Delivered By:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%" }}> {props.model.delivered_by_user ? props.model.delivered_by_user.name : null}</th>
                                        <th className="text-end" style={{ width: "13%", padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{ fontSize: "3mm", marginBottom: "0px" }}
                                            >
                                                <li>استلمت من قبل:</li>
                                                <li>Received By:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%" }}>

                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "20px" }}>
                                                <li>إمضاء:</li>
                                                <li>Signature:</li>
                                            </ul>
                                        </th>
                                        <th style={{ width: "37%", height: "40px" }}>
                                            {props.model.delivered_by_signature ?
                                                <img alt="Signature" src={process.env.REACT_APP_API_URL + props.model.delivered_by_signature.signature + "?" + (Date.now())} key={props.model.delivered_by_signature.signature} style={{ width: 100, height: 80 }} ></img>
                                                : null}
                                        </th>
                                        <th className="text-end" style={{ padding: "0px" }} >
                                            <ul className="list-unstyled" style={{ fontSize: "3mm", height: "20px" }}>
                                                <li>إمضاء:</li>
                                                <li>Signature:</li>
                                            </ul>
                                        </th>
                                        <th></th>
                                    </tr>
                                    <tr>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm",
                                                    height: "20px"
                                                }}
                                            >
                                                <li>تاريخ:</li>
                                                <li>Date:</li>
                                            </ul>
                                        </th>
                                        <th style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", height: "35px", marginBottom: "0px"
                                                }}
                                            >
                                                <li>{props.model.signature_date_str ? getArabicDate(props.model.signature_date_str) : ""}</li>
                                                <li>{props.model.signature_date_str ? props.model.signature_date_str : ""}</li>
                                            </ul>
                                        </th>
                                        <th className="text-end" style={{ padding: "0px" }}>
                                            <ul
                                                className="list-unstyled"
                                                style={{
                                                    fontSize: "3mm", marginBottom: "0px"
                                                }}
                                            >
                                                <li>تاريخ:</li>
                                                <li>Date:</li>
                                            </ul>
                                        </th>
                                        <th></th>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="row" style={{ fontSize: "3mm", height: "55px" }}>
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
            </div>
        ))}
    </>);

});

export default OrderPreviewContent;