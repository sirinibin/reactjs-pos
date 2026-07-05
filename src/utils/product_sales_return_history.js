import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductSalesReturnHistoryTable from "../product/sales_return_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductSalesReturnHistory = forwardRef((props, ref) => {
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
            title={`Sales Return History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && <ProductSalesReturnHistoryTable ref={tableRef} model={product} selectedCustomers={selectedCustomers} />}
        </DraggableHistoryModal>
    );
});

export default ProductSalesReturnHistory;
