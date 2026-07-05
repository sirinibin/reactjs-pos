import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductDeliveryNoteHistoryTable from "../product/delivery_note_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductDeliveryNoteHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const [show, setShow] = useState(false);
    const tableRef = useRef();

    useImperativeHandle(ref, () => ({
        open(model, selectedCustomersValue) {
            product = model;
            setProduct(product);
            // Note: intentionally no reset — preserves previous selection if none provided
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
            title={`Delivery Note History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && <ProductDeliveryNoteHistoryTable ref={tableRef} model={product} selectedCustomers={selectedCustomers} />}
        </DraggableHistoryModal>
    );
});

export default ProductDeliveryNoteHistory;
