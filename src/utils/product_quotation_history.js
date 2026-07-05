import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductQuotationHistoryTable from "../product/quotation_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductQuotationHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    let [selectedType, setSelectedType] = useState("");
    const [show, setShow] = useState(false);
    const tableRef = useRef();

    useImperativeHandle(ref, () => ({
        open(model, selectedCustomersValue, typeValue) {
            product = model;
            setProduct(product);
            if (typeValue) {
                selectedType = typeValue;
                setSelectedType(typeValue);
            }
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
            title={`Qtn. ${selectedType === "invoice" ? "Sales" : ""} History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && (
                <ProductQuotationHistoryTable
                    ref={tableRef}
                    model={product}
                    selectedCustomers={selectedCustomers}
                    selectedType={selectedType}
                />
            )}
        </DraggableHistoryModal>
    );
});

export default ProductQuotationHistory;
