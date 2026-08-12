import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductSalesHistoryTable from "../product/sales_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductSalesHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const [show, setShow] = useState(false);
    const tableRef = useRef();

    useImperativeHandle(ref, () => ({
        open(model, selectedCustomersValue) {
            product = model;
            setProduct(product);
            selectedCustomers = [];
            setSelectedCustomers([]);
            if (selectedCustomersValue?.length > 0) {
                selectedCustomers = selectedCustomersValue;
                setSelectedCustomers([...selectedCustomersValue]);
            }
            setShow(true);
        },
    }));

    return (
        <DraggableHistoryModal
            show={show}
            onClose={() => setShow(false)}
            title={`Sales History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
            extraClass={props.extraClass}
        >
            {show && <ProductSalesHistoryTable ref={tableRef} model={product} selectedCustomers={selectedCustomers} subFormModalClass={props.extraClass === "order-inner-history-modal" ? "above-inner-history-form" : ""} />}
        </DraggableHistoryModal>
    );
});

export default ProductSalesHistory;
