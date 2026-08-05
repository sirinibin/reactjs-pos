import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Spinner } from "react-bootstrap";
import DraggableHistoryModal from "./DraggableHistoryModal.js";
import { trimTo2Decimals } from "./numberUtils";
import { format } from "date-fns";

const ProductNonVATSalesReturnHistory = forwardRef((props, ref) => {
    const [product, setProduct] = useState({});
    const [show, setShow] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const storeId = localStorage.getItem("store_id");

    useImperativeHandle(ref, () => ({
        open(model) {
            setProduct(model || {});
            setHistoryList([]);
            setShow(true);
            loadHistory(model);
        },
    }));

    async function loadHistory(model) {
        const productId = model?.product_id || model?.id;
        if (!productId) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                "search[product_id]": productId,
                "search[store_id]": storeId,
                limit: 50,
                sort: "-created_at",
                select: "id,non_vat_sales_return_code,date,customer_name,quantity,unit_price,unit_price_with_vat,price,net_price",
            });
            const r = await fetch(`/v1/non-vat-sales-return/history?${params}`, {
                headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
            });
            const data = await r.json();
            setHistoryList(data?.result || []);
        } catch (e) {
            setHistoryList([]);
        } finally {
            setIsLoading(false);
        }
    }

    const name = product?.name || "";
    const nameAr = product?.name_in_arabic ? ` / ${product.name_in_arabic}` : "";

    return (
        <DraggableHistoryModal show={show} onClose={() => setShow(false)} title={`Non VAT Sales Return History of ${name}${nameAr}`}>
            {show && (
                <div style={{ padding: "12px", overflowX: "auto" }}>
                    {isLoading ? (
                        <div style={{ textAlign: "center", padding: "32px" }}>
                            <Spinner animation="border" size="sm" /> Loading...
                        </div>
                    ) : historyList.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                            <i className="bi bi-inbox d-block mb-2" style={{ fontSize: "28px" }}></i>
                            No non-VAT sales return history found.
                        </div>
                    ) : (
                        <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                            <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                                <tr>
                                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Date</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Code</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Customer</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "right" }}>Qty</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "right" }}>Unit Price</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, textAlign: "right" }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyList.map((row, i) => (
                                    <tr key={row.id || i}>
                                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                                            {row.date ? format(new Date(row.date), "d MMM yyyy") : "—"}
                                        </td>
                                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>{row.non_vat_sales_return_code || "—"}</td>
                                        <td style={{ padding: "6px 10px" }}>{row.customer_name || "—"}</td>
                                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{row.quantity ?? "—"}</td>
                                        <td style={{ padding: "6px 10px", textAlign: "right" }}>
                                            {row.unit_price != null ? trimTo2Decimals(row.unit_price) : "—"}
                                        </td>
                                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                                            {row.price != null ? trimTo2Decimals(row.price) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </DraggableHistoryModal>
    );
});

export default ProductNonVATSalesReturnHistory;
