import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";
import "./print.css";

const OrderPrintContent2 = forwardRef((props, ref) => {
    //Non-A4
    let border = "0";
    return (<>
        <span ref={ref}>
            {props.model.pages && props.model.pages.map((page, pageIndex) => (
                <div
                    key={pageIndex}
                    className="container"
                    id="printableArea"
                    style={{
                        backgroundColor: "white",
                        border: "solid 0px",
                        borderColor: "silver",
                        borderRadius: "3mm",
                        padding: "10px",
                        height: "700px",
                    }}

                >
                    <h2 className="print-value" style={{ fontSize: "4mm", position: "absolute", left: "280px", top: (200 + page.top) + "px", border: "solid " + border + "px", textDecoration: "underline", }}>
                        {/*"TAX INVOICE / فاتورة ضريبية"*/}
                        {props.model.invoiceTitle}
                    </h2>

                    <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "390px", top: (225 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.code ? props.model.code : ""}
                    </h4>

                    <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "445px", top: (275 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.name ? props.model.customer.name : "N/A"}
                    </h4>


                    <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "600px", top: (220 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.date ? format(
                            new Date(props.model.date),
                            "yyyy-MM-dd"
                        ) : ""}
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        {props.model.date ? format(
                            new Date(props.model.date),
                            "h:mma"
                        ) : ""}
                    </h4>

                    {/*
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (28 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.name_in_arabic ? props.model.customer.name_in_arabic : "N/A"}
                    </h4>

                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (46 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no ? props.model.customer.vat_no : "N/A"}
                    </h4>
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "105px", top: (60 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no_in_arabic ? props.model.customer.vat_no_in_arabic : "N/A"}
                    </h4>


                    <h4 style={{ fontSize: "3mm", position: "absolute", right: "69px", top: (63 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                    </h4>*/}

                    <table className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "60px", top: (370 + page.top) + "px", border: "solid 0px", }}>
                        <tbody>
                            {page.products && page.products.map((product, index) => (
                                <tr key={product.item_code} style={{ paddingTop: "1px", height: "8px", borderBottom: "solid 1px" }}>
                                    <td className="text-center " style={{ border: "solid 1px", width: "48px", }}>
                                        <h4 className="print-value" style={{ fontSize: "3mm" }}>{index + 1 + (pageIndex * props.model.pageSize)}
                                        </h4>
                                    </td>
                                    <td className="text-center" style={{ border: "solid 1px", width: "250px" }} >
                                        <h4 className="print-value" style={{ fontSize: "2.2mm" }}>
                                            {product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number ? product.part_number : ""}
                                        </h4>
                                    </td>
                                    <td className="text-left" style={{ border: "solid 1px", width: "720px", paddingLeft: "20px" }} >
                                        <div className="print-value" style={{ height: "23px" }} >
                                            {product.name_in_arabic ? <h4 className="print-value" style={{ fontSize: "3mm", position: "relative", top: "-2px" }}>
                                                {product.name_in_arabic}
                                            </h4> : ""}
                                            {product.name && product.name_in_arabic ? <h4 className="print-value" style={{ fontSize: "2.4mm", position: "relative", top: "-11px" }}>
                                                {product.name}
                                            </h4> : ""}
                                            {product.name && !product.name_in_arabic ? <h4 className="print-value" style={{ fontSize: "2.4mm", position: "relative", top: "2px" }}>
                                                {product.name}
                                            </h4> : ""}
                                        </div>
                                    </td>
                                    <td className="text-center" style={{ border: "solid 1px", width: "120px", }}>
                                        <h4 className="print-value" style={{ fontSize: "3mm" }}>
                                            {product.quantity}  {product.unit ? product.unit : ""}
                                        </h4>
                                    </td>
                                    <td className="text-end" style={{ border: "solid 1px", width: "140px", paddingRight: "5px" }}>

                                        <h4 className="print-value" style={{ fontSize: "3mm" }}>

                                            <NumberFormat
                                                value={trimTo2Decimals(product.unit_price)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />

                                            {product.unit_discount ? " [" + trimTo2Decimals(product.unit_discount * product.quantity) + " off]" : ""}
                                        </h4>

                                    </td>
                                    <td className="text-end" style={{ border: "solid 1px", width: "150px", paddingRight: "5px" }} >
                                        <h4 className="print-value" style={{ fontSize: "3mm" }}>
                                            <NumberFormat
                                                value={trimTo2Decimals((product.unit_price - product.unit_discount) * product.quantity)}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={""}
                                                renderText={(value, props) => value}
                                            />
                                        </h4>
                                    </td>
                                </tr>

                            ))}
                        </tbody>
                    </table>

                    {page.lastPage ? <table className="print-value" style={{ minWidth: "150px", fontSize: "3mm", position: "absolute", left: "700px", top: (800 + page.top) + "px", border: "solid 1px", }}>
                        <tbody>
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 1px", }}>
                                <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            displayType={"text"}
                                            value={trimTo2Decimals(props.model.total)}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />

                                    </h4>
                                </td>
                            </tr>
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 1px", }}>
                                <td style={{ paddingRight: "5px", paddingTop: "13px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            value={trimTo2Decimals(props.model.vat_price)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 1px", }}>
                                <td style={{ paddingRight: "5px", paddingTop: "13px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            value={trimTo2Decimals(props.model.discount)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 1px", }}>
                                <td style={{ paddingRight: "5px", paddingTop: "13px" }}>
                                    <h4 className="print-value" style={{ fontSize: "3mm", height: "9px", }}>
                                        <NumberFormat
                                            value={trimTo2Decimals(props.model.net_total)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                    </h4>
                                </td>
                            </tr>
                        </tbody>
                    </table> : ""}

                    <span dir="ltr" className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "200px", top: (815 + page.top) + "px" }} >
                        <h4>Cust. Address:</h4>
                    </span>

                    <span dir="ltr" className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "65px", top: (835 + page.top) + "px" }} >
                        {props.model.customer?.national_address?.building_no ? `${props.model.customer.national_address.building_no}` : ""}
                        {props.model.customer?.national_address?.street_name ? ` ${props.model.customer.national_address.street_name}` : ""}
                        {props.model.customer?.national_address?.district_name ? ` - ${props.model.customer.national_address.district_name}` : ""}
                        {props.model.customer?.national_address?.unit_no ? `, Unit #${props.model.customer.national_address.unit_no}` : ""}
                        {props.model.customer?.national_address?.city_name ? `, ${props.model.customer.national_address.city_name}` : ""}
                        {props.model.customer?.national_address?.zipcode ? ` - ${props.model.customer.national_address.zipcode}` : ""}
                        {props.model.customer?.national_address?.additional_no ? ` - ${props.model.customer.national_address.additional_no}` : ""}
                    </span>


                    {/*
                    {page.lastPage && props.model.shipping_handling_fees && props.model.shipping_handling_fees > 0 ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "480px", top: (513 + page.top) + "px" }}>
                        {"Shipping / Handling Fees: "}
                    </h4> : ""}

                    {page.lastPage && props.model.shipping_handling_fees ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "686px", top: (513 + page.top) + "px" }}>
                        {trimTo2Decimals(props.model.shipping_handling_fees)}
                    </h4> : ""}*/}


                    {page.lastPage ? <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", right: "280px", top: (910 + page.top) + "px" }}>
                        {n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}
                    </h4> : ""}
                    {page.lastPage ? <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "65px", top: (920 + page.top) + "px" }}>
                        {n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}
                    </h4> : ""}

                    {/*<h4 style={{ fontSize: "3mm", position: "absolute", left: "205px", top: (664 + page.top) + "px" }}>
                        {props.model.delivered_by_user ? props.model.delivered_by_user.name : ""}
                    </h4>*/}

                    {page.lastPage ? <div className="print-value" style={{ position: "absolute", left: "60px", top: (650 + page.top) + "px" }} >
                        {/*!props.model.zatca?.qr_code && props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "102px", height: "94px" }} alt="Invoice QR Code" /> : ""*/}
                        {/*props.model.zatca?.qr_code ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "102px", height: "94px" }} size={100} / > : ""*/}
                        {props.model.store?.zatca?.phase === "1" && props.model.QRImageData ? <img src={props.model.QRImageData} style={{ width: "138px", height: "138px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}
                        {props.model.store?.zatca?.phase === "2" && props.model.zatca?.qr_code && props.model.zatca?.reporting_passed ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "138px", height: "138px" }} size={138} /> : ""}
                        {props.model.store?.zatca?.phase === "2" && !props.model.zatca?.qr_code ? <img src={props.model.QRImageData} style={{ width: "138px", height: "138px", border: "solid 0px" }} alt="Invoice QR Code" /> : ""}

                    </div> : ""}

                    <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "140px", top: (815 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.remarks ? props.model.remarks : "N/A"}
                    </h4>


                    <h4 className="print-value" style={{ fontSize: "3mm", position: "absolute", left: "178px", top: (875 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no ? props.model.customer.vat_no : "N/A"}
                    </h4>
                </div >

            ))}
        </span>
    </>);

});

export default OrderPrintContent2;