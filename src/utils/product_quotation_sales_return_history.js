import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductQuotationSalesReturnHistoryTable from "../product/quotation_sales_return_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductQuotationSalesReturnHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    const [show, setShow] = useState(false);
    const tableRef = useRef();

    useImperativeHandle(ref, () => ({
        // typeValue is accepted for API compatibility but not used in this modal
        open(model, selectedCustomersValue, typeValue) {
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
            title={`Qtn. Sales Return History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && (
                <ProductQuotationSalesReturnHistoryTable
                    ref={tableRef}
                    model={product}
                    selectedCustomers={selectedCustomers}
                />
            )}
        </DraggableHistoryModal>
    );
});

export default ProductQuotationSalesReturnHistory;
