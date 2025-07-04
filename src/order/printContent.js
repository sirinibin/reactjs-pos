import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'
import { QRCodeCanvas } from "qrcode.react";
import { trimTo2Decimals } from "../utils/numberUtils";

const OrderPrintContent = forwardRef((props, ref) => {
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
                        height: "700px"
                    }}


                >
                    <h2 style={{ fontSize: "4mm", position: "absolute", left: "305px", top: (40 + page.top) + "px", border: "solid " + border + "px", textDecoration: "underline", }}>
                        {props.model.invoiceTitle}
                    </h2>

                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (14 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.name ? props.model.customer.name : "N/A"}
                    </h4>
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (28 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.name_in_arabic ? props.model.customer.name_in_arabic : "N/A"}
                    </h4>

                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (46 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no ? props.model.customer.vat_no : "N/A"}
                    </h4>
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "105px", top: (60 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.customer && props.model.customer.vat_no_in_arabic ? props.model.customer.vat_no_in_arabic : "N/A"}
                    </h4>


                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "570px", top: (14 + page.top) + "px", border: "solid " + border + "px", }}>
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
                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "570px", top: (35 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.code ? props.model.code : ""}
                    </h4>

                    <h4 style={{ fontSize: "3mm", position: "absolute", right: "69px", top: (63 + page.top) + "px", border: "solid " + border + "px", }}>
                        {props.model.total_pages ? "Page " + (pageIndex + 1) + " of " + props.model.total_pages : ""}
                    </h4>

                    <table style={{ fontSize: "3mm", position: "absolute", left: "18px", top: (119 + page.top) + "px", border: "solid 0px", }}>
                        <tbody>
                            {page.products && page.products.map((product, index) => (
                                <tr key={product.item_code} style={{ paddingTop: "1px", height: "8px", borderBottom: "solid 1px" }}>
                                    <td className="text-center" style={{ border: "solid 0px", width: "48px", }}>
                                        <h4 style={{ fontSize: "3mm" }}>{index + 1 + (pageIndex * props.model.pageSize)}
                                        </h4>
                                    </td>
                                    <td className="text-center" style={{ border: "solid 0px", width: "93px" }} >
                                        <h4 style={{ fontSize: "2.2mm" }}>
                                            {product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number ? product.part_number : ""}
                                        </h4>
                                    </td>
                                    <td className="text-left" style={{ border: "solid 0px", width: "299px", paddingLeft: "5px" }} >
                                        <div style={{ height: "23px" }} >
                                            {product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "-2px" }}>
                                                {product.name_in_arabic}
                                            </h4> : ""}
                                            {product.name && product.name_in_arabic ? <h4 style={{ fontSize: "2.4mm", position: "relative", top: "-11px" }}>
                                                {product.name}
                                            </h4> : ""}
                                            {product.name && !product.name_in_arabic ? <h4 style={{ fontSize: "2.4mm", position: "relative", top: "2px" }}>
                                                {product.name}
                                            </h4> : ""}
                                        </div>
                                    </td>
                                    <td className="text-center" style={{ border: "solid 0px", width: "77px", }}>
                                        <h4 style={{ fontSize: "3mm" }}>
                                            {product.quantity}  {product.unit ? product.unit : ""}
                                        </h4>
                                    </td>
                                    <td className="text-end" style={{ border: "solid 0px", width: "111px", paddingRight: "5px" }}>

                                        <h4 style={{ fontSize: "3mm" }}>

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
                                    <td className="text-end" style={{ border: "solid 0px", width: "99px", paddingRight: "5px" }} >
                                        <h4 style={{ fontSize: "3mm" }}>
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

                    {page.lastPage ? <table style={{ fontSize: "3mm", position: "absolute", left: "646px", top: (530 + page.top) + "px", border: "solid 0px", }}>
                        <tbody>
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                    <h4 style={{ fontSize: "3mm", height: "9px", }}>
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
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                    <h4 style={{ fontSize: "3mm", height: "9px", }}>
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
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                    <h4 style={{ fontSize: "3mm", height: "9px", }}>
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
                            <tr className="text-end" style={{ verticalAlign: "center", border: "solid 0px", }}>
                                <td style={{ width: "99px", paddingRight: "5px", paddingTop: "10px" }}>
                                    <h4 style={{ fontSize: "3mm", height: "9px", }}>
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


                    {page.lastPage && props.model.shipping_handling_fees && props.model.shipping_handling_fees > 0 ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "480px", top: (513 + page.top) + "px" }}>
                        {"Shipping / Handling Fees: "}
                    </h4> : ""}

                    {page.lastPage && props.model.shipping_handling_fees ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "686px", top: (513 + page.top) + "px" }}>
                        {trimTo2Decimals(props.model.shipping_handling_fees)}
                    </h4> : ""}


                    {page.lastPage ? <h4 style={{ fontSize: "3mm", position: "absolute", right: "320px", top: (565 + page.top) + "px" }}>
                        {n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}
                    </h4> : ""}
                    {page.lastPage ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "50px", top: (580 + page.top) + "px" }}>
                        {n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}
                    </h4> : ""}

                    <h4 style={{ fontSize: "3mm", position: "absolute", left: "205px", top: (664 + page.top) + "px" }}>
                        {props.model.delivered_by_user ? props.model.delivered_by_user.name : ""}
                    </h4>

                    {page.lastPage && props.model?.modelName !== "quotation" && props.model?.modelName !== "quotation_sales_return" && props.model?.modelName !== "delivery_note" ? <div style={{ position: "absolute", left: "600px", top: (670 + page.top) + "px" }} >
                        {!props.model.zatca?.qr_code && props.model.QRImageData ? <img className="text-start" src={props.model.QRImageData} style={{ width: "102px", height: "94px" }} alt="Invoice QR Code" /> : ""}
                        {props.model.zatca?.qr_code ? <QRCodeCanvas value={props.model.zatca?.qr_code} style={{ width: "102px", height: "94px" }} size={100} /> : ""}
                    </div> : ""}
                </div >
            ))}
        </span>
    </>);

});

export default OrderPrintContent;