import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import DraggableFullscreenDialog from "./DraggableFullscreenDialog.js";
import OrderIndex from "../order/index.js";
import SalesReturnIndex from "../sales_return/index.js";
import QuotationIndex from "../quotation/index.js";
import QuotationSalesReturnIndex from "../quotation_sales_return/index.js";
import NonVATSalesIndex from "../non_vat_sales/index.js";
import NonVATSalesReturnIndex from "../non_vat_sales_return/index.js";
import PurchaseIndex from "../purchase/index.js";
import PurchaseReturnIndex from "../purchase_return/index.js";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import PostingIndex from "./../posting/index.js";
import { ObjectToSearchQueryParams } from './queryUtils.js';

// Read on every render, not once when the bundle loads: the Topbar refreshes this
// cache after start-up and when store settings change, which decides which tabs show.
const readStoreSettings = () => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } };

// GET /v1/vendor/vat_no/name for the vendor with this customer's name and VAT no.
// Both values are encoded: a name with "&", "#" or "+" otherwise cuts the query short
// and the vendor (and so the Purchases tabs) is never found.
export const vendorLookupURL = (name, vatNo, storeId) =>
    '/v1/vendor/vat_no/name?vat_no=' + encodeURIComponent(vatNo) + '&name=' + encodeURIComponent(name) +
    (storeId ? '&' + ObjectToSearchQueryParams({ store_id: storeId }) : '');

