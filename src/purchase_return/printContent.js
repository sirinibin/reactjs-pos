import { React, forwardRef } from "react";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import n2words from 'n2words'

const PurchaseReturnPrintContent = forwardRef((props, ref) => {





    let border = "0";
    return (<>

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
                    padding: "10px"
                }}


            >
                <h4 style={{ fontSize: "4mm", position: "absolute", left: "270px", top: (40 + page.top) + "px", border: "solid " + border + "px", textDecoration: "underline", }}>
                    {"PURCHASE RETURN TAX INVOICE / شراء فاتورة ضريبة الإرجاع"}
                </h4>

                <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (14 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.vendor && props.model.vendor.name ? props.model.vendor.name : "N/A"}
                </h4>
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (28 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.vendor && props.model.vendor.name_in_arabic ? props.model.vendor.name_in_arabic : "N/A"}
                </h4>

                <h4 style={{ fontSize: "3mm", position: "absolute", left: "100px", top: (46 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.vendor && props.model.vendor.vat_no ? props.model.vendor.vat_no : "N/A"}
                </h4>
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "105px", top: (60 + page.top) + "px", border: "solid " + border + "px", }}>
                    {props.model.vendor && props.model.vendor.vat_no_in_arabic ? props.model.vendor.vat_no_in_arabic : "N/A"}
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
                                    <h4 style={{ fontSize: "3mm" }}>
                                        {product.part_no ? product.part_no : ""}
                                    </h4>
                                </td>
                                <td className="text-left" style={{ border: "solid 0px", width: "299px", paddingLeft: "5px" }} >
                                    <div style={{ height: "23px" }} >
                                        {product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "-2px" }}>
                                            {product.name_in_arabic}
                                        </h4> : ""}
                                        {product.name && product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "-11px" }}>
                                            {product.name}
                                        </h4> : ""}
                                        {product.name && !product.name_in_arabic ? <h4 style={{ fontSize: "3mm", position: "relative", top: "2px" }}>
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
                                            value={(product.purchasereturn_unit_price).toFixed(2)}
                                            displayType={"text"}
                                            thousandSeparator={true}
                                            suffix={""}
                                            renderText={(value, props) => value}
                                        />
                                          {product.discount ? " ["+product.discount.toFixed(2)+" off]" : ""}
                                    </h4>
                                </td>
                                <td className="text-end" style={{ border: "solid 0px", width: "99px", paddingRight: "5px" }} >
                                    <h4 style={{ fontSize: "3mm" }}>
                                        <NumberFormat
                                            value={((product.purchasereturn_unit_price * product.quantity) - product.discount).toFixed(2)}
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
                                        value={props.model.total.toFixed(2)}
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
                                        value={props.model.vat_price.toFixed(2)}
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
                                        value={props.model.discount?.toFixed(2)}
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
                                        value={props.model.net_total.toFixed(2)}
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



                {page.lastPage ? <h4 style={{ fontSize: "3mm", position: "absolute", right: "320px", top: (565 + page.top) + "px" }}>
                    {n2words(props.model.net_total, { lang: 'ar' }) + " ريال سعودي  "}
                </h4> : ""}
                {page.lastPage ? <h4 style={{ fontSize: "3mm", position: "absolute", left: "50px", top: (580 + page.top) + "px" }}>
                    {n2words(props.model.net_total, { lang: 'en' }) + " saudi riyals"}
                </h4> : ""}

                <h4 style={{ fontSize: "3mm", position: "absolute", left: "205px", top: (664 + page.top) + "px" }}>
                    {props.model.received_by_user ? props.model.received_by_user.name : ""}
                </h4>

                {page.lastPage ? <div style={{ position: "absolute", left: "600px", top: (670 + page.top) + "px" }} >
                    {props.model.QRImageData && <img style={{ width: "102px", height: "94px" }} src={props.model.QRImageData} alt="Invoice QR Code" />}

                </div> : ""}
            </div >
        ))}
    </>);

});

export default PurchaseReturnPrintContent;