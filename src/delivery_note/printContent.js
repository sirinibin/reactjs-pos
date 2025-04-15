import { React, forwardRef } from "react";
import { format } from "date-fns";


const DeliveryNotePrintContent = forwardRef((props, ref) => {



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
                    padding: "10px",
                    height: "700px"
                }}


            >
                <h2 style={{ fontSize: "4mm", position: "absolute", left: "305px", top: (40 + page.top) + "px", border: "solid " + border + "px", textDecoration: "underline", }}>
                    {"DELIVERY NOTE / مذكرة تسليم"}
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
                        "MMM dd yyyy h:mma"
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
                                        {product.prefix_part_number ? product.prefix_part_number + " - " : ""}{product.part_number ? product.part_number : ""}
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
                            </tr>

                        ))}
                    </tbody>
                </table>
                <h4 style={{ fontSize: "3mm", position: "absolute", left: "205px", top: (654 + page.top) + "px" }}>
                    {props.model.delivered_by_user ? props.model.delivered_by_user.name : ""}
                </h4>
            </div >
        ))}
    </>);

});

export default DeliveryNotePrintContent;