const CustomerPending = forwardRef((props, ref) => {
    const storeSettings = readStoreSettings();
    // Bumped on every open; a lookup answered after the modal was reopened for
    // another customer is dropped instead of overwriting the new customer's data.
    const openSeqRef = useRef(0);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);
    let [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);
    let [enableSelection, setEnableSelection] = useState(false);

    let [customer, setCustomer] = useState({});
    let [vendor, setVendor] = useState({});

    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, customerValue) {
            openSeqRef.current += 1;
            vendor = {}
            setVendor(vendor);
            customer = {};
            setCustomer(customer);

            customer = customerValue
            setCustomer(customer);

            getCustomer(customerValue.id)



            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);


            selectedCustomers = [
                {
                    id: customer.id,
                    name: customer.name,
                    vat_no: customer.vat_no,
                    search_label: customer.search_label,
                }
            ];



            setSelectedCustomers([...selectedCustomers]);

            if (selectedCustomers?.length > 0) {
                getVendor(selectedCustomers[0].name, selectedCustomers[0].vat_no);
            }


            selectedPaymentStatusList = [
                {
                    id: "not_paid",
                    name: "Not Paid",
                },
                {
                    id: "paid_partially",
                    name: "Paid partially",
                }
            ];
            setSelectedPaymentStatusList([...selectedPaymentStatusList]);

            selectedVendors = [];
            setSelectedVendors([...selectedVendors]);

            SetShow(true);
        },
    }));


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    const handleSelected = (selected) => {
        props.onSelectSale(selected); // Send to parent
        handleClose();
    };

    const handleUpdated = () => {
        getCustomer(customer?.id)
        if (customer?.vat_no) {
            getVendor(customer?.name, customer?.vat_no);
        }

        if (props.handleUpdated) {
            props.handleUpdated();
        }
    };

    // props.onSelectSale(selected); // Send to parent
    //     handleClose();

    /*
    let [creditSales, setCreditSales] = useState(0);

    const handleCreditSalesLoaded = (creditValue) => {
        alert("okk" + creditValue);
        setCreditSales(creditValue);
        console.log("Credit value loaded:", creditValue);
    };*/

    async function getVendor(name, vat_no) {
        if (!vat_no || !name) {
            return;
        }
        const seq = openSeqRef.current;

        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch(vendorLookupURL(name, vat_no, localStorage.getItem("store_id")), requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response (a missing vendor answers 200 with no result)
                if (!response.ok || !data?.result?.id) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }
                if (seq !== openSeqRef.current) return;

                let vendorValue = data.result;
                vendor = vendorValue;
                setVendor(vendor);

                selectedVendors = [
                    {
                        id: vendorValue.id,
                        name: vendorValue.name,
                        search_label: vendorValue.search_label,
                    }
                ];
                setSelectedVendors([...selectedVendors]);


            })
            .catch(error => {

            });
    }

    async function getCustomer(id) {
        const seq = openSeqRef.current;
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                if (seq !== openSeqRef.current) return;
                let customerData = data.result;
                customer = customerData
                setCustomer(customer);

            })
            .catch(error => {

            });
    }





    let [showBalanceSheet, setShowAccountBalanceSheet] = useState(false);
    const timerRef = useRef(null);
    const AccountBalanceSheetRef = useRef();

    useEffect(() => {
        if (showBalanceSheet) {
            document.body.classList.add('pending-balance-sheet-open');
        } else {
            document.body.classList.remove('pending-balance-sheet-open');
        }
        return () => document.body.classList.remove('pending-balance-sheet-open');
    }, [showBalanceSheet]);

    function openBalanceSheetDialogue(account) {
        setShowAccountBalanceSheet(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            AccountBalanceSheetRef.current?.open(account);
        }, 100);
    }

    return (
        <>
            {showBalanceSheet && <PostingIndex ref={AccountBalanceSheetRef} />}
            <Modal show={show} {...(props.size ? { size: props.size } : { fullscreen: true })} onHide={handleClose} animation={false} scrollable={true}
                backdrop={false}
                keyboard={false}
                centered={false}
                enforceFocus={false}
                className="above-sales-modal customer-pending-modal"
                dialogAs={props.size ? undefined : DraggableFullscreenDialog}
            >
                <Modal.Header>
                    <Modal.Title>{enableSelection ? "Select Sale" : customer.code + "/" + customer?.name + "'s Pendings "}
                    </Modal.Title>


                    <div className="col align-self-end text-end">
                        <Button variant="primary" disabled={!customer.account} onClick={() => {
                            openBalanceSheetDialogue(customer.account)
                        }} >
                            Balance Sheet
                            <Badge bg="danger" style={{ marginLeft: "2px" }}>
                                <Amount amount={trimTo2Decimals(customer.credit_balance)} />
                            </Badge>

                        </Button>

                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                    <>

                        <Tabs
                            defaultActiveKey="sales"
                            mountOnEnter
                            id="uncontrolled-tab-example"
                            className="mb-3"
                        >
                            <Tab eventKey="sales" title={
                                <>
                                    Sales <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["sales_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["sales_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <OrderIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>
                            <Tab eventKey="salesReturn" title={
                                <>
                                    Sales Return <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["sales_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["sales_return_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <SalesReturnIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>
                            {storeSettings?.enable_sales_in_quotation && <Tab eventKey="quotation_sales" title={
                                <>
                                    Qtn. Sales <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["quotation_invoice_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["quotation_invoice_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <QuotationIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    type={"invoice"}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}

                                />
                            </Tab>}
                            {storeSettings?.enable_sales_in_quotation && <Tab eventKey="quotation_sales_return" title={
                                <>
                                    Qtn. Sales Return <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["quotation_sales_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["quotation_sales_return_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <QuotationSalesReturnIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    type={"invoice"}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}

                                />
                            </Tab>}
                            {storeSettings?.non_vat_sales && <Tab eventKey="non_vat_sales" title={
                                <>
                                    Non VAT Sales <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["non_vat_sales_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["non_vat_sales_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <NonVATSalesIndex
                                    handleUpdated={handleUpdated}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>}
                            {storeSettings?.non_vat_sales && <Tab eventKey="non_vat_sales_return" title={
                                <>
                                    Non VAT Sales Return <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["non_vat_sales_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["non_vat_sales_return_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <NonVATSalesReturnIndex
                                    handleUpdated={handleUpdated}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>}
                            {selectedVendors?.length > 0 && <Tab eventKey="purchase" title={
                                <>
                                    Purchases <Badge bg={vendor?.stores ? vendor?.stores[localStorage.getItem("store_id")]?.["purchase_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={vendor?.stores ? trimTo2Decimals(vendor?.stores[localStorage.getItem("store_id")]?.["purchase_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <PurchaseIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    selectedVendors={selectedVendors}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>}
                            {selectedVendors?.length > 0 && <Tab eventKey="purchase_return" title={
                                <>
                                    Purchases Returns <Badge bg={vendor?.stores ? vendor?.stores[localStorage.getItem("store_id")]?.["purchase_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={vendor?.stores ? trimTo2Decimals(vendor?.stores[localStorage.getItem("store_id")]?.["purchase_return_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <PurchaseReturnIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    selectedVendors={selectedVendors}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>}
                        </Tabs>

                    </>
                </Modal.Body>
            </Modal >
        </>);


});

export default CustomerPending;